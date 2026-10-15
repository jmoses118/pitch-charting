/* Thunder Elite pitch charting – location.js: the one reading of a pitch's called and actual spot.
   Pure logic (no DOM). UI lists call calledOf / actualOf instead of copying the fallback. */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
function calledOf(p){if(!p)return null;if(p.calledLoc!=null)return p.calledLoc;const t=p.targets||[];if(!t.length)return null;return t.length===1?t[0]:t.join('/');}
function actualOf(p){if(!p)return null;if(p.actualLoc!=null)return p.actualLoc;return p.loc!=null?p.loc:null;}
function aimsOf(p){const c=calledOf(p);if(c==null||c==='')return [];if(typeof c==='number')return [c];return String(c).split('/').map(z=>+z).filter(z=>Number.isFinite(z));}
function landOf(p){const a=actualOf(p);if(a==null||a==='')return null;const n=+a;return Number.isFinite(n)?n:null;}
Object.assign(PC,{calledOf,actualOf,aimsOf,landOf});
})(typeof window!=='undefined'?window:globalThis);
