# Architecture

## Files
| Path | Role |
|---|---|
| `index.html` | Markup for every view (Game, Bullpen, Stats, Setup) and script tags |
| `style.css` | Styles (mobile first) |
| `config.js` | `window.PC_CONFIG`: Supabase URL + publishable key |
| `js/core/*.js` | Pure logic modules (no DOM), shared by browser and node tests |
| `logic.js` | Node entry point: loads the core modules in order and exports `PC` |
| `app.js` | UI: rendering, event handlers, roles/visibility, sync wiring |
| `sw.js` | Service worker: offline cache (`te-pitch-vNN`), network-first app files |
| `supabase/migrations/` | SQL migrations, identical to what is applied in Supabase |

## Core modules (load order = dependency order)
Each module is an IIFE that reads dependencies from the shared `PC` namespace (`const {…}=PC`) and registers its exports with `Object.assign(PC,{…})`. The browser loads them via `<script>` tags; node via `logic.js`.

1. **grid.js** – single source of truth for the location grid: zone 1–9, ring 11–18, way-off 21–24, `GRID_XY` lattice, `MAX_MISS`, `missDist`, `locInfo`, `pct`.
2. **calls.js** – pitch types, call codes (Jim's wristband language), call-code parsing, wristband/call sheet defaults.
3. **game.js** – count logic (GameChanger aligned), results, at-bat ends, batted-ball types, bullpen entry steps.
4. **scoring.js** – all scoring rules: miss severity (`pitchMiss` is the only severity source), souvenir, CH-low, ring/way-off, competitive %, heat maps, reports, summaries, K credit, count stats, trends, alert levels. Report, heat map and stats all call these same functions.
5. **csv.js** – CSV export/import.
6. **workload.js** – pitch counts today / this tournament weekend (Fri–Sun; Mon–Thu shows the last weekend), game and bullpen counted separately, optional soft day/weekend limits (`workloadAlert`: amber from 85%, red at the limit), in-game alert thresholds, optional rest-day guide (off by default).
7. **sync.js** – Supabase REST: `TABLES`, `keyOf`, row builders, `roleAllows` (client mirror of RLS), `mergeRemote`, push/pull loop.
8. **modes.js** – game and bullpen are mutually exclusive on a device: `modeLock(state, tab, canGame)` (a started, not-ended active game locks Bullpen; an active session with pitches locks Game), plus resumable `pausedGames` / `pausedSessions`. Pausing only clears `activeGame` / `activeSession`; no data changes.
9. **store.js** – default state, `localStorage` load/save + migrations (`ensureSync`), notes.

## Data flow
UI action → `store.update()` mutates state → saved to `localStorage` → marked dirty → `makeSync` pushes changed rows (filtered by `roleAllows`) via PostgREST with the access code in the `x-team-code` header → periodic pull merges remote rows (`mergeRemote`, newest `updated_at` wins). Test mode skips sync entirely.

## Service worker
`sw.js` precaches the file list `F` under cache `te-pitch-vNN`; bump the version when any app file changes. App files are fetched network-first so updates land on the next load; offline falls back to cache.

## Supabase schema + RLS summary
- Tables (`public`): `pitchers`, `games`, `sessions`, `pitches`, `call_sheets`, `notes`, `team_settings`, all keyed by `team_id` + id.
- `team_settings`: one row per team (`id='team'`): `alerts int[]`, `day_limit`, `weekend_limit`, `show_rest`, `rest jsonb`. Coach-only (RLS `req_team()`), shared by every coach phone; only pushed when a coach edits a setting, never by "mark all dirty", so a new coach phone cannot overwrite it with defaults.
- `private.teams` (team codes) and `private.access_codes` (role, `pitcher_id`, `pitcher_ids`) are not exposed.
- Helpers resolve the request's `x-team-code` header: `private.req_team()` (coach), `req_team_any()` (any valid code), `req_role()`, `req_pitcher()`, `req_pitchers()`.
- RLS: coach full read/write; viewer read-only; player reads her own games/pitches and writes only her own bullpen sessions/pitches; pcoach reads/writes sessions, bullpen pitches and notes for her `pitcher_ids`; `call_sheets` and `team_settings` coach-only. Trigger `set_charted_by` tags pcoach-charted pitches.
- RPCs: `whoami`, `coach_create_code(p_role, p_pitcher_id, p_label, p_pitcher_ids)`, list/revoke codes (anon only).
