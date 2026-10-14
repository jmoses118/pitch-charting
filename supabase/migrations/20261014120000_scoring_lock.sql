-- v39 scoring lock: the phone (device id) that may score a live bullpen session.
-- NOT APPLIED to the live database yet – Jim applies it, then sets scorerColumn:true in config.js (PC_CONFIG).
-- Until then the app derives the session owner from sessions.device_id and sends no scorer column.
-- Games need no change: the owner rides in games.cur (jsonb) as cur.scorer.
alter table public.sessions add column if not exists scorer text;
comment on column public.sessions.scorer is 'device_id of the phone allowed to score this bullpen session (scoring lock, v39)';
