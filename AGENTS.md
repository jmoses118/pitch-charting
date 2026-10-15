# Agent rules

Each business rule lives in exactly one `js/core` module. `js/ui` files render and forward events. They do not define validators or rule logic.

Search before writing a helper. Never copy a block between files.

- One validator per concept. `validCalled` and `validActual` in `js/core/flow.js` are the location checks.
- One CSV row builder: `csvRow` in `js/core/csv.js`.
- One flow state machine: `js/core/flow.js`.
- One location module: `js/core/location.js` (`calledOf`, `actualOf`).

`js/core` never references `js/ui`. `js/ui` does not define `valid*`, `calc*`, or `*Of` rule functions. `js/ui` does not bind `PC`, copy `CH_TARGETS` or `LOW_RING`, or read `isZone`, `isStrike`, `GRID_XY`, `CH_TARGETS`, or `nearestTarget`, and `PC.aimRejectMsg` stays only at `coach.js` lines 85 and 88 and `shared.js` line 77; `test/dup.scan.js` fails any clone that is not in the shrink-only `test/dup.baseline.json` (`--min-tokens 30`).

Every pull request cites the spec IDs it covers and adds the mapped tests first.

These files are IIFEs, not ES modules, so an import linter cannot see a cross-file call. `test/arch.scan.js` is the check that fails the build: core files must not mention `js/ui`, and UI files must not define those rule functions. `test/arch.negative.js` plants the copies that must fail. `test/dup.scan.js` runs `jscpd` on a Prettier copy and fails a clone that is not already listed.
