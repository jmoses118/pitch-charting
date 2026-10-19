# Changelog

## v79 – A waste fastball hits the spot only off the plate
### Changed
- **SCORE-5.** Jim's ruling on 19 October 2026. FB A (away waste) still counts as a strike when the umpire calls it a strike. It counts as hitting the spot only on box 16 against a righty or box 17 against a lefty, for a ball or a swinging miss. A called strike, a foul, a ball in play, or a pitch in the zone is a miss.
- Cache: `te-pitch-v71`.

## v78 – The bullpen cleanup is on the live database
### Changed
- **FLOW-6a.** Jim approved it. On 2026-10-19 at 2:59 PM ET, `20261014230000_bullpen_no_result.sql` was applied to production. No rows needed clearing. The chart works the same.

## v77 – Builder docs point at the current rules
### Changed
- The chart works the same. Agent notes name each module and the rule it owns. The product spec and the scoring notes are the current rules, including hit spot, miss severity, competitive %, and strike %. The architecture notes moved word for word. The lesson log stays at the root, and a bug that reaches Jim gets a lesson entry plus a regression test. Builders should not read this changelog unless asked.
- The Game tab lists only today's scheduled games.

## v76 – A file move counts only when the bytes match
### Changed
- **BRIEF-5.** The chart works the same. A word-for-word file move is free only when the two copies are the same bytes, and both paths are counted or both are under test.
- Reordering lines is not word-for-word. That move counts every deleted line and every added line.
- Moving a file into test counts the old file. Moving a file out of test counts the new file.
- A move that changes any byte counts the whole old file plus the whole new file. A new line longer than 500 characters still fails.
- The workflow file is a gate file, so moving it is not free.

## v75 – Old backup tables are removed
### Changed
- Jim approved deleting four leftover backup tables from 15 October 2026: the full copies of pitches, sessions, games, and notes. The live tables stay. The migration drops only those four copies.

## v74 – The coach screen lines up on a large phone
### Changed
- **RULE-8.** On an iPhone 17 Pro Max turned sideways, the wristband fills its column, the results line up with the status card, and In dirt sits on the bottom of the band. The screen keeps its height when the Safari toolbar shows and hides.
- 844×390, no insets: band cells 48px → 49px, results 50px below the status card → lined up with it, In dirt 12px below the band → on the band, ⋯ Game 44px → 48px.
- On a landscape coach screen at least 700px wide and shorter than 400px, strike-zone cells are 46px where that fits, and smaller only when the screen cannot fit 46px. At 400px or taller they are at least 48px. The iPhone SE coach screen stays as it was. Jim approved fit-first on 2026-10-17. On those very short screens, In dirt may sit a few pixels below the band.
- At 844×360 and 932×360, In dirt and the results stay on the screen.
- Cache: `te-pitch-v70`.

## v71 – The Game tab opens a picker
### Changed
- Tapping Game opens a list of games in progress. Start new game asks for the opponent and the pitcher before it creates anything. A draft can be discarded. Ending a game still asks first.
- The Game tab lists only today's scheduled games.
- Ending a game names the opponent. Exit stays beside End game. In landscape, Start new game stays on screen, and today's scheduled games sit above Resume in that list.
- Turning the phone moves today's games between that list and the Scheduled card.
- Cache: `te-pitch-v69`.

## v70 – A game needs a pitcher, and an empty game stays on the list
### Changed
- A pitcher is now required to start a game. Leaving the opponent blank no longer starts a game called Opponent.
- An empty game is a draft. It still shows in the paused card until the picker is added. Ending it still asks first. Discarding a draft is only for the phone that is scoring, and only while it has no pitches.
- Cache: `te-pitch-v68`.

## v69 – Checks and local copies stay off the live database
### Changed
- **INFRA-3.** The public site is the only copy that talks to the live database. On a computer, in CI, and on any other address, the app uses a local or staging database and says that cloud sync is not the live database. If that address is the live project, the app uses the local database instead.
- A migration file already on the main branch stays unchanged when its bytes match. A new migration file is still checked when its date is old. CI builds its throwaway database from the migration files and only on this computer.
- When test mode and the not-live warning would both show, they share one bar. Scoring and the coach screen stay as they are.
- Cache: `te-pitch-v67`. v67 and v68 did not change any app file, so the cache did not skip from v66 to v69.

