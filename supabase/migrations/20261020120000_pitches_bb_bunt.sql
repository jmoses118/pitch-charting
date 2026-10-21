-- RULE-13. Ball-in-play contact may be a bunt (BU).
-- Take a database backup before applying this. It replaces the check on pitches.bb.
-- Existing rows stay. GB, LD, FB, and PU are still allowed. Nothing is rewritten.
-- Rollback: restore pitches from the backup taken before this migration.
-- Do not put the four-code check back while any row is BU. That check would fail.
-- Do not null those BU rows without Jim's sign-off.

begin;

alter table public.pitches drop constraint if exists pitches_bb_check;

alter table public.pitches
  add constraint pitches_bb_check
  check (bb is null or bb in ('GB','LD','FB','PU','BU'));

commit;
