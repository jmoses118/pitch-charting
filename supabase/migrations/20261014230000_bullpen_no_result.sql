-- FLOW-6a: a bullpen pitch has no ball/strike result.
-- Clears every saved bullpen result (result, and the in-play / end fields that went with it).
-- Keep this file. Do not apply it to production from the app. Run it in Supabase when this build goes live.
update public.pitches
set result = null,
    ip = null,
    end_event = null
where mode = 'bullpen'
  and (result is not null or ip is not null or end_event is not null);
