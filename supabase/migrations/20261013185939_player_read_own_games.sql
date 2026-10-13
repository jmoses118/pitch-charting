-- Applied to Supabase project as migration 20261013185939 (player_read_own_games).
-- Any literal access codes / team codes / hashes are redacted.
drop policy if exists pitches_sel on public.pitches;
create policy pitches_sel on public.pitches for select to anon using (team_id = (select private.req_team_any()) and ((select private.req_role()) = any (array['coach','viewer']) or pitcher_id = (select private.req_pitcher())));
drop policy if exists games_sel on public.games;
create policy games_sel on public.games for select to anon using (team_id = (select private.req_team_any()) and ((select private.req_role()) = any (array['coach','viewer']) or ((select private.req_role()) = 'player' and exists (select 1 from public.pitches p where p.game_id = games.id and p.team_id = games.team_id and p.pitcher_id = (select private.req_pitcher()) and not coalesce(p.deleted,false)))));
