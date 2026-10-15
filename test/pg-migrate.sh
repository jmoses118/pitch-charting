#!/bin/bash
# Build the throwaway database from supabase/migrations. Localhost only.
set -euo pipefail
case "${PGHOST:-localhost}" in
  localhost|127.0.0.1) ;;
  *) echo "database host must be localhost or 127.0.0.1" >&2; exit 1;;
esac
psql -v ON_ERROR_STOP=1 -tA -c "select 1 from pg_roles where rolname = 'anon'" | grep -q 1 \
  || psql -v ON_ERROR_STOP=1 -c "create role anon nologin"
psql -v ON_ERROR_STOP=1 -tA -c "select 1 from pg_roles where rolname = 'authenticated'" | grep -q 1 \
  || psql -v ON_ERROR_STOP=1 -c "create role authenticated nologin"
for f in supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -f "$f"
done
echo "migrations applied from supabase/migrations"
