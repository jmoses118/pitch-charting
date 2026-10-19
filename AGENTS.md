# Agent rules

Thunder Elite pitch charting is a static iPhone PWA. The scripts are IIFEs with no bundler. `index.html` loads `js/core`, then `js/ui`. Node tests load the same core files through `logic.js`. Supabase is optional cloud sync. GitHub Pages hosts the public site.

Players are minors. Show first name and jersey number only. Never commit a surname, a birth date, or an access code.

## App files

- `index.html` holds every view and the script tags, core first, then UI.
- `style.css` holds the tokens named in `docs/DESIGN.md`.
- `logic.js` loads `js/core` for Node. `config.js` only wires the browser. The choice is `pcPickConfig`.
- `sw.js` is network-first with a cache fallback. Bump `te-pitch-vNN` when an app file changes.
- `supabase/migrations/` is the schema CI applies on localhost. Do not edit a file that is already on the base branch.

## Module map

Each `js/core` file owns the rule IDs on its line. UI files render and forward events. They do not own a rule.

IDs live in `docs/SPEC.md`: FLOW-1a, FLOW-13a, RULE-4b, RULE-5a, RULE-6a, RULE-7a, RULE-8a, SCORE-1 through SCORE-4, SYNC-1 through SYNC-3, VIEW-3. SCORE-1 through SCORE-4 are worded in `docs/SCORING.md`.

- `js/core/config.js` — INFRA-3. `pcPickConfig` is the one database target. `pcPickConfig.PROD` holds the production ref, URL, publishable key, and host list.
- `js/core/grid.js` — the location lattice (`GRID_XY`, zone, ring, way off, dirt, backstop) that SCORE-2 and SCORE-3 use.
- `js/core/calls.js` — RULE-1. `aimOpts` asks `validCalled`. `aimRejectMsg` is the one refusal sentence.
- `js/core/location.js` — RULE-4 and RULE-4b. `calledOf` and `actualOf` are the one reading of a stored called spot and actual spot.
- `js/core/flow.js` — the one scoring state machine (`scoreApply`, `scoreTap`, `scoreStep`, `scoreCommit`) and the location checks (`validCalled`, `validActual`). Portrait Game, the coach screen, and Bullpen call this module.
- `js/core/game.js` — RULE-6, RULE-6a, FLOW-8, FLOW-9, FLOW-11, and FLOW-12. Count, redo, `sessionHand`, and `editActual`.
- `js/core/scoring.js` — SCORE-1, SCORE-2, SCORE-3, SCORE-4, FLOW-7, FLOW-7a, and RULE-3c. `pitchMiss` is the only severity source. `hitSpot` and `strikeOf` are hit spot versus strike. The penalty reads `calledTypeOf`.
- `js/core/csv.js` — RULE-9 and RULE-10. `csvRow` is the one CSV row builder. `calledTypeOf` lives here.
- `js/core/workload.js` — today's pitch count, the Fri–Sun weekend count, and the soft day and weekend alerts. The alert turns amber at 85%.
- `js/core/sync.js` — SYNC-1, SYNC-2, SYNC-3, and RULE-4a. A read keeps a grid aim that fails `validCalled` and sets `calledFlag`. `scorerOfRow` is the lock's row reader (RULE-5a).
- `js/core/modes.js` — FLOW-13, FLOW-13a, FLOW-14, FLOW-15, VIEW-3, RULE-5, and RULE-5a. `createGame`, `endGame`, `discardGame`, `pauseGame`, `todaysScheduled`, and the scoring lock.
- `js/core/store.js` — RULE-10, RULE-11, and RULE-11a. Roster, `jerseyError`, and the local save.

- `js/ui/shared.js` — DOM helpers, the store, roles, the zone, banners, and sync. `tapLoc` is one `aimRejectMsg` call.
- `js/ui/zonegfx.js` — VIEW-1 markers, the plate, and the recent-pitch list.
- `js/ui/game.js` — portrait Game. It calls `flow.js`.
- `js/ui/coach.js` — landscape coach Game. `coachZoneAct` and `pointerdown` are the other `aimRejectMsg` calls.
- `js/ui/bullpen.js` — Bullpen. It calls the same flow.
- `js/ui/report.js` — the shared report, drill-down, and notes.
- `js/ui/stats.js` — Stats. Spot %, miss, competitive %, and strike % come from core.
- `js/ui/setup.js` — Setup, including the sync-problems sheet (SYNC-1).
- `js/ui/main.js` — the render loop, nav, and startup.

## Boundary rules

Each business rule lives in exactly one `js/core` module. `js/ui` files render and forward events. They do not define validators or rule logic.

Search before writing a helper. Never copy a block between files.

- One validator per concept. `validCalled` and `validActual` in `js/core/flow.js` are the location checks.
- One CSV row builder: `csvRow` in `js/core/csv.js`.
- One flow state machine: `js/core/flow.js`.
- One location module: `js/core/location.js` (`calledOf`, `actualOf`).
- One database target: `pcPickConfig` in `js/core/config.js`.

