/* Thunder Elite pitch charting – grid.js: Location grid (pitcher's view), zones, ring, way-off, lattice distance.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
// ---------- Location grid: PITCHER'S VIEW ----------
// 1-2-3 top row left->right as the pitcher sees it, 4-5-6 middle, 7-8-9 bottom.
// 11 top-left, 12 top-right, 13 bottom-left, 14 bottom-right (balls, pitcher's view).
// RHB stands on the pitcher's RIGHT (3B side) => inside column for RHB is col 2 (3/6/9); LHB inside is col 0 (1/4/7).
const insideCol=hand=>hand==='L'?0:2;
const awayCol=hand=>2-insideCol(hand);
const cz=(col,row)=>row*3+col+1;
const isZone=z=>z>=1&&z<=9, isCorner=z=>z>=11&&z<=14, isOut=z=>z>=11&&z<=18;
// Way off (non-competitive, nowhere near the plate): 21 way high, 22 way low (dirt), 23 way to the pitcher's left, 24 way to the pitcher's right.
// The ring 11-18 (one box off the plate) is COMPETITIVE (chase pitches, CH/drop just below the knees).
const WAY={21:'way high',22:'way low',23:'way left',24:'way right'};const isWay=z=>z>=21&&z<=24;const isCompetitive=z=>isZone(z)||isOut(z);
// 15 = center up (above 2), 16 = middle, pitcher's left (beside 4), 17 = middle, pitcher's right (beside 6), 18 = center down (below 8). All balls.
// glove side in the pitcher's view: RHP = pitcher's left (col 0, 1B side), LHP = pitcher's right (col 2, 3B side)
const gloveCol=throws=>throws==='L'?2:0;
// No batter + known pitcher hand: describe horizontally as glove side / arm side instead of in/away
function locInfo(z,hand,throws){if(hand==='N'&&(throws==='L'||throws==='R')){const i=locInfoRaw(z,'R');if(!i)return i;let col=null;
    if(isZone(z))col=(z-1)%3;else if(isCorner(z))col=(z===11||z===13)?0:2;else if(z===16||z===17)col=z===16?0:2;
    if(col===null||col===1)return i;const h=col===gloveCol(throws)?'glove side':'arm side';
    const label=isZone(z)?(i.vert==='middle'?`middle ${h}`:`${i.vert} ${h}`):(isCorner(z)?`${i.vert} ${h} (ball)`:`center ${h} (ball)`);return Object.assign({},i,{horiz:h,label});}
  return locInfoRaw(z,hand);}
function locInfoRaw(z,hand){hand=hand==='L'?'L':'R';
  if(isWay(z))return{z,strikeZone:false,way:true,vert:z===21?'up':z===22?'down':'middle',horiz:null,label:WAY[z]+' (not competitive)'};
  if(isZone(z)){const r=(z-1)/3|0,c=(z-1)%3;
    const v=['up','middle','down'][r];const h=c===1?'middle':(c===insideCol(hand)?'in':'away');
    return{z,strikeZone:true,vert:v,horiz:h,label:(v==='middle'&&h==='middle')?'middle-middle':`${v} and ${h}`};}
  if(isCorner(z)){const top=z<=12,left=(z===11||z===13);const col=left?0:2;
    const h=col===insideCol(hand)?'in':'away';const v=top?'up':'down';
    return{z,strikeZone:false,vert:v,horiz:h,label:`${v} and ${h} (ball)`};}
  if(z===15||z===18)return{z,strikeZone:false,vert:z===15?'up':'down',horiz:'middle',label:(z===15?'center up':'center down')+' (ball)'};
  if(z===16||z===17){const h=(z===16?0:2)===insideCol(hand)?'in':'away';return{z,strikeZone:false,vert:'middle',horiz:h,label:`center ${h} (ball)`};}
  return null;}
const ALL_CELLS=[11,15,12,1,2,3,16,4,5,6,17,7,8,9,13,18,14];
// flatten state into pitch items with context (deleted/undone pitches are already gone from the arrays)
// Miss distance on the grid (documented): every location sits on a 5x5 lattice in the pitcher's view.
// Zone 1-9 = columns 1-3 x rows 1-3; outside spots: 11=(0,0) 15=(2,0) 12=(4,0) 16=(0,2) 17=(4,2) 13=(0,4) 18=(2,4) 14=(4,4).
// Distance = Chebyshev "squares away" = max(|dx|,|dy|), so diagonal neighbours are 1 and the max is 4 (e.g. 11 -> 14).
const GRID_XY={21:[2,-1],22:[2,5],23:[-1,2],24:[5,2],11:[0,0],15:[2,0],12:[4,0],16:[0,2],17:[4,2],13:[0,4],18:[2,4],14:[4,4]};for(let z=1;z<=9;z++)GRID_XY[z]=[(z-1)%3+1,Math.floor((z-1)/3)+1];
const MAX_MISS=4;
function isMiddleMiss(p){return p.loc===5&&p.targets&&p.targets.length>0&&!p.targets.includes(5);}
function missDist(a,b){const p=GRID_XY[a],q=GRID_XY[b];if(!p||!q)return null;return Math.max(Math.abs(p[0]-q[0]),Math.abs(p[1]-q[1]));}
function pct(a,b){return b?Math.round(1000*a/b)/10:null;}
Object.assign(PC,{insideCol,awayCol,cz,isZone,isCorner,isOut,WAY,isWay,isCompetitive,gloveCol,locInfo,locInfoRaw,ALL_CELLS,GRID_XY,MAX_MISS,isMiddleMiss,missDist,pct});
})(typeof window!=='undefined'?window:globalThis);
