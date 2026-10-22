-- D-1. The exact tap point. Additive: three nullable columns and one check, with no backfill.
-- Take the D-7 backup first (supabase/backup/pitches_backup.sh). Nothing runs on live data without Jim's go-ahead.
-- Apply this file before merging the build that sets xyColumn:true in config.js.
-- Rollback: supabase/rollback/20261022120000_pitches_xy.sql.
alter table public.pitches add column if not exists actual_x numeric(4,3);
alter table public.pitches add column if not exists actual_y numeric(4,3);
alter table public.pitches add column if not exists xy_loc smallint;

alter table public.pitches drop constraint if exists pitches_xy_check;
alter table public.pitches add constraint pitches_xy_check check (
  (actual_x is null) = (actual_y is null)
  and (actual_x is null) = (xy_loc is null)
  and (actual_x is null or (actual_x between 0 and 1 and actual_y between 0 and 1)));

comment on column public.pitches.actual_x is 'tap point across the frame or its off-grid bin, 0 to 1, rounded in the app';
comment on column public.pitches.actual_y is 'tap point down the frame or its off-grid bin, 0 to 1, rounded in the app';
comment on column public.pitches.xy_loc is 'location code the tap was captured on; the point is stale when this is not the landed code';