`js/core` never references `js/ui`. `js/ui` does not define `valid*`, `calc*`, or `*Of` rule functions. `js/ui` does not bind `PC`, copy `CH_TARGETS` or `LOW_RING`, or read `isZone`, `isStrike`, `GRID_XY`, `CH_TARGETS`, or `nearestTarget`, and `PC.aimRejectMsg` stays only in `coach.js` `coachZoneAct` and `pointerdown` and in `shared.js` `tapLoc` (one call each); `test/dup.scan.js` reads `test/dup.baseline.json` from the base branch and fails if a clone is added or the tree falls below the list (`--min-tokens 30`).

Every pull request cites the spec IDs it covers and adds the mapped tests first.

These files are IIFEs, not ES modules, so an import linter cannot see a cross-file call. `test/arch.scan.js` is the check that fails the build: core files must not mention `js/ui`, and UI files must not define those rule functions. `test/arch.negative.js` plants the copies that must fail. `test/dup.scan.js` runs `jscpd` on a Prettier copy and fails a clone that is not already listed.

## Where the rules live

`docs/SPEC.md` holds the FLOW, RULE, VIEW, INFRA, SCORE, and SYNC IDs. `docs/SCORING.md` holds the SCORE-1 through SCORE-4 wording, plus the grid, change-up aim, and shake-off notes. `LESSONS.md` is the live regression log. `docs/DESIGN.md` is the current visual system. `docs/TESTING.md` is how to run the checks. A version heading there is a test log, not a second spec.

History lives in `docs/archive/` and CHANGELOG.md. Don't read them unless asked. BRIEF-7 still needs a new plain-English line on every pull request.

## Standard builder brief

- **BRIEF-1.** Read AGENTS.md and `LESSONS.md`, then the spec IDs you touch. Every bug that reaches Jim gets a lesson entry plus a regression test.
- **BRIEF-2.** Post a short plan (files, shared modules, tests) before coding.
- **BRIEF-3.** Write tests first and cite rule IDs.
- **BRIEF-4.** One small task.
- **BRIEF-5.** Stay under the PR size cap.
A word-for-word move is free only when the blobs match and both paths are counted or both are excluded. Any other move counts the deleted lines plus the added lines. A move into test counts the old file.
- **BRIEF-6.** Use the staging DB only, never production.
- **BRIEF-7.** Add a plain-English CHANGELOG line.
- **BRIEF-8.** Never merge.

## PR gates

A change to a gate file (`test/prsize.js`, `test/changelog.js`, `test/prdiff.js`, `test/prgate.negative.js`, `test/git-base.js`, `.github/workflows/pr-gate.yml`, `.github/workflows/ci.yml`) fails the size check. That change needs an owner override: the pull request author is the repository owner, or the owner lands the edit on main. A branch that is behind main has to merge main before the changelog check passes.

The size cap is 300 lines. Files under `test/` and the root lockfiles are not counted.

## Staging database

Production is Supabase project `qeqijbrokrkzpcacpjyw`. Builders and CI do not connect to it, push migrations to it, or create branches on it. Production is chosen by a hostname check against `pcPickConfig.PROD.hosts` (the public site).

Any other host uses `http://127.0.0.1:54321`, or a staging project, and shows a banner that cloud sync is not the live database. In Node, `PC_SUPABASE_URL` and `PC_SUPABASE_ANON_KEY` override `localStorage.pc_supabase` (`{"url","key"}`). In the browser there is no process environment, so `localStorage.pc_supabase` is the override. If the URL hostname is the production project, the app uses the local address with no key.

Do not edit a migration file that is already on the base branch. A change there breaks the checksum of a migration that has been applied. The project-ref scan exempts that file only when the base branch has the same bytes. A new file is still scanned when its timestamp is old. Use the publishable (anon) key only. Never commit a secret or service-role key. Put staging values in the environment (Node) or in gitignored `.test-env`.

Staging is a persistent Supabase preview branch. Jim creates it in the dashboard (Branching, persistent) or, after `supabase login`, with `supabase --experimental branches create --persistent`. Do not run that from CI or from a builder session. The branch has its own URL and publishable key.

Schema checks run on that branch, or on the throwaway Postgres CI already starts: `test/pg-migrate.sh` applies `supabase/migrations`, then the database scripts run. Production schema changes only when that preview branch is merged into production. Merging git to `main` updates the site. It does not change the production database until the Supabase branch is merged.

Do not apply `supabase/migrations/20261014230000_bullpen_no_result.sql` to production until this build is live.

A viewer is read-only, a player writes only her own bullpen, a pcoach is limited to her `pitcher_ids`, and `set_charted_by` tags the pitches she charts.

## Tests

- Unit and prod host: `node --test test/logic.test.js test/prodref.test.js`.
- Boundaries: `node test/arch.scan.js && node test/arch.negative.js && node test/dup.scan.js`.
- Gates: `node test/prsize.js && node test/changelog.js && node test/prgate.negative.js`.
- UI, on a local static server at port 8766 with Chrome: `node test/ui.smoke.js 8766`, then `node test/<name>.ui.js http://localhost:8766/`. Names are in `docs/TESTING.md`.
- Postgres, localhost only: `test/pg-migrate.sh`, then `test/flow6a.pg.sh`, `test/badaim.pg.sh`, and `test/pendingbadaim.pg.sh`.
- Live Supabase scripts use the staging branch or local stack. They do not use production.
