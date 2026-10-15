-- Take a snapshot before you run this. It is not a substitute for a dump.
--   pg_dump --format=custom --file=pitches_badaim_YYYYMMDD.dump "$DATABASE_URL"
-- or take a Supabase backup snapshot.
-- NOT applied by `supabase db push`. This file is outside supabase/migrations.
-- RULE-4a: an illegal called aim is kept and flagged. Do not delete by that rule.
-- Run this by hand only after the owner names the ids.
-- Replace every YYYYMMDD with the backup date. Type the approved ids once, in the
-- insert below. Leave that placeholder unfilled in git.
-- Do not point this at production until those ids are filled in.
--   psql -v ON_ERROR_STOP=1 -f supabase/pending/delete_bad_aim_pitches.sql

\set ON_ERROR_STOP on

begin;

create temp table if not exists approved (id uuid primary key);
truncate approved;

insert into approved (id)
select unnest(array[<OWNER-APPROVED IDS>]::uuid[]);

do $$
declare
  n_approved int;
  n_backup int;
  n_removed int;
  n_absent int;
  n_missing int;
begin
  if to_regclass('public.pitches_badaim_backup_YYYYMMDD') is null then
    execute $create$
      create table public.pitches_badaim_backup_YYYYMMDD as
      select p.*
      from public.pitches p
      join approved a on a.id = p.id
    $create$;
  end if;

  execute $del$
    with removed as (
      delete from public.pitches p
      using public.pitches_badaim_backup_YYYYMMDD b
      where p.id = b.id
      returning p.id
    )
    select count(*)::int from removed
  $del$ into n_removed;

  execute $counts$
    select
      (select count(*)::int from approved),
      (select count(*)::int from public.pitches_badaim_backup_YYYYMMDD),
      (select count(*)::int from public.pitches_badaim_backup_YYYYMMDD b
        where not exists (select 1 from public.pitches p where p.id = b.id)),
      (select count(*)::int from approved a
        where not exists (
          select 1 from public.pitches_badaim_backup_YYYYMMDD b where b.id = a.id
        ))
  $counts$ into n_approved, n_backup, n_absent, n_missing;

  -- deleted = rows from the backup that are gone. A second run removes nothing
  -- new and still matches, so the guarded backup create can be run again.
  if n_approved = 0
     or n_missing <> 0
     or n_approved is distinct from n_backup
     or n_backup is distinct from n_absent
     or (n_removed <> n_backup and n_removed <> 0)
  then
    raise exception 'approved % backup % deleted %; rolling back', n_approved, n_backup, n_absent;
  end if;
end $$;

commit;

-- Restore the backed-up rows. Leave this commented. Run it only to undo the delete:
-- insert into public.pitches
-- select * from public.pitches_badaim_backup_YYYYMMDD
-- on conflict (id) do nothing;