## v68 – Pull requests note what changed
### Changed
- The chart works the same. A pull request that changes more than 300 lines is stopped. Files under test, and the lockfiles at the root of the repo, are not counted. Each pull request also needs a new changelog note that says what changed.

## v67 – Illegal aims stay in the database
### Changed
- **RULE-4a.** `supabase/migrations/20261015130000_delete_bad_aim_pitches.sql` is a no-op, so `supabase db push` does not delete a pitch whose called aim fails the change-up rule. Those rows stay and stay flagged. `supabase/pending/delete_bad_aim_pitches.sql` is the hand-run template: the owner-approved ids are typed once, copied into `pitches_badaim_backup_YYYYMMDD`, and deleted from that backup inside a transaction that rolls back unless the counts match. The placeholder stays unfilled. `supabase/preview_delete_bad_aim_pitches.sql` is unchanged.

## v66 – 48px targets on a short phone
### Changed
- **RULE-8.** On a 375px phone the pitch buttons, the pitcher row, Batter, Band, and Result are 48px again. The strike boxes are a little shorter so the zone still fits. The wristband shows all 8 columns with no sideways scroll; those cells stay 48px tall and may be a bit narrower. The pitch counts sit on their own line so a long pitcher name stays readable, and the jersey number stays on the end. Foul-timing chips leave after about 3 seconds, or when you tap the band or a result.
- Cache: `te-pitch-v66`.

## v65 – A bad aim stays marked
### Changed
- **RULE-4a.** A change-up aim that sits on the zone but is not a legal change-up box is kept when it comes from a file or another phone, and the chart marks it. A called box that is not on the zone is left blank.
- **RULE-11a.** Two active pitchers cannot wear the same number. `0` and `00` are both allowed, and a blank number is allowed.
- **ARCH-1.** The build fails if a screen copies the strike check, the change-up boxes, or the miss math.
- Cache: `te-pitch-v65`.

## v64 – Shake-off keeps the aim
### Changed
- **RULE-3d.** After a shake-off, the original aim stays filled in. If that box is not legal for the pitch she threw, it stays and the screen says so. She can still tap a new aim.
- **RULE-4.** The chart, the edit sheet, the miss map, the summary, the CSV, and sync all read the same called box and the same landing box.
- Cache: `te-pitch-v64`.

## v63 – Short game screen keeps the zone on screen
### Changed
- **RULE-8.** On a short screen the inning bar takes less height, so the zone stays above the tab bar at 375px. The shake-off button stays 48px. The fit check also covers 430px.
- Cache: `te-pitch-v63`.

## v63a – Short-screen count row
### Changed
- On a phone 720px tall or shorter, the count row collapses so the zone stays above the tab bar. Shake-off stays 48px. Pitch chips on that short screen stay 44px.
- Superseded by v66: those pitch chips are 48px, and the pitch counts sit on their own line.
- Cache: `te-pitch-v63`.

## v62 – One home for each rule
### Changed
- **ARCH-1.** `validSpot` calls `validActual`. The screen helpers that read the pitcher's hand and hit-test the zone are no longer named like rule functions. CI fails if `js/core` mentions `js/ui`, if `js/ui` defines a `valid*`, `calc*`, or `*Of` rule function, or if `jscpd` finds a clone under `js/`.
- Cache: `te-pitch-v62`.

## v61 – Jersey number and tap targets
### Changed
- **RULE-11.** A jersey is empty or 1–2 digits, and `00` is allowed. `jerseyNum` in `js/core/store.js` rejects `100`, `-1`, `abc`, and `4 5` with “Jersey number is 0–99 (00 is OK)” and the dialog stays open. An active pitcher cannot take another active pitcher’s number (`#45 is already Avery`); `0` and `00` stay distinct. The Game screen opens the same editor.
- The batter-hand checkbox returns the page to the top. One bullpen pitch reads “1 pitch”. Pitcher, Band, Result, the batter chip, checkboxes, and wristband cells are at least 44px.
- A CSV import still keeps a grid aim that fails `validCalled`, flags the row, and the toast counts those flagged rows.
- Cache: `te-pitch-v61`.

