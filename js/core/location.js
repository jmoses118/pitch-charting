/* Thunder Elite pitch charting – location.js: the one reading of a pitch's called and actual spot.
   Pure logic (no DOM). UI lists call calledOf / actualOf instead of copying the fallback. */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
// One list. A stored calledLoc is that box. Otherwise the targets. calledOf never makes scoring split "7/9".
function calledBoxes(p){if(!p)return [];if(p.calledLoc!=null&&p.calledLoc!==''){const z=+p.calledLoc;return Number.isFinite(z)?[z]:[];}return (p.targets||[]).map(z=>+z).filter(z=>Number.isFinite(z));}
function calledOf(p){const b=calledBoxes(p);if(!b.length)return null;return b.length===1?b[0]:b.join('/');}
function actualOf(p){if(!p)return null;if(p.actualLoc!=null)return p.actualLoc;return p.loc!=null?p.loc:null;}
Object.assign(PC,{calledBoxes,calledOf,actualOf});
})(typeof window!=='undefined'?window:globalThis);
