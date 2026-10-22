# Testing

## Unit (CI)
`node --test test/logic.test.js` — pure logic in `js/core/` via `logic.js`. Runs on every PR (`.github/workflows/ci.yml`).

## UI (Playwright, local)
Needs `playwright-core` (in `test/node_modules`) and Chrome at `/usr/bin/google-chrome`. Serve the app: `python3 -m http.server 8766`.
- `node test/ui.smoke.js 8766`
- `node test/<name>.ui.js http://localhost:8766/` for `heat`, `report`, `xss`, `pitchchange`, `wayoff`, `round1`, `workload`, `modes`, `zonegfx`, `fit` (one-screen entry at 390×844 and 375×667), `layout` (every tab/state at 375×667, 390×844, 430×932: no clipping, truncated pitcher name, off-screen content or overlaps; `SHOT_DIR=… ` saves 390×844 screenshots), `sheets` (segmented-control options visible; every dialog/sheet cancels via Cancel, Escape and backdrop with data unchanged), `roles`

Setup sections are collapsible `<details>`; tests open them before filling inputs. `node test/demo.ui.js <url> <before|after>` writes 390×844 screenshots to `test/demo-ui-v2/`; `node test/demo.v3.js <url>` writes the zone-graphics shots to `test/demo-ui-v3/`; `node test/demo.v4.js <url>` writes the one-screen entry shots to `test/demo-ui-v4/`; `node test/demo.v5.js <url>` writes the batter-sheet / add-pitcher shots to `test/demo-ui-v5/`.

UI tests use a throwaway browser profile and block Supabase (`route(/supabase\.co/, r=>r.abort())`); demo data never syncs.

## Live (Supabase, manual)
`live.roles`, `live.pcoach`, `live.supabase`, `live.playergame`, `live.sync`, `live.settings` use `PC_CONFIG`. That is local Supabase, or the staging preview branch when `PC_SUPABASE_URL` and `PC_SUPABASE_ANON_KEY` are set. They do not use production. The `zztest` team code comes from env `PC_TEST_COACH` or the gitignored `.test-env` — never commit it. Clean `zztest` rows before/after runs.

## Database (CI)
The FLOW-6a job starts a throwaway Postgres, applies `supabase/migrations` with `test/pg-migrate.sh`, then runs `test/flow6a.pg.sh`, `test/badaim.pg.sh`, `test/pendingbadaim.pg.sh`, and `test/dropbackup.pg.sh`, which ends with `test/xy.pg.sh` (D-1, D-6, and the D-7 backup and rollback dry run). Do not point those scripts at a hosted database.

## Before pushing
Check no codes leaked: `grep -rqF "$PC_TEST_COACH" .` must find nothing.

## coach.ui.js / lib/audit.js (v37)
`coach.ui.js` checks the landscape coach screen at 844x390 (cells at least 48px) and 667x375 (at least 40px). It covers the flow, ✎ Aim, long-press, in play + spray, Undo, Same, band setup cancel/save, the side-retired card, theme, mirror and the portrait rotate prompt. With `SHOT_DIR` set it saves screenshots. `test/lib/audit.js` holds the shared clipping/overlap audit used by layout.ui.js and coach.ui.js.

`layout.ui.js` checks the iPhone 17 Pro Max coach screen.
Under 400px tall, zone cells are 46px where it fits; smaller only when the screen cannot fit 46px (approved by Jim 2026-10-17, fit-first).
At 400px or taller the floor is 48px. The SE screen (667×375, under 700px wide) keeps its existing strike box.
Exact sizes are checked at 956 and 844 wide for heights 360, 375, 384, 399, 400, and 401.
46px still fits at 956×384, at 956×375 with no home bar, and at 844×390 with insets (47/47/21). A bare 360px-tall screen is 43px, because 46px does not fit.
At 956×360 and 956×375, with a notch only (62/0/0) and with insets 62/62/21, every coach button stays inside the viewport and above the home-bar inset, with no scrolling.
The same fit check covers 844×360 and 932×360, where In dirt and the results row used to end 2px off the screen.
In dirt may sit a few px below the band at those extreme heights.

coach.ui.js also checks: Keep charting contrast (≥10:1), no zone/status shift after band and zone taps, simulated iPhone safe-area insets (47/47/21), game menu fit/3-col/End away from Cancel, sticky band-setup footer, ⋯ ≥44px, row headers kept, and in the bullpen pad Way buttons ≥48 tall, all types incl. SC, and a confirmation that doesn't cover the zone.

