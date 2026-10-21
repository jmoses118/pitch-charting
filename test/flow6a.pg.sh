#!/bin/bash
# FLOW-6a: re-run the bullpen-result migration on the schema from test/pg-migrate.sh.
# This database is created for the check. Do not point it at production.
set -euo pipefail
psql -v ON_ERROR_STOP=1 <<'SQL'
truncate public.pitches;
insert into public.pitches (id, team_id, mode, result, ip, end_event) values
  ('11111111-1111-1111-1111-111111111111', 't', 'bullpen', 'ball', 'out', 'K'),
  ('22222222-2222-2222-2222-222222222222', 't', 'game', 'called', null, null);
SQL
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261014230000_bullpen_no_result.sql
bp=$(psql -tA -c "select coalesce(result,'') || ':' || coalesce(ip,'') || ':' || coalesce(end_event,'') from public.pitches where mode = 'bullpen'")
gm=$(psql -tA -c "select coalesce(result,'') || ':' || coalesce(ip,'') || ':' || coalesce(end_event,'') from public.pitches where mode = 'game'")
test "$bp" = '::'
test "$gm" = 'called::'
echo "FLOW-6a postgres: bullpen results null, game result kept"
# RULE-13. BU is allowed. GB, LD, FB, and PU stay. Anything else is refused.
psql -v ON_ERROR_STOP=1 <<'SQL'
do $$
begin
  insert into public.pitches (id, team_id, mode, bb) values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 't', 'game', 'GB'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 't', 'game', 'LD'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 't', 'game', 'FB'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 't', 'game', 'PU'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5', 't', 'game', 'BU'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6', 't', 'game', null);
  begin
    insert into public.pitches (id, team_id, mode, bb) values
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb7', 't', 'game', 'ZZ');
    raise exception 'ZZ was accepted';
  exception when check_violation then
    null;
  end;
  if (select count(*) from public.pitches where bb = 'BU') <> 1 then
    raise exception 'BU was not stored';
  end if;
  delete from public.pitches where id in (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6');
end $$;
SQL
echo "RULE-13 postgres: BU allowed, older contact codes kept"
# The live check must list the same codes as PC.BB_TYPES, in that order.
want=$(node -e 'process.stdout.write(require("./logic.js").BB_TYPES.join(","))')
got=$(psql -tA -c "select pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.pitches'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%bb%'")
list=$(printf '%s' "$got" | grep -o "'[A-Z][A-Z]'" | tr -d "'" | paste -sd, -)
test "$list" = "$want"
echo "RULE-13 postgres: pitches.bb allows $list"
