-- Applied to Supabase project as migration 20261013230142 (pitching_coach_role_and_notes).
-- Any literal access codes / team codes / hashes are redacted.
alter table private.access_codes add column if not exists pitcher_ids text[];
alter table private.access_codes drop constraint access_codes_role_check;
alter table private.access_codes add constraint access_codes_role_check check (role = any (array['player','viewer','pcoach']));
alter table private.access_codes drop constraint access_codes_check;
alter table private.access_codes add constraint access_codes_check check (((role = 'player') = (pitcher_id is not null)) and ((role = 'pcoach') = (coalesce(cardinality(pitcher_ids),0) > 0)));
create or replace function private.req_pitchers() returns text[] language sql stable security definer set search_path to '' as $$
  select coalesce((select case a.role when 'player' then array[a.pitcher_id] when 'pcoach' then a.pitcher_ids else '{}'::text[] end
    from private.access_codes a where a.code = private.req_hdr() and a.revoked_at is null), '{}'::text[]) $$;
drop policy pitchers_sel on public.pitchers;
create policy pitchers_sel on public.pitchers for select to anon using (team_id = (select private.req_team_any()) and ((select private.req_role()) = any (array['coach','viewer']) or id = any (coalesce((select private.req_pitchers()),'{}'::text[]))));
drop policy pitches_sel on public.pitches;
create policy pitches_sel on public.pitches for select to anon using (team_id = (select private.req_team_any()) and ((select private.req_role()) = any (array['coach','viewer']) or pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[]))));
drop policy sessions_sel on public.sessions;
create policy sessions_sel on public.sessions for select to anon using (team_id = (select private.req_team_any()) and ((select private.req_role()) = any (array['coach','viewer']) or pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[]))));
drop policy games_sel on public.games;
create policy games_sel on public.games for select to anon using (team_id = (select private.req_team_any()) and ((select private.req_role()) = any (array['coach','viewer']) or ((select private.req_role()) = any (array['player','pcoach']) and exists (select 1 from public.pitches p where p.game_id = games.id and p.team_id = games.team_id and p.pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[])) and not coalesce(p.deleted,false)))));
create policy pitches_pcoach_ins on public.pitches for insert to anon with check ((select private.req_role()) = 'pcoach' and team_id = (select private.req_team_any()) and mode = 'bullpen' and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[])));
create policy pitches_pcoach_upd on public.pitches for update to anon using ((select private.req_role()) = 'pcoach' and team_id = (select private.req_team_any()) and mode = 'bullpen' and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[])) and charted_by <> 'coach') with check (team_id = (select private.req_team_any()) and mode = 'bullpen' and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[])));
create policy sessions_pcoach_ins on public.sessions for insert to anon with check ((select private.req_role()) = 'pcoach' and team_id = (select private.req_team_any()) and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[])));
create policy sessions_pcoach_upd on public.sessions for update to anon using ((select private.req_role()) = 'pcoach' and team_id = (select private.req_team_any()) and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[]))) with check (team_id = (select private.req_team_any()) and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[])));
create or replace function private.set_charted_by() returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if tg_op='INSERT' then new.charted_by := case private.req_role() when 'player' then 'player' when 'pcoach' then 'pcoach' else 'coach' end;
  else new.charted_by := old.charted_by; end if;
  return new;
