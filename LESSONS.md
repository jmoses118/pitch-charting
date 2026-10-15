The edit sheet used to open on loc when actualLoc disagreed; it follows actualOf. Regression: test/logic.test.js “edit sheet reads actualLoc before loc” and test/editpitch.ui.js.
A shake-off used to demand a new aim; the original box stays, and a later aim tap can still replace it. Regression: test/logic.test.js RULE-3d and test/shake.ui.js.
The 375×667 scoring screen used to scroll the zone under the tab bar. Regression: test/fit.ui.js at 375×667.
Way-off and dirt used to be accepted as called targets; they are actual locations only. Regression: test/wayoff.ui.js and test/logic.test.js RULE-3a.
#26 scan matched names only and was beaten by renaming -> test/arch.negative.js