## agree.ui.js (v38)
Replays Jim's Oct 14 test-mode sequence: 3 band-called pitches in landscape, then 3 no-aim pitches in portrait. Checks that Game (PITCHES, count, outs, last-at-bat note), the heat map (Landed counts all 6, Miss says 3 of 6 aimed and the rest are left out, kid-clear labels) and the per-pitch report (thrown, aimed, result-based strike %) agree. `SHOT_DIR` + `SHOT_PREFIX` save the before/after screenshots. The unit test `report strikes follow the umpire result` covers `PC.strikeOf`.

## v39
- `test/logic.test.js` adds: 403 row retried row by row, 401 + invalid code halts, 403 with a valid code quarantines and continues, rejected list/retry/discard, incremental keyset pull, sessions last-writer-wins, live game count never rolls back, rowPitch valid spots, change-up targets (incl. CH H+), hitSpot = pitchMiss, localDate after 9 PM ET, no UTC dates in UI code, `heatSummary` with no-aim and souvenir counts, `MISS_DIRS` / `topDir` / `bestWeak`.
- `test/v39.ui.js`: Setup → Sync problems at 390x844, 375x667 and 430x932 (lists, plain words, layout audit, 44px controls, Cancel changes nothing, Apply retries/discards); change-up aim limits in the coach screen, band setup and bullpen; a 9:30 PM ET clock gives today's date for a new bullpen session and game. `SHOT_DIR` saves `setup-sync-problems-<size>.png`.
- CI (`.github/workflows/ci.yml`) now has a `ui` job: playwright-core with the runner's Google Chrome, a local static server, then `ui.smoke.js` and `xss.ui.js`.
- v39 review round: `v39.ui.js` also checks the plain "Why:" copy for 401/403/409/400, the closed Details toggle, the red unselected Discard, the Undo toast (and that Undo restores), the band-setup change-up note and flagged old aim, and, at 667/844/932, that the short change-up warning and ⋯ Game aren't truncated and the faded boxes are dashed with #5B6472 numbers. The unit test `syncWhy` covers the status mapping.

- `test/lock.ui.js` – scoring lock: view-only coach screen (667/844/932 landscape), portrait view-only bar and takeover popup (375x667/390x844/430x932), Cancel vs Take over, ⋯ Game menu items disabled + code-level refusal of end/pause/outs/inning/IBB, bullpen pause/end lock. Unit tests: "scoring lock …" in `test/logic.test.js`.
- `test/shake.ui.js` – shake-off: **regression guard that the Shake-off button exists in both layouts**, coach flow (call → shake → thrown type → zone → result), Cancel, Undo, portrait flow (bar, Cancel, refuses until a type is picked), Stats Shake-offs section; 3 portrait + 3 landscape sizes. Unit tests: "shake-off …" in `test/logic.test.js`.

## v40
- `test/logic.test.js`: dirt, way off, and the backstop are actual locations (`validCalled` rejects them); change-up aims stay low-only; a sync read and a CSV import keep an illegal grid aim and flag it; redo cap 10; foul / wild-pitch / velocity cleaners; CSV filter by pitcher and date; chart columns omitted unless `sync.chartCol`.
- Review round: `nearestTarget` (nearest called box, tie keeps the earlier one); CSV `called_type` and `shook` round-trip, including an old file with neither column; `csvPitcherFile` keeps the first name and drops the rest of the roster text; redo list saves, reloads, trims to 10, clears, and stays off `buildRows`.
- Foul logs on the Foul tap. `ui.smoke.js`, `shake.ui.js`, `agree.ui.js` and `pitchchange.ui.js` click Foul and do not look for a skip button. Early / On time / Late are optional chips after that pitch is saved.
- Edit pitch: `PC.editActual` changes the actual spot and leaves later pitches, the call, and the result. When `targets` has more than one box, `calledLoc` becomes the nearest target and CSV `called_location` matches; one target leaves `calledLoc`. The edited flag syncs on `call_raw` (no new column) and round-trips in CSV, including an old file with no `edited` column. `PC.canEditBox` is the scorer only, including after the game. `test/editpitch.ui.js` opens the sheet from the log and from Stats (one game selected), checks Cancel at 48px, Save, Cancel / Escape / backdrop, a view-only refusal, and that Undo (the button and the toast) restores the spot without deleting a later pitch. CSV writes `from_video` and still imports `edited`.
