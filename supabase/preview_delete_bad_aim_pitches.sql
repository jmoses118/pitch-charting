-- READ ONLY. Show Jim the pitches the delete migration would remove.
-- NOT a migration and NOT applied. Same WHERE as
-- supabase/migrations/20261015130000_delete_bad_aim_pitches.sql.
select
  p.id,
  coalesce(g.date, s.date) as date,
  split_part(coalesce(pit.name, ''), ' ', 1) as pitcher,
  p.type,
  case
    when p.called_loc is not null then p.called_loc::text
    else nullif(array_to_string(p.targets, '/'), '')
  end as called_box,
  coalesce(p.actual_loc, p.loc) as actual_box
from public.pitches p
left join public.pitchers pit on pit.team_id = p.team_id and pit.id = p.pitcher_id
left join public.games g on g.team_id = p.team_id and g.id = p.game_id
left join public.sessions s on s.team_id = p.team_id and s.id = p.session_id
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
)
order by p.id;
