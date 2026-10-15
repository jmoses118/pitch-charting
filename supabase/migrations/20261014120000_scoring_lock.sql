-- v39 scoring lock: the phone (device id) that may score a live bullpen session.
-- APPLIED to the live database 2026-10-14 (project qeqijbrokrkzpcacpjyw). scorerColumn:true is set in config.js (PC_CONFIG).
-- Games need no change: the owner rides in games.cur (jsonb) as cur.scorer.
alter table public.sessions add column if not exists scorer text;
comment on column public.sessions.scorer is 'device_id of the phone allowed to score this bullpen session (scoring lock, v39)';
