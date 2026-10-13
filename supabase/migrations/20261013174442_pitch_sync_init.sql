-- Applied to Supabase project as migration 20261013174442 (pitch_sync_init).
-- Any literal access codes / team codes / hashes are redacted.
create schema if not exists private;
revoke all on schema private from public;
create table private.teams (team_code text primary key check (length(team_code) >= 20), name text, created_at timestamptz not null default now());
alter table private.teams enable row level security;

-- returns the x-team-code request header only if it is a registered team code, else null
create or replace function private.req_team() returns text
language sql stable security definer set search_path = ''
as $$
  select t.team_code from private.teams t
  where t.team_code = nullif(current_setting('request.headers', true)::json->>'x-team-code', '')
$$;
revoke all on function private.req_team() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.req_team() to anon, authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;

create table public.pitchers (
  team_code text not null, id text not null, name text not null, num text, throws text check (throws in ('L','R')), archived boolean not null default false, note text,
  device_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted boolean not null default false,
  primary key (team_code, id));
create table public.games (
  team_code text not null, id text not null, date text, opponent text, event text, home_away text, lineup jsonb, cur jsonb, started bigint, ended bigint, imported boolean default false,
  device_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted boolean not null default false,
  primary key (team_code, id));
create table public.sessions (
  team_code text not null, id text not null, date text, started bigint, imported boolean default false,
  device_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted boolean not null default false,
  primary key (team_code, id));
create table public.pitches (
  id uuid primary key, team_code text not null, mode text not null check (mode in ('game','bullpen')), game_id text, session_id text, pitcher_id text, ts bigint,
  hand text, type text, call text, call_raw text, targets int[], loc int, result text, ip text, end_event text,
  inning int, outs_before int, slot int, batter text, batter_num text, b int, s int, abn int, first_pitch boolean, no_pitch boolean, prev_hand text,
  device_id text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted boolean not null default false);
create index pitches_team_idx on public.pitches (team_code, updated_at);

do $$ declare t text; begin
  foreach t in array array['pitchers','games','sessions','pitches'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', t||'_touch', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update on public.%I to anon, authenticated', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (team_code = (select private.req_team()))', t||'_sel', t);
    execute format('create policy %I on public.%I for insert to anon, authenticated with check (team_code = (select private.req_team()))', t||'_ins', t);
    execute format('create policy %I on public.%I for update to anon, authenticated using (team_code = (select private.req_team())) with check (team_code = (select private.req_team()))', t||'_upd', t);
  end loop; end $$;
