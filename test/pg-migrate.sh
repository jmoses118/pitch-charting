#!/bin/bash
# Build the throwaway database from supabase/migrations. Do not point this at a hosted project.
set -euo pipefail
case "${PGHOST:-}" in
  *supabase.co*) echo "refusing a hosted Supabase database" >&2; exit 1;;
esac
psql -v ON_ERROR_STOP=1 -tA -c "select 1 from pg_roles where rolname = 'anon'" | grep -q 1 \
  || psql -v ON_ERROR_STOP=1 -c "create role anon nologin"
psql -v ON_ERROR_STOP=1 -tA -c "select 1 from pg_roles where rolname = 'authenticated'" | grep -q 1 \
  || psql -v ON_ERROR_STOP=1 -c "create role authenticated nologin"
for f in supabase/migrations/*.sql; do
  psql -v ON_ERROR_STOP=1 -f "$f"
done
echo "migrations applied from supabase/migrations"
