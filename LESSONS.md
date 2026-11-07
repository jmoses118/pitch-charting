## Gotchas

Soft coach result buttons used opacity, so Ball, Strike, Foul, In play and HBP sat around 2:1 before the pitch was ready. They keep the Okabe-Ito fills at full strength, and Redo may stay dim. Regression: test/resultcontrast.ui.js VIEW-2.
The Elite script on the wordmark is white, so it vanished on the white Field header. Field paints that plate with `--c-text`. Night keeps it white. Regression: test/jersey.ui.js VIEW-4.
A -0.07em squeeze made the narrow tiny warnings fit, and the moved aim dropped to 13px with no gap after the call code. Normal spacing now decides fit, and the moved aim matches the no-warning aim. Regression: test/flow.ui.js VIEW-5.
An or-branch in the narrow warning test let Drop: low sit in the cell or on the hint. Jim ruled it moves to the hint only when it does not fit, and that hint replaces the step prompt. The aim text stays. Regression: test/flow.ui.js VIEW-5.
A spec exception must be implemented as an explicit rule in code (a named CSS variable or branch) and tested with exact values on both sides of the boundary, never accepted because one screen size happens to land on the number. bug-landscape-956: the 46px under-400px floor passed at 384 by coincidence and broke at 375/360.
PR body claims like "unchanged" must be verified with a pixel diff before posting.
bug-landscape-956 reached Jim on his iPhone 17 Pro Max. The wristband left dead strips, the results sat low, and In dirt sat below the band. Regression: test/layout.ui.js.
Test layout floors with real safe-area insets, not just bare viewports. bug-landscape-956: 956×360 and 956×375 fit a 46px zone on a bare screen and overflowed once the notch and home bar took height.

A migration that deletes every pitch with an illegal aim reached main via #14's history in supabase/migrations/20261015130000_delete_bad_aim_pitches.sql (the file itself merged in #24). supabase db push applies that folder. Those rows stay and are flagged. An owner-approved delete names the ids once, copies that set into a backup, and deletes from the backup inside a transaction that rolls back unless the approved, backup, and deleted counts match. Regression: test/pendingbadaim.pg.sh.
The edit sheet used to open on loc when actualLoc disagreed; it follows actualOf. Regression: test/logic.test.js “edit sheet reads actualLoc before loc” and test/editpitch.ui.js.
A shake-off used to demand a new aim; the original box stays, and a later aim tap can still replace it. Regression: test/logic.test.js RULE-3d and test/shake.ui.js.
The 375×667 scoring screen used to scroll the zone under the tab bar. Regression: test/fit.ui.js at 375×667.
Short-phone pitch buttons, the pitcher row, Batter, Band, and Result used to shrink to 44px, and the portrait wristband scrolled sideways. They are 48px again. At 375 the band cells are 48 tall and about 42–44 wide so all 8 columns fit. Regression: test/fit.ui.js.
Way-off and dirt used to be accepted as called targets; they are actual locations only. Regression: test/wayoff.ui.js and test/logic.test.js RULE-3a.
#26 scan matched names only and was beaten by renaming -> test/arch.negative.js
Tapping Game re-entered scoring because that tab shows the live game whenever one is active, and Start created the game on the same tap, even with a blank opponent named Opponent.
Exit only left the screen, so an empty game stayed on the list with no picker and no discard.
Regression: test/logic.test.js "FLOW-13 createGame returns null until opponent and pitcher are set", "FLOW-14 pauseGame keeps the row and endGame waits for confirmation", and "FLOW-15 discard pushes deleted and a pull does not bring it back".
The picker check is test/modes.ui.js "picker shows N Resume rows and one Start".
The paused card is gone. The picker is the list. Regression: test/modes.ui.js "picker shows N Resume rows and one Start".
Git can score a rename R100 when the lines are only reordered. A free move needs the same blob on both sides. Regression: test/prgate.negative.js "BRIEF-5 an R100 line reversal counts the whole file" and "BRIEF-5 a pure rename of a 600-char line passes".
A move into test/ was free because the deletion folded into the test path. The old file counts. Moving a file out of test/ still counts the new file. Regression: test/prgate.negative.js "BRIEF-5 a move into test/ counts the source file" and "BRIEF-5 an edited move from test/x.js to js/x.js counts the full file".
The tap-a-box view called a curveball that missed up "CH up" and "change-ups" after HM-9a widened `chUp` to CB, DR, and DC. Words for a rule that covers several types come from core with the type, never a hard-coded type in the UI. Regression: test/logic.test.js "HM-9a drill" and test/wayoff.ui.js.
At 430×932 the ball-in-play Ground and Liner chips covered the Batter button. The button sizes to its label and that row starts to its right. A wider face steps that row's type down so the names still fit and the row is not put back on the button. The sheet's open slide is ignored when measuring, so the gap survives the animation. Regression: test/contact.ui.js and test/fit.ui.js RULE-8.
Game home was shorter than the iPhone, so the installed app left a 62pt black band under the tab bar (440×956, 21 Oct). Bullpen and scoring already filled the screen and the bar met the glass. The installed portrait page now fills the screen. The labels stay above the home indicator. Regression: test/layout.ui.js VIEW-6 runs the script in index.html. A normal browser tab stays unmarked.
