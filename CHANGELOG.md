# Changelog

## v40 – Scoring screen (simpler flow)
### Added
- **One tap starts a scheduled game.** Games that arrived from schedule sync show a Start button. One tap sets the game active, claims this phone as the scorer, and fills an empty lineup with Batter 1–9. The manual start form is still there. Tapping a GameChanger link does not start the game.
- **Big result buttons** on the portrait result sheet: Ball, Called strike, Swinging strike, Foul, Ball in play, HBP.
- **Ball in play drill-down.** Contact (GB / LD / FB / PU) is optional; then the play (out, 1B–HR, error, FC, DP). Cancel logs nothing.
- **Foul timing** (optional): Early, On time, Late, or Foul with no timing. Cancel logs nothing. Same submenu on the landscape coach screen.
- **Undo and Redo.** Undo removes the location tap first, then the last pitch. Redo puts it back (newest 10). Logging a pitch clears Redo. Redo is on the portrait sheet, the bullpen pad, and the coach result column.
- **Called location and actual location** are stored separately. `loc` stays the actual spot so miss scoring, hit spot and the heat map stay on one field. The called box is the aim, or the nearest aim when the call names more than one (on a shake-off, the coach's called box, not her own aim).
- **Actual location past the ring:** In dirt (31) and Over catcher/backstop (32), next to the way-off buttons in portrait and under the zone on the coach screen. They are never a called aim. A change-up called target is still only 4, 7, 8, 9, 13, 14, 18; the actual location may be any box, including those two.
- **Per pitch:** pitch type called and thrown, count before, inning, outs, batter handedness, pitcher, game vs bullpen, result (ball / called strike / swinging strike / foul / in play / HBP), optional wild pitch or passed ball, optional velocity.
- **Bullpen** still starts with no batter (LHB / RHB stay in the Batter sheet). An optional default result (Off / Ball / Strike) can stamp ball or called strike; Off is the default, so a pitch with no result still uses the zone.
- **CSV:** Stats → This pitcher, this date exports one pitcher (first name + number) on one date. New columns are appended: called_location, actual_location, foul_time, wp_pb, velocity.
### Unchanged
- Scoring stays locked to the phone that started the game or bullpen; other phones are view only, with Take over scoring.
- Shake-off stays on the portrait screen and the landscape coach Game screen (called pitch vs thrown pitch + result).
- Strike zone, wristband aim, and Thunder Elite colours are unchanged.
### Notes
- Migration `supabase/migrations/20261014180000_scoring_chart.sql` adds `called_loc`, `actual_loc`, `foul_time`, `wp_pb`, `velo`. **Not applied** to the live project. `chartColumn` is unset in `config.js`, so those columns are not sent until a coach applies the file and turns the flag on. Cache: `te-pitch-v41`.
### Review
- **CSV** appends `called_type` (the called pitch) and `shook` (`1` when she shook it off). Import reads both. An older file without those columns still imports. The download name uses her first name and jersey only, with safe characters (`PC.csvPitcherFile`).
- **Velocity** outside 20–110 shows "Velocity must be between 20 and 110. Not saved." Empty stays empty, with no message.
- **Called box** when the call names more than one target is the target nearest where the pitch went. A tie keeps the earlier target. Before the location is tapped, the first target is shown.
- **Redo** is saved on this phone (still the newest 10) and comes back after a reload. Logging a pitch clears it. It is not synced.
### Design review (UI)
- **Result colours.** Ball, Foul and HBP use `#0B0F17` text (white failed on those fills). Called strike, swinging strike and in play stay white.
- **Foul is one tap.** The pitch is saved on Foul. Early / On time / Late then show for about 5 seconds and update that pitch. There is no skip button. A new pitch, or Undo of that pitch, clears the chips.
- **Tap targets are at least 48px.** Coach In dirt / Over catcher is a row under the zone. Coach contact chips, the result sheet Cancel, velocity, short-phone way-off and dirt/backstop boxes, and the bullpen Undo / Redo / Pause / End and default-result buttons all meet that.
- **Nothing needed sits below the fold.** The result sheet and the in-play sheet use 4 columns. Cancel, Undo and Redo are pinned to the bottom of the sheet.
- **Contact** reads Ground, Liner, Fly, Pop up. The chips are an outline until one is picked. The stored values stay GB / LD / FB / PU.
- **CSV** opens on today and the current pitcher. All pitchers is still there.
- **Wild pitch, passed ball and velocity** sit under More on the result sheet.
- The coach hint fits on one line. Portrait step labels (Pitch / Where / Result) have their own row.
- The sync pill and Start game use white text on the green fill.
- Cache: `te-pitch-v42`.

## v39 – Code Reviewer fixes
### Fixed
- **Sync no longer stalls on one refused row.** A 401/403 is now retried row by row like other 4xx errors, so the good rows and every later table still sync. Sync stops only if the coach code itself is no longer valid.
- **Dates after 8 PM ET** were stamped with tomorrow's date (UTC). New bullpen sessions, new games, rest info and backups now use the phone's local date.
- **Hit spot** in Stats and the report now use one rule (a change-up up in the zone never counts as a hit).
- **Two coach phones** no longer roll back each other's live count, and bullpen session edits from any phone are pulled (last writer wins).
- Pulled pitches keep way-off targets (21–24).
### Added
- **Change-ups are aimed low only:** boxes 4, 7, 8, 9, 13, 14, 18. Other boxes are refused in the bullpen, the call sheet and the coach screen. A high change-up call (e.g. CH H+) gets no spot and goes to band setup.
- **Setup → Sync problems:** see changes the server refused, then retry or discard each one (Cancel changes nothing).
- **Faster sync:** pull downloads only what changed since the last sync, with keyset paging.
- CI runs the browser smoke and XSS tests on every PR.
### Shake-off (Jim)
- New **⤺ Shake-off** button in the Game pitch flow (portrait) and on the landscape coach screen next to Aim/Undo/Same: records the coach's call as shaken off, then the pitch type she actually threw, where it went and the result, linked to the call. Cancel and Undo supported.
- Stats gets a **Shake-offs** card per pitcher (also in the bullpen report when present): count, shook vs followed-call results (strike %, hits, hard contact, K, balls), and each shake-off with called vs thrown, count, previous pitch and outcome.
- Scoring: a shake-off pitch is scored against her own aim; unknown = no aim (SCORING.md).
- Sync works on today's schema (call_raw tag). Optional migration `20261014140000_shake_off.sql` (`pitches.shook`) – **not applied**.
- Bullpen: not included (no wristband call in bullpen).
- History check: "shake" never appeared in any commit or PR (#1–#12), so this is new, not a restore.

### Scoring lock (Jim)
- A live game or bullpen session can be scored only from the phone that started it; other phones see the live count and pitches read only, with a "Scoring on another phone" note.
- **Take over scoring** (with confirm and Cancel) moves scoring to this phone when the scoring phone dies.
- On a view-only phone the ⋯ Game menu and the game/bullpen cards disable everything that changes the game (pause, end, outs, next inning, intentional walk, dropped 3rd strike, undo) and show the "Scoring on another phone" note with Take over scoring; band setup, theme and mirror stay available. Also blocked in code.
- Replaces the "phone that has seen more pitches wins" rule (`cur.pn` removed).
- Migration `20261014120000_scoring_lock.sql` (`sessions.scorer`) – **applied 2026-10-14** to live project `qeqijbrokrkzpcacpjyw`; `scorerColumn:true` is set in `config.js` (`PC_CONFIG`). Games still use `cur.scorer`.

### Design review fixes (UI Designer)
- Sync problems rows say why in plain words: "Why: This phone isn't allowed to save that. Ask your coach to check your team code. · Oct 14, 8:56 AM" (sign-in ran out / not allowed / already saved from another phone / couldn't read). The raw server text is behind a Details toggle.
- Discard looks destructive before it's picked (red text and outline). After Apply, a "1 change discarded · Undo" toast stays for about 6 seconds.
- New sheet subtitle: "These changes didn't reach the cloud. They're safe on this phone. Pick Retry or Discard for each, then tap Apply."
- Coach screen: the change-up warning is short so it never truncates ("Change-up: aim low"; "CH: aim low" on narrow phones), and ⋯ Game keeps its full label. The bullpen toast keeps the full box list.
- Boxes a change-up can't aim at are dashed outlines with grey (#5B6472) numbers instead of faded out.
- Band setup: change-up rows say "Change-ups aim low: 4, 7, 8, 9, 13, 14 or 18." An old high change-up aim is flagged on its row ("Was zone 2 – change-ups can't aim high. Pick a low box.") instead of being dropped silently.
### Design review round 2 (UI Designer)
- Coach shake hint no longer truncates: **"Which pitch?"** (landscape) / **"Threw?"** (667) while picking the type, then the normal step hint ("Tap where it went" / "Where?").
- Portrait view-only banner sits under the INN/COUNT strip (sticky); copy **"👁 View only – another phone is scoring"**. Tapping the zone or band (incl. coach band) toasts that sentence.
- Touch targets ≥48px: portrait Shake-off/Cancel, Take over, sync Keep/Retry/Discard, Details.
- Contrast: coach "View only" `#4A5363`; unselected Discard `#B42323`.
- Portrait zone no longer jumps on call: Shake-off lives in the Band/Result stepline; the shake bar is a fixed 48px slot.
- Take over sheet: **Cancel** is the filled/primary button; Take over scoring is outline.
- Sync row "Pitcher ?" → **"Pitcher (not on this phone)"**. Shake-offs table headers spelled out (Pitches · Strike % · Hits · Hard hit · K · Balls). Dropped the duplicate portrait shake toast.
### Changed (code)
- Heat map summary moved into scoring.js (`PC.heatSummary`), with tests. One miss-direction list and one best/weakest-spot helper. Removed the unused `isMiddleMiss` and a stray comment.

## v38 – Game, heat map and report always agree (Jim's test-mode bug)
### Fixed
- **"Count stuck at 0-0" after 6 pitches.** The count was right (two at-bats had finished), but the zone kept showing the last batter's balls with no label. The zone now says "Last batter: 3 pitches · single · next batter starts 0-0" and fades those balls until the next pitch.
- **Heat map Miss summary was confusing** ("3 pitches … 3 had no intended spot"). It now reads "Showing 3 of 6 pitches (the ones with an aim). Box = where she aimed · color = how far off. 3 with no aim aren't shown – see Landed." Landed counts every pitch: "6 pitches · where they landed".
- **"✓1.0" boxes** looked like a score or a hit. Boxes (heat map and bullpen report) now say "Hit spot", "Close" (1 box off, still on target) or "2 off" / "3 off" / "4 off" in whole boxes, plus "1 pitch" / "3 pitches". Legend: "Number = how many boxes she missed by. 'Close' = 1 box off – still on target."
- **Per-pitch report strike %** used where the ball landed, not the umpire's call, so it could disagree with the Game count and Stats. Game pitches now use the result (one shared `PC.strikeOf`); bullpen pitches, which have no result, still use the zone. Intentional walks are no longer counted as thrown.
- Report labels: "On target 2 of 2 aimed"; the card is titled "Each pitch type" with the note "Strikes count every pitch. On target counts only pitches with an aim."
- Miss labels never say "1 off" (an average of 1.33 shows "2 off", since 1 box off is "Close"); the color-scale caption says "boxes off"; the player (kid) Miss view uses the same "Showing N of M pitches…" summary.
### Notes
- The red frame on every screen in test mode is intentional (TEST MODE – NOT SAVED); it isn't an error.

## v37 – landscape coach screen (redesign)
### Added
- **Landscape coach game screen** (844x390): the whole wristband grid (rows 1–7 × cols 01–08, cells 48px or larger, selected cell royal), the strike zone and a docked results column on one screen. The status box shows the spoken call big ("3-05 Fb In").
- Per-pitch flow: tap the call (aim mapped automatically), tap where it went, tap the result. ✎ Aim edits the aim; a long-press on the zone sets it.
- On-screen **saved** confirmation in the status strip (iPhone can't vibrate); Undo always visible; Same button.
- **One-time band setup** for cells that have no zone (9 on Wristband 1). Opens from the game menu or Setup.
- **Field (light) and Night palettes** in Thunder Elite colours, plus Auto (night 19:00–07:00). Result colours are colour-blind safe (Okabe-Ito). There's also a Mirror option.
- Side-retired card; ⋯ Game menu for rarely used controls (outs ±, next inning, IBB, K-D3, band setup, theme, pause, end).
- A rotate prompt in portrait, with a "Chart in portrait instead" fallback.
### Changed
- Bullpen (portrait): the pitch type stays selected between pitches, a "Last:" line shows after each pitch, and a bottom pad holds the type and way buttons plus Undo, Pause and End.
### Design review fixes (UI Designer, PASS WITH CHANGES)
- "Keep charting" on the side-retired card is now readable (white text, 2px light border, >10:1).
- The status hint is always one line ("Tap where it went"), so the zone no longer jumps after a band tap. The status box has a fixed height, and the band/results stay clear of the iPhone home bar (sizing counts the grid lines and the safe-area insets).
- ⋯ Game is 44px+ tall. The game menu is a 3-column grid in landscape, with Cancel on screen and End game at the top, away from Cancel. The Cancel/Save footer in band setup stays visible (sticky).
- Narrow phones (under 700px wide, e.g. iPhone SE): row headers 20px (still shown), results 46px wide, band cells 44px, a compact status, and ⋯ as a 44×44 icon.
- Bullpen: Way buttons are 48px tall, SC is on the pad (types wrap), and the "✓ FB 3 → 2" confirmation shows above the zone instead of on it.
- Band setup and the in-play spray say "saved on this phone".
- **Heads-up: the whole app changes look.** v37 uses the light Field palette everywhere by default. Switch it in Setup → Display (☀ Field / ☾ Night buttons) or in the game menu.
### Notes
- Band aims and spray locations are stored on the device only. The Supabase schema is unchanged.
- At 667x375 (iPhone SE landscape) band and zone cells are about 40px. 48px everywhere doesn't fit there.

## v36 – header that never truncates the pitcher
### Fixed
- **Pitcher name cut off** ("Avei") on the Game tab with no game, because it shared a row with the workload counts and the sync chip.
  - The sync chip now sits on the logo row.
  - The picker sizes to the name and has priority width; the short counts show only while charting and wrap if they're tight.
  - The full workload sentence shows on its own line only when not charting, so the counts no longer appear twice.
- **Clipped text:** disclosure summaries overflowed by 2px, and the "Location" step label was cut off on an SE. The step is now "Where".

## v35 – batter sheet, cancelable dialogs
### Fixed
- **Bullpen batter control clipped** (RHB missing on some phones): the corner segmented control is replaced by a small **Batter** chip in the zone corner. It opens a sheet with No batter / LHB / RHB (LHB / RHB in a game). Bullpen still defaults to no batter.
- **Add pitcher (+) could not be canceled:** the required "Throws" field blocked Cancel.
  - Every dialog (add/edit pitcher, batter, heat-map filters, drill-down, session report) now closes with Cancel, Escape or a tap on the backdrop, without saving.
  - The heat-map filters sheet gets a Cancel button.
  - The result and wristband sheets also close on Escape.
- The pitcher picker no longer shows "(R)/(L)", so the name isn't clipped in the slim header.
- While charting, toasts show at the top over the header instead of over the zone.

## v34 – one-screen pitch entry
### Changed
- In Bullpen and Game, the whole pitch entry (pitch → aim/location → landed/result) fits on one iPhone screen (390×844, and 375×667 for an SE) with no scrolling:
  - **Slim header:** one line with the pitcher, workload counts ("Today 0 · Wknd 0") and a compact sync chip. The full workload text and sync time are in the tooltips.
  - **Pitch types:** a single row of pill chips (abbreviations; scrolls sideways if there are many), sticky above the zone.
  - **Steps:** a thin inline indicator with **Band** and **Result** buttons; the hint line is hidden on short screens.
  - **Zone:** fills the remaining height. Boxes never go below 48px, and the softball markers and orientation cues are kept. The None/LHB/RHB batter control is a small segmented control in the zone's bottom-left corner, clear of every tap box.
  - **Result picker:** a bottom sheet over the tab bar. It opens when a location is tapped, or with **Result** when no location is charted.
  - **Wristband:** a toggle sheet, one tap away, that never pushes the zone down. Calling a box closes it.
  - **Below the fold:** the recent-pitch list, session/game controls, call sheet and log.
- `PC.workloadShort` (core); `fitZone()` sizes the zone (UI).

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
