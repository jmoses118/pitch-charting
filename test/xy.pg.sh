#!/bin/bash
# D-1, D-6, D-7. The tap-point columns, an upsert that leaves them alone, and the scratch dry run of the backup and rollback.
# The schema is the one test/pg-migrate.sh built. Do not point this at production.
set -euo pipefail
case "${PGHOST:-localhost}" in
  localhost|127.0.0.1) ;;
  *) echo "database host must be localhost or 127.0.0.1" >&2; exit 1;;
esac
mig=supabase/migrations/20261022120000_pitches_xy.sql
back=supabase/rollback/20261022120000_pitches_xy.sql
bk=supabase/backup/pitches_backup.sh
q() { psql -v ON_ERROR_STOP=1 -tA "$@"; }
cols() { q -c "select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'pitches' and column_name in ('actual_x','actual_y','xy_loc')"; }
out=$(mktemp -d)
trap 'rm -rf "$out"' EXIT

# D-1. The check rejects a half point and anything outside 0..1, and accepts a full point or none.
q -f "$mig" >/dev/null
test "$(cols)" = 3
q <<'SQL'
truncate public.pitches;
do $$
declare t record;
begin
  for t in select * from (values (1.001::numeric, 0.5::numeric, 5::smallint), (0.5, null, 5), (0.5, 0.5, null), (-0.001, 0.2, 1)) v(x, y, l) loop
    begin
      insert into public.pitches (id, team_id, mode, actual_x, actual_y, xy_loc) values (gen_random_uuid(), 't', 'game', t.x, t.y, t.l);
      raise exception 'accepted (%, %, %)', t.x, t.y, t.l;
    exception when check_violation then
      null;
    end;
  end loop;
end $$;
insert into public.pitches (id, team_id, mode, actual_x, actual_y, xy_loc) values
  ('d1000000-0000-0000-0000-000000000001', 't', 'game', 0, 1, 13),
  ('d1000000-0000-0000-0000-000000000002', 't', 'game', null, null, null),
  ('d1000000-0000-0000-0000-000000000003', 't', 'game', 0.123, 0.987, 12);
SQL
test "$(q -c "select count(*) from public.pitches")" = 3
test "$(q -c "select actual_x || ',' || actual_y || ',' || xy_loc from public.pitches where id = 'd1000000-0000-0000-0000-000000000003'")" = '0.123,0.987,12'
echo "D-1 postgres: the check rejects 4 bad points and keeps (0, 1, 13), none, and (0.123, 0.987, 12)"

# D-6. merge-duplicates updates only the columns it sends, so a phone without xyCol leaves x and y alone.
q <<'SQL'
insert into public.pitches (id, team_id, mode, loc) values ('d1000000-0000-0000-0000-000000000003', 't', 'game', 12)
on conflict (id) do update set loc = excluded.loc;
SQL
test "$(q -c "select loc || ':' || actual_x || ',' || actual_y || ',' || xy_loc from public.pitches where id = 'd1000000-0000-0000-0000-000000000003'")" = '12:0.123,0.987,12'
echo "D-6 postgres: a row without the x/y columns keeps the stored point"

# D-7. Start from today's production shape: no x/y columns.
day=$(q -c "select to_char(now(), 'YYYYMMDD')")
q -c "drop table if exists private.pitches_xy_backup_${day}"
q -c "truncate public.pitches"
q -f "$back" >/dev/null
test "$(cols)" = 0
test "$(q -c "select count(*) from private.pitches_xy_backup_${day}")" = 0
q -c "drop table private.pitches_xy_backup_${day}"
q <<'SQL'
insert into public.pitches (id, team_id, mode, loc) values
  ('d7000000-0000-0000-0000-000000000001', 't', 'game', 5),
  ('d7000000-0000-0000-0000-000000000002', 't', 'game', 8),
  ('d7000000-0000-0000-0000-000000000003', 't', 'bullpen', 31),
  ('d7000000-0000-0000-0000-000000000004', 'u', 'game', 14);
SQL

# The backup refuses a remote host without Jim's go-ahead.
if SOURCE_URL='postgresql://u@db.example.com/x' bash "$bk" backup "$out/remote" 2>/dev/null; then echo "a remote backup ran without JIM_GO_AHEAD" >&2; exit 1; fi

# Each way around the local-only guard is refused, before anything is written.
refuses() { local why=$1; shift
  if env "$@" >/dev/null 2>"$out/err"; then echo "allowed: $*" >&2; exit 1; fi
  grep -q "$why" "$out/err" || { echo "wrong refusal for $*: $(cat "$out/err")" >&2; exit 1; }
  test ! -e "$out/neg"; }
