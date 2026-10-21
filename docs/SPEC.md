# Pitch Charting v1 Product Spec

Thunder Elite softball pitch charting. Static site on GitHub Pages with Supabase sync, built for iPhone Safari. Each rule below has an ID so tests and reviews can cite it. "Must" means required for v1.

## FLOW: one state machine
- **FLOW-1** Every scoring screen uses one shared pitch-entry state machine: portrait Game, landscape coach Game, Bullpen, and any later view. No screen has its own step logic. This replaces both `bullpenStep`/`bullpenTap` in `js/core/game.js` and the game steps in the UI scripts. A `js/core/flow.js` may already exist on the `fix/redesign-bugs` branch; build on it.
- **FLOW-1a** `scoreCommit` is the only writer of `loc` / `actualLoc` while charting; `editActual` (`js/core/game.js:44`) is the only edit path; sync and CSV import also write them.
- **FLOW-2 (Game order)** A game pitch goes through these steps in order: 1) call the pitch type; 2) called location; 3) actual location (zone, off-grid ring, dirt, or backstop); 4) result (ball, strike, foul, in play, and so on).
- **FLOW-3** The called location is placed automatically from the wristband aim. The user can override it by hand.
- **FLOW-4** The result menu opens only after the actual-location tap. It never covers the zone before that tap.
- **FLOW-5** A game pitch cannot be saved without an actual location.
- **FLOW-6 (Bullpen order)** A bullpen pitch goes: call the pitch type, then called location (automatic plus override, per FLOW-3), then actual location, then save. Bullpen has no ball/strike result (no `bpResult` default or stamp).
- **FLOW-6a** As part of the build, a migration deletes every saved bullpen result (`bpResult` and similar), both locally and in Supabase.
- **FLOW-7** A bullpen pitch is a success when it hits its spot: the actual location matches the called one. For example, a curve or change aimed at the bottom row that lands in that box is a success. Bullpen stats show hit-spot %, not strike %. The low-pitch bonus stays alongside it. FLOW-7a says when that bonus applies.
- **FLOW-7a** The bullpen low-pitch bonus applies only when the pitch was called in 7, 8, 9, 13, 14 or 18 and lands in 13, 14 or 18.
- **FLOW-8** Bullpen starts with no batter. LHB/RHB is available through an optional setting.
- **FLOW-9 (optional, any mode)** A pitch's location can be edited later, for example after checking video. Only the scoring phone can make that edit.
- **FLOW-10 (optional)** Shake-off: the user records the shake-off and picks the new pitch. It must be available on both the portrait and landscape Game screens.
- **FLOW-11 (optional)** Velocity can be typed in.
- **FLOW-12 (optional, Game only)** After the result, the user can add: ball-in-play detail, foul timing (early, on time, or late), contact type, and a WP/PB flag. None of these blocks saving.
- **FLOW-13** Tapping Game opens a picker, not a game. The picker lists each in-progress game with Resume, plus a separate Start new game. No game is created until the opponent and pitcher are confirmed. `createGame` returns null until both are set. A blank opponent toasts "Enter the opponent". A blank pitcher toasts "Pick a pitcher".
- **FLOW-13a** The paused card is gone. The picker is the list.
- **FLOW-14** Exiting a game saves it and never deletes it. Exit is pause. A game ends only through End game plus a confirmation. The ended game stays in Stats.
- **FLOW-15** A game with no pitches is a draft. The picker can resume or discard it. Discard asks first, sets `deleted`, and only the scoring phone can do it, and only while the game is still empty. A draft is still in progress: it locks the bullpen, and another phone sees it view-only.

