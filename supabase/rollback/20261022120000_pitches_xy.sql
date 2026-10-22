-- D-7 rollback for supabase/migrations/20261022120000_pitches_xy.sql. supabase db push does not read this folder.
-- Run it only with Jim's go-ahead, after the D-7 backup. Every saved point is copied into the private schema first.
begin;

do $$
declare t text := 'pitches_xy_backup_' || to_char(now(), 'YYYYMMDD');
begin
  execute format('create table private.%I as select id, actual_x, actual_y, xy_loc from public.pitches where actual_x is not null', t);
  execute format('revoke all on private.%I from public, anon, authenticated', t);
end $$;

alter table public.pitches drop constraint if exists pitches_xy_check;
alter table public.pitches drop column if exists actual_x, drop column if exists actual_y, drop column if exists xy_loc;

commit;
