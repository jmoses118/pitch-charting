# Architecture

## Files
| Path | Role |
|---|---|
| `index.html` | Markup for every view (Game, Bullpen, Stats, Setup) and script tags |
| `style.css` | Design tokens (CSS custom properties) + components; see [DESIGN.md](DESIGN.md) |
| `config.js` | `window.PC_CONFIG`: Supabase URL + publishable key |
| `js/core/*.js` | Pure logic modules (no DOM), shared by browser and node tests |
| `logic.js` | Node entry point: loads the core modules in order and exports `PC` |
| `js/ui/*.js` | UI views (classic scripts sharing one global scope, loaded in order): `shared` (DOM helpers, store, roles, zone component, call entry, banners, sync), `zonegfx` (softball markers, plate, batter silhouette, recent-pitch list), `game`, `bullpen`, `report` (shared report / drill-down / notes components), `stats`, `setup`, `main` (render loop, nav, startup) |
| `sw.js` | Service worker: offline cache (`te-pitch-vNN`), network-first app files |
| `supabase/migrations/` | SQL migrations, identical to what is applied in Supabase |

## Core modules (load order = dependency order)
Each module is an IIFE that reads dependencies from the shared `PC` namespace (`const {…}=PC`) and registers its exports with `Object.assign(PC,{…})`. The browser loads them via `<script>` tags; node via `logic.js`.

