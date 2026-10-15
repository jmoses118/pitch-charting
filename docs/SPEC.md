# Pitch Charting v1 Product Spec

Thunder Elite softball pitch charting. Static site on GitHub Pages with Supabase sync, built for iPhone Safari. Each rule below has an ID so tests and reviews can cite it. "Must" means required for v1.

## FLOW: one state machine
- **FLOW-1** Every scoring screen uses one shared pitch-entry state machine: portrait Game, landscape coach Game, Bullpen, and any later view. No screen has its own step logic. This replaces both `bullpenStep`/`bullpenTap` in `js/core/game.js` and the game steps in the UI scripts. A `js/core/flow.js` may already exist on the `fix/redesign-bugs` branch; build on it.
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
- **RULE-5** Only one phone can score a game or bullpen session. Every other phone sees it live and read-only.
- **RULE-6** Undo and Redo cover both the pitch and its location.
- **RULE-7** Every popup has a working Cancel that leaves the data unchanged.
- **RULE-8** The scoring screen fits on one iPhone screen without scrolling at widths of 375, 390 and 430 px. It uses compact pitch buttons, slim pitcher and count bars, and a large zone. Portrait wristband height stays 48. At <=390px wide, cells may be 42–44px wide so all 8 columns, plus the row and column headers, fit with no sideways scroll. On the SE coach screen (667×375) the strike box may be 34px; that is the SE exception.
- **RULE-9** CSV export is per pitcher per date. One shared CSV row builder produces every row.
- **RULE-10** Players are shown by first name and jersey number (`pitcherLabel`), and CSV file names use the same. No surnames.
- **RULE-11** Jim can edit a pitcher's jersey number. Cancel leaves it unchanged.
- **RULE-11a** An active pitcher cannot share a jersey number with another active pitcher. `0` and `00` are both allowed and are not the same number. Empty is allowed. The check is `jerseyError` in `js/core/store.js`.
- **RULE-12** The current branding stays.

## VIEW
- **VIEW-1** The zone is shown Gameday-style, from the catcher's eye. Each pitch is a small numbered softball colored by its result. The pitch list sits under the zone.
- **VIEW-2** As in GameChanger, a scheduled game starts with one tap, and the result buttons are big.

## LATER (out of scope for v1: do not build)
- The overlay view: a big zone with floating count, pitcher and pitch widgets, the batter's last-at-bat widget, and a lineup edit menu.
- Pocket Radar import.

## INFRA
- **INFRA-3** Production Supabase is used only when the page hostname is in `pcPickConfig.PROD.hosts`. The project ref, URL, and publishable key are defined once on `pcPickConfig.PROD` in `js/core/config.js`. Every other build uses the local address or `PC_SUPABASE_URL` / `PC_SUPABASE_ANON_KEY`, and shows a banner that cloud sync is not the live database.
- A database URL is refused when `new URL(url.toLowerCase()).hostname` contains the production project ref. The app then uses the local address with an empty key. The scoring screen and the coach screen hide that banner so the zone still fits.
- A migration is exempt from that scan only when the same path exists on the base branch with identical bytes. A new file is scanned even when its timestamp is old. Leave an applied migration byte-identical. CI applies `supabase/migrations` only when the database host is `localhost` or `127.0.0.1`. The production schema changes only when a Supabase preview branch is merged.

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
| VIEW-1, VIEW-2 | `zonegfx.ui.js`: numbered, colored markers and list; one-tap scheduled start |
| DoD | UI: `inning.e2e` (full inning) and `bullpen20.e2e` (20-pitch bullpen) at 390 px |
| ARCH-1 | `test/arch.scan.js` passes on the tree. Negative cases are `test/arch.negative.js` and `test/dup.scan.js`. |
| INFRA-3 | `test/prodref.test.js`: a non-production host shows the sync-off warning and does not point at production; an uppercase production URL and a split project ref are refused; a migration on the base branch with identical bytes is exempt; a backdated new migration is not; `test/pg-migrate.sh` allows only `localhost` or `127.0.0.1` |
| BRIEF-1, BRIEF-2, BRIEF-3, BRIEF-4, BRIEF-5, BRIEF-6, BRIEF-7, BRIEF-8 | `AGENTS.md` Standard builder brief. BRIEF-5 is `test/prsize.js` and `test/prgate.negative.js`. BRIEF-7 is `test/changelog.js` and `test/prgate.negative.js`. BRIEF-6 is not enforced in this tree. |

## Architecture
Each business rule lives in one `js/core` module. UI files render and forward events. They do not keep a second validator or a second copy of a rule.

| Module | Owns |
|---|---|
| `js/core/config.js` | `pcPickConfig`, the one database target. `pcPickConfig.PROD` holds the production ref, URL, publishable key, and host list. |
| `js/core/flow.js` | The one scoring state machine (`scoreApply`, `scoreTap`, `scoreStep`, `scoreCommit`) and the one location validator (`validCalled`, `validActual`). Portrait Game, the landscape coach screen, Bullpen, and any later view call this module. |
| `js/core/location.js` | `calledOf` and `actualOf`, the one reading of a stored called spot and actual spot. |
| `js/core/scoring.js` | Miss severity, the low-pitch bonus, and strike versus hit-spot. The penalty uses `calledTypeOf`. |
| `js/core/csv.js` | `csvRow`, the one CSV row builder, and `calledTypeOf`. |
| `js/core/store.js` | The roster, the jersey check, and the local save. |
| `js/core/sync.js` | Row mapping and merge. A read keeps a grid aim that fails `validCalled` and sets `calledFlag`. |