## RULES
- **RULE-1** A changeup's called target must be box 4, 7, 8, 9, 13, 14 or 18.
- **RULE-2** RULE-1 limits only the called target. A changeup's actual location can be anywhere.
- **RULE-3** Changeup penalties are based on the called pitch type. After a shake-off, the called type is the final pitch called, which is the one she threw.
- **RULE-3a** Dirt (box 31), the way-off boxes (21–24) and the backstop are actual locations only, never called targets. No pitch is called to hit the ground. The bottom row (13, 14, 18), just above the dirt, is the lowest allowed aim.
- **RULE-3b** The ring boxes just outside the zone (11–18) remain valid called targets.
- **RULE-3c** A CH, drop or drop curve called low (7, 8, 9, 13, 14, 18) that lands in the dirt (31) counts as a reduced-severity miss, not a full way-off miss.
- **RULE-3d** After a shake-off, the called location is the location re-signaled with the final pitch. If none was re-signaled, the original box stands.
- **RULE-4** One shared location component and one location validator are used everywhere: scoring, editing, sync, and CSV import.
- **RULE-4a** On CSV import and on a sync read, a called aim that is on the grid but fails `validCalled` is kept and flagged (`calledFlag`). It is not dropped. A called box that is not on the grid is stored as null. Pitches already saved with an illegal called aim stay. `supabase/migrations/20261015130000_delete_bad_aim_pitches.sql` is a no-op, so `supabase db push` does not delete them. A delete of owner-approved ids lives only in `supabase/pending/delete_bad_aim_pitches.sql`, which `supabase db push` does not apply. That script types the ids once, copies them into a backup, and deletes from the backup inside a transaction that rolls back unless the counts match. `supabase/preview_delete_bad_aim_pitches.sql` is the read-only list of the same rows.
- **RULE-4b** The edit sheet reads `actualOf` (`actualLoc`, then `loc`).
- **RULE-5** Only one phone can score a game or bullpen session. Every other phone sees it live and read-only.
- **RULE-5a** `box.scorer` is that phone's `sync.deviceId`. A box with no owner stays open until a recorded pitch sets it. Take over calls `claimScoring` (`js/core/modes.js`). `scorerOfRow` is in `js/core/sync.js`. Games store the owner on `games.cur.scorer`.
- **RULE-6** Undo and Redo cover both the pitch and its location.
- **RULE-6a** Redo keeps at most 10 items on this phone (`state.redo`). It is not synced. A new pitch clears it.
- **RULE-7** Every popup has a working Cancel that leaves the data unchanged.
- **RULE-7a** Escape and a backdrop tap cancel the same way. Save runs only when the dialog returns ok.
- **RULE-8** The scoring screen fits on one iPhone screen without scrolling at widths of 375, 390 and 430 px. It uses compact pitch buttons, slim pitcher and count bars, and a large zone. Portrait wristband height stays 48. At <=390px wide, cells may be 42–44px wide so all 8 columns, plus the row and column headers, fit with no sideways scroll. On the SE coach screen (667×375) the strike box may be 34px; that is the SE exception.
  Under 400px tall, zone cells are 46px where it fits; smaller only when the screen cannot fit 46px (approved by Jim 2026-10-17, fit-first).
  At 400px or taller the floor is 48px. The SE coach screen (667×375, under 700px wide) keeps its existing strike box and is not part of this floor.
  At those extreme heights, In dirt may sit a few px below the band.
- **RULE-8a** On the landscape coach screen, 844×390 keeps band, zone, and results at least 48px. At 667×375 the minima are band 44, zone 34, and results 46 (`test/coach.ui.js`).
- **RULE-9** CSV export is per pitcher per date. One shared CSV row builder produces every row.
- **RULE-10** Players are shown by first name and jersey number (`pitcherLabel`), and CSV file names use the same. No surnames.
- **RULE-11** Jim can edit a pitcher's jersey number. Cancel leaves it unchanged.
- **RULE-11a** An active pitcher cannot share a jersey number with another active pitcher. `0` and `00` are both allowed and are not the same number. Empty is allowed. The check is `jerseyError` in `js/core/store.js`.
- **RULE-12** The current branding stays.
- **RULE-13** Ball-in-play contact is optional. The five choices are Ground (GB), Liner (LD), Fly (FB), Pop up (PU), and Bunt (BU).
  `BB_TYPES` and `BB_NAME` in `js/core/game.js` are the only list. Portrait Game (`#ipBtns`) and the coach screen render those chips.
  A pitch can be saved with none selected. A saved pitch keeps its code.
  A code that is not on that list stays stored. The screen shows it as no contact.
  Stats and reports that name a contact type use that list, so a bunt reads Bunt.
  `pitches.bb` allows null or those five codes. Take a database backup before the migration that allows BU.
  CSV import keeps a contact only when the text is one of those five codes.
  A future GB/FB ratio has to decide how a bunt (BU) counts.
  The game screen shows the full name on each chip. The coach screen follows RULE-13a.
- **RULE-13a** Jim ruled on 20 October 2026. On the coach screen, contact is its own step.
  After the in-play outcome (out, 1B, and so on), the result column shows the five chips.
  Each chip is at least 48×48. The chip row under the zone is gone.
  A chip shows the code, and the full name is its aria-label, when the full name does not fit.
  Skip records that pitch with no contact. Escape records that pitch with no contact too.
  Back returns to the outcome choices and saves nothing.
  Undo, while a pitch is waiting for contact, cancels that step and leaves no pitch saved.
  The band and the result column stay put from idle, to in play, to this step.
  The result column's top and bottom stay put too.

