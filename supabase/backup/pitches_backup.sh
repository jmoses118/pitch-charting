#!/bin/bash
# D-7. Back up public.pitches before the x/y migration, then prove the copy restores.
#   backup OUT_DIR  pg_dump of public.pitches (data only), its sha256, and per-team counts with an md5 of the ids.
#   verify DUMP     checks the sha256, restores into a scratch schema on a local database, and compares the counts.
# The source is SOURCE_URL, or the PG* variables when it is empty. A host other than localhost needs JIM_GO_AHEAD=yes.
# Keep the three files out of the repo: the private Storage bucket db-backups/pitches/, or Jim's encrypted drive.
set -euo pipefail
repo=$(cd "$(dirname "$0")/../.." && pwd)
counts="select team_id, count(*), md5(string_agg(id::text, ',' order by id)) from %s group by team_id order by team_id"
local_host() { case "$1" in localhost|127.0.0.1) return 0;; *) return 1;; esac; }
cmd=${1:-}
arg=${2:-}
case "$cmd" in
  backup)
    [ -n "$arg" ] || { echo "usage: $0 backup OUT_DIR" >&2; exit 2; }
    src=()
    host=${PGHOST:-localhost}
    if [ -n "${SOURCE_URL:-}" ]; then
      src=(-d "$SOURCE_URL")
      host=$(printf '%s' "$SOURCE_URL" | sed -E 's#^[a-z]+://([^@/]*@)?([^:/?]*).*#\2#')
    fi
    if ! local_host "$host" && [ "${JIM_GO_AHEAD:-}" != yes ]; then echo "$host is not local: set JIM_GO_AHEAD=yes once Jim says go" >&2; exit 1; fi
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
    local_host "${PGHOST:-localhost}" || { echo "restore into a local scratch database only" >&2; exit 1; }
    dir=$(cd "$(dirname "$arg")" && pwd)
    name=$(basename "$arg" .dump)
    (cd "$dir" && sha256sum -c --quiet "$name.dump.sha256")
    scratch="scratch_$(printf '%s' "$name" | tr -c 'a-z0-9' '_')"
    psql -v ON_ERROR_STOP=1 -q -c "drop schema if exists $scratch cascade" -c "create schema $scratch" -c "create table $scratch.pitches (like public.pitches)"
    pg_restore -f - "$dir/$name.dump" | sed "s/^COPY public\.pitches /COPY $scratch.pitches /" | psql -v ON_ERROR_STOP=1 -q >/dev/null
    got=$(psql -v ON_ERROR_STOP=1 -tA -c "$(printf "$counts" "$scratch.pitches")")
    psql -v ON_ERROR_STOP=1 -q -c "drop schema $scratch cascade"
    [ "$got" = "$(cat "$dir/$name.counts.txt")" ] || { echo "the restored counts do not match $name.counts.txt" >&2; exit 1; }
    echo "restore matches $name.counts.txt";;
  *) echo "usage: $0 backup OUT_DIR | verify DUMP" >&2; exit 2;;
esac
