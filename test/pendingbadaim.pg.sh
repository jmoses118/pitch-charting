#!/bin/bash
# RULE-4a: the pending script backs up the approved ids, then deletes from that backup.
# Scratch database only. Do not point it at production.
set -euo pipefail
src=supabase/pending/delete_bad_aim_pitches.sql
live=$(sed -e '/\/\*/,/\*\//d' -e 's/--.*$//' "$src")
count=$(printf '%s\n' "$live" | grep -o '<OWNER-APPROVED IDS>' | wc -l | tr -d ' ')
test "$count" = "1"
A=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1
B=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2
C=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3
psql -v ON_ERROR_STOP=1 <<SQL
drop table if exists public.pitches_badaim_backup_scratch1;
drop table if exists public.pitches_badaim_backup_scratch2;
drop table if exists public.pitches cascade;
create table public.pitches (
  id uuid primary key,
  team_id text not null,
  mode text not null,
  type text,
  called_loc int,
  result text
);
insert into public.pitches (id, team_id, mode, type, called_loc, result) values
  ('$A', 't', 'game', 'CH', 2, 'ball'),
  ('$B', 't', 'game', 'FB', 5, 'called');
SQL
run() {
  sed -e "s/<OWNER-APPROVED IDS>/$1/" -e 's/YYYYMMDD/'"$2"'/g' "$src" > /tmp/pending-badaim.sql
  psql -v ON_ERROR_STOP=1 -f /tmp/pending-badaim.sql
}
run "'$A'" scratch1
kept=$(psql -tA -c "select string_agg(id::text, ',' order by id) from public.pitches")
bak=$(psql -tA -c "select string_agg(id::text, ',' order by id) from public.pitches_badaim_backup_scratch1")
na=$(psql -tA -c "select count(*) from public.pitches_badaim_backup_scratch1")
test "$kept" = "$B"
test "$bak" = "$A"
test "$na" = "1"
run "'$A'" scratch1
kept2=$(psql -tA -c "select string_agg(id::text, ',' order by id) from public.pitches")
bak2=$(psql -tA -c "select string_agg(id::text, ',' order by id) from public.pitches_badaim_backup_scratch1")
test "$kept2" = "$B"
test "$bak2" = "$A"
restore=$(sed -e "s/<OWNER-APPROVED IDS>/'$A'/" -e 's/YYYYMMDD/scratch1/g' "$src" | sed -n '/^-- insert into public.pitches$/,/^-- on conflict (id) do nothing;$/s/^-- //p')
psql -v ON_ERROR_STOP=1 -c "$restore"
back=$(psql -tA -c "select string_agg(id::text, ',' order by id) from public.pitches")
test "$back" = "$A,$B"
psql -v ON_ERROR_STOP=1 <<SQL
drop table if exists public.pitches cascade;
create table public.pitches (
  id uuid primary key,
  team_id text not null,
  mode text not null,
  type text,
  called_loc int,
  result text
);
insert into public.pitches (id, team_id, mode, type, called_loc, result) values
  ('$A', 't', 'game', 'CH', 2, 'ball'),
  ('$B', 't', 'game', 'FB', 5, 'called');
SQL
set +e
run "'$A','$C'" scratch2
code=$?
set -e
test "$code" -ne 0
still=$(psql -tA -c "select string_agg(id::text, ',' order by id) from public.pitches")
gone=$(psql -tA -c "select to_regclass('public.pitches_badaim_backup_scratch2') is null")
test "$still" = "$A,$B"
test "$gone" = "t"
psql -v ON_ERROR_STOP=1 -c "drop table if exists public.pitches_badaim_backup_scratch1; drop table if exists public.pitches cascade;"
echo "RULE-4a postgres: backup, delete, and approved stay in parity; a mismatch rolls back"
