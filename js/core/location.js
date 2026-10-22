/* Thunder Elite pitch charting – location.js: the one reading of a pitch's called and actual spot.
   Pure logic (no DOM). UI lists call calledOf / actualOf instead of copying the fallback. */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
// One list. A stored calledLoc is that box. Otherwise the targets. calledOf never makes scoring split "7/9".
function calledBoxes(p){if(!p)return [];if(p.calledLoc!=null&&p.calledLoc!==''){const z=+p.calledLoc;return Number.isFinite(z)?[z]:[];}return (p.targets||[]).map(z=>+z).filter(z=>Number.isFinite(z));}
function calledOf(p){const b=calledBoxes(p);if(!b.length)return null;return b.length===1?b[0]:b.join('/');}
function actualOf(p){if(!p)return null;if(p.actualLoc!=null)return p.actualLoc;return p.loc!=null?p.loc:null;}
// D-6. The one reading of a stored tap point. It counts only while xy_loc is the landed code. Otherwise all three are null.
function xyOf(p){const xy=PC.cleanXY(p&&p.actual_x,p&&p.actual_y,p&&p.xy_loc),at=actualOf(p);if(xy.xy_loc==null||at==null||xy.xy_loc!==+at)return {actual_x:null,actual_y:null,xy_loc:null};return xy;}
Object.assign(PC,{calledBoxes,calledOf,actualOf,xyOf});
})(typeof window!=='undefined'?window:globalThis);
