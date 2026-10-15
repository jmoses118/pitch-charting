The edit sheet used to open on loc when actualLoc disagreed; it follows actualOf. Regression: test/logic.test.js “edit sheet reads actualLoc before loc” and test/editpitch.ui.js.
A shake-off used to demand a new aim; the original box stays, and a later aim tap can still replace it. Regression: test/logic.test.js RULE-3d and test/shake.ui.js.
The 375×667 scoring screen used to scroll the zone under the tab bar. Regression: test/fit.ui.js at 375×667.
Short-phone pitch buttons, the pitcher row, Batter, Band, and Result used to shrink to 44px, and the portrait wristband scrolled sideways. They are 48px again. At 375 the band cells are 48 tall and about 42–44 wide so all 8 columns fit. Regression: test/fit.ui.js.
Way-off and dirt used to be accepted as called targets; they are actual locations only. Regression: test/wayoff.ui.js and test/logic.test.js RULE-3a.
#26 scan matched names only and was beaten by renaming -> test/arch.negative.js
