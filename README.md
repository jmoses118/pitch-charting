# Thunder Elite pitch charting

Mobile-first, offline-first pitch charting for Thunder Elite 13U fastpitch (game + bullpen).
Static web app (no build step) hosted on GitHub Pages: https://jmoses118.github.io/pitch-charting/
Data lives in `localStorage` on each phone and optionally syncs to Supabase per team.

Highlights: game + bullpen charting with Jim's wristband calls, miss severity / competitive % scoring ([docs/SCORING.md](docs/SCORING.md)), heat maps and reports, and a pitch-count reminder on pitcher select and in the game header — *Today: X game + Y bullpen · Weekend: X game + Y bullpen* — with optional coach-set soft limits per day / tournament weekend (Fri–Sun). A phone scores one thing at a time: a game in progress must be paused or ended before a bullpen, and vice versa.

## Setup
- Serve the folder with any static server, e.g. `python3 -m http.server 8766`, and open http://localhost:8766/.
- `config.js` holds the Supabase URL and **publishable** key (safe for clients; RLS enforces access). Never put a secret/service key in the repo. The public site is the only copy that uses production. This computer uses local Supabase, or `PC_SUPABASE_URL` and `PC_SUPABASE_ANON_KEY` for a staging branch.
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
- Rules: [AGENTS.md](AGENTS.md), [docs/SPEC.md](docs/SPEC.md), and [docs/SCORING.md](docs/SCORING.md). History in [docs/archive/](docs/archive/) and [CHANGELOG.md](CHANGELOG.md) is not a builder reading.

## Process and deploy
- All changes go through a feature branch + pull request; no direct pushes to `main`.
- Each PR: clear description, tests run listed, docs/CHANGELOG updated, CI green before merge.
- Merging to `main` deploys GitHub Pages automatically. Bump the cache name in `sw.js` whenever app files change so phones pick up the update.
- Database changes: add a file to `supabase/migrations/` (timestamp_name.sql) matching what is applied to the Supabase project.

### One scoring phone
A live game or bullpen is scored only from the phone that started it. Other phones can watch it live (view only). If the scoring phone dies, tap **Take over scoring** and confirm.

### Shake-offs
If she shakes off your call, tap **⤺ Shake-off** (portrait or the landscape coach screen), pick the pitch she threw, then where and the result as usual. Stats shows a Shake-offs card per pitcher: how her shake-offs did vs pitches that followed the call, and each one with the count and the pitch before it.

### Scoring a game
Scheduled games (from schedule sync) start with one tap. Then: call (wristband) → where it was aimed → where it went → a big result button. Foul saves on that tap; early / on time / late is optional after. Ball in play can note Ground, Liner, Fly or Pop up, then the play. Undo steps back through the location tap and the last pitch; Redo (up to 10, kept on this phone until the next pitch) puts them back. In dirt and Over catcher are actual locations only. Tap a pitch in the list (during the game, or in Stats after it) to correct where it actually went. Later pitches stay. When that call named more than one box, the called box becomes the one nearest the corrected spot. Only the scoring phone can save that. Stats can export one pitcher on one date as CSV. The file name uses her first name and jersey. The export includes a from_video column when a pitch was corrected. Undo right after that correction puts the spot back.
