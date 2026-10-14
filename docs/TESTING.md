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
`live.roles`, `live.pcoach`, `live.supabase`, `live.playergame`, `live.sync`, `live.settings` hit the real project using the `zztest` team.
Test codes come from env `PC_TEST_COACH` or the gitignored `.test-env` — never commit them. Clean `zztest` rows before/after runs.

## Before pushing
Check no codes leaked: `grep -rqF "$PC_TEST_COACH" .` must find nothing.

## coach.ui.js / lib/audit.js (v37)
`coach.ui.js` checks the landscape coach screen at 844x390 (cells at least 48px) and 667x375 (at least 40px). It covers the flow, ✎ Aim, long-press, in play + spray, Undo, Same, band setup cancel/save, the side-retired card, theme, mirror and the portrait rotate prompt. With `SHOT_DIR` set it saves screenshots. `test/lib/audit.js` holds the shared clipping/overlap audit used by layout.ui.js and coach.ui.js.