## v61a – Illegal saved aims can be removed; a shake-off keeps the original box
### Changed
- **RULE-3d.** Picking the pitch she threw after a shake-off fills in the original aim. A tap that is not a legal aim for that pitch is where it went. A legal aim tap still replaces the box. An aim that is illegal for the new type is kept and flagged. Superseded by v64.
- **RULE-4.** The pitch log, CSV row, sync row, miss math, and the edit sheet read called and actual boxes through `calledOf` and `actualOf`. Superseded by v64.
- **RULE-4a.** Import and sync keep and flag an illegal called aim. That part of this note is superseded by v65. The same change added `supabase/migrations/20261015130000_delete_bad_aim_pitches.sql`, which would have deleted every saved pitch with an illegal aim. v67 turns that file into a no-op, so it does not delete those rows. `supabase/preview_delete_bad_aim_pitches.sql` only lists them.
- **RULE-11a.** Active jersey numbers are unique. Empty is allowed, `0` and `00` stay distinct, and an archived pitcher does not block.
- Cache: `te-pitch-v61`.

## v60 – One location validator
### Changed
- **RULE-1, RULE-3a.** `validCalled` is the only aim check. Dirt, way off, and the backstop are actual locations. A change-up aim stays 4, 7, 8, 9, 13, 14, 18. `canAim` and `targetOk` are gone.
- **RULE-3.** `calledTypeOf` is the thrown pitch after a shake-off. The penalty, a bad aim, the low bonus, and the CSV called type all use it.
- **RULE-3c, RULE-3d, FLOW-7a.** A low change, drop, or drop curve in the dirt is severity 2. A shake-off called location is the re-signaled box, or the original box. The bullpen low bonus needs that low call and a landing in 13, 14, or 18.
- **RULE-4.** A sync read and a CSV import keep a grid aim that fails the validator and flag the row. The import toast counts flagged rows. `csvRow` builds every export row. `calledOf` and `actualOf` live in `js/core/location.js`.
- Cache: `te-pitch-v60`.

## v60a – The game log asks scoring whether a pitch was a strike
### Changed
- **FLOW-6.** The pitch list uses `strikeOf` for a pitch that has no umpire result. A bullpen row stays blank. A game row is K or B from that helper.
- Cache: `te-pitch-v60`.

## v59 – Bullpen has no strike
### Changed
- **FLOW-6.** `strikeOf` is null for a bullpen pitch. The session report, the log, and the bullpen CSV leave the strike column blank. Game strikes still follow the umpire.
- **FLOW-6a.** `stripBullpenResults` sets its own done flag, so a second pass does not queue the same pitch again. A sync read drops a bullpen result. CI runs `20261014230000_bullpen_no_result.sql` on Postgres.
- **FLOW-8.** `blankSession` is the new-session shape: pitches start empty and there is no batter.
- Cache: `te-pitch-v59`.

## v58 – Bullpen has no result
### Changed
- **FLOW-6.** A bullpen pitch is type, called location, actual location, then save. There is no ball/strike result and no default stamp.
- **FLOW-6a.** Opening the app deletes a saved `bpResult` and any result stored on a bullpen pitch, and queues those pitches. `supabase/migrations/20261014230000_bullpen_no_result.sql` clears the same rows in Supabase. That file is not applied to production from here.
- **FLOW-7.** A bullpen pitch is a success when it hits its spot, including a bottom-row aim that lands in that box. Stats stay on hit-spot %. A change, drop, or drop curve that lands in 13, 14, or 18 is still a good pitch.
- **FLOW-8.** A new bullpen session has no batter. LHB and RHB show only when “Show LHB / RHB” is on.
- Cache: `te-pitch-v58`.

## v58a – The saved pitch comes from the scoring draft
### Changed
- **FLOW-1.** A saved pitch's type, aim, landing, and called box are written only by `scoreCommit`. The shake-off lives on that same draft, so Cancel restores the call from it. The screen no longer keeps a second copy of the aim or the landing.
- Cache: `te-pitch-v58`.

## v57 – One draft, one actual-location toggle
### Changed
- **FLOW-1.** A second tap of the actual location clears it inside `scoreTap`. The coach screen no longer keeps its own toggle. The entry screen keeps one flow draft.
- Cache: `te-pitch-v57`.

## v54 – Shared scoring machine is the only step list
### Changed
- **FLOW-1.** Portrait Game, the landscape coach Game screen, and Bullpen already call `js/core/flow.js`. The old `bullpenStep`, `bullpenTap`, and `gameZoneAction` wrappers are gone, so no screen keeps a second step list.
- **FLOW-2, FLOW-4, FLOW-5.** A game pitch still walks type, called location, actual location, then result. The result sheet stays closed until the actual tap, and a pitch cannot be saved without that spot.
- **FLOW-3.** The wristband aim (or a saved band aim) is still the called box, and a hand tap replaces it.
- Cache: `te-pitch-v54`.

