-- Applied to Supabase project as migration 20261013183647 (rotate_leaked_coach_code).
-- Any literal access codes / team codes / hashes are redacted.
alter table private.access_codes drop constraint access_codes_team_code_fkey;
alter table private.access_codes add constraint access_codes_team_code_fkey foreign key (team_code) references private.teams(team_code) on delete cascade on update cascade;
update private.teams set team_code = '<REDACTED_CODE>' where team_id = 'thunder-elite-13u';
