# Scoring rules

All rules live in `js/core/grid.js` and `js/core/scoring.js`; report, heat map and stats share them. SPEC.md lists SCORE-1 through SCORE-4. The wording of those four rules is in this file. The rest of this file is current too.

## Grid (pitcher's view)
- **Zone** 1–9 (3×3), **5** = middle-middle.
- **Ring** 11–18 just off the plate (competitive misses); 13/18/14 are the low ring. This is the one ring of ball boxes outside the zone.
- **Way off** 21–24 (tap buttons outside the ring). Not competitive.
- **Actual only** 31 in dirt and 32 over catcher/backstop. Logged as where the pitch went. `PC.validCalled` rejects them, and way off (21–24), as called targets. `PC.missD` counts every one of those landings as 3 off, even when that box was the call. A CH, drop, or drop curve called in 7, 8, 9, 13, 14, or 18 that lands in 31 is severity 2 (`pitchMiss.lowDirt`). Not competitive. Counted as landed on the heat map, but not drawn on the zone grid.
- `GRID_XY` places zone + ring on a 5×5 lattice; 31 sits one row below way-low and 32 one row above way-high. Raw miss distance is Chebyshev (squares) to the nearest target. Off-grid landings use `missD` instead, and that distance is 3.

## Called location vs actual location (v40)
- `calledLoc` is the box that was called. One target stays that box. Several targets (a multi-target call, or a shake-off whose call named more than one box) use the target nearest the actual location (`PC.nearestTarget`, same Chebyshev distance as miss scoring). Before the actual location is known, the first target is shown. A distance tie keeps the earlier target. On a shake-off the set is the coach's called boxes, not her own aim.
- `actualLoc` and `loc` are where it went. `loc` stays the field miss scoring, hit spot and heat maps already use, so those rules did not grow a second path.
- A change-up **called** target is still only 4, 7, 8, 9, 13, 14, 18. The **actual** location may be any box, including a high box, in dirt, or over the catcher.
- **Correcting a past pitch** (`PC.editActual`) changes `loc` and `actualLoc`. When `targets` has more than one box, `calledLoc` becomes the target nearest the new spot (same tie rule as above), so CSV `called_location` matches. One target, or none, leaves `calledLoc` as it was. The result and the count stay, and later pitches stay in the list. Miss scoring, hit spot, and the heat map follow the new `loc`. The pitch is marked `edited` (shown as “from video”, exported as `from_video`). Undo right after that correction restores the previous spot. Only the phone that owns scoring can save it, including after the game.

## Call codes
Wristband calls map to pitch type + target cell(s) (`calls.js`); a call can have several targets, the nearest one counts.

## Change-up targets (Jim's rule, v39)
A change-up is **never aimed in the upper zone**. The only valid change-up targets are **4, 7, 8, 9, 13, 14 and 18** (`PC.CH_TARGETS`).
- Every target picker uses `PC.aimOpts(type)`, which asks `PC.validCalled`: the bullpen target tap, the portrait call target, the coach zone when the call has no spot (`PC.scoreTap`), ✎ Aim / long-press, and band setup. Other boxes are refused ("Change-ups are aimed low: 4, 7, 8, 9 or 13, 14, 18", or the actual-only sentence for dirt and the backstop). A call that already names a spot keeps the next zone tap as where the pitch went. The cell directly above box 3 on the coach grid is zone 12, labeled and tappable.
- A change-up call that names a high spot (e.g. **CH H+**, CH H, CH 2) keeps the CH type but gets **no spot** and is flagged `chHigh`. It then shows up in band setup, where only the valid boxes can be picked.
- Older data with a high change-up target is flagged by `pitchMiss(...).badAim`; it is still scored normally.
- The pitch-type miss rule below scores a high landing. The aim block above is unchanged.

## SCORE-1 Hit spot
`PC.hitSpot(p)` is a hit when the pitch is not a type miss, and either it lands on the called box or the low-target rule applies. Stats Spot %, the report's Bullseyes, the intended heat map, and CSV `hit_spot` use that same hit. A change-up aimed at box 4 that lands on box 4 is a hit. Box 5 is never a hit, even when 5 was the call. FB A (away waste) follows SCORE-5, and that same hit decides its marker and its on-target count.

