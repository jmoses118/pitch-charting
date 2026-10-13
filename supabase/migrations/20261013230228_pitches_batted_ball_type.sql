-- Applied to Supabase project as migration 20261013230228 (pitches_batted_ball_type).
-- Any literal access codes / team codes / hashes are redacted.
alter table public.pitches add column if not exists bb text check (bb is null or bb in ('GB','LD','FB','PU'));
