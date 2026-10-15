-- NOT applied by `supabase db push`. This file is outside supabase/migrations.
-- RULE-4a: illegal called aims are kept and flagged. Do not delete by that rule.
-- Run this by hand only for ids the owner has approved, and only after the backup.
-- Replace YYYYMMDD with the backup date. Replace <OWNER-APPROVED IDS> with those
-- ids in both statements. Leave the placeholder unfilled in git.
-- Do not point this at production until the owner has named the ids.

create table pitches_badaim_backup_YYYYMMDD as
select *
from public.pitches
where id in (<OWNER-APPROVED IDS>);

delete from public.pitches
where id in (<OWNER-APPROVED IDS>);
