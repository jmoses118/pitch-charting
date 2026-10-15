-- RULE-4a: an illegal called aim is kept and flagged. It is not deleted.
-- This file is in supabase/migrations, the folder `supabase db push` applies.
-- It used to delete every pitch whose called aim failed the change-up rule.
-- That blanket delete is not allowed. Only ids the owner has approved may be
-- deleted, and only after a backup table exists.
-- The hand-run template is supabase/pending/delete_bad_aim_pitches.sql.
-- `supabase db push` does not apply supabase/pending/.
-- supabase/preview_delete_bad_aim_pitches.sql still lists the rows. It does not delete them.
-- The statement below changes no rows.

select 1 where false;
