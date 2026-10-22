-- D-7 restore: puts the points kept by 20261022120000_pitches_xy.sql (the rollback) back on public.pitches.
-- Re-apply supabase/migrations/20261022120000_pitches_xy.sql first, then name the copy the rollback made:
--   bash supabase/backup/pitches_backup.sh restore pitches_xy_backup_YYYYMMDD
-- That runs this file on a local database only, in a session that has checked its own server address.
-- A pitch that has a point again keeps it. Run it only with Jim's go-ahead. The copy stays until Jim drops it.
\set ON_ERROR_STOP on
\if :{?backup}
\else
do $$ begin raise exception 'run with -v backup=pitches_xy_backup_YYYYMMDD'; end $$;
\endif
begin;

update public.pitches p
set actual_x = b.actual_x, actual_y = b.actual_y, xy_loc = b.xy_loc
from private.:"backup" b
where p.id = b.id and p.actual_x is null;

commit;
