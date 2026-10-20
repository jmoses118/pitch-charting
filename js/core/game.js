/* Thunder Elite pitch charting – game.js: Count logic (GameChanger aligned), results, batted-ball types.
   Pitch entry steps live in flow.js. Portrait, coach and bullpen call that machine directly.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
// RULE-13. One contact list. Chips render these labels; the stored code is the first item.
const BB_CONTACT=[['GB','Ground'],['LD','Liner'],['FB','Fly'],['PU','Pop up'],['BU','Bunt']];
const BB_TYPES=BB_CONTACT.map(x=>x[0]);
const BB_NAME=Object.fromEntries(BB_CONTACT);
function bbOf(p){const c=p&&p.bb;return c?(BB_NAME[c]||c):'';}
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
// Redo holds undone location taps and pitches. A new logged pitch clears it. Cap is the newest 10.
const REDO_MAX=10;
const FOUL_TIMES={early:'Early',ontime:'On time',late:'Late'};
function redoPush(stack,item){const s=(Array.isArray(stack)?stack:[]).concat([item]);return s.length>REDO_MAX?s.slice(s.length-REDO_MAX):s;}
function redoPop(stack){const s=(Array.isArray(stack)?stack:[]).slice();return{item:s.pop()||null,stack:s};}
// Stored redo list: location, aim, or pitch items only, newest 10. Anything else is dropped.
function redoState(raw){if(!Array.isArray(raw))return [];return raw.filter(x=>x&&typeof x==='object'&&(x.kind==='loc'||x.kind==='aim'||x.kind==='pitch')).slice(-REDO_MAX);}
function cleanFoul(v){return Object.prototype.hasOwnProperty.call(FOUL_TIMES,v)?v:null;}
function cleanFlag(v){return v==='wp'||v==='pb'?v:null;}
function cleanVelo(v){if(v==null||v==='')return null;const n=+v;return Number.isFinite(n)&&n>=20&&n<=110?Math.round(n*10)/10:null;}
// Bullpen starts with no batter. LHB/RHB only when the optional setting is on.
function sessionHand(settings,hand){if(!settings||!settings.showBatterHand)return 'N';return hand==='L'||hand==='R'?hand:'N';}
// Correct where a past pitch actually went. Does not remove it, reorder the list, or touch the result or the count.
// One target (or none) keeps calledLoc. Several targets recompute it as the nearest to the new spot, so CSV called_location matches.
function editActual(pitch,loc){loc=+loc;if(!pitch||!PC.validActual(loc))return false;const same=pitch.loc===loc&&pitch.actualLoc===loc;pitch.loc=loc;pitch.actualLoc=loc;
  const targets=Array.isArray(pitch.targets)?pitch.targets:[];let calledMoved=false;
  if(targets.length>1){const next=PC.nearestTarget(targets,loc);if(next!=null&&next!==pitch.calledLoc){pitch.calledLoc=next;calledMoved=true;}}
  if(!same||calledMoved)pitch.edited=true;return true;}
// Put a corrected pitch back to the spot it had before the edit. Returns false when nothing changed.
function revertEdit(pitch,snap){if(!pitch||!snap)return false;const was=!!pitch.edited,called=pitch.calledLoc==null?null:pitch.calledLoc;const nextCalled=snap.calledLoc==null?null:snap.calledLoc;
  const same=pitch.loc===snap.loc&&pitch.actualLoc===snap.actualLoc&&called===nextCalled&&was===!!snap.edited;pitch.loc=snap.loc;pitch.actualLoc=snap.actualLoc;
  if(nextCalled==null)delete pitch.calledLoc;else pitch.calledLoc=nextCalled;if(snap.edited)pitch.edited=true;else delete pitch.edited;return !same;}
Object.assign(PC,{BB_TYPES,BB_NAME,bbOf,RESULTS,IP_RESULTS,isStrike,applyPitch,countsAsPitch,pitchCount,REDO_MAX,FOUL_TIMES,redoPush,redoPop,redoState,cleanFoul,cleanFlag,cleanVelo,sessionHand,editActual,revertEdit});
})(typeof window!=='undefined'?window:globalThis);
