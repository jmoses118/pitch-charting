# Design system

The app is used on an iPhone, one-handed, in a dugout, often in direct sun. It is dark and high-contrast, and Thunder Elite royal blue (#1E3FD0) on black is the only brand color. Everything is defined as CSS custom properties at the top of `style.css`.

## Tokens
- **Color:** `--c-bg`, `--c-surface` / `-2` / `-3` (raised layers), `--c-line` / `--c-line-strong`, text `--c-text` / `-2` / `-3`, brand `--c-royal` (fills), `--c-royal-hi` (focus and selected borders), `--c-royal-text` (blue text on dark), `--c-royal-tint` (active nav, lock card), plus semantic `--c-success`, `--c-danger`, `--c-warn` with `-text` variants. Body and secondary text are ≥4.5:1.
- **Space:** a 4-pt scale `--s1`…`--s6` (4, 8, 12, 16, 24, 32 px).
- **Radius:** `--r-sm` 8, `--r-md` 12 (controls), `--r-lg` 16 (cards, sheets), `--r-pill`.
- **Type:** system SF font, 1.2 scale `--fs-xs` 12 … `--fs-2xl` 28, tabular numerals everywhere.
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
- **Pitch chips** (`.chips`): 44px pill buttons (48px in one-hand mode, 42px on short screens), abbreviations only with the full name as the label. The row scrolls sideways and has no visible scrollbar.
- **Step line** (`.stepline`): a 2px three-segment progress line plus `button.mini` actions (Band, Result). The hint text is one ellipsized line and is hidden under 720px tall.
- **Zone sizing** (`fitZone()`): height = viewport − zone top − tab bar − way row, clamped so a strike-zone box is ≥ `ZONE_MIN_BOX` (48px). The `.zseg` batter control is placed in viewBox space (−13…30, 124+), which is clear of every tap box.
- **Bottom sheets** (`.bsheet`, `body.wbopen #wbCard`): fixed to the bottom over the tab bar (z-index above `nav`), with a grab handle and a close button. The result sheet uses 56px buttons in 3 columns (64px in one-hand mode).