# stub DIR ADDR [LATER]: a psql whose server address reads as ADDR, or as LATER in the session that writes (scratch DDL or restore).
stub() { mkdir -p "$1"; cat > "$1/psql" <<EOF
#!/bin/bash
rep="'$2'::inet"; case "\$*" in *'create schema'*|*_restore.sql*) rep="'${3:-$2}'::inet";; esac
a=(); for x in "\$@"; do a+=("\${x//inet_server_addr()/\$rep}"); done
exec $(command -v psql) "\${a[@]}"
EOF
  chmod +x "$1/psql"; }
stub "$out/fake" 10.1.2.3
printf '[pitch]\nhost=localhost\n' > "$out/pg_service.conf"
touch "$out/neg.dump"
for run in "backup $out/neg" "verify $out/neg.dump" "restore pitches_xy_backup_none"; do
  refuses PGHOSTADDR PGHOSTADDR=10.255.255.1 bash "$bk" $run
  refuses PGSERVICE PGSERVICE=pitch bash "$bk" $run
  refuses PGSERVICEFILE PGSERVICEFILE="$out/pg_service.conf" bash "$bk" $run
  refuses PGLOADBALANCEHOSTS PGLOADBALANCEHOSTS=random bash "$bk" $run
  refuses PGTARGETSESSIONATTRS PGTARGETSESSIONATTRS=any bash "$bk" $run
  refuses 'PGHOST lists' PGHOST=localhost,db.example.com bash "$bk" $run
  refuses 'PGPORT lists' PGPORT=5432,5433 bash "$bk" $run
  refuses 'SOURCE_URL lists' SOURCE_URL='postgresql://localhost,db.example.com/pitch' bash "$bk" $run
  refuses SOURCE_URL SOURCE_URL='postgresql://localhost/pitch?host=db.example.com' bash "$bk" $run
  refuses SOURCE_URL SOURCE_URL='host=db.example.com dbname=pitch' bash "$bk" $run
  refuses 10.1.2.3 PATH="$out/fake:$PATH" bash "$bk" $run
done
refuses 10.1.2.3 JIM_GO_AHEAD=yes PATH="$out/fake:$PATH" bash "$bk" verify "$out/neg.dump"
refuses PGHOSTADDR JIM_GO_AHEAD=yes PGHOSTADDR=10.255.255.1 bash "$bk" verify "$out/neg.dump"
JIM_GO_AHEAD=yes PATH="$out/fake:$PATH" bash "$bk" backup "$out/go" >/dev/null
test "$(ls "$out/go" | wc -l)" = 3
echo "D-7 guard: PGHOSTADDR, PGSERVICE, PGSERVICEFILE, PGLOADBALANCEHOSTS, PGTARGETSESSIONATTRS, a comma in PGHOST, PGPORT or SOURCE_URL, a SOURCE_URL with ? or host=, and a remote server address are refused for backup, verify and restore; JIM_GO_AHEAD lets only backup through"

# CI's Postgres is a service container. Through the port mapping the server sees its own bridge address, and the real guard refuses it.
# There the runs below get 127.0.0.1 for the address query from a stub psql. Locally they go through the real check.
lo=$PATH
real=$(q -c "select coalesce(host(inet_server_addr()), 'socket')")
case "$real" in
  socket|127.0.0.1|::1) echo "D-7 guard: the real server address is $real, so the runs below use the real check";;
  *) refuses "connected to $real" bash "$bk" verify "$out/neg.dump"
     stub "$out/lo" 127.0.0.1
     lo="$out/lo:$PATH"
     echo "D-7 guard: the real guard refuses the container address $real, so the runs below report 127.0.0.1";;
esac
bkl() { PATH="$lo" bash "$bk" "$@"; }

# The backup refuses a folder inside the repo.
if bkl backup "$PWD/tmp-backup" 2>/dev/null; then echo "a backup inside the repo was allowed" >&2; exit 1; fi
test ! -e "$PWD/tmp-backup"

# Backup, then the sha256 verifies and the restore into a scratch schema matches the counts.
dump=$(bkl backup "$out/bk" | tail -1)
name=$(basename "$dump" .dump)
test -s "$dump"
test -s "$out/bk/$name.dump.sha256"
test "$(wc -l < "$out/bk/$name.counts.txt")" = 2
grep -q '^t|3|' "$out/bk/$name.counts.txt"
grep -q '^u|1|' "$out/bk/$name.counts.txt"
bkl verify "$dump"
test "$(q -c "select count(*) from information_schema.schemata where schema_name like 'scratch_%'")" = 0

