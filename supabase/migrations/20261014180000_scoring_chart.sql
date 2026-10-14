-- Scoring chart fields: called location vs actual location, optional foul timing,
-- wild pitch / passed ball, optional velocity.
-- Apply this file before merging the build that sets chartColumn:true in config.js.
-- Apply 20261014140000_shake_off.sql first.
alter table public.pitches add column if not exists called_loc int;
alter table public.pitches add column if not exists actual_loc int;
alter table public.pitches add column if not exists foul_time text;
alter table public.pitches add column if not exists wp_pb text;
alter table public.pitches add column if not exists velo numeric;

alter table public.pitches drop constraint if exists pitches_foul_time_check;
alter table public.pitches add constraint pitches_foul_time_check check (foul_time is null or foul_time in ('early','ontime','late'));
alter table public.pitches drop constraint if exists pitches_wp_pb_check;
alter table public.pitches add constraint pitches_wp_pb_check check (wp_pb is null or wp_pb in ('wp','pb'));

comment on column public.pitches.called_loc is 'box the pitch was aimed at (change-up aims only 4, 7, 8, 9, 13, 14, 18)';
comment on column public.pitches.actual_loc is 'where it went: zone, ring, way off, 31 in dirt, or 32 over catcher/backstop';
comment on column public.pitches.foul_time is 'optional foul timing: early, ontime, late';
comment on column public.pitches.wp_pb is 'wp wild pitch or pb passed ball; null if neither';
comment on column public.pitches.velo is 'optional velocity';