1. **grid.js** – single source of truth for the location grid: zone 1–9, ring 11–18, way-off 21–24, actual-only 31 (in dirt) and 32 (over catcher/backstop), `GRID_XY` lattice, `MAX_MISS`, `missDist`, `locInfo`, `pct`.
2. **calls.js** – pitch types, call codes (Jim's wristband language), call-code parsing, wristband/call sheet defaults. `canAim` / `aimOpts` stay the zone-and-ring rule (change-ups only 4, 7, 8, 9, 13, 14, 18) for band setup and the wristband.
3. **flow.js** – the one scoring state machine. `flowSteps('game')` is `type → called → actual → result`. `flowSteps('bullpen')` stops after `actual` and then saves. `scoreApply` / `scoreTap` / `scoreStep` / `scoreCommit` are the only step rules. Portrait, the landscape coach screen, bullpen, and a future overlay all call this module. They do not keep a second copy of the order.
4. **game.js** – count logic (GameChanger aligned), results, at-bat ends, batted-ball types. Pitch entry is only `flow.js`.
5. **scoring.js** – all scoring rules: miss severity (`pitchMiss` is the only severity source), souvenir, CH-low, ring/way-off, competitive %, heat maps, reports, summaries, K credit, count stats, trends, alert levels. Report, heat map and stats all call these same functions.
6. **csv.js** – CSV export/import.
7. **workload.js** – pitch counts today / this tournament weekend (Fri–Sun; Mon–Thu shows the last weekend), game and bullpen counted separately, optional soft day/weekend limits (`workloadAlert`: amber from 85%, red at the limit), in-game alert thresholds, optional rest-day guide (off by default).
8. **sync.js** – Supabase REST: `TABLES`, `keyOf`, row builders, `roleAllows` (client mirror of RLS), `mergeRemote`, push/pull loop.
9. **modes.js** – game and bullpen are mutually exclusive on a device: `modeLock(state, tab, canGame)` (a started, not-ended active game locks Bullpen; an active session with pitches locks Game), plus resumable `pausedGames` / `pausedSessions`. Pausing only clears `activeGame` / `activeSession`; no data changes.
10. **store.js** – default state (first-name pitchers, empty roster), `pitcherLabel` (first name + #number, used by every view), `localStorage` load/save + migrations (`ensureSync`), notes.

## Data flow
UI action (js/ui) → `store.update()` mutates state → saved to `localStorage` → marked dirty → `makeSync` pushes changed rows (filtered by `roleAllows`) via PostgREST with the access code in the `x-team-code` header → periodic pull merges remote rows (`mergeRemote`, newest `updated_at` wins). Test mode skips sync entirely.

## Service worker
`sw.js` precaches the file list `F` under cache `te-pitch-vNN`; bump the version when any app file changes. App files are fetched network-first so updates land on the next load; offline falls back to cache.

## Supabase schema + RLS summary
- Tables (`public`): `pitchers`, `games`, `sessions`, `pitches`, `call_sheets`, `notes`, `team_settings`, all keyed by `team_id` + id.
- `team_settings`: one row per team (`id='team'`): `alerts int[]`, `day_limit`, `weekend_limit`, `show_rest`, `rest jsonb`. Coach-only (RLS `req_team()`), shared by every coach phone; only pushed when a coach edits a setting, never by "mark all dirty", so a new coach phone cannot overwrite it with defaults.
- `private.teams` (team codes) and `private.access_codes` (role, `pitcher_id`, `pitcher_ids`) are not exposed.
- Helpers resolve the request's `x-team-code` header: `private.req_team()` (coach), `req_team_any()` (any valid code), `req_role()`, `req_pitcher()`, `req_pitchers()`.
- RLS: coach full read/write; viewer read-only; player reads her own games/pitches and writes only her own bullpen sessions/pitches; pcoach reads/writes sessions, bullpen pitches and notes for her `pitcher_ids`; `call_sheets` and `team_settings` coach-only. Trigger `set_charted_by` tags pcoach-charted pitches.
- RPCs: `whoami`, `coach_create_code(p_role, p_pitcher_id, p_label, p_pitcher_ids)`, list/revoke codes (anon only).

## js/ui/coach.js (v37)
Loads after setup.js and before main.js. It holds the theme/mirror prefs, the landscape coach render (`renderModes`), the game menu, band setup (`openBandSetup`, which saves `sheet.aims`), the rotate prompt and the bullpen pad. Core helpers in calls.js: `cellCode`, `unmappedCells`, `bandAim`, `bandSetupDone`.

## Sync (v39)
- **Push:** a refused chunk (any 4xx, including 401/403 from row-level security) is retried row by row, so one bad row never blocks the good rows or later tables. Refused rows are quarantined in `sync.rejected` (`PC.quarantine`). Push halts, keeping everything queued, only when every row is refused for auth **and** `whoami` says the code is no longer valid (or its role changed).
- **Sync problems:** Setup → Cloud sync → "⚠ Sync problems (N)" opens `#rejDlg` (setup.js). Each row can be kept, retried (`PC.retryRejected` re-queues it) or discarded (`PC.discardRejected`). Nothing changes until Apply; Cancel leaves everything as it was.
- **Pull:** incremental. `sync.seen[table]` holds the newest `updated_at` merged. The next pull asks for `updated_at >= seen − 2 min` (overlap for slow commits; merging is idempotent) and pages by keyset `(updated_at, id)` (`PC.pullUrl`), never offset. `seen` resets when the team or role changes.
- **Merging:** every table, including sessions, is last-writer-wins by `updated_at`. A live game's count (`games.cur`) is plain last-writer-wins: only one phone can score it (see Scoring lock).
- **rowPitch** keeps every valid spot (1–9, 11–18, 21–24, 31 in dirt, 32 over catcher/backstop) and drops anything else.
- Dates are always local (`PC.localDate` via `today()` in shared.js); nothing builds a date from UTC.

## Scoring lock (v39)
A live game or bullpen session is scored from **one phone only** – the phone that started it. Viewing stays unlocked.
- **Owner:** `box.scorer` = that phone's `sync.deviceId`, set in `gStart` / `newSession` (legacy boxes with no owner are claimed by the first phone that records a pitch).
- **Core:** `PC.canScore(box,dev)`, `PC.lockedBox(box,dev)`, `PC.claimScoring(box,dev)` in `js/core/modes.js`; `PC.scorerOfRow` in `js/core/sync.js`.
- **Storage:** games keep the owner in `games.cur.scorer` (existing jsonb, no schema change). Sessions use `sessions.scorer` from `supabase/migrations/20261014120000_scoring_lock.sql`, applied 2026-10-14. `scorerColumn:true` is set in `config.js`.
- **UI:** `viewOnly()` (shared.js) toggles `body.viewonly`: scoring controls are hidden (portrait chips/steps/way-off/pad/result sheet/undo; coach result column) and zone/band taps are inert. `scoreGuard()` also refuses `recordGame`, `callCell`, `tapLoc`, `undoLast` and `logBullpen`. A "Scoring on another phone" note offers **Take over scoring** → `#takeDlg` (Cancel / Take over scoring); confirming sets `scorer` to this phone, queues the row and syncs, and the old phone turns view only on its next pull.
- `RO_EDIT_IDS` / `applyViewOnly()` (shared.js) disable every game-changing control (⋯ Game menu: outs, end, next inning, IBB, D3, pause; portrait Pause/End/outs/inning/IBB/undo; bullpen Pause/End/pad). `endGame`, `pauseGame`, `pauseBullpen`, `endBullpen` and the outs/inning/IBB handlers call `scoreGuard()`. The menu shows `#cmRo` (note + Take over scoring).
- This replaces the v39-draft "phone that has seen more pitches wins" rule (`cur.pn` / `curNewer`), which is removed.

## Shake-off (v39)
- Draft state `D.shook` = the coach's call (`norm`, `raw`, type, aim) captured by `shakeOff()` (shared.js); `cancelShake()` restores it; `resetDraft` clears it. `baseRec` then writes `shook:true`, `call`/`callRaw` = coach call, `type` = thrown, `targets` = her own aim only (`aimSet` ignores the call while shaking off). `recordGame` refuses a shake-off until a thrown type is picked. Undo removes it like any pitch.
- UI: portrait `#shakeBtn` (pitch flow) + `#shakeBar` (call, Cancel); coach `[data-cx=shake]` next to Aim/Undo/Same, then a thrown-type picker (`[data-ty]`) with ✕ Cancel. Stats `#sShakeCard` and the bullpen report use `shakeHTML()` → `PC.shakeoffs`.
- Sync: the flag travels as a `⤺ ` prefix on `pitches.call_raw` (`PC.SHOOK_TAG`). `shakeColumn:true` in `config.js` also writes `pitches.shook`. Apply `supabase/migrations/20261014140000_shake_off.sql` before merge.

## Scoring chart (v40)
- Portrait flow: scheduled game → one tap (`startScheduled`) → call → location → big result. Foul logs on that tap (`foulTime` unset). Early / On time / Late chips (`#foulChips`, about 5 seconds) update that pitch by id. Ball in play opens contact (optional: Ground, Liner, Fly, Pop up) then the play (`D.ip`). Cancel on the sheet logs nothing. Wild pitch and velocity are under More.
- `redoStack` (`var` in `js/ui/game.js` so coach and bullpen can see it) holds up to `PC.REDO_MAX` (10) undone location taps and pitches. It is stored on this phone as `state.redo` (localStorage) and restored on load. `clearRedo()` runs when a pitch is logged. Test mode does not write it. It is not a sync table. Undo of a location tap does not tombstone a pitch.
- Pitch fields `calledLoc`, `actualLoc`, `calledType`, `foulTime`, `wpPb`, `velo`, and `mode` (`game` / `bullpen`) live on the phone. `calledLoc` for several targets is `PC.nearestTarget` against the actual location. `pitchRow` adds `called_loc`, `actual_loc`, `foul_time`, `wp_pb`, `velo` when `sync.chartCol` is set (`config.js` `chartColumn: true`). `calledType` is not a database column. `shook` still uses the call_raw tag, and `shakeColumn: true` also writes `pitches.shook`.
- Migration `supabase/migrations/20261014180000_scoring_chart.sql` must be applied before merge, after `20261014140000_shake_off.sql`.
- CSV columns are appended in `PC.CSV_COLS`, including `called_type`, `shook`, and `from_video` (`PC.csvChart` / `PC.csvApply`). An older file's `edited` column still imports. `PC.filterPitcherDate` keeps one pitcher (first name + number) on one date. Download names go through `PC.csvPitcherFile` / `PC.csvGameFile`: first name and jersey only, safe characters.
- **Edit pitch:** `PC.editActual(pitch, loc)` sets `loc` and `actualLoc` and, when the spot changed, `edited`. When `targets` has more than one box, it sets `calledLoc` to `PC.nearestTarget` for the new spot. One target, or none, leaves `calledLoc`. It does not remove the pitch or change the result or the count. The sheet is `#editDlg` (Save / Cancel). Rows in `#log`, `#recent`, and Stats `#pitchList` (one game or one session) open it. `PC.canEditBox` allows the scoring phone (and that phone after the game); viewer and unknown codes cannot. Sync: `dirty('pitches', id)` sends a normal pitch update. `edited` is a word joiner (`PC.EDITED_TAG`) at the end of `call_raw`, so it round-trips on today's schema and the shake-off prefix stays at the front. It is not a new column.
- A bullpen pitch has no ball/strike result. `stripBullpenResults` deletes a saved `bpResult` and any stamped `result` on bullpen pitches (locally, and queued so the next sync clears them). `supabase/migrations/20261014230000_bullpen_no_result.sql` clears the same rows in Supabase. Do not apply that file to production until this build goes live. A new bullpen session has no batter. LHB/RHB show only when `settings.showBatterHand` is on.

## Scoring flow (v48)
One state machine in `js/core/flow.js`. Portrait Game, the landscape coach Game screen, Bullpen, and a future overlay call `PC.scoreApply`, `PC.scoreTap`, `PC.scoreStep`, and `PC.scoreCommit`. There is no second screen and no second copy of the step order.

| Mode | Required steps | Save |
|---|---|---|
| Game | `type` → `called` → `actual` → `result` | `recordGame` after the result. Result is ball, called strike, swinging strike, foul, foul tip, in play, HBP, or a dropped third. |
| Bullpen | `type` → `called` → `actual` | `logBullpen` on the actual-location tap. No ball/strike step. |

- **Called location** is auto-placed from the wristband call (or a saved band aim). A zone tap, ✎ Aim, or a long-press overrides it. `PC.validCalled` allows dirt (31), over the catcher (32), and way off (21–24), so a curve or change aimed in the dirt that lands in the dirt is a hit. A change-up still cannot be called in a high zone or ring box. `PC.canAim` is unchanged and still rejects those spots in band setup.
- **Actual location** is the later tap. In a game it is what opens the result sheet. The sheet stays closed while the called spot or the actual spot is still missing, and it never covers the zone during those steps. The header reads aim → actual, for example `Result · CH 8 → @12`.
- **Bullpen success** is hit-spot % (`PC.hitSpot`: the actual spot is one of the called spots, and a change-up up in the zone does not count). The live bullpen line, a bullpen Stats scope, and the session report lead with that. Game Stats keep strike %.
- Landing on a called dirt or way-off spot is severity 0. The same landing aimed somewhere else stays `WAY_SEV`.
- **Optional, and they do not reorder the required steps:** shake-off (the coach's call is stored, then the thrown pitch walks type → her own called spot → actual → game result), velocity, in-play contact and the play, and editing a past actual location (`PC.editActual`). Intentional walk stays outside the machine.
- `PC.scoreCommit` is the one writer of `targets` (her called spots), `loc` / `actualLoc`, and `calledLoc` (on a shake-off, the coach's box nearest the landing). A future overlay should call the same four functions and not invent a third path.
