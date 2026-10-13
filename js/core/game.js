/* Thunder Elite pitch charting – game.js: Count logic (GameChanger aligned), results, batted-ball types, bullpen entry steps.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const BB_TYPES=['GB','LD','FB','PU'];const BB_NAME={GB:'Ground ball',LD:'Line drive',FB:'Fly ball',PU:'Pop-up'};
// ---------- Count logic (GameChanger style) ----------
const RESULTS={kd3:'K – reached (dropped 3rd)',kd3out:'K – dropped 3rd, thrown out',foultip:'Foul tip',ball:'Ball',called:'Called strike',swinging:'Swinging strike',foul:'Foul',inplay:'In play',hbp:'HBP'};
const IP_RESULTS={out:'Out','1B':'1B','2B':'2B','3B':'3B',HR:'HR',E:'Error',FC:'FC',DP:'Double play'};
// GC: strikes = called, swinging, foul, in play. Balls = ball, HBP.
const isStrike=r=>r==='kd3'||r==='kd3out'||r==='foultip'||r==='called'||r==='swinging'||r==='foul'||r==='inplay';
// apply one pitch to a count. returns {b,s,end,outs} end: null|'BB'|'K'|'HBP'|ip result
function applyPitch(cnt,result,ip){let b=cnt.b,s=cnt.s,end=null,outs=0;
  if(b>=4||s>=3)throw new Error('At-bat already over');
  if(result==='ball'){b++;if(b>=4)end='BB';}
  else if(result==='called'||result==='swinging'){s++;if(s>=3){end='K';outs=1;}}
  else if(result==='kd3'){if(s!==2)throw new Error('Dropped 3rd strike only with 2 strikes');s++;end='K-D3';} // strikeout for pitcher, batter reaches, no out
  else if(result==='kd3out'){if(s!==2)throw new Error('Dropped 3rd strike only with 2 strikes');s++;end='K';outs=1;} // K, catcher throws her out
  else if(result==='foultip'){s++;if(s>=3){end='K';outs=1;}} // caught foul tip = strike; strike 3 with 2 strikes
  else if(result==='foul'){if(s<2)s++;}
  else if(result==='hbp'){end='HBP';}
  else if(result==='inplay'){end=ip||'out';if(end==='out'||end==='FC')outs=1;if(end==='DP')outs=2;}
  else throw new Error('bad result '+result);
  return{b,s,end,outs};}
// GC pitch count = every pitch thrown (balls, strikes, fouls, balls in play, HBP). Intentional walks
// awarded without pitches (records with noPitch) are not pitches.
const countsAsPitch=p=>!p.noPitch;
const pitchCount=(pitches,pid)=>pitches.filter(p=>countsAsPitch(p)&&(pid==null||p.pitcherId===pid)).length;
// ---------- Stats ----------
const hitSpot=p=>p.loc!=null&&p.targets&&p.targets.length&&p.targets.includes(p.loc);
// Bullpen per-pitch flow (same order as game mode): 1) pitch type 2) tap intended spot 3) tap actual spot -> log + reset.
// A call-sheet code that already names a spot counts as step 2.
function bullpenStep(d){if(!d.type)return'type';const it=(d.callTargets&&d.callTargets.length)?d.callTargets:(d.target?[d.target]:[]);return it.length?'actual':'target';}
function bullpenTap(d,z){const st=bullpenStep(d);if(st==='type')return{action:'need_type',draft:d};
  if(st==='target')return{action:'target',draft:Object.assign({},d,{target:z})};
  const targets=(d.callTargets&&d.callTargets.length)?d.callTargets.slice():[d.target];return{action:'log',draft:Object.assign({},d,{loc:z}),targets};}
Object.assign(PC,{BB_TYPES,BB_NAME,RESULTS,IP_RESULTS,isStrike,applyPitch,countsAsPitch,pitchCount,hitSpot,bullpenStep,bullpenTap});
})(typeof window!=='undefined'?window:globalThis);
