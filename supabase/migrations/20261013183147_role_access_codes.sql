-- Applied to Supabase project as migration 20261013183147 (role_access_codes).
-- Any literal access codes / team codes / hashes are redacted.
create table private.access_codes (
  code text primary key check (length(code) >= 20),
  team_code text not null references private.teams(team_code) on delete cascade,
  role text not null check (role in ('player','viewer')),
  pitcher_id text,
  label text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((role = 'player') = (pitcher_id is not null)));
alter table private.access_codes enable row level security;

alter table public.sessions add column if not exists pitcher_id text;

-- request context from the x-team-code header: coach (team code), player or viewer (access code)
create or replace function private.req_hdr() returns text language sql stable set search_path = '' as $$
  select nullif(current_setting('request.headers', true)::json->>'x-team-code', '') $$;
create or replace function private.req_role() returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select 'coach' from private.teams t where t.team_code = private.req_hdr()),
                  (select a.role from private.access_codes a where a.code = private.req_hdr() and a.revoked_at is null)) $$;
create or replace function private.req_team_any() returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select t.team_code from private.teams t where t.team_code = private.req_hdr()),
                  (select a.team_code from private.access_codes a where a.code = private.req_hdr() and a.revoked_at is null)) $$;
create or replace function private.req_pitcher() returns text language sql stable security definer set search_path = '' as $$
  select a.pitcher_id from private.access_codes a where a.code = private.req_hdr() and a.revoked_at is null and a.role = 'player' $$;
-- req_team() (existing) stays = coach team only
revoke all on function private.req_hdr(), private.req_role(), private.req_team_any(), private.req_pitcher() from public;
grant execute on function private.req_hdr(), private.req_role(), private.req_team_any(), private.req_pitcher() to anon, authenticated;

-- replace select policies, add player write policies (coach insert/update policies unchanged)
drop policy pitchers_sel on public.pitchers;
create policy pitchers_sel on public.pitchers for select to anon, authenticated using (
  team_code = (select private.req_team_any()) and ((select private.req_role()) in ('coach','viewer') or id = (select private.req_pitcher())));
drop policy games_sel on public.games;
create policy games_sel on public.games for select to anon, authenticated using (
  team_code = (select private.req_team_any()) and (select private.req_role()) in ('coach','viewer'));
drop policy sessions_sel on public.sessions;
create policy sessions_sel on public.sessions for select to anon, authenticated using (
  team_code = (select private.req_team_any()) and ((select private.req_role()) in ('coach','viewer') or pitcher_id = (select private.req_pitcher())));
create policy sessions_player_ins on public.sessions for insert to anon, authenticated with check (
  (select private.req_role()) = 'player' and team_code = (select private.req_team_any()) and pitcher_id = (select private.req_pitcher()));
create policy sessions_player_upd on public.sessions for update to anon, authenticated using (
  (select private.req_role()) = 'player' and team_code = (select private.req_team_any()) and pitcher_id = (select private.req_pitcher()))
  with check (team_code = (select private.req_team_any()) and pitcher_id = (select private.req_pitcher()));
drop policy pitches_sel on public.pitches;
create policy pitches_sel on public.pitches for select to anon, authenticated using (
  team_code = (select private.req_team_any()) and ((select private.req_role()) in ('coach','viewer')
   or (mode = 'bullpen' and pitcher_id = (select private.req_pitcher()))));
create policy pitches_player_ins on public.pitches for insert to anon, authenticated with check (
  (select private.req_role()) = 'player' and team_code = (select private.req_team_any()) and mode = 'bullpen' and pitcher_id = (select private.req_pitcher()));
create policy pitches_player_upd on public.pitches for update to anon, authenticated using (
  (select private.req_role()) = 'player' and team_code = (select private.req_team_any()) and mode = 'bullpen' and pitcher_id = (select private.req_pitcher()))
  with check (team_code = (select private.req_team_any()) and mode = 'bullpen' and pitcher_id = (select private.req_pitcher()));

-- RPCs
create or replace function public.whoami() returns json language sql stable security definer set search_path = '' as $$
  select case when private.req_role() is null then null else json_build_object(
    'role', private.req_role(), 'pitcher_id', private.req_pitcher(),
    'pitcher_name', (select p.name from public.pitchers p where p.team_code = private.req_team_any() and p.id = private.req_pitcher())) end $$;
create or replace function public.coach_list_codes() returns table(code text, role text, pitcher_id text, label text, created_at timestamptz, revoked_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$ begin
  if private.req_role() is distinct from 'coach' then raise exception 'coach code required' using errcode = '42501'; end if;
  return query select a.code, a.role, a.pitcher_id, a.label, a.created_at, a.revoked_at from private.access_codes a where a.team_code = private.req_team() order by a.role, a.label; end $$;
create or replace function public.coach_create_code(p_role text, p_pitcher_id text default null, p_label text default null) returns text
language plpgsql volatile security definer set search_path = '' as $$ declare c text; h text; begin
  if private.req_role() is distinct from 'coach' then raise exception 'coach code required' using errcode = '42501'; end if;
  if p_role not in ('player','viewer') then raise exception 'bad role'; end if;
  if p_role = 'player' and not exists (select 1 from public.pitchers p where p.team_code = private.req_team() and p.id = p_pitcher_id) then raise exception 'unknown pitcher'; end if;
  h := upper(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
  c := (case p_role when 'player' then 'TEP-' else 'TEV-' end) || substr(h,1,5) || '-' || substr(h,6,5) || '-' || substr(h,11,5) || '-' || substr(h,16,5);
  insert into private.access_codes(code, team_code, role, pitcher_id, label) values (c, private.req_team(), p_role, case when p_role = 'player' then p_pitcher_id end, p_label);
  return c; end $$;
create or replace function public.coach_revoke_code(p_code text) returns boolean language plpgsql volatile security definer set search_path = '' as $$ begin
  if private.req_role() is distinct from 'coach' then raise exception 'coach code required' using errcode = '42501'; end if;
  update private.access_codes set revoked_at = now() where code = p_code and team_code = private.req_team() and revoked_at is null;
  return found; end $$;
revoke all on function public.whoami(), public.coach_list_codes(), public.coach_create_code(text,text,text), public.coach_revoke_code(text) from public;
grant execute on function public.whoami(), public.coach_list_codes(), public.coach_create_code(text,text,text), public.coach_revoke_code(text) to anon, authenticated;
