#!/bin/bash
# RULE-4a: illegal called aims are kept and flagged.
# The file in supabase/migrations is a no-op. The preview still lists the rows.
# The schema is the one test/pg-migrate.sh built. Do not point this at production.
set -euo pipefail
mig=supabase/migrations/20261015130000_delete_bad_aim_pitches.sql
live=$(sed -e '/\/\*/,/\*\//d' -e 's/--.*$//' "$mig")
if printf '%s\n' "$live" | grep -qiE 'delete[[:space:]]+from'; then
  echo "applied migration still deletes rows" >&2
  exit 1
fi
psql -v ON_ERROR_STOP=1 <<'SQL'
truncate public.pitches, public.pitchers, public.games, public.sessions;
insert into public.pitchers (team_id, id, name) values ('t', 'p_woods', 'Avery Woods');
insert into public.games (team_id, id, date) values ('t', 'g1', '2026-10-14');
insert into public.sessions (team_id, id, date) values ('t', 's1', '2026-10-13');
insert into public.pitches (id, team_id, mode, game_id, session_id, pitcher_id, type, targets, loc, called_loc, actual_loc, result) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 't', 'game', 'g1', null, 'p_woods', 'CH', '{2}', 5, 2, 5, 'ball'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 't', 'game', 'g1', null, 'p_woods', 'FB', '{2}', 2, 2, 2, 'called'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 't', 'bullpen', null, 's1', 'p_woods', 'CH', '{8}', 8, 8, 8, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 't', 'game', 'g1', null, 'p_woods', 'FB', '{12}', 12, 12, 12, 'ball'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 't', 'game', 'g1', null, 'p_woods', 'FB', null, 5, null, 5, 'called'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6', 't', 'game', 'g1', null, 'p_woods', 'FB', '{31}', 31, 31, 31, 'ball'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7', 't', 'bullpen', null, 's1', 'p_woods', 'FB', '{21}', 21, null, 21, null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa8', 't', 'game', 'g1', null, 'p_woods', 'CH', '{4,2}', 8, null, 8, 'foul'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9', 't', 'game', 'g1', null, 'p_woods', 'FB', '{5}', 31, 5, 31, 'ball');
SQL
q=$(sed -e '/^--/d' -e 's/order by p.id;//' supabase/preview_delete_bad_aim_pitches.sql)
preview=$(psql -tA -v ON_ERROR_STOP=1 -c "select string_agg(id::text, ',' order by id) from ($q) q")
sample=$(psql -tA -v ON_ERROR_STOP=1 -c "select pitcher || '|' || date || '|' || type || '|' || called_box || '|' || actual_box from ($q) q where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'")
test "$preview" = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa8"
test "$sample" = "Avery|2026-10-14|CH|2|5"
before=$(psql -tA -v ON_ERROR_STOP=1 -c "select string_agg(id::text, ',' order by id) from public.pitches")
psql -v ON_ERROR_STOP=1 -f "$mig"
kept=$(psql -tA -c "select string_agg(id::text, ',' order by id) from public.pitches")
result=$(psql -tA -c "select result from public.pitches where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'")
after=$(psql -tA -c "select count(*) from ($q) q")
backups=$(psql -tA -c "select count(*) from pg_catalog.pg_class where relkind = 'r' and relname like 'pitches_badaim_backup%'")
test "$before" = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa6,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa7,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa8,aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa9"
test "$kept" = "$before"
test "$result" = "called"
test "$after" = "4"
test "$backups" = "0"
echo "RULE-4a postgres: illegal aims stay; the preview still lists them; the applied migration deletes nothing"
