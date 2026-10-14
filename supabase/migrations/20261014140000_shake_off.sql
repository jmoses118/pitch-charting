-- v39 shake-off: the pitcher shook off the coach's call (pitches.call = the coach's call, type/loc/result = what she threw).
-- NOT APPLIED to the live database yet. Until it is, the flag syncs as a "⤺ " prefix on pitches.call_raw (no schema change needed).
-- After applying, set shakeColumn:true in config.js (PC_CONFIG) so the app also writes this column.
alter table public.pitches add column if not exists shook boolean not null default false;
comment on column public.pitches.shook is 'pitcher shook off the coach''s call; call = coach call, type/loc = pitch thrown (v39)';
