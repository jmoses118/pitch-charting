---
name: project-intake-and-modular-build
description: >-
  Use at the start of any new software project or feature, and whenever handing
  repo work to a builder or reviewer: spec intake first, modular architecture,
  CI guardrails, fresh-builder-per-task.
---
# Project intake and modular build

## 1. Intake (before any code)
1. Collect the user's requirements and write a short SPEC.md: numbered rules (FLOW-n, RULE-n, VIEW-n), a LATER list of things not to build yet, a definition of done, and a test map linking each rule ID to a test.
2. Add an **Architecture** section that names the core modules (one per domain concept, e.g. flow, location, validation, export) and what each one owns.
3. List open questions where the current code and the requirements disagree. Get the user's answers and their explicit OK before building.

## 2. Repo guardrails (first PR, before features)
1. Add `.cursor/rules/architecture.mdc` (alwaysApply) and the same text in AGENTS.md:
   - Each business rule lives in exactly ONE core module. UI files only render and forward user events, with no rule logic and no validators.
   - Before writing a helper, search for an existing one and reuse or extend it. Never copy a block between files.
   - One validator per concept, one serializer per output format, and one state machine per flow.
   - Every PR cites the spec rule IDs it implements and adds the mapped tests first.
   - A new shared concept means updating the Architecture section of SPEC.md.
2. CI (blocking):
   - Unit and UI/e2e tests, including every mapped test.
   - A duplicate-code check (e.g. jscpd with --min-tokens about 30, run on a prettier-formatted copy so dense one-line code is still caught).
   - An import and usage boundary scan: core never imports UI, and UI can't call core primitives (rule constants, validators, zone/strike helpers), can't assign to the core namespace, and can't hard-code rule lists. Keep an allowlist for UI-only helpers. Prove the scan catches a planted copy.
   - A PR size cap (fail over about 300 changed lines, excluding tests and lockfiles).
   - Screenshot comparison at the target device sizes; unexpected visual changes fail.
   - Golden real-data replay: anonymized real sessions saved as fixtures must produce the same stats after every change.
   - The e2e tests must assert exact, hand-computed domain numbers (e.g. counts, percentages), not just that a screen loads.

3. Every PR gets a preview deploy (its own URL) so the user can try it on the real device before merging.
4. Add LESSONS.md: every bug that reached the user gets one line and a regression test, and every builder reads it first.
5. Error reporting from the live app (e.g. Sentry) so real crashes are captured automatically.
6. A separate staging/test database (e.g. a Supabase branch). Builders and CI never touch production; only a merge does.
7. Take an automatic backup or snapshot before every production migration, with a documented restore.
8. Keep a plain-English CHANGELOG line per merge, written for the user, not developers.
9. Bug intake: the user sends what they tapped, what they expected and a screenshot. It becomes a failing test before it's fixed.
10. Use feature flags for new features, plus a one-step rollback of production to the last good version.

## 3. Build loop
Every fresh builder gets the same standard brief: read SPEC.md, AGENTS.md and LESSONS.md, post a plan, write tests first, cite rule IDs, stay under the PR size cap, use the staging DB only, and never merge.
0. Plan first: the builder posts a short plan (files, shared modules used or added, tests) and the code reviewer approves it before any code is written.
1. Give each task a FRESH builder (cloud agent) that starts from SPEC.md and the repo rules. One small task per builder, citing rule IDs. Don't steer mid-build unless there's a bug; batch the user's new ideas for the next task.
2. For tricky core logic, the code reviewer writes the failing tests first and the builder makes them pass. Optionally run two builders on the same core task and keep the cleaner result.
3. Build a thin end-to-end slice first, then add features in small stacked PRs.
4. Every PR goes to the code reviewer (DRY and modularity are blocking), plus domain and UI reviewers when it touches their area. Merge only on the user's word.
5. Changes the user asks for update SPEC.md first, then the code. Retire a builder once its stack is merged.
