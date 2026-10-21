/* Thunder Elite pitch charting – UI zonegfx.js: Gameday-style zone graphics (shared component).
   Softball pitch markers (numbered, ring colored by result), home plate in perspective, batter silhouette, recent-pitch list.
   Pure inline SVG, offline. Markers never take taps (pointer-events:none) so the zone grid behaves exactly as before.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
const RESULT_SHORT={ball:'Ball',called:'Called K',swinging:'Swing K',foul:'Foul',inplay:'In play',hbp:'HBP',ibb:'IBB',kd3:'K-reached',kd3out:'K (D3 out)',foultip:'Foul tip K'};
const ORIENT_H=GRID_H+38,PLAIN_H=GRID_H+18,ORIENT_VIEWBOX=`-14 -6 128 ${ORIENT_H}`,PLAIN_VIEWBOX=`-14 -6 128 ${PLAIN_H}`,ORIENT_LABEL_Y=GRID_H+28,PLAIN_LABEL_Y=GRID_H+8;
document.documentElement.style.setProperty('--zone-ar',`128 / ${ORIENT_H}`);
// where a marker sits: box centre, or just outside the ring for way-off taps (pitcher's view)
const WAY_POS={21:[50,-1],22:[50,GRID_H+6],23:[-9,ZONE_MID],24:[109,ZONE_MID]};
const markPos=z=>WAY_POS[z]||(z?center(z):null);
const JITTER=[[0,0],[-6,-5],[6,-5],[-6,5],[6,5],[0,-9],[0,9],[-9,0],[9,0]];
// one softball: optic-yellow core, red stitched seams, result ring, sequence number; souvenir adds a star badge
function ballSVG(x,y,no,mark,r){r=r||4.6;const k=r/4.6;
  return `<g class="ball mk-${mark||'none'}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(2)})" aria-hidden="true">`+
    `<circle class="ring" r="5.5"/><circle class="core" r="4.5"/>`+
    `<path class="seam" d="M-2.9 -3.4Q-1.2 0 -2.9 3.4M2.9 -3.4Q1.2 0 2.9 3.4"/>`+
    `<text class="num" y=".3">${no}</text>`+
    (mark==='souvenir'?`<path class="souv" d="M4.6 -6.6l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>`:'')+`</g>`;}
// markers for numbered pitches [{p,no}] with deterministic spreading when several land in the same box
function ballsSVG(items,throws){const seen={};return items.map(({p,no})=>{const xy=markPos(p.loc);if(!xy)return'';const k=seen[p.loc]=(seen[p.loc]||0)+1;const j=JITTER[(k-1)%JITTER.length];
  return ballSVG(xy[0]+j[0],xy[1]+j[1],no,PC.pitchMark(p,throws));}).join('');}
// home plate seen from the mound (flat front edge toward the pitcher, point toward the catcher), plus the one-box-off ring frame
const py=n=>+(GRID_H+n).toFixed(1);
const PLATE_SVG=`<g class="orient" aria-hidden="true"><rect class="ringframe" x="0" y="0" width="100" height="${GRID_H}" rx="1.5"/>`+
  `<path class="plate-shadow" d="M34 ${py(18.6)}H66L68 ${py(13)} 50 ${py(6.6)} 32 ${py(13)}Z"/><path class="plate" d="M34 ${py(17)}H66L68 ${py(11.4)} 50 ${py(5)} 32 ${py(11.4)}Z"/></g>`;
// simple batter silhouette (stance, bat up) on her side of the plate; RHB stands on the pitcher's right
const BATTER_PATH='M104 26a4.2 4.2 0 1 1 0.1 0M100.5 33c2.5-1.3 5.5-1.3 7.5.3l1.6 14.7c.2 2-1 3.3-2.6 3.6l1.9 18.4 3.6 30.5h-4.4l-4.6-27.2-3.3 27.2h-4.3l2.6-30.6.3-17.8c-1.6-.6-2.4-2.1-2.1-4z M101 36.5l-6.6-14.2';
function batterSVG(hand){if(hand!=='L'&&hand!=='R')return'';const right=PC.insideCol(hand)===2;
  return `<g class="batter" aria-hidden="true"${right?'':' transform="translate(100 0) scale(-1 1)"'}><path d="${BATTER_PATH}"/></g>`;}
// recent-pitch list rows: badge, result, type, target → landed
function editedMark(p){return p&&p.edited?'<span class="fromvid">from video</span>':'';}
function recentRows(items,isGame,throws){if(!items.length)return `<li class="empty">${isGame?'No pitches yet this at-bat':'No pitches yet this session'}</li>`;
  return items.slice().reverse().map(({p,no})=>{const mark=PC.pitchMark(p,throws);const res=isGame?(RESULT_SHORT[p.result]||p.result||''):(mark?PC.MARK_LABEL[mark]:'Logged');
    const aimRaw=PC.calledOf(p);const aim=aimRaw==null?'–':aimRaw;const landed=PC.actualOf(p);const typ=typeName(p.type);const warn=PC.callWarnOf(p);
    const contact=PC.bbOf(p)?' '+PC.bbOf(p):'';
    const warnBit=warn?`<span class="r-warn mut">${H(warn)}</span>`:'';
    const row=`<li><button type="button" class="rrow" data-edit="${H(p.id)}" aria-label="Fix location for pitch ${no}${p.edited?', from video':''}">`;
    return row+`<svg viewBox="-8 -8 16 16" class="badge" aria-hidden="true">${ballSVG(0,0,no,mark,5.2)}</svg><span class="r-main"><b>${H(res+contact)}</b> <span class="pedit" aria-hidden="true">✎</span> <span class="mut">${H(p.type?typ:'No type')}</span>${editedMark(p)}</span><span class="r-loc mut">aim ${H(aim)} → ${H(landed!=null?locTxt(landed):'–')}</span>${warnBit}</button></li>`;}).join('');}
// One row in the game log and the Stats pitch list. Newest-first is the caller's job; i is the pitch's place in the at-bat order.
function pitchLine(p,i,mode){const who=mode==='game'?H(String(pName(p.pitcherId)).split(' ')[0])+' vs '+H(p.batter||'–')+': ':'';
  const kb=PC.strikeOf(p);
  const contact=PC.bbOf(p)?' · '+PC.bbOf(p):'';
  const res=p.result?(RESULT_SHORT[p.result]||p.result)+(p.ip?' '+p.ip:'')+contact:(kb==null?'':kb?'K':'B');
  const aimRaw=PC.calledOf(p);const aimN=aimRaw==null?'':aimRaw;
  const actRaw=PC.actualOf(p);const act=actRaw!=null?locTxt(actRaw):'';
  const aimBit=mode==='stats'?`<span class="plist-aim">aim ${H(aimN===''?'–':aimN)} → ${H(act===''?'–':act)}</span>`:'';
  const warn=PC.callWarnOf(p);
  const warnBit=warn?`<span class="plist-warn mut">${H(warn)}</span>`:'';
  const spot=p.loc?' <span class="tag">'+H(locTxt(p.loc))+'</span>':'';
  const mark=p.targets&&p.targets.length&&p.loc?(PC.hitSpot(p)?' ✓':' ✗'):'';
  const main=`${who}${p.call?'<b>['+H(p.call)+']</b> ':''}${H(p.type||'')}${spot}${mark} ${aimBit}${warnBit} ${editedMark(p)}`;
  const tail=`<span class="plist-res">${H(res)}${p.end?' · <b>'+H(p.end)+'</b>':''}</span>${p.result!=null&&p.b!=null?`<span class="tag">${H(p.b)}-${H(p.s)}</span>`:''}`;
  return `<button type="button" class="plist" data-edit="${H(p.id)}" aria-label="Fix location for pitch ${i+1}${p.edited?', from video':''}"><span class="pedit" aria-hidden="true">✎</span><span class="n">${i+1}</span><span class="plist-main">${main}</span>${tail}</button>`;}
// current at-bat (or the last one, right after it ends) / current session, newest last
function recentFor(){if(tab==='game'){const g=game();if(!g)return{items:[],title:''};const P=g.pitches.filter(p=>!p.noPitch);let ab=P.filter(p=>p.abn===g.cur.abn),title='This at-bat';
    if(!ab.length&&P.length){const last=P[P.length-1].abn;ab=P.filter(p=>p.abn===last);title='Last at-bat';}return{items:PC.recentPitches(ab),title};}
  const x=session();return{items:PC.recentPitches(x?x.pitches:[],RECENT_MAX),title:'Recent pitches'};}
const RECENT_MAX=10;
function lastAbText(items){const p=items[items.length-1].p,end=p.end||p.ip||'';const E={K:'strikeout','K-D3':'strikeout (reached)',BB:'walk',HBP:'hit by pitch',out:'out',DP:'double play',FC:"fielder's choice",E:'error','1B':'single','2B':'double','3B':'triple',HR:'home run'};
  return `Last batter: ${items.length} pitch${items.length===1?'':'es'}${end?' · '+(E[end]||end):''} · next batter starts 0-0`;}
const typeName=c=>{const t=allTypes().find(x=>x.code===c);return t?t.name:(c||'');};
function renderRecent(){const r=recentFor();
  // a finished at-bat stays on the zone until the next pitch: say so, so 0-0 next to old balls never looks like a stuck count
  const last=tab==='game'&&r.title==='Last at-bat'&&r.items.length,n=$('zoneNote');if(n){n.classList.toggle('hide',!last);n.textContent=last?lastAbText(r.items):'';}$('zone').classList.toggle('lastab',!!last);$('recentTitle').textContent=r.title||'Recent pitches';$('recent').innerHTML=recentRows(r.items,tab==='game',pitcherHand());return r.items;}
