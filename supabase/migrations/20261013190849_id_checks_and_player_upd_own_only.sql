-- Applied to Supabase project as migration 20261013190849 (id_checks_and_player_upd_own_only).
-- Any literal access codes / team codes / hashes are redacted.
alter table public.games add constraint games_id_safe check (id ~ '^[A-Za-z0-9_-]{1,64}$'), add constraint games_date_len check (date is null or length(date)<=32);
alter table public.sessions add constraint sessions_id_safe check (id ~ '^[A-Za-z0-9_-]{1,64}$'), add constraint sessions_date_len check (date is null or length(date)<=32), add constraint sessions_pid_safe check (pitcher_id is null or pitcher_id ~ '^[A-Za-z0-9_-]{1,64}$');
alter table public.pitchers add constraint pitchers_id_safe check (id ~ '^[A-Za-z0-9_-]{1,64}$');
alter table public.pitches add constraint pitches_refs_safe check ((game_id is null or game_id ~ '^[A-Za-z0-9_-]{1,64}$') and (session_id is null or session_id ~ '^[A-Za-z0-9_-]{1,64}$') and (pitcher_id is null or pitcher_id ~ '^[A-Za-z0-9_-]{1,64}$'));
-- who charted each pitch; players may only modify pitches they charted themselves
alter table public.pitches add column if not exists charted_by text not null default 'coach';
create or replace function private.set_charted_by() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='INSERT' then new.charted_by := case when private.req_role()='player' then 'player' else 'coach' end;
  else new.charted_by := old.charted_by; end if;
  return new;
end $$;
revoke all on function private.set_charted_by() from public, anon, authenticated;
drop trigger if exists pitches_charted_by on public.pitches;
create trigger pitches_charted_by before insert or update on public.pitches for each row execute function private.set_charted_by();
drop policy if exists pitches_player_upd on public.pitches;
create policy pitches_player_upd on public.pitches for update to anon using ((select private.req_role())='player' and team_id=(select private.req_team_any()) and mode='bullpen' and pitcher_id=(select private.req_pitcher()) and charted_by='player') with check (team_id=(select private.req_team_any()) and mode='bullpen' and pitcher_id=(select private.req_pitcher()));
