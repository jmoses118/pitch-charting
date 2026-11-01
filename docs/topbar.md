# Spec: top pitcher bar only where it does something (one PR)

Source: origin/main `bf8e8fc` (2026-10-22 1:30 PM ET), read-only clone. Complaint (Jim, 11:51 PM ET 10/31): "that top piece is irrelevant on most screens as it does nothing."

## What the bar is (code read)
- Rendered: `index.html:18`, `.pickrow` inside the sticky `<header>` (`style.css:34`), under the brand row (`index.html:17`). Holds `#pitcher` select, `#wlMini`, `#jerseyEdit` ('#'), `#addPQuick` ('+').
- Dropdown: fills from the active roster (`js/ui/main.js:18`). Changing it sets `S().curPitcher`, saves, re-renders, and toasts "Pitching change" during a game (`js/ui/game.js:78`).
- '#': opens the edit dialog for the current pitcher, coach only (`js/ui/setup.js:37`, hidden for others `main.js:14`).
- '+': opens Add pitcher, the same dialog as Setup's own `#addP` "+ Add pitcher" button (`setup.js:36`, `index.html:187`). A new pitcher becomes `curPitcher` (`setup.js:34`).
- Who reads `curPitcherId()` (`shared.js:38`):
  - Game in progress / Bullpen: every logged pitch (`shared.js:169` baseRec), sheets (`game.js:6`), alerts/workload (`shared.js:108-111`, shows only on game/bullpen). **Needed.**
  - Game scheduled list: one-tap start uses `curPitcherId()` as the starting pitcher (`game.js:115-119`, tap at `game.js:121`). **Needed** (no other picker on that path).
  - Game idle (no scheduled game): the start dialog has its own `#gPitcher` (`index.html:37`), seeded from curPitcher (`game.js:124`) and written back (`game.js:136`). Bar is redundant there, but keep it on the whole Game tab (see TB-2) so the scheduled path keeps working and Game stays one rule.
  - Stats: has its own `#sPitcher`; it already defaults to the global pick until the user picks (`stats.js:42`, `stats.js:106`). **Not needed.**
  - Setup: roster list plus its own Add button and per-row edit. **Not needed.**
- Already hidden today: landscape Game when not scoring (`style.css:499`).

## Measured (headless Chrome, Supabase blocked, test roster Reese #7 / Avery #45)
Bar slot = 48px row + 8px margin = **56px**. Mocked hide on Stats/Setup: header bottom 181 → 125px at 375x667, 390x844, 430x932; 158 → 102px at 667x375. **56px gained at every size.** Header top 0 and the TE wordmark top (77px portrait, 54px landscape, below the test-copy banner) are identical before and after and across Game idle/Stats/Setup. Buttons are 48x48 today. Scoring tabs (Bullpen, Game in progress) already use the compact entry header, which is unchanged.

## Rules
- **TB-1** Show `.pickrow` only on the Game tab (all states) and on Bullpen. Hide it with `display:none` on Stats and Setup, keyed off the body tab class (the same hook as `body.tab-game` in `style.css:497`). Do not hide it in JS per element.
- **TB-2** Keep the Game idle and scheduled bar as it is. The one-tap scheduled start reads it (`game.js:118`).
- **TB-3** On Stats and Setup the header keeps only the brand row (TE wordmark, sync and mode tags, #1E3FD0 border). Content starts directly below it, 56px higher. No placeholder slot. The brand row must not move: header top, wordmark y and nav y stay identical on every tab at each size.
- **TB-4** Remove nothing else. Keep `#pitcher`, `#jerseyEdit` and `#addPQuick` in the DOM so the handlers in `setup.js:36-37` and `game.js:78` and the tests keep working. Setup already has "+ Add pitcher" (`#addP`) and per-row edit, so the hidden '+' and '#' lose nothing there.
- **TB-5** Stats' `#sPitcher` keeps defaulting to the global selection until the user picks (current `stats.js:42`). Picking in Stats must NOT write `curPitcher`; that keeps a stats lookup from becoming a pitching change.
- **TB-6** Hidden means not focusable and not announced (`display:none`). Visible controls keep at least a 48px tap target (`--tap`).
- **TB-7** Bump `te-pitch-vNN` in `sw.js` and add a CHANGELOG entry.

## Acceptance tests (add to `test/layout.ui.js` or a new `test/topbar.ui.js`; Supabase routed to abort)
Sizes 375x667, 390x844, 430x932, 667x375. Roster: Reese #7, Avery #45.
1. Game idle, Game scheduled list, Bullpen, Game in progress (portrait): `#pitcher` is visible, 48px or taller, and shows "Reese #7". (Landscape Game idle stays hidden per `style.css:499`; landscape Game in progress is the coach screen.)
2. Stats and Setup: `.pickrow` computed `display:none`, `#pitcher`, `#jerseyEdit` and `#addPQuick` have a 0x0 box and are absent from tab order.
3. Header lock: at each size, `header.getBoundingClientRect().top` and `.brand img` top are equal on Game idle, Stats and Setup, within 0px. Nav top is equal on all tabs.
4. Space: on Stats and Setup, `header.bottom` is 56px less than on Game idle (±1px), and the first Stats card top is 56px less than on main.
5. Stats default: set curPitcher to Avery, open Stats, and `#sPitcher` shows Avery. Pick Reese in `#sPitcher`, go to Game, and the bar still shows Avery.
6. Scheduled start: with Avery selected, tap a scheduled game and the created game's pitcherId is Avery.
7. Setup "+ Add pitcher" opens the dialog, and a saved pitcher becomes selected on the Game bar (`setup.js:34`).
8. Existing `test/layout.ui.js` and `test/jersey.ui.js` still pass. Update any jersey test that clicks `#jerseyEdit` on Setup or Stats so it clicks it on Game.

## Files to touch (about 40 lines)
- `style.css`: 1–3 rules hiding `.pickrow` and `#wlMsg` on stats/setup.
- `js/ui/main.js`: only if the body tab class doesn't already cover stats/setup. Toggle `tab-<name>` next to `main.js:21`.
- `sw.js` and `CHANGELOG.md`: version bump (TB-7).
- `test/topbar.ui.js` (new) or `test/layout.ui.js`: acceptance tests 1–7.

## Risks
- State across tabs: curPitcher persists. A coach who changes the pitcher in Stats expects that change to stay on Stats (TB-5). Test 5 guards it.
- The sticky header gets shorter on Stats/Setup. Check that `scroll-margin` and any sticky offsets inside Stats don't assume 181px.
- `#wlMsg` and the workload alerts sit under the bar. They only show on game/bullpen (`shared.js:111`), so hiding them with the bar is safe, but verify there is no empty gap.
- A test or helper that clicks '#' or '+' while on Setup will break. Fix the test, not the rule.
- Role `player`: the dropdown is disabled (`main.js:14`). The rule is unchanged for that role.

Shots: `shots/<size>-<state>.png` (game-idle, game-scheduled, game-inprogress, bullpen, stats, setup, stats-MOCK, setup-MOCK), metrics in `shots/metrics.json`. Key: `key/390x844-stats-before-after.png`, `key/390x844-setup-before-after.png`.