# The scratch DDL session checks its own address, so a later session that lands on another host is refused before it writes.
stub "$out/split" 127.0.0.1 10.1.2.3
refuses 'connected to 10.1.2.3' PATH="$out/split:$PATH" bash "$bk" verify "$dump"
test "$(q -c "select count(*) from information_schema.schemata where schema_name like 'scratch_%'")" = 0

# A changed dump fails the sha256 check.
mkdir "$out/bad"
cp "$out/bk/$name".* "$out/bad/"
printf 'x' >> "$out/bad/$name.dump"
if bkl verify "$out/bad/$name.dump" >/dev/null 2>"$out/err"; then echo "a changed dump passed" >&2; exit 1; fi
grep -q 'did NOT match' "$out/err"

# Migrate (twice changes nothing), write (0.5, 0.5, 5), then roll back.
q -f "$mig" >/dev/null
q -f "$mig" >/dev/null
test "$(cols)" = 3
test "$(q -c "select count(*) from public.pitches where actual_x is not null")" = 0
q -c "update public.pitches set actual_x = 0.5, actual_y = 0.5, xy_loc = 5 where id = 'd7000000-0000-0000-0000-000000000001'"
q -f "$back" >/dev/null
test "$(cols)" = 0
test "$(q -c "select count(*) from private.pitches_xy_backup_${day}")" = 1
test "$(q -c "select id || ':' || actual_x || ',' || actual_y || ',' || xy_loc from private.pitches_xy_backup_${day}")" = 'd7000000-0000-0000-0000-000000000001:0.500,0.500,5'
test "$(q -c "select relrowsecurity from pg_class where oid = 'private.pitches_xy_backup_${day}'::regclass")" = t
for role in anon authenticated; do
  test "$(q -c "select has_table_privilege('$role', 'private.pitches_xy_backup_${day}', 'select')")" = f
  if q -c "set role $role; select count(*) from private.pitches_xy_backup_${day}" >/dev/null 2>&1; then echo "$role read the backup" >&2; exit 1; fi
  test "$(q -q <<SQL
begin;
grant usage on schema private to $role;
grant select on private.pitches_xy_backup_${day} to $role;
set local role $role;
select count(*) from private.pitches_xy_backup_${day};
rollback;
SQL
)" = 0
done
now=$(q -c "select team_id || '|' || count(*) || '|' || md5(string_agg(id::text, ',' order by id)) from public.pitches group by team_id order by team_id")
test "$now" = "$(cat "$out/bk/$name.counts.txt")"
echo "D-7 postgres: backup, sha256, restore, migrate, write (0.5, 0.5, 5), roll back: 1 row kept, counts match"
echo "D-7 postgres: the rollback copy has RLS on, and anon and authenticated read nothing, even with a grant"

# The restore needs the backup name, checks its own session, puts the kept point back, and never overwrites a newer point.
res=supabase/rollback/20261022120000_pitches_xy_restore.sql
point() { q -c "select actual_x || ',' || actual_y || ',' || xy_loc from public.pitches where id = 'd7000000-0000-0000-0000-000000000001'"; }
q -f "$mig" >/dev/null
if q -f "$res" >/dev/null 2>&1; then echo "the restore SQL ran without -v backup" >&2; exit 1; fi
if bkl restore >/dev/null 2>&1; then echo "the restore ran without a backup name" >&2; exit 1; fi
refuses 'connected to 10.1.2.3' PATH="$out/split:$PATH" bash "$bk" restore "pitches_xy_backup_${day}"
test "$(q -c "select count(*) from public.pitches where actual_x is not null")" = 0
bkl restore "pitches_xy_backup_${day}" >/dev/null
test "$(point)" = '0.500,0.500,5'
q -c "update public.pitches set actual_x = 0.6, actual_y = 0.6 where id = 'd7000000-0000-0000-0000-000000000001'"
bkl restore "pitches_xy_backup_${day}" >/dev/null
test "$(point)" = '0.600,0.600,5'
test "$(q -c "select count(*) from public.pitches where actual_x is not null")" = 1
echo "D-7 postgres: verify and restore refuse a session on another host; the restore puts (0.5, 0.5, 5) back and leaves a newer point alone"

# Leave the schema migrated for anything that runs later.
q -c "drop table private.pitches_xy_backup_${day}"
q -c "truncate public.pitches"
q -f "$mig" >/dev/null
test "$(cols)" = 3
