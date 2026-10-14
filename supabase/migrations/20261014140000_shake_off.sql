-- v39 shake-off: the pitcher shook off the coach's call (pitches.call = the coach's call, type/loc/result = what she threw).
-- Apply this file before merging the build that sets shakeColumn:true in config.js.
-- The flag still also syncs as a "⤺ " prefix on pitches.call_raw.
alter table public.pitches add column if not exists shook boolean not null default false;
comment on column public.pitches.shook is 'pitcher shook off the coach''s call; call = coach call, type/loc = pitch thrown (v39)';