## SCORING
SCORE-1, SCORE-2, SCORE-3, SCORE-4, and SCORE-5 are in `docs/SCORING.md`.

## VIEW
- **VIEW-1** The zone is shown Gameday-style, from the catcher's eye. Each pitch is a small numbered softball colored by its result. The pitch list sits under the zone.
- **VIEW-2** As in GameChanger, a scheduled game starts with one tap, and the result buttons are big.
- **VIEW-3** The Game tab lists only today's scheduled games. Jim's ruling, 2026-10-15. `todaysScheduled` keeps scheduled rows whose date is that day.
- **VIEW-4** Night is the default palette. Jim approved this on 2026-10-20. `themeOf` and `themeFromStorage` in `js/core/theme.js` are the one reading of `THEME_KEY` (`te_ui_theme`).
  Nothing saved opens in `night`. A saved `field` or `night` stays that palette. Any other saved value, and `auto` with an hour that is not a number, opens in `night`.
  `auto` is night from 19:00 through 06:59 and field from 07:00 through 18:59. The game menu still cycles the saved choice both ways. The page does not paint Field before the resolved palette is on the document.
  Night buttons, selects and inputs use a 2px border, the same as Field. Night fills (`--c-royal`) are #3A5CF0. If `theme.js` does not load, the page stays Night and the browser bar stays black.
  `themeColor` is #fff for field and #000 otherwise. The head script and the coach screen both use it. The head script keeps its names private.
  The Night status card and pitch-log rows use the same box as Field. A pressed Night primary is a darker shade of #3A5CF0. The coach screen still opens if `theme.js` does not load.

## LATER (out of scope for v1: do not build)
- The overlay view: a big zone with floating count, pitcher and pitch widgets, the batter's last-at-bat widget, and a lineup edit menu.
- Pocket Radar import.

## INFRA
- **INFRA-3** Production Supabase is used only when the page hostname is in `pcPickConfig.PROD.hosts`. The project ref, URL, and publishable key are defined once on `pcPickConfig.PROD` in `js/core/config.js`. Every other build uses the local address or `PC_SUPABASE_URL` / `PC_SUPABASE_ANON_KEY`, and shows a banner that cloud sync is not the live database.
- **INFRA-4** The release that is running is `PC.APP_VERSION` in `js/core/version.js`, defined once. The service-worker cache name is `te-pitch-` plus that label (`PC.cacheNameOf`), and the newest changelog heading is the same label. `sw.js` repeats the cache name so a new release changes the worker script; the unit test fails if the three disagree.
  Setup and the game menu show the label. `versionNotice` shows `Updated to vNN` only when a different release is already stored under `PC.VERSION_SEEN_KEY`. Nothing stored is a fresh install: no notice, then the label is stored. The note dismisses itself after `PC.VERSION_NOTE_MS`.
  `workerUpdated` is true only when a service worker was already controlling the page, so the page reloads once and the label on screen is the release that is running.
  A reload waits while `safeToReload` is false. That is a draft with a type, a called box, an actual spot, a result, an in-play mark, a shake-off, an aim edit, or a velocity, or while sync is running, or while a sheet is open. `reloadDue` is that check plus the page being hidden or idle. A stored value that is not `v` plus digits is a fresh install: no notice, and the label is still stored. The notice is shown only after that stored write succeeds.
  On the coach screen the note uses the status footer. In portrait it borrows the Today line, then that line comes back. The header and the chart stay the same size. It stays off the band, the status card, the results, the chips, the nav, and the header controls.
- A database URL is refused when `new URL(url.toLowerCase()).hostname` contains the production project ref. The app then uses the local address with an empty key. The scoring screen and the coach screen hide that banner so the zone still fits.
- A migration is exempt from that scan only when the same path exists on the base branch with identical bytes. A new file is scanned even when its timestamp is old. Leave an applied migration byte-identical. CI applies `supabase/migrations` only when the database host is `localhost` or `127.0.0.1`. The production schema changes only when a Supabase preview branch is merged.

## SYNC
- **SYNC-1** A refused push (any 4xx) is retried row by row and quarantined in `sync.rejected`. Push halts only when every row fails auth and `whoami` says the code is invalid or the role changed. Keep, retry, or discard applies on Apply. Cancel changes nothing.
- **SYNC-2** Pull uses `sync.seen`, then `updated_at` at or after seen minus 2 minutes, paged by `(updated_at, id)`. `seen` resets when the team or role changes. Merge is last-writer-wins, including sessions and `games.cur`. `rowPitch` keeps a `validActual` spot. Dates are `PC.localDate`.
- **SYNC-3** `team_settings` is coach-only and is never pushed by mark-all-dirty.

