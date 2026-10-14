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
