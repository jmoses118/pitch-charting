-- Applied to Supabase project as migration 20261013181418 (games_schedule_fields).
-- Any literal access codes / team codes / hashes are redacted.
alter table public.games add column if not exists status text not null default 'active' check (status in ('scheduled','active','final')), add column if not exists link text, add column if not exists notes text, add column if not exists game_time text, add column if not exists field text, add column if not exists game_no text, add column if not exists location text;
alter table public.games drop constraint if exists games_home_away_check; alter table public.games add constraint games_home_away_check check (home_away is null or home_away in ('home','away','tbd'));
