# Agent rules

Each business rule lives in exactly one `js/core` module. `js/ui` files render and forward events. They do not define validators or rule logic.

Search before writing a helper. Never copy a block between files.

- One validator per concept. `validCalled` and `validActual` in `js/core/flow.js` are the location checks.
- One CSV row builder: `csvRow` in `js/core/csv.js`.
- One flow state machine: `js/core/flow.js`.
- One location module: `js/core/location.js` (`calledOf`, `actualOf`).

`js/core` never references `js/ui`. `js/ui` does not define `valid*`, `calc*`, or `*Of` rule functions.

Every pull request cites the spec IDs it covers and adds the mapped tests first.

These files are IIFEs, not ES modules, so an import linter cannot see a cross-file call. `test/arch.scan.js` is the check that fails the build: core files must not mention `js/ui`, and UI files must not define those rule functions. `jscpd` fails when a cloned block appears under `js/`.
