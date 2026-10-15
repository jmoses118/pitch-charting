#!/bin/bash
# FLOW-6a: run the bullpen-result migration against a real Postgres and assert the rows.
# This database is created for the check. Do not point it at production.
set -euo pipefail
psql -v ON_ERROR_STOP=1 <<'SQL'
create table public.pitches (
  id uuid primary key,
  mode text not null,
  result text,
  ip text,
  end_event text
);
insert into public.pitches (id, mode, result, ip, end_event) values
  ('11111111-1111-1111-1111-111111111111', 'bullpen', 'ball', 'out', 'K'),
  ('22222222-2222-2222-2222-222222222222', 'game', 'called', null, null);
SQL
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20261014230000_bullpen_no_result.sql
bp=$(psql -tA -c "select coalesce(result,'') || ':' || coalesce(ip,'') || ':' || coalesce(end_event,'') from public.pitches where mode = 'bullpen'")
gm=$(psql -tA -c "select coalesce(result,'') || ':' || coalesce(ip,'') || ':' || coalesce(end_event,'') from public.pitches where mode = 'game'")
test "$bp" = '::'
test "$gm" = 'called::'
echo "FLOW-6a postgres: bullpen results null, game result kept"
