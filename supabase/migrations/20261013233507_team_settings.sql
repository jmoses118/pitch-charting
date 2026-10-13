-- Applied to Supabase project as migration 20261013233507 (team_settings).
-- coach-only team settings shared by every coach phone: pitch-count alerts, soft day/weekend limits, optional rest guide
create table if not exists public.team_settings (
  team_id text not null,
  id text not null check (id = 'team'),
  alerts int[] not null default '{75,90}',
  day_limit int check (day_limit is null or (day_limit > 0 and day_limit < 1000)),
  weekend_limit int check (weekend_limit is null or (weekend_limit > 0 and weekend_limit < 1000)),
  show_rest boolean not null default false,
  rest jsonb not null default '[]'::jsonb check (pg_column_size(rest) < 4000),
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (team_id, id),
  check (cardinality(alerts) <= 10)
);
alter table public.team_settings enable row level security;
revoke all on public.team_settings from anon, authenticated;
grant select, insert, update on public.team_settings to anon;
create policy team_settings_sel on public.team_settings for select to anon using (team_id=(select private.req_team()));
create policy team_settings_ins on public.team_settings for insert to anon with check (team_id=(select private.req_team()));
create policy team_settings_upd on public.team_settings for update to anon using (team_id=(select private.req_team())) with check (team_id=(select private.req_team()));
create trigger team_settings_touch before update on public.team_settings for each row execute function private.touch_updated_at();
