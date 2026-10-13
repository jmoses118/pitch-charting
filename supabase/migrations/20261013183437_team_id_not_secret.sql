-- Applied to Supabase project as migration 20261013183437 (team_id_not_secret).
-- Any literal access codes / team codes / hashes are redacted.
alter table private.teams add column if not exists team_id text unique;
update private.teams set team_id = 'thunder-elite-13u' where team_code = '<REDACTED_CODE>';
update private.teams set team_id = 'zztest' where team_code = '<REDACTED_CODE>';
update private.teams set team_id = 't_' || substr(md5(team_code),1,10) where team_id is null;
alter table private.teams alter column team_id set not null;

do $$ declare t text; begin
  foreach t in array array['pitchers','games','sessions','pitches'] loop
    execute format('alter table public.%I rename column team_code to team_id', t);
    execute format('update public.%I x set team_id = tm.team_id from private.teams tm where tm.team_code = x.team_id', t);
  end loop; end $$;

create or replace function private.req_team() returns text language sql stable security definer set search_path = '' as $$
  select t.team_id from private.teams t where t.team_code = private.req_hdr() $$;
create or replace function private.req_team_any() returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select t.team_id from private.teams t where t.team_code = private.req_hdr()),
                  (select t.team_id from private.access_codes a join private.teams t on t.team_code = a.team_code where a.code = private.req_hdr() and a.revoked_at is null)) $$;

create or replace function public.whoami() returns json language sql stable security definer set search_path = '' as $$
  select case when private.req_role() is null then null else json_build_object(
    'role', private.req_role(), 'team_id', private.req_team_any(), 'pitcher_id', private.req_pitcher(),
    'pitcher_name', (select p.name from public.pitchers p where p.team_id = private.req_team_any() and p.id = private.req_pitcher())) end $$;
create or replace function public.coach_list_codes() returns table(code text, role text, pitcher_id text, label text, created_at timestamptz, revoked_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$ begin
  if private.req_role() is distinct from 'coach' then raise exception 'coach code required' using errcode = '42501'; end if;
  return query select a.code, a.role, a.pitcher_id, a.label, a.created_at, a.revoked_at from private.access_codes a where a.team_code = private.req_hdr() order by a.role, a.label; end $$;
create or replace function public.coach_create_code(p_role text, p_pitcher_id text default null, p_label text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$ declare c text; h text; begin
  if private.req_role() is distinct from 'coach' then raise exception 'coach code required' using errcode = '42501'; end if;
  if p_role not in ('player','viewer') then raise exception 'bad role'; end if;
  if p_role = 'player' and not exists (select 1 from public.pitchers p where p.team_id = private.req_team() and p.id = p_pitcher_id) then raise exception 'unknown pitcher'; end if;
  h := upper(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
  c := (case p_role when 'player' then 'TEP-' else 'TEV-' end) || substr(h,1,5) || '-' || substr(h,6,5) || '-' || substr(h,11,5) || '-' || substr(h,16,5);
  insert into private.access_codes(code, team_code, role, pitcher_id, label) values (c, private.req_hdr(), p_role, case when p_role = 'player' then p_pitcher_id end, p_label);
  return c; end $$;
create or replace function public.coach_revoke_code(p_code text) returns boolean language plpgsql volatile security definer set search_path = '' as $$ begin
  if private.req_role() is distinct from 'coach' then raise exception 'coach code required' using errcode = '42501'; end if;
  update private.access_codes set revoked_at = now() where code = p_code and team_code = private.req_hdr() and revoked_at is null;
  return found; end $$;
