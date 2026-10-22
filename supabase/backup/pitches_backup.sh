#!/bin/bash
# D-7. Back up public.pitches before the x/y migration, then prove the copy restores.
#   backup OUT_DIR  pg_dump of public.pitches (data only), its sha256, and per-team counts with an md5 of the ids.
#   verify DUMP     checks the sha256, restores into a scratch schema on a local database, and compares the counts.
#   restore NAME    runs supabase/rollback/20261022120000_pitches_xy_restore.sql with -v backup=NAME on a local database.
# The database is SOURCE_URL, or the PG* variables when it is empty.
# Local only: PGHOSTADDR, PGSERVICE, PGSERVICEFILE, PGLOADBALANCEHOSTS, PGTARGETSESSIONATTRS, a comma in PGHOST, PGPORT or SOURCE_URL,
# a host other than localhost, and a SOURCE_URL with ? or host= are refused. Every verify and restore session first checks
# that its own server address is a socket, 127.0.0.1, or ::1.
# JIM_GO_AHEAD=yes skips that guard for backup only, once Jim says go (the production URL needs ?sslmode=require).
# verify and restore never skip it; on production Jim runs the restore SQL himself.
# Keep the three files out of the repo: the private Storage bucket db-backups/pitches/, or Jim's encrypted drive.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
counts="select team_id, count(*), md5(string_agg(id::text, ',' order by id)) from %s group by team_id order by team_id"
src=()
[ -z "${SOURCE_URL:-}" ] || src=(-d "$SOURCE_URL")
check="do \$\$ declare a text := coalesce(host(inet_server_addr()), 'socket'); begin
  if a not in ('socket', '127.0.0.1', '::1') then raise exception 'connected to %, not this machine', a; end if; end \$\$"
lpsql() { psql "${src[@]}" -v ON_ERROR_STOP=1 -q -c "$check" "$@"; }
local_only() {
  local v host
  for v in PGHOSTADDR PGSERVICE PGSERVICEFILE PGLOADBALANCEHOSTS PGTARGETSESSIONATTRS; do
    [ -z "${!v:-}" ] || { echo "$v is set: unset it, the guard cannot see where it points" >&2; exit 1; }
  done
  for v in PGHOST PGPORT SOURCE_URL; do
    case "${!v:-}" in *,*) echo "$v lists more than one host or port" >&2; exit 1;; esac
  done
  case "${SOURCE_URL:-}" in *'?'*|*host=*) echo "SOURCE_URL has ? or host=: give a plain local URL" >&2; exit 1;; esac
  host=${PGHOST:-localhost}
  [ -z "${SOURCE_URL:-}" ] || host=$(printf '%s' "$SOURCE_URL" | sed -E 's#^[a-z]+://([^@/]*@)?([^:/?]*).*#\2#')
  case "$host" in localhost|127.0.0.1|::1|/*) ;; *) echo "$host is not local (a backup needs JIM_GO_AHEAD=yes once Jim says go)" >&2; exit 1;; esac
  lpsql
}
cmd=${1:-}
arg=${2:-}
case "$cmd" in
  backup)
    [ -n "$arg" ] || { echo "usage: $0 backup OUT_DIR" >&2; exit 2; }
    [ "${JIM_GO_AHEAD:-}" = yes ] || local_only
    case "$(mkdir -p "$arg" && cd "$arg" && pwd)/" in
      "$repo"/*) rmdir "$arg" 2>/dev/null || true; echo "keep backups out of the repo" >&2; exit 1;;
    esac
    out=$(cd "$arg" && pwd)
    name="pitches-$(date -u +%Y%m%d-%H%M)"
    pg_dump "${src[@]}" -t public.pitches --data-only -Fc -f "$out/$name.dump"
    (cd "$out" && sha256sum "$name.dump" > "$name.dump.sha256")
    psql "${src[@]}" -v ON_ERROR_STOP=1 -tA -c "$(printf "$counts" public.pitches)" > "$out/$name.counts.txt"
    echo "$out/$name.dump";;
  verify)
    [ -f "$arg" ] || { echo "usage: $0 verify DUMP" >&2; exit 2; }
    local_only
    dir=$(cd "$(dirname "$arg")" && pwd)
    name=$(basename "$arg" .dump)
    (cd "$dir" && sha256sum -c --quiet "$name.dump.sha256")
    scratch="scratch_$(printf '%s' "$name" | tr -c 'a-z0-9' '_')"
    lpsql -c "drop schema if exists $scratch cascade" -c "create schema $scratch" -c "create table $scratch.pitches (like public.pitches)"
    pg_restore -f - "$dir/$name.dump" | sed "s/^COPY public\.pitches /COPY $scratch.pitches /" | lpsql -f - >/dev/null
    got=$(lpsql -tA -c "$(printf "$counts" "$scratch.pitches")")
    lpsql -c "drop schema $scratch cascade"
    [ "$got" = "$(cat "$dir/$name.counts.txt")" ] || { echo "the restored counts do not match $name.counts.txt" >&2; exit 1; }
    echo "restore matches $name.counts.txt";;
  restore)
    [ -n "$arg" ] || { echo "usage: $0 restore pitches_xy_backup_YYYYMMDD" >&2; exit 2; }
    local_only
    lpsql -v backup="$arg" -f "$repo/supabase/rollback/20261022120000_pitches_xy_restore.sql";;
  *) echo "usage: $0 backup OUT_DIR | verify DUMP | restore NAME" >&2; exit 2;;
esac
