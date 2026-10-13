-- Applied to Supabase project as migration 20261013183541 (rpc_anon_only).
-- Any literal access codes / team codes / hashes are redacted.
revoke execute on function public.whoami(), public.coach_list_codes(), public.coach_create_code(text,text,text), public.coach_revoke_code(text) from authenticated;
