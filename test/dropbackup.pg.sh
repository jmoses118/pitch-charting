#!/bin/bash
# The 2026-10-15 full-backup tables are dropped. Live tables stay.
# The schema is the one test/pg-migrate.sh built. Do not point this at production.
set -euo pipefail
mig=supabase/migrations/20261019140000_drop_pre_cleanup_backups.sql
got=$(sed -e '/\/\*/,/\*\//d' -e 's/--.*$//' "$mig" | tr '[:upper:]' '[:lower:]' | tr -s $' \t' ' ' | sed -e 's/^ *//' -e 's/ *$//' -e '/^$/d')
exp='drop table if exists public.pitches_full_backup_20261015;
drop table if exists public.sessions_full_backup_20261015;
drop table if exists public.games_full_backup_20261015;
drop table if exists public.notes_full_backup_20261015;'
test "$got" = "$exp"
psql -v ON_ERROR_STOP=1 <<'SQL'
drop table if exists public.pitches_full_backup_20261015;
drop table if exists public.sessions_full_backup_20261015;
drop table if exists public.games_full_backup_20261015;
drop table if exists public.notes_full_backup_20261015;
create table public.pitches_full_backup_20261015 (id int);
create table public.sessions_full_backup_20261015 (id int);
create table public.games_full_backup_20261015 (id int);
create table public.notes_full_backup_20261015 (id int);
insert into public.pitches_full_backup_20261015 (id) values (1);
insert into public.sessions_full_backup_20261015 (id) values (1);
insert into public.games_full_backup_20261015 (id) values (1);
insert into public.notes_full_backup_20261015 (id) values (1);
SQL
before=$(psql -tA -v ON_ERROR_STOP=1 -c "select (select count(*) from public.pitches)::text || ',' || (select count(*) from public.sessions) || ',' || (select count(*) from public.games) || ',' || (select count(*) from public.notes)")
psql -v ON_ERROR_STOP=1 -f "$mig"
after=$(psql -tA -v ON_ERROR_STOP=1 -c "select (select count(*) from public.pitches)::text || ',' || (select count(*) from public.sessions) || ',' || (select count(*) from public.games) || ',' || (select count(*) from public.notes)")
test "$before" = "$after"
for t in pitches_full_backup_20261015 sessions_full_backup_20261015 games_full_backup_20261015 notes_full_backup_20261015; do
  gone=$(psql -tA -v ON_ERROR_STOP=1 -c "select to_regclass('public.${t}') is null")
  test "$gone" = "t"
done
for t in pitches sessions games notes; do
  still=$(psql -tA -v ON_ERROR_STOP=1 -c "select to_regclass('public.${t}') is not null")
  test "$still" = "t"
done
psql -v ON_ERROR_STOP=1 -f "$mig"
echo "backup tables dropped; pitches, sessions, games, and notes are unchanged"
# D-1, D-6, D-7 run here too, because the CI workflow is a gate file.
bash test/xy.pg.sh
