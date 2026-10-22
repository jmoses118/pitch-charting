-- D-7. Stops this session unless its server is this machine: a socket, 127.0.0.1, or ::1.
-- pitches_backup.sh and the restore SQL both run it first. Only -v jim_go_ahead=yes skips it, once Jim says go.
\set ON_ERROR_STOP on
\if :{?jim_go_ahead}
\else
\set jim_go_ahead no
\endif
select :'jim_go_ahead' = 'yes' as jim_go_ahead_given \gset
\if :jim_go_ahead_given
\else
do $$ declare a text := coalesce(host(inet_server_addr()), 'socket'); begin
  if a not in ('socket', '127.0.0.1', '::1') then raise exception 'connected to %, not this machine (only Jim runs this with -v jim_go_ahead=yes)', a; end if; end $$;
\endif