## SCORE-2 Miss severity (per called pitch)
- `sev` starts from `missD` to the nearest target (raw Chebyshev inside the frame, 3 off the grid). 0 is the called box. The miss heat map copies that same nearest-target distance onto each landing. A pitch aimed at two boxes stores the same distance on both.
- **Box 5**: a missed spot for every pitch type, even when 5 was the call. Severity is at least `CH_MIN_SEV` (2). Landing in 5 when 5 was not a target stays the souvenir at `MAX_MISS` (4).
- **Pitch-type miss** (`TYPE_MISS` in grid.js): a change-up or curve in the top row (1, 2, 3, 11, 12, 15) is at least 2. Boxes 4, 6, 16 and 17 stay a normal miss for those two. A drop or drop curve in the middle row (4, 5, 6) is at least 2, the top row is `MAX_MISS` (4), and 16 or 17 is a competitive miss at 2 (not a hit, and not on target). `chUp` is those miss rows except 16 and 17, so a side miss is not marked up.
- The session report and the per-type line still say “up in the zone” only for a change-up. A curve, drop, or drop curve that misses high does not get that sentence.
- **Off grid**: way off, dirt and the backstop are 3 off, even when that box was the call. A CH, drop, or drop curve called low that lands in the dirt stays severity 2.
- **Low-target rule (FLOW-7a)**: any pitch except a rise ball, called in 7, 8, 9, 13, 14 or 18 and landing in 13, 14 or 18, is a hit in a game and in the bullpen. Severity is capped at 1. A rise ball is never good low.
- **Good** = `sev ≤ GOOD_MAX_SEV` (1).

## Heat map summary
`PC.heatSummary(d, miss)` (scoring.js) accounts for every pitch: Miss = "Showing N of M pitches (the ones with an aim)…", plus souvenirs and how many with no aim aren't shown. Landed = all pitches with a location, plus how many with no location are left out.

## SCORE-3 Competitive %
Pitches landing in zone (1–9) or ring (11–18) ÷ all pitches. Way off, in dirt and over the catcher are not competitive.

## Foul timing, wild pitch, velocity (v40)
Optional. A foul is saved on the Foul tap with `foulTime` unset. Early / On time / Late can set `foulTime` to `early`, `ontime` or `late` on that pitch afterwards. `wpPb` is `wp` or `pb`. `velo` is 20–110, one decimal. A number outside that range is dropped and a short message says it was not saved (empty stays empty, with no message). A bullpen pitch can also carry `result` `ball` or `called` when the phone's default result is set; otherwise bullpen strike % still uses the zone.

## SCORE-4 Strike %
Game strike % follows GameChanger (balls vs called/swinging/foul/in play etc.); location does not change it.

## SCORE-5 FB A waste pitch
Jim's ruling, 2026-10-19. FB A is a true waste pitch, aimed off the plate: box 16 against a righty, box 17 against a lefty. It is often thrown 0-2 looking for a swing and miss.

Strike % does not change. If the umpire calls an FB A a strike, it counts as a strike, the same way GameChanger does. SCORE-4 is unchanged.

Hit spot is stricter. An FB A that lands in the zone, is called a strike, is put in play, or is fouled is a missed spot. It is never a hit spot, even when it lands on the called box or a location bonus would mark the severity as good.

A hit is a ball, a swing-and-miss, or a dropped third strike (`kd3` or `kd3out`) that stays out of the zone and lands on the away box: 16 against a righty, 17 against a lefty. The other side of the plate is a miss. Jim's ruling, 2026-10-20.

A game pitch with no hand defaults to a righty, so the away box is 16.

A bullpen FB A with no result that lands on the away box counts as hitting the spot, since the goal is to be off the plate. Derived from Jim's 10/19 ruling; Jim may override.

On a shake-off, SCORE-5 is skipped and the pitch is scored on what she actually threw, under the existing shake rule. Derived from Jim's 10/19 ruling; Jim may override.

## Strikeouts
- **K credit**: if the pitcher is replaced with 2 strikes and the reliever finishes the K, the K goes to the pitcher who threw strike 2 (official rule). Pitch counts stay with whoever threw each pitch.
- **Dropped 3rd strike**: `kd3` (batter reaches) and `kd3out` (thrown out) both count as a K for the pitcher; reached D3 records no out.

## Shake-offs (v39)
- A **shake-off** pitch is one where the pitcher shook off the coach's call and threw her own choice. It is stored as `shook: true`; `call` / `callRaw` keep the coach's call (type + aim from the wristband) and `type`, `loc`, `result` are what she actually threw.
- **Hit spot:** a shake-off pitch is scored against **her own chosen location** (`targets`, set with ✎ Aim if the coach knows it) versus where it actually landed. The coach's called aim is **never** used. If her aim is unknown, `targets` is empty: the pitch has **no aim** and is left out of hit-spot %, the intended heat map and miss severity (it still counts for strikes, balls, K and contact).
- **Shake-offs section** (`PC.shakeoffs`): per pitcher – count; shake-off pitches vs pitches that followed the call (called, not shaken off): strike %, hits allowed (1B/2B/3B/HR), **hard contact** (line drive or extra-base hit), K, balls; and each shake-off with called vs thrown, the count, the previous pitch in that at-bat and its result, and the outcome.
- Call → thrown in Stats marks these as `CH8 ⤺ shook → FB5`.
