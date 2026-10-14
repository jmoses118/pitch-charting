# Scoring rules

All rules live in `js/core/grid.js` and `js/core/scoring.js`; report, heat map and stats share them.

## Grid (pitcher's view)
- **Zone** 1–9 (3×3), **5** = middle-middle.
- **Ring** 11–18 just off the plate (competitive misses); 13/18/14 are the low ring. This is the one ring of ball boxes outside the zone.
- **Way off** 21–24 (tap buttons outside the ring). Not competitive.
- **Actual only** 31 in dirt and 32 over catcher/backstop. Logged as where the pitch went. Never a called aim (`PC.canAim` is false; a target tap returns `not_aim`). Scored like way off (`WAY_SEV`). Not competitive. Counted as landed on the heat map, but not drawn on the zone grid.
- `GRID_XY` places zone + ring on a 5×5 lattice; 31 sits one row below way-low and 32 one row above way-high. Miss distance = Chebyshev distance (squares) to the nearest target.

## Called location vs actual location (v40)
- `calledLoc` is the box that was called (coach aim, else the typed target, else the first parsed target). On a shake-off it is the coach's called box, not her own aim.
- `actualLoc` and `loc` are where it went. `loc` stays the field miss scoring, hit spot and heat maps already use, so those rules did not grow a second path.
- A change-up **called** target is still only 4, 7, 8, 9, 13, 14, 18. The **actual** location may be any box, including a high box, in dirt, or over the catcher.

## Call codes
Wristband calls map to pitch type + target cell(s) (`calls.js`); a call can have several targets, the nearest one counts.

## Change-up targets (Jim's rule, v39)
A change-up is **never aimed in the upper zone**. The only valid change-up targets are **4, 7, 8, 9, 13, 14 and 18** (`PC.CH_TARGETS`).
- Every target picker uses `PC.aimOpts(type)` / `PC.targetOk(type, z)`: the bullpen target tap, the portrait call target, the coach ✎ Aim / long-press and band setup. Other boxes are refused ("Change-ups are aimed low: 4, 7, 8, 9 or 13, 14, 18").
- A change-up call that names a high spot (e.g. **CH H+**, CH H, CH 2) keeps the CH type but gets **no spot** and is flagged `chHigh`. It then shows up in band setup, where only the valid boxes can be picked.
- Older data with a high change-up target is flagged by `pitchMiss(...).badAim`; it is still scored normally.
- The **CH-up miss rule** below is unchanged.

## Hit spot
`PC.hitSpot(p)` = `pitchMiss(p).d === 0` and not a CH-up. One rule for Stats Spot %, the report's Bullseyes and the Game marks.

## Miss severity (per called pitch)
- `sev` = distance in squares from the nearest target, 0 = hit spot.
- **Souvenir**: landing in 5 when 5 was not a target → `MAX_MISS` (4).
- **CH up**: a changeup that misses up is at least `CH_MIN_SEV` (2).
- **Way off**: always `WAY_SEV` (3), whatever the target (a miss, not a souvenir).
- **CH-low rule (bullpen only)**: CH/DR/DC landing in the low ring (13/18/14) counts as good (sev ≤ 1).
- **Good** = `sev ≤ GOOD_MAX_SEV` (1).

## Heat map summary
`PC.heatSummary(d, miss)` (scoring.js) accounts for every pitch: Miss = "Showing N of M pitches (the ones with an aim)…", plus souvenirs and how many with no aim aren't shown. Landed = all pitches with a location, plus how many with no location are left out.

## Competitive %
Pitches landing in zone (1–9) or ring (11–18) ÷ all pitches. Way off, in dirt and over the catcher are not competitive.

## Foul timing, wild pitch, velocity (v40)
Optional. `foulTime` is `early`, `ontime` or `late` (or unset). `wpPb` is `wp` or `pb`. `velo` is 20–110, one decimal. A bullpen pitch can also carry `result` `ball` or `called` when the phone's default result is set; otherwise bullpen strike % still uses the zone.

## Strike %
Game strike % follows GameChanger (balls vs called/swinging/foul/in play etc.); location does not change it.

## Strikeouts
- **K credit**: if the pitcher is replaced with 2 strikes and the reliever finishes the K, the K goes to the pitcher who threw strike 2 (official rule). Pitch counts stay with whoever threw each pitch.
- **Dropped 3rd strike**: `kd3` (batter reaches) and `kd3out` (thrown out) both count as a K for the pitcher; reached D3 records no out.

## Shake-offs (v39)
- A **shake-off** pitch is one where the pitcher shook off the coach's call and threw her own choice. It is stored as `shook: true`; `call` / `callRaw` keep the coach's call (type + aim from the wristband) and `type`, `loc`, `result` are what she actually threw.
- **Hit spot:** a shake-off pitch is scored against **her own chosen location** (`targets`, set with ✎ Aim if the coach knows it) versus where it actually landed. The coach's called aim is **never** used. If her aim is unknown, `targets` is empty: the pitch has **no aim** and is left out of hit-spot %, the intended heat map and miss severity (it still counts for strikes, balls, K and contact).
- **Shake-offs section** (`PC.shakeoffs`): per pitcher – count; shake-off pitches vs pitches that followed the call (called, not shaken off): strike %, hits allowed (1B/2B/3B/HR), **hard contact** (line drive or extra-base hit), K, balls; and each shake-off with called vs thrown, the count, the previous pitch in that at-bat and its result, and the outcome.
- Call → thrown in Stats marks these as `CH8 ⤺ shook → FB5`.
