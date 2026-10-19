# Agent rules

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

## Standard builder brief

- **BRIEF-1.** Read SPEC.md, AGENTS.md, and LESSONS.md.
- **BRIEF-2.** Post a short plan (files, shared modules, tests) before coding.
- **BRIEF-3.** Write tests first and cite rule IDs.
- **BRIEF-4.** One small task.
- **BRIEF-5.** Stay under the PR size cap.
A word-for-word move is free only when the blobs match and both paths are counted or both are excluded. Any other move counts the deleted lines plus the added lines. A move into test counts the old file.
- **BRIEF-6.** Use the staging DB only, never production.
- **BRIEF-7.** Add a plain-English CHANGELOG line.
- **BRIEF-8.** Never merge.

A change to a gate file (`test/prsize.js`, `test/changelog.js`, `test/prdiff.js`, `test/prgate.negative.js`, `test/git-base.js`, `.github/workflows/pr-gate.yml`, `.github/workflows/ci.yml`) fails the size check. That change needs an owner override: the pull request author is the repository owner, or the owner lands the edit on main. A branch that is behind main has to merge main before the changelog check passes.

## Staging database

Production is Supabase project `qeqijbrokrkzpcacpjyw`. Builders and CI do not connect to it, push migrations to it, or create branches on it. Production is chosen by a hostname check against `pcPickConfig.PROD.hosts` (the public site).

Any other host uses `http://127.0.0.1:54321`, or a staging project, and shows a banner that cloud sync is not the live database. In Node, `PC_SUPABASE_URL` and `PC_SUPABASE_ANON_KEY` override `localStorage.pc_supabase` (`{"url","key"}`). In the browser there is no process environment, so `localStorage.pc_supabase` is the override. If the URL hostname is the production project, the app uses the local address with no key.

Do not edit a migration file that is already on the base branch. A change there breaks the checksum of a migration that has been applied. The project-ref scan exempts that file only when the base branch has the same bytes. A new file is still scanned when its timestamp is old. Use the publishable (anon) key only. Never commit a secret or service-role key. Put staging values in the environment (Node) or in gitignored `.test-env`.

Staging is a persistent Supabase preview branch. Jim creates it in the dashboard (Branching, persistent) or, after `supabase login`, with `supabase --experimental branches create --persistent`. Do not run that from CI or from a builder session. The branch has its own URL and publishable key.

Schema checks run on that branch, or on the throwaway Postgres CI already starts: `test/pg-migrate.sh` applies `supabase/migrations`, then the database scripts run. Production schema changes only when that preview branch is merged into production. Merging git to `main` updates the site. It does not change the production database until the Supabase branch is merged.
