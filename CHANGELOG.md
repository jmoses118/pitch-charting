# Changelog

## v33 – Gameday-style zone graphics
### Added
- Pitches are drawn as numbered softballs (yellow, red stitching). The ring shows the result: green on target/competitive, red miss, amber with a star for a souvenir. Used on the Game zone, the Bullpen zone and the heat-map drill-down.
- Orientation cues: home plate in perspective, a one-box-off ring frame, a batter silhouette on the correct side (RHB/LHB), and glove/arm-side labels with no batter.
- A recent-pitch list under the zone (current at-bat or session): number badge, result, pitch type, aim → landed.
- `PC.pitchMark`, `PC.recentPitches` (core), and `js/ui/zonegfx.js` (UI). Tap behavior is unchanged.

## v32 – privacy for minors
### Changed
- Pitchers are shown as **first name + jersey number** (e.g. "Avery #45") everywhere in the UI: pitcher picker, banners, toasts, reports, stats, Setup and access-code labels.
- The pitcher form asks for a first name only. Default pitchers are first names, and the default roster is empty (no surnames in the public repo).
- One-time migration trims stored surnames on the default pitchers to first names and queues them for sync, so the cloud copy is scrubbed by the next coach sync. Data IDs are unchanged, so history and access codes stay attached.
- Test fixtures, seeds and docs use first names only. No birthdays or other personal details are stored.

## v31 – UI v2
### Changed
- Design pass for the iPhone PWA:
  - **Tokens:** design tokens (color, 4-pt spacing, radius, type scale, touch sizes) in CSS variables.
  - **Components:** consistent buttons (primary / success / danger / ghost), cards, bottom sheets, and a scoreboard header.
  - **Navigation and steps:** SVG tab icons instead of emoji, and a Pitch → Aim/Location → Landed/Result step indicator.
  - **Less on screen:** game options, wristband, stats tables and Setup sections collapse (progressive disclosure).
  - **Touch, toasts, contrast:** 48px+ touch targets, toasts moved into the thumb zone, and dark-mode contrast raised to WCAG AA. See docs/DESIGN.md.
- `app.js` split into view modules under `js/ui/` (shared, game, bullpen, report, stats, setup, main). Behavior unchanged.

## v30 – game and bullpen are exclusive
### Fixed
- A bullpen session and a game could be scored at the same time on one phone. Now, while a game is in progress (started, not ended), the Bullpen tab shows "Game in progress — end or pause the game to start a bullpen" with Pause game / End game / Back to the game. While a bullpen session with pitches is open, the Game tab shows the reverse with Pause bullpen / End bullpen.
### Added
- Pause for games (resume from "Games in progress" on the Game tab) and bullpens ("Resume paused bullpen"). Nothing is deleted; it works offline. Roles without game mode (player, pitching coach, viewer) are never locked.
- `js/core/modes.js` (`modeLock`, `pausedGames`, `pausedSessions`).

## v29 – pitch-count reminder
### Added
- Pitch-count reminder on pitcher select and in the game header: "Today: X game + Y bullpen · Weekend: X game + Y bullpen" (tournament weekend = Fri–Sun; Mon–Thu shows the last weekend). Bullpen/warm-up pitches are their own line.
- Optional coach-set soft limits per day and per weekend (game + bullpen): amber from 85%, red + buzz + toast when reached.
- Alert/limit settings sync to Supabase as coach-only `team_settings`, shared by every coach phone (migration `20261013233507_team_settings`).
### Changed
- Rest-day reminder and table are hidden by default (Setup → "Show rest-day guide").
- New core module `js/core/workload.js` (alerts / rest helpers moved here from `store.js`).

## v28 – refactor
### Changed (refactor, no behavior change)
- Split `logic.js` into core modules under `js/core/` (grid, calls, game, scoring, csv, sync, store); `logic.js` is now the node entry point.
- Single severity source: `missData` uses `pitchMiss`; shared `GOOD_MAX_SEV`/`isGoodSev` used by stats drill-down.
- Removed dead waste-in-zone code and leftovers.
- Added README, docs (architecture, scoring, testing), Supabase migrations, CI workflow. SW cache v28.

## v27
Pitching-coach role + notes, one-hand game mode, GB/LD/FB/PU, count charts, pitch-count alerts + rest days, season trends.

## v26
Competitive ring + way-off taps, CH/drop low-ring rule, competitive %.

## Earlier
Wristband call sheets, mid-game pitching changes, official K credit rule, roles and access codes, Supabase sync.
