-- Applied to Supabase project as migration 20261013200059 (call_sheets).
-- Any literal access codes / team codes / hashes are redacted.
create table if not exists public.call_sheets (
  team_id text not null,
  id text not null check (id ~ '^[A-Za-z0-9_-]{1,64}$'),
  name text check (length(name)<=80),
  pitcher_id text check (pitcher_id is null or pitcher_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  cols jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  sort int default 0,
  deleted boolean not null default false,
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id,id),
  check (pg_column_size(rows) < 20000)
);
alter table public.call_sheets enable row level security;
revoke all on public.call_sheets from anon, authenticated;
grant select, insert, update on public.call_sheets to anon;
-- coach code only; players and viewers never see call sheets
create policy call_sheets_sel on public.call_sheets for select to anon using (team_id=(select private.req_team()));
create policy call_sheets_ins on public.call_sheets for insert to anon with check (team_id=(select private.req_team()));
create policy call_sheets_upd on public.call_sheets for update to anon using (team_id=(select private.req_team())) with check (team_id=(select private.req_team()));
create or replace function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at := now(); return new; end $$;
create trigger call_sheets_touch before update on public.call_sheets for each row execute function private.touch_updated_at();
