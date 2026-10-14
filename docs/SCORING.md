# Scoring rules

All rules live in `js/core/grid.js` and `js/core/scoring.js`; report, heat map and stats share them.

## Grid (pitcher's view)
- **Zone** 1–9 (3×3), **5** = middle-middle.
- **Ring** 11–18 just off the plate (competitive misses); 13/18/14 are the low ring.
- **Way off** 21–24 (tap buttons outside the ring).
- `GRID_XY` places zone + ring on a 5×5 lattice; miss distance = Chebyshev distance (squares) to the nearest target.

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
Pitches landing in zone (1–9) or ring (11–18) ÷ all pitches. Way off is not competitive.

## Strike %
Game strike % follows GameChanger (balls vs called/swinging/foul/in play etc.); location does not change it.

## Strikeouts
- **K credit**: if the pitcher is replaced with 2 strikes and the reliever finishes the K, the K goes to the pitcher who threw strike 2 (official rule). Pitch counts stay with whoever threw each pitch.
- **Dropped 3rd strike**: `kd3` (batter reaches) and `kd3out` (thrown out) both count as a K for the pitcher; reached D3 records no out.