end $$;
create table if not exists public.notes (
  team_id text not null,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,96}$'),
  pitcher_id text not null check (pitcher_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  session_id text check (session_id is null or session_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  game_id text check (game_id is null or game_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  body text not null default '' check (length(body) <= 2000),
  author text,
  deleted boolean not null default false,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, id),
  check ((session_id is null) <> (game_id is null))
);
alter table public.notes enable row level security;
revoke all on public.notes from anon, authenticated;
grant select, insert, update on public.notes to anon;
create policy notes_sel on public.notes for select to anon using (team_id = (select private.req_team_any()) and ((select private.req_role()) = any (array['coach','viewer']) or pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[]))));
create policy notes_ins on public.notes for insert to anon with check (team_id = (select private.req_team()) or ((select private.req_role()) = 'pcoach' and team_id = (select private.req_team_any()) and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[]))));
create policy notes_upd on public.notes for update to anon using (team_id = (select private.req_team()) or ((select private.req_role()) = 'pcoach' and team_id = (select private.req_team_any()) and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[])))) with check (team_id = (select private.req_team()) or ((select private.req_role()) = 'pcoach' and team_id = (select private.req_team_any()) and pitcher_id = any (coalesce((select private.req_pitchers()),'{}'::text[]))));
create or replace function private.notes_author() returns trigger language plpgsql security definer set search_path to '' as $$ begin new.author := coalesce(private.req_role(),'?'); new.updated_at := now(); return new; end $$;
create trigger notes_author before insert or update on public.notes for each row execute function private.notes_author();
drop function public.coach_create_code(text,text,text);
create function public.coach_create_code(p_role text, p_pitcher_id text default null, p_label text default null, p_pitcher_ids text[] default null) returns text language plpgsql security definer set search_path to '' as $$
declare c text; h text; begin
  if private.req_role() is distinct from 'coach' then raise exception 'coach code required' using errcode = '42501'; end if;
  if p_role not in ('player','viewer','pcoach') then raise exception 'bad role'; end if;
  if p_role = 'player' and not exists (select 1 from public.pitchers p where p.team_id = private.req_team() and p.id = p_pitcher_id) then raise exception 'unknown pitcher'; end if;
  if p_role = 'pcoach' and (coalesce(cardinality(p_pitcher_ids),0) = 0 or cardinality(p_pitcher_ids) > 30 or exists (select 1 from unnest(p_pitcher_ids) x where not exists (select 1 from public.pitchers p where p.team_id = private.req_team() and p.id = x))) then raise exception 'unknown pitcher'; end if;
  h := upper(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''));
  c := (case p_role when 'player' then 'TEP-' when 'pcoach' then 'TEC-' else 'TEV-' end) || substr(h,1,5) || '-' || substr(h,6,5) || '-' || substr(h,11,5) || '-' || substr(h,16,5);
  insert into private.access_codes(code, team_code, role, pitcher_id, pitcher_ids, label) values (c, private.req_hdr(), p_role, case when p_role = 'player' then p_pitcher_id end, case when p_role = 'pcoach' then (select array_agg(distinct x) from unnest(p_pitcher_ids) x) end, p_label);
  return c; end $$;
drop function public.coach_list_codes();
create function public.coach_list_codes() returns table(code text, role text, pitcher_id text, pitcher_ids text[], label text, created_at timestamptz, revoked_at timestamptz) language plpgsql stable security definer set search_path to '' as $$ begin
  if private.req_role() is distinct from 'coach' then raise exception 'coach code required' using errcode = '42501'; end if;
  return query select a.code, a.role, a.pitcher_id, a.pitcher_ids, a.label, a.created_at, a.revoked_at from private.access_codes a where a.team_code = private.req_hdr() order by a.role, a.label; end $$;
create or replace function public.whoami() returns json language sql stable security definer set search_path to '' as $$
  select case when private.req_role() is null then null else json_build_object(
    'role', private.req_role(), 'team_id', private.req_team_any(), 'pitcher_id', private.req_pitcher(),
    'pitcher_ids', private.req_pitchers(),
    'pitcher_name', (select p.name from public.pitchers p where p.team_id = private.req_team_any() and p.id = private.req_pitcher())) end $$;
revoke all on function public.coach_create_code(text,text,text,text[]) from public; grant execute on function public.coach_create_code(text,text,text,text[]) to anon;
revoke all on function public.coach_list_codes() from public; grant execute on function public.coach_list_codes() to anon;