## v48 – One scoring flow
### Changed
- **One state machine** (`js/core/flow.js`) for portrait Game, the landscape coach screen, and Bullpen. Game steps are pitch type, called location, actual location, then the result. Bullpen stops after the actual location and saves. There is no ball/strike step in the pen.
- **Called location** is filled in from the wristband (or a saved band aim) and can be overridden. Dirt, way off, and over the catcher are legal called spots, so a change or curve aimed in the dirt that finishes in the dirt is a hit. A change-up still cannot be called up in the zone.
- **The result sheet stays closed** until the actual location is tapped, and it does not cover the zone while that tap is still needed. The header shows aim → actual (for example `Result · CH 8 → @12`). A game pitch cannot be saved without that actual spot.
- **Bullpen success is hit-spot %**, on the live session line, in bullpen Stats, and on the session report. Game Stats still show strike %.
- Cache: `te-pitch-v48`.

## v47 – Coach ring and change-up aim
### Fixed
- **Landscape coach zone.** Every ring box is labeled and tappable, including the cell above box 3 (zone 12). Aim and the landing mark show on that cell. A high pitch can be recorded there.
- **Change-up with no called spot** (CHG, or a high change-up). The first zone tap is the aim, the same as portrait. The next tap is where it went, including a high box, in the dirt, or over the catcher. Stats counts that aim.
- **A result with no pitch type is not saved.** That pitch was showing up on Stats as "?".
- Cache: `te-pitch-v47`.

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
- Migration `supabase/migrations/20261014180000_scoring_chart.sql` adds `called_loc`, `actual_loc`, `foul_time`, `wp_pb`, `velo`. See **Go live** below. Cache: `te-pitch-v41`.
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
### Edit pitch
- **Tap a pitch in the list** (the game or bullpen log, the recent list, or Stats → Pitches after the game) to correct its **actual** location. The sheet is the full grid: zone, the ring, way off, In dirt, and Over catcher. Save writes that pitch. Cancel, Escape, and the backdrop write nothing.
- Later pitches stay. The count and the result stay. Miss scoring follows the corrected spot (`loc` and `actualLoc`). When that call named more than one target, the called box becomes the target nearest the new spot (`PC.nearestTarget`), so CSV `called_location` matches. One target, or none, leaves the called box as it was. A distance tie keeps the earlier target.
- The pitch is marked **edited**. The list shows “from video”. CSV writes `from_video` (`1` or empty) and still imports an older `edited` column.
- Only the scoring phone can save, including after the game. A view-only phone cannot.
- The correction syncs with the pitch (`loc`, plus an invisible mark on `call_raw` so the flag comes back). No new database column.
- Stats → Pitches lists the pitches only when one game or one session is selected, so Everything still shows the heat map.
- On a short phone the log sits above the location row, so each pitch stays tappable.
- **Undo after a correction** puts that pitch back. It does not delete the latest pitch. The "Location updated" toast has Undo for about 5 seconds. Logging a new pitch makes Undo remove that pitch again.
- The sheet is titled **Fix location (from video)**. The log says "Tap a pitch to fix where it went" and marks each row with ✎. Stats rows show aim → actual. CSV calls the flag `from_video` and still reads an older `edited` column.
- On a short phone the fix-location sheet keeps Way off and In dirt above Save. Coach foul-timing chips sit under the wristband, clear of the count. Portrait pitch-type chips are 48px, the entry line wraps, and Archived is a full-height row. Cache: `te-pitch-v46`.
### Go live
- `chartColumn: true` and `shakeColumn: true` are set in `config.js`. `scorerColumn` was already on. Apply these two files to production before merge, in this order:
  1. `supabase/migrations/20261014140000_shake_off.sql` (`pitches.shook`)
  2. `supabase/migrations/20261014180000_scoring_chart.sql` (`called_loc`, `actual_loc`, `foul_time`, `wp_pb`, `velo`)
- `20261014120000_scoring_lock.sql` is already applied. Cache: `te-pitch-v46`.

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
- Sync works on today's schema (call_raw tag). Migration `20261014140000_shake_off.sql` (`pitches.shook`) is listed under **Go live**; `shakeColumn:true` is set.
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
