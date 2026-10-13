# Testing

## Unit (CI)
`node --test test/logic.test.js` — pure logic in `js/core/` via `logic.js`. Runs on every PR (`.github/workflows/ci.yml`).

## UI (Playwright, local)
Needs `playwright-core` (in `test/node_modules`) and Chrome at `/usr/bin/google-chrome`. Serve the app: `python3 -m http.server 8766`.
- `node test/ui.smoke.js 8766`
- `node test/<name>.ui.js http://localhost:8766/` for `heat`, `report`, `xss`, `pitchchange`, `wayoff`, `round1`, `workload`, `modes`, `roles`

UI tests use a throwaway browser profile and block Supabase (`route(/supabase\.co/, r=>r.abort())`); demo data never syncs.

## Live (Supabase, manual)
`live.roles`, `live.pcoach`, `live.supabase`, `live.playergame`, `live.sync`, `live.settings` hit the real project using the `zztest` team.
Test codes come from env `PC_TEST_COACH` or the gitignored `.test-env` — never commit them. Clean `zztest` rows before/after runs.

## Before pushing
Check no codes leaked: `grep -rqF "$PC_TEST_COACH" .` must find nothing.
