# Design system

The app is used on an iPhone, one-handed, in a dugout, often in direct sun. It is dark and high-contrast, and Thunder Elite royal blue (#1E3FD0) on black is the only brand color. Everything is defined as CSS custom properties at the top of `style.css`.

## Tokens
- **Color:** `--c-bg`, `--c-surface` / `-2` / `-3` (raised layers), `--c-line` / `--c-line-strong`, text `--c-text` / `-2` / `-3`, brand `--c-royal` (fills), `--c-royal-hi` (focus and selected borders), `--c-royal-text` (blue text on dark), `--c-royal-tint` (active nav, lock card), plus semantic `--c-success`, `--c-danger`, `--c-warn` with `-text` variants. Body and secondary text are ≥4.5:1.
  `--c-coach-accent` (#9DB2FF) is the blue on the dark coach panel: the aim label, the step number, the undo button, and the call warning and change-up refusal. It does not change with Field, because that panel stays dark.
  Night sets `--c-royal` to #3A5CF0 so white text on a fill stays readable. Buttons, selects and inputs are 2px in both palettes. The Night status card and pitch-log rows match Field. A pressed Night primary uses `--c-royal-press` (#2C45B4). The wordmark file is unchanged.
- **Space:** a 4-pt scale `--s1`…`--s6` (4, 8, 12, 16, 24, 32 px).
- **Radius:** `--r-sm` 8, `--r-md` 12 (controls), `--r-lg` 16 (cards, sheets), `--r-pill`.
- **Type:** system SF font, 1.2 scale `--fs-xs` 12 … `--fs-2xl` 28, tabular numerals everywhere. Warning text uses `--fs-13` (13px), between `--fs-xs` and `--fs-sm`.
- **Touch:** `--tap` 48px minimum and `--tap-lg` 56px for entry buttons (60–64px in one-hand mode).
- Legacy aliases (`--card`, `--acc`, `--grn`, …) map onto the tokens for older inline styles.

## Components
- **Buttons:** default (surface), `.primary` (royal), `.success`, `.danger` (outlined; filled for destructive confirms), `.ghost`, `.link`, `.icon`; `.sel` marks the current choice.
- **Cards:** `.card`. Progressive disclosure uses `<details class="disc">` (a chevron summary, 48px tall).
- **Sheets:** every `<dialog class="sheet">` becomes a bottom sheet on phones.
- **Steps:** the `#steps` indicator above the zone shows Pitch → Aim → Landed (bullpen) or Pitch → Location → Result (game).
- **Scoreboard:** the four tiles in the sticky header (inning, count, outs, pitches).
- **Nav:** a bottom tab bar in the thumb zone, with authored SVG icons; the active tab gets a royal tint.

## Screen rules
- One primary task per screen. Secondary panels are collapsed: game options, Stats → "More tables", and Setup sections (only Test mode, Cloud sync and Pitchers open by default).
- Feedback (toasts) appears near the thumb, above the nav, and never covers the zone.

## Zone graphics (Gameday-inspired, `js/ui/zonegfx.js`)
- **Pitch markers** are small softballs: an optic-yellow core (`--c-ball`) with red stitched seams (`--c-stitch`), numbered in sequence. The ring color shows the result (`PC.pitchMark`):
  - `--c-mark-good`: on target (≤1 box off), or competitive when nothing was aimed.
  - `--c-mark-miss`: missed.
  - `--c-mark-souv` plus a star badge: souvenir (middle-middle when 5 wasn't the target).
  - Several pitches in one box spread out in a fixed pattern.
- **Orientation:**
  - Home plate is drawn in perspective under the grid (flat edge toward the pitcher), with a dashed frame around the one-box-off ring and a white zone frame.
  - A faint batter silhouette sits on her side when a batter is set: RHB on the pitcher's right, LHB mirrored.
  - With no batter, glove/arm-side labels are shown instead.
- **Taps are unaffected:** every graphic is `pointer-events:none`, so the 48px+ zone boxes take taps exactly as before. Everything is inline SVG and works offline.
- **Recent-pitch list** under the zone shows the current at-bat (or the last one right after it ends) or the last 10 of the session, newest first, each with a badge, result, pitch type and aim → landed.
- The **heat-map drill-down** uses the same softballs; the number is how many landed in that box.

## One-screen entry (v34)
Rule: on a 390×844 phone (and 375×667 for an SE), everything needed to log a pitch is visible without scrolling. `test/fit.ui.js` checks this.
- **Order** (`body.entrymode`, flex `order`): slim header → sticky entry bar (pitch chips + step line) → zone → way-off row → [secondary cards: recent pitches, session/game controls, call sheet, log].
- **Slim header:** pitcher select, `.wlmini` workload counts (colored at the warn/limit levels) and the sync chip in compact form (`☁ ✓`, `☁ 3` pending, `☁ !` error). The brand row hides while charting.
- **Pitch chips** (`.chips`): 48px pill buttons, abbreviations only with the full name as the label. The row scrolls sideways and has no visible scrollbar.
- **Step line** (`.stepline`): a 2px three-segment progress line plus `button.mini` actions (Band, Result). The hint text is one ellipsized line and is hidden under 720px tall.
- **Zone sizing** (`fitZone()`): height = viewport − zone top − tab bar − way row, clamped so a strike-zone box is ≥ `ZONE_MIN_BOX` (48px). The `.zchip` **Batter** chip is placed in viewBox space (−13…30, 124+), which is clear of every tap box. It opens `#batDlg`, a sheet with a `.seg3` choice (No batter / LHB / RHB; no "No batter" in a game).
- **Bottom sheets** (`.bsheet`, `body.wbopen #wbCard`): fixed to the bottom over the tab bar (z-index above `nav`), with a grab handle and a close button. The result sheet uses 56px buttons in 3 columns (64px in one-hand mode).

## Dialogs and sheets (v35)
- **Opening and dismissing:** open with `openSheet(dialog)`, which resets `returnValue`. Every `<dialog>` closes without saving on Cancel (`value="cancel" formnovalidate`, so required fields can't block it), on Escape and on a backdrop tap; all three set `returnValue='cancel'`. Save handlers act only on `returnValue==='ok'` (or `'reset'`).
- **Inline sheets:** the result and wristband sheets close with their ✕/toggle and with Escape.
- **Toasts:** while charting they sit at the top over the header, never over the zone.
- **Pitcher picker:** shows first name + number only; handedness lives in Setup.
- **Segmented controls:** every option must be fully visible in the viewport at 390×844 and 375×667. `test/sheets.ui.js` enforces this.

## Header and text-fit rules (v36)
- **Header layout:**
  - Logo row: brand · sync chip · mode tag.
  - Pitcher row: the picker sizes to its content and never truncates; the add (+) button sits beside it.
  - Not charting: the full workload sentence is on its own line.
  - Charting: the logo row hides, the sync chip moves (compact) next to the picker, and the short "Today n · Wknd n" counts wrap rather than squeeze the name.
- **No text may clip or ellipsize unintentionally** on any tab or state at 375×667, 390×844 and 430×932, and no controls may overlap. `test/layout.ui.js` enforces this. The pitch-type row is the sideways scroller. The portrait wristband does not scroll sideways: at <=390px wide, cells may be 42–44px wide and height stays 48 so all 8 columns fit. The SE exception is the 667×375 strike box, which may be 34px. A pitcher name that cannot fit at 14px ellipsizes and keeps the jersey number. The workload counts sit on their own row so the name stays readable.

## Coach screen (v37)
Landscape only (`(orientation: landscape) and (max-height: 500px)`). The grid is band, then status + zone, then results. `sizeCoach()` caps the band and the zone at 56px.
At 844×390 the band cell is 49px. At 667×375 the zone is about 34px. Palettes use `html[data-theme=field|night]`. Band setup maps a cell with no zone to a spot once per sheet. The bullpen pad (`#bpPad`) is fixed above the nav, and fitZone subtracts `--pad-h`.

Review fixes (v37): `.cs-hint` is a fixed single line (ellipsis), `.cstatus` has a fixed height (`--c-sth`), and `sizeCoach()` caps the zone by height and counts the 1.5px grid lines. Under 700px width `.coach.compact` uses `--c-rh` 20, `--c-res` 102, band 44, a compact status and a ⋯ icon.
The batter line stays visible. The status stays 112px tall, so the menu stays at (506, 71) and the zone does not move. On the narrow screen a 13px warning sits in its own cell beside the batter line, and the call code stays 18px in the same place. The pitch count stays on the batter line. The narrow cell says 5: miss, CB: low, CH: low, Drop: low, or DC: low, and the screen-reader label keeps the full sentence. Elements marked `data-ellipsis` may truncate on purpose (the layout audit skips them).

## Sync problems dialog (v39)
Setup → Cloud sync shows a red "⚠ Sync problems (N) – view" button only when the server refused changes. The bottom sheet lists each change in plain words: what (first name, pitch, where) and "Why: <sentence> · Oct 14, 8:56 AM" from `PC.syncWhy` (401 sign-in ran out, 403 not allowed, 409/duplicate already saved, other 4xx couldn't read). The raw server text is behind a closed "Details" toggle. Each row has a Keep / Retry / Discard segmented control (44px; Discard has red text and outline, and turns solid red when picked). After Apply, discards get a 6-second "N change(s) discarded · Undo" toast. "Retry all" sets every row to Retry. The Cancel / Apply footer is sticky, and nothing changes until Apply.

Change-up aims: in ✎ Aim mode, boxes a change-up can't be aimed at become dashed outlines with no fill and #5B6472 numbers. A tap there shows a short yellow warning in the status strip ("Change-up: aim low", or "CH: low" on the narrow coach screen). The bullpen toast keeps the full list. Band setup shows "Change-ups aim low: 4, 7, 8, 9, 13, 14 or 18." under change-up rows and flags an old high aim with a yellow left border.

## Scoring lock (v39)
- View-only phone, portrait: amber bar at the top of entry – "👁 Scoring on another phone · view only" + **Take over scoring** (≥44px). Scoring controls hidden; count, zone and recent pitches stay visible.
- Coach landscape: the result column becomes "👁 Scoring on another phone / View only / **Take over scoring**".
- ⋯ Game menu on a view-only phone: amber note "👁 Scoring on another phone · view only. Game changes are off here." + **Take over scoring** on top; game-changing items greyed (disabled); Band setup, Display and Mirror stay active.
- Takeover popup: title "Take over scoring?", body "Another phone is scoring this. Only take over if that phone died or the coach handed it to you. That phone will switch to view only.", buttons Cancel (focused) and **Take over scoring**.

## Shake-off (v39)
- Portrait: "⤺ Shake-off" (≥44px, violet outline) right-aligned under the entry steps; enabled once a wristband call is made. Tapping shows a violet bar "⤺ Shook off CH7 → tap the pitch she threw" (then "→ threw FB") with **Cancel**.
- Coach landscape: "⤺ Shake-off" button after Aim/Undo/Same. Tapping swaps the result column for the thrown-type picker (FB, CH, CB…) + "✕ Cancel"; the call line reads "⤺ CH7 → ?" then "⤺ CH7 → FB". After a type, results return and the button becomes "✕ Shake" (cancel).
- Stats: a "Shake-offs · Name #: N" card (not hidden in More tables) with a Shook off / Followed call table (#, Str%, H, Hard, K, Ball) and a list "Called CH8 → threw FB 5 · 0-2 · after CH · Foul · 2B (LD)".

## Scoring screen (v40)
Same Field / Night tokens and result colours. Ball, Foul and HBP use `#0B0F17` text. The result sheet is 4 columns (primary results 64px, the rest at least 48px). Cancel, Undo and Redo are pinned to the bottom of the sheet. Foul saves on the Foul tap; Early / On time / Late chips update that pitch for about 5 seconds. Ball in play uses outline chips labelled Ground, Liner, Fly and Pop up, then the play. In dirt and Over catcher sit beside the four way-off buttons (one 48px row) so the zone keeps its height. On the coach screen that same 48px row sits under the zone (`#cSlot`); during a ball in play it swaps to the contact chips. Wild pitch / velocity on the portrait sheet is under More. On the coach screen it is still `#xDlg` with Cancel and Done. Every popup uses the existing Cancel / Escape / backdrop pattern. Start game and the sync pill use white text on the green fill. Tapping a pitch in the log, the recent list, or Stats → Pitches opens Fix location (from video): the same zone, ring, way-off row, and In dirt / Over catcher, with Way off and In dirt above Save. The subtitle is "Aim and result stay the same." Save and Cancel sit on the footer (Cancel at least 48px). The log says "Tap a pitch to fix where it went" and each row has ✎. A corrected pitch shows "from video". Stats rows show aim → actual. Undo after a correction restores that spot; the toast offers Undo for about 5 seconds.
