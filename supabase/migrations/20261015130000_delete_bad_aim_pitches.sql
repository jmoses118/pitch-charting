-- NOT APPLIED to production.
-- Jim's accidental test pitches: delete a pitch when its called aim fails validCalled.
-- validCalled (js/core/flow.js): a called box is zone 1–9 or ring 11–18.
-- Way off (21–24), dirt (31) and the backstop (32) are actual locations only.
-- A change-up called box is only 4, 7, 8, 9, 13, 14 or 18.
-- A null called aim is kept. The actual box is not judged.
-- Run supabase/preview_delete_bad_aim_pitches.sql first. It uses this same WHERE.
delete from public.pitches p
where (
  (
    p.called_loc is not null
    and (
      not (p.called_loc between 1 and 9 or p.called_loc between 11 and 18)
      or (p.type = 'CH' and p.called_loc not in (4, 7, 8, 9, 13, 14, 18))
    )
  )
  or exists (
    select 1
    from unnest(coalesce(p.targets, '{}'::int[])) as aim(box)
    where aim.box is not null
      and (
        not (aim.box between 1 and 9 or aim.box between 11 and 18)
        or (p.type = 'CH' and aim.box not in (4, 7, 8, 9, 13, 14, 18))
      )
  )
);
