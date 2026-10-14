# Thunder Elite pitch charting

Mobile-first, offline-first pitch charting for Thunder Elite 13U fastpitch (game + bullpen).
Static web app (no build step) hosted on GitHub Pages: https://jmoses118.github.io/pitch-charting/
Data lives in `localStorage` on each phone and optionally syncs to Supabase per team.

Highlights: game + bullpen charting with Jim's wristband calls, miss severity / competitive % scoring ([docs/SCORING.md](docs/SCORING.md)), heat maps and reports, and a pitch-count reminder on pitcher select and in the game header — *Today: X game + Y bullpen · Weekend: X game + Y bullpen* — with optional coach-set soft limits per day / tournament weekend (Fri–Sun). A phone scores one thing at a time: a game in progress must be paused or ended before a bullpen, and vice versa.

## Setup
- Serve the folder with any static server, e.g. `python3 -m http.server 8766`, and open http://localhost:8766/.
- `config.js` holds the Supabase URL and **publishable** key (safe for clients; RLS enforces access). Never put a secret/service key in the repo.
- Install the app on a phone with "Add to Home Screen"; the service worker (`sw.js`) caches every file for offline use.

## Sync problems
If the server refuses a change, Setup → Cloud sync shows **⚠ Sync problems**. Open it to retry or discard each change; Cancel leaves everything as it was.

## Privacy (minors)
The repo is public and the players are minors. The app shows pitchers as **first name + jersey number** only (`PC.pitcherLabel`). Never commit surnames, birthdays or other personal details in code, seeds, tests, docs or screenshots. Use test data in demos.

## Roles and access codes
Sync is unlocked by entering an access code (Setup → Sync). The code decides the role:

| Role | Code | Can |
|---|---|---|
| coach | team code | everything: chart games/bullpens, call sheets, settings, create other codes |
| viewer | `TEV-…` | read everything, write nothing |
| player | `TEP-…` | chart her own bullpens, read her own games/stats |
| pcoach (pitching coach) | `TEC-…` | bullpens, stats, notes for assigned pitchers only |

Coaches create codes in Setup → Access codes (`coach_create_code` RPC). Codes are secrets: never commit them or show them in screenshots. **Test mode** never syncs.

## Development
- Unit tests: `node --test test/logic.test.js` (runs in CI on every PR). See [docs/TESTING.md](docs/TESTING.md).
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Scoring rules: [docs/SCORING.md](docs/SCORING.md). History: [CHANGELOG.md](CHANGELOG.md).

## Process and deploy
- All changes go through a feature branch + pull request; no direct pushes to `main`.
- Each PR: clear description, tests run listed, docs/CHANGELOG updated, CI green before merge.
- Merging to `main` deploys GitHub Pages automatically. Bump the cache name in `sw.js` whenever app files change so phones pick up the update.
- Database changes: add a file to `supabase/migrations/` (timestamp_name.sql) matching what is applied to the Supabase project.

### One scoring phone
A live game or bullpen is scored only from the phone that started it. Other phones can watch it live (view only). If the scoring phone dies, tap **Take over scoring** and confirm.
