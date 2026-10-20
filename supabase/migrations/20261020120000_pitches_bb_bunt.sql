-- RULE-13. Ball-in-play contact may be a bunt (BU).
-- Take a database backup before applying this. It replaces the check on pitches.bb.
-- Existing rows stay. GB, LD, FB, and PU are still allowed. Nothing is rewritten.

do $$
declare cname text;
begin
  select con.conname into cname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'pitches'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) like '%''GB''%';
  if cname is not null then
    execute format('alter table public.pitches drop constraint %I', cname);
  end if;
end $$;

alter table public.pitches drop constraint if exists pitches_bb_check;

alter table public.pitches
  add constraint pitches_bb_check
  check (bb is null or bb in ('GB','LD','FB','PU','BU'));