## Definition of done (v1)
On an iPhone-size viewport, a full inning in Game mode and a 20-pitch bullpen can both be scored end to end with no bugs. Every requirement ID maps to at least one automated test, and all of those tests pass in CI.

## Test map
| ID | Test (unit = `test/logic.test.js`; UI = `test/*.ui.js`) |
|---|---|
| FLOW-1 | unit: the same `flow` transitions drive the game and bullpen screens; UI: portrait, landscape and bullpen screens reach identical states |
| FLOW-2, FLOW-4, FLOW-5 | unit: step order and save rejected without an actual location; UI: result menu hidden until the actual tap |
| FLOW-3 | unit: wristband aim becomes the called box; an override replaces it |
| FLOW-6, FLOW-7 | unit: bullpen pitch saves with no result; hit-spot % math including a bottom-row hit |
| FLOW-7a | unit: low-pitch bonus only when the pitch was called in 7, 8, 9, 13, 14 or 18 and lands in 13, 14 or 18 |
| FLOW-6a | unit: migration removes `bpResult` from stored sessions and pitches; SQL migration test clears the Supabase rows |
| FLOW-8 | unit: new session has no batter; UI: LHB/RHB shown only with the setting on |
| FLOW-9 | `editpitch.ui.js`: edit is saved on the scoring phone and refused on a viewer phone |
| FLOW-10 | `shake.ui.js`: shake-off works in portrait and landscape |
| FLOW-11, FLOW-12 | unit: `cleanVelo`, `cleanFoul`, `cleanFlag`; UI: the optional detail does not block saving |
| RULE-1, RULE-2, RULE-3 | unit: changeup called-target validation, actual location unrestricted, penalty uses the final called type after a shake-off |
| RULE-3a | unit: validator rejects 31, 32 and 21–24 as called targets and accepts them as actual locations |
| RULE-3c | unit: a CH, drop or drop curve called low that lands in 31 is a miss below way-off severity |
| RULE-3d | unit: after a shake-off the called location is the re-signaled box, or the original box when none was re-signaled |
| RULE-4 | unit: scoring, edit, sync and CSV import call the same validator with the same inputs and get the same results |
| RULE-4a | unit: a CH called box 2 is kept, `calledFlag` is true, and an off-grid called box is null, on CSV import and on a sync read; SQL change-up target lists match `PC.CH_TARGETS`; Postgres: `test/badaim.pg.sh` keeps those rows and the preview still lists them |
| RULE-5 | `lock.ui.js` + `live.sync.js`: a second phone is read-only and sees pitches live |
| RULE-6, RULE-7 | unit: redo/undo state; UI: Cancel on every popup leaves the state unchanged |
| RULE-8 | `fit.ui.js`: no vertical scroll at 375, 390 and 430 px; controls at least 48px; the portrait wristband shows all 8 columns with no sideways scroll (at <=390px wide, cells may be 42–44px wide, height stays 48); the SE coach screen (667×375) may use a 34px strike box; the location dot stays round and the box numbers are not squashed. `layout.ui.js`: at 375 and 390 at least 8 name characters plus `#12` are visible |
| RULE-9 | unit: one row builder; export filtered to one pitcher and one date |
| RULE-10 | unit: `pitcherLabel` and CSV file name include the jersey number; smoke: no surnames shown |
| RULE-11, RULE-12 | UI: edit jersey number saves, and Cancel leaves it unchanged; smoke: branding unchanged |
| RULE-11a | unit: `0` and `00` are allowed, empty is allowed, and a duplicate active number errors |
| RULE-13 | unit: “RULE-13: contact is Ground, Liner, Fly, Pop up, and Bunt”; `test/detail.ui.js` portrait Bunt saves and can be skipped |
| RULE-13a | `test/contact.ui.js`: coach chips are at least 48×48 in the result column, top and bottom stay put, Back and Undo save nothing, Skip and Escape record no contact, and 440×956 portrait insets are included |
| VIEW-1, VIEW-2 | `zonegfx.ui.js`: numbered, colored markers and list; one-tap scheduled start |
| VIEW-3 | unit: “VIEW-2 todaysScheduled returns only that day's scheduled games” |
| VIEW-4 | unit: “VIEW-4: nothing saved is Night, and a saved Field or Night stays”; “VIEW-4: themeFromStorage reads THEME_KEY and stays Night when getItem throws”; `test/coach.ui.js`: Night by default, the game menu reaches Field and Night, a saved Field stays Field, no Field frame paints on load, a throwing theme read stays Night, Night controls are 2px, Night fills are #3A5CF0, themeColor paints the bar, a missing theme.js opens Night and the coach screen, and Night boxes match Field |
| FLOW-13 | unit: `createGame` returns null until the opponent and pitcher are set; a scheduled id starts that row; the toast leaves the game list unchanged |
| FLOW-14 | unit: pause keeps the row; `endGame` waits for confirmation |
| FLOW-15 | unit: discard pushes `deleted` and a pull does not bring the game back; the stats scope omits the draft. The picker check is `modes.ui.js` "picker shows N Resume rows and one Start" |
| DoD | UI: `inning.e2e` (full inning) and `bullpen20.e2e` (20-pitch bullpen) at 390 px |
| ARCH-1 | `test/arch.scan.js` passes on the tree. Negative cases are `test/arch.negative.js` and `test/dup.scan.js`. |
| FLOW-1a | unit: “FLOW-1: scoreCommit is the chart record” |
| FLOW-13a | `test/modes.ui.js` “picker shows N Resume rows and one Start” |
| RULE-4b | unit: “edit sheet reads actualLoc before loc”; `test/editpitch.ui.js` |
| RULE-5a | unit: “scoring lock: only the starting phone scores” |
| RULE-6a | unit: “redo list persists on this phone, stays capped at 10, and is not synced” |
| RULE-7a | `test/sheets.ui.js`: Cancel, Escape, and backdrop leave data unchanged |
| RULE-8a | `test/coach.ui.js` line 9: 844×390 is 48; 667×375 is band ≥44, zone ≥34, results ≥46 |
| SCORE-1 | unit: “hitSpot uses pitchMiss”; “SCORE-1: the intended heat map uses hit spot, so a change-up on box 4 is not a hit” |
| SCORE-2 | unit: “ring is competitive, way off is a miss” |
| SCORE-3 | unit: that ring test; `test/wayoff.ui.js` competitive 67% |
| SCORE-4 | unit: “report strikes follow the umpire result”; `test/flow.ui.js` |
| SCORE-5 | unit: “SCORE-5: an FB A waste pitch is a strike when the umpire says so, and a hit spot only off the plate”; “SCORE-5: the away box is 16 for a righty and 17 for a lefty, and the marks use that hit spot” |
| SYNC-1 | unit: “push: a 403 row is retried row by row”; “every row 401”; “rejected rows: list, retry” |
| SYNC-2 | unit: “pull: incremental since last updated_at”; “sessions: last writer wins”; “rowPitch keeps every valid spot”; “localDate” |
| SYNC-3 | unit: “team settings sync: coach only… never pushed by markAllDirty” |
| INFRA-3 | `test/prodref.test.js`: a non-production host shows the sync-off warning and does not point at production; an uppercase production URL and a split project ref are refused; a migration on the base branch with identical bytes is exempt; a backdated new migration is not; `test/pg-migrate.sh` allows only `localhost` or `127.0.0.1` |
| INFRA-4 | unit: “INFRA-4: one release label matches the cache and the changelog”; “INFRA-4: a fresh install stores the version and shows no notice”; “INFRA-4: an update notice shows once”; “INFRA-4: a worker already in control reloads once”; `test/version.ui.js` (run from `test/coach.ui.js`): the label in Setup and the game menu at 844×390, 667×375 and 956×440 in Field and Night; the notice once, and not on a fresh install; the controlling worker cache matches the label |
| BRIEF-1, BRIEF-2, BRIEF-3, BRIEF-4, BRIEF-5, BRIEF-6, BRIEF-7, BRIEF-8 | `AGENTS.md` Standard builder brief. BRIEF-5 is `test/prsize.js` and `test/prgate.negative.js`. BRIEF-7 is `test/changelog.js` and `test/prgate.negative.js`. BRIEF-6 is not enforced in this tree. |

INFRA-4 also maps “INFRA-4: a stored value that is not a version is a fresh install”; “INFRA-4: a reload waits while a pitch, a sync, or a sheet is open”; “INFRA-4: a reload also waits until the page is hidden or idle”; “INFRA-4: a controller change does not reload by itself”; “INFRA-4: the worker takes control only after the new cache is ready”. The same UI test checks that the note misses those controls, and that the game menu title keeps its row.

RULE-8 coach zone floor, same tests: under 400px tall, zone cells are 46px where it fits; smaller only when the screen cannot fit 46px (approved by Jim 2026-10-17, fit-first). The SE screen is unchanged. Exact sizes are checked at 956 and 844 wide. 844×360 and 932×360 keep every coach button on screen.

## Architecture
The module map and the boundary rule are in [AGENTS.md](../AGENTS.md).
