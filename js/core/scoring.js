/* Thunder Elite pitch charting – scoring.js: Scoring rules: miss severity, souvenir, CH-low, ring / way-off, heat maps, reports, stats, K credit, counts, trends.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const {isZone,isOut,isWay,isActualOnly,isCompetitive,gloveCol,locInfo,ALL_CELLS,GRID_XY,MAX_MISS,missDist,pct,isStrike,countsAsPitch}=PC;
// ---------- Heat map ----------
function heatItems(st){const th={};st.pitchers.forEach(p=>th[p.id]=p.throws);const out=[];
  st.games.forEach(g=>g.pitches.forEach(p=>{if(!p.noPitch)out.push({p,src:'game',gameId:g.id,sessionId:null,throws:th[p.pitcherId]||null,side:p.hand==='L'?'L':p.hand==='N'?'N':(p.hand?'R':'N'),batter:p.batter||''});}));
  st.sessions.forEach(x=>x.pitches.forEach(p=>out.push({p,src:'bullpen',gameId:null,sessionId:x.id,throws:th[p.pitcherId]||null,side:p.hand==='L'?'L':p.hand==='R'?'R':'N',batter:''})));return out;}
const HEAT_KEYS=['type','pitcher','throws','batter','side','src','game','session'];
function heatFilter(items,f){f=f||{};return items.filter(it=>(!f.type||it.p.type===f.type)&&(!f.pitcher||it.p.pitcherId===f.pitcher)&&(!f.throws||it.throws===f.throws)&&(!f.batter||it.batter===f.batter)
  &&(!f.side||it.side===f.side)&&(!f.src||it.src===f.src)&&(!f.game||it.gameId===f.game)&&(!f.session||it.sessionId===f.session));}
// view: 'actual' = where pitches landed; 'intended' = where they were aimed (counts + hit-the-spot % per aimed cell)
function heatData(items,f,view){const q=heatFilter(items,f);const cells={};ALL_CELLS.forEach(z=>cells[z]={n:0,hit:0});let total=0;
  q.forEach(({p})=>{if(view==='intended'){const t=p.targets&&p.targets.length?p.targets:null;if(!t||p.loc==null)return;total++;const hit=t.includes(p.loc);t.forEach(z=>{if(cells[z]){cells[z].n++;if(hit)cells[z].hit++;}});}
    else{if(p.loc==null)return;if(!cells[p.loc]){if(isActualOnly(p.loc))total++;return;}total++;cells[p.loc].n++;}});
  const max=Math.max(0,...Object.values(cells).map(c=>c.n));return{cells,total,max,matched:q.length};}
// per intended cell: n pitches aimed there, average miss distance (to the nearest called spot), hits
// Jim's change-up rule: a CH must finish at the knees. Landing in the top or middle row (or any spot above the bottom row)
// is a miss for CH even if it's on/near the target; scored at least 2 squares. Bottom row (7-9) and below use normal rules.
const CH_MIN_SEV=2;
// "Good" / on target = severity 0 or 1 (hit the spot or 1 box off). Single source for report, heat map, drill-down.
const GOOD_MAX_SEV=1;const isGoodSev=sev=>sev!=null&&sev<=GOOD_MAX_SEV;
// "Waste pitch" = every intended spot is in the ring (11-18); reported separately ("off-plate spots on target").
const aims=p=>typeof PC.aimsOf==='function'?PC.aimsOf(p):[];
const land=p=>typeof PC.landOf==='function'?PC.landOf(p):(p&&p.loc!=null?p.loc:null);
const wasteAim=p=>!!(aims(p).length&&aims(p).every(z=>isOut(z)));
const isBullpenPitch=p=>p&&p.abn==null&&p.inning==null;
// Jim's ring rules (Oct 2026): ring 11-18 is competitive and scored by normal distance (within 1 box = on target).
// Way off (21-24) is always a miss at WAY_SEV (not a souvenir), whatever the target.
// CH / drop / drop curve landing in the bottom ring (13, 18, 14) is a good pitch (bullpen). CH-up rule still applies.
const WAY_SEV=MAX_MISS-1;const LOW_RING=[13,18,14],LOW_TYPES=['CH','DR','DC'],LOW_CALL=[7,8,9,13,14,18];
// Called type is the one helper in csv.js. A shake-off uses the pitch she threw, not the abandoned call.
const penaltyType=p=>typeof PC.calledTypeOf==='function'?String(PC.calledTypeOf(p)||''):String((p&&p.type)||'');
const calledLow=p=>aims(p).some(z=>LOW_CALL.includes(z));
// FLOW-7a: bullpen only, called in 7/8/9/13/14/18, lands in 13/14/18, called type CH/DR/DC.
const lowGood=p=>isBullpenPitch(p)&&LOW_TYPES.includes(penaltyType(p))&&calledLow(p)&&LOW_RING.includes(land(p));
// RULE-3c: that same low call landing in the dirt is a miss, one step under a full way-off.
const dirtSoft=p=>land(p)===31&&LOW_TYPES.includes(penaltyType(p))&&calledLow(p);
function adjSev(p,sev){const loc=land(p);if(dirtSoft(p))return Math.min(sev,WAY_SEV-1);const aimedHere=aims(p).some(z=>z===loc);if((isWay(loc)||isActualOnly(loc))&&!aimedHere)return WAY_SEV;if(lowGood(p))return Math.min(sev,1);return sev;}
const chUp=p=>{const loc=land(p);return !!(p&&penaltyType(p)==='CH'&&!isWay(loc)&&!isActualOnly(loc)&&GRID_XY[loc]!=null&&GRID_XY[loc][1]<=2);};
function missData(items,f){const q=heatFilter(items,f);const cells={};ALL_CELLS.forEach(z=>cells[z]={n:0,sum:0,hit:0,avg:null,mm:0});let total=0,mm=0,chu=0;
  // one source of truth for severity: pitchMiss (souvenir, CH-up, way-off, low-ring rules all live there)
  q.forEach(({p})=>{const m=pitchMiss(p);if(!m)return;const t=aims(p),loc=land(p),d=m.d,sev=m.sev,mmMiss=m.mm,up=m.chUp;total++;if(mmMiss)mm++;if(up)chu++;
    t.forEach(z=>{const c=cells[z];if(!c)return;c.n++;c.sum+=sev;if(d===0&&!up)c.hit++;if(isGoodSev(sev))c.good=(c.good||0)+1;if(mmMiss)c.mm++;if(up)c.chUp=(c.chUp||0)+1;
      const L=(c.land=c.land||{});const e=(L[loc]=L[loc]||{n:0,sev:0,mm:0,chUp:0});e.n++;e.sev=Math.max(e.sev,sev);if(mmMiss)e.mm++;if(up)e.chUp++;});});
  ALL_CELLS.forEach(z=>{const c=cells[z];if(c.n)c.avg=Math.round(10*c.sum/c.n)/10;});return{cells,total,matched:q.length,mm,chUp:chu};}
// one sentence that always accounts for every pitch: shown + left out (no aim in Miss, no location in Landed)
const pz=n=>`${n} pitch${n===1?'':'es'}`;
function heatSummary(d,miss){const out=d.matched-d.total;
  if(miss)return `Showing ${d.total} of ${pz(d.matched)} (the ones with an aim). Box = where she aimed · color = how far off.`+(d.mm?` 🎁 ${d.mm} souvenir${d.mm===1?'':'s'}.`:'')+(out?` ${out} with no aim aren't shown – see Landed.`:'');
  return `${pz(d.total)} · where they landed`+(out?` · ${pz(out)} with no location left out`:'');}
// Jim's scale: hit or 1 square = green (no ding); then darker red as the average miss grows, darkest at 4
const MISS_SCALE=[{max:1,fill:'#2ea043',text:'#fff',label:'0–1 good'},{max:2,fill:'#f47067',text:'#000',label:'1–2'},{max:3,fill:'#c93c37',text:'#fff',label:'2–3'},{max:4,fill:'#7d1414',text:'#fff',label:'3–4'}];
function missColor(avg){if(avg==null)return null;for(const s of MISS_SCALE)if(avg<=s.max)return s;return MISS_SCALE[MISS_SCALE.length-1];}
// colorblind-friendly sequential palette (viridis) for the actual-location frequency view
const VIRIDIS=['#440154','#46327e','#365c8d','#277f8e','#1fa187','#4ac16d','#a0da39','#fde725'];
function heatColor(n,max){if(!n||!max)return null;const t=Math.min(1,n/max);const i=Math.min(VIRIDIS.length-1,Math.floor(t*(VIRIDIS.length-1)+0.0001));return{fill:VIRIDIS[i],text:i>=5?'#000':'#fff'};}
// Official K rule (Jim's choice): if a pitcher leaves with 2 strikes on the batter and the reliever finishes the strikeout
// (K, K-D3, D3 thrown out, foul-tip K), the K is credited to the pitcher who threw strike 2. Pitch counts stay with whoever threw each pitch.
// Walks and other outcomes are not changed. `all` must be in pitch order (a game's pitches array, or games concatenated).
function kCredit(all){const m=new Map();(all||[]).forEach((p,i)=>{if(!p||(p.end!=='K'&&p.end!=='K-D3'))return;let by=p.pitcherId;
  if(p.abn!=null&&p.s===2){let s=p.s;for(let j=i-1;j>=0;j--){const q=all[j];if(!q||q.abn!==p.abn||q.inning!==p.inning||q.slot!==p.slot||q.s>s||q.end)break;s=q.s;if(q.s<2&&!q.noPitch){by=q.pitcherId;break;}}}
  m.set(p,by);});return m;}
// Game strike = the umpire's result when there is one, otherwise the zone. A bullpen pitch has no strike.
const strikeOf=p=>isBullpenPitch(p)?null:(p.result?isStrike(p.result):isZone(land(p)));
function summarize(pitches,opt){const P=pitches.filter(countsAsPitch);
  const fp=P.filter(p=>p.firstPitch!==undefined?p.firstPitch:(p.b===0&&p.s===0));
  const called=P.filter(p=>p.targets&&p.targets.length&&p.loc!=null);
  const group=(keyf)=>{const o={};P.forEach(p=>{const k=keyf(p);if(k==null)return;(o[k]=o[k]||[]).push(p);});
    const out={};for(const k in o){const q=o[k];const c=q.filter(x=>x.targets&&x.targets.length&&x.loc!=null);
      out[k]={n:q.length,strikes:q.filter(strikeOf).length,strikePct:pct(q.filter(strikeOf).length,q.length),spotPct:pct(c.filter(hitSpot).length,c.length),
        whiff:q.filter(x=>x.result==='swinging').length,inPlay:q.filter(x=>x.result==='inplay').length};}return out;};
  let ks=pitches.filter(p=>p.end==='K'||p.end==='K-D3');if(opt&&opt.all&&opt.pid!=null){const m=kCredit(opt.all);ks=[...m].filter(([,by])=>by===opt.pid).map(([p])=>p);}
  return{k:ks.length,kd3:ks.filter(p=>p.end==='K-D3').length,n:P.length,strikes:P.filter(strikeOf).length,strikePct:pct(P.filter(strikeOf).length,P.length),compPct:pct(P.filter(p=>isCompetitive(p.loc)).length,P.filter(p=>p.loc!=null).length),wayOff:P.filter(p=>isWay(p.loc)).length,wasteN:P.filter(p=>isBullpenPitch(p)&&wasteAim(p)&&p.loc!=null).length,wasteGood:P.filter(p=>isBullpenPitch(p)&&wasteAim(p)&&p.loc!=null&&(m=>m&&m.good)(pitchMiss(p))).length,
    fps:fp.filter(strikeOf).length,fpsN:fp.length,fpsPct:pct(fp.filter(strikeOf).length,fp.length),
    spotN:called.length,spot:called.filter(hitSpot).length,spotPct:pct(called.filter(hitSpot).length,called.length),
    byType:group(p=>p.type),byLoc:group(p=>p.loc!=null?String(p.loc):null),byCall:group(p=>p.call||null),
    callVsThrown:group(p=>p.call?(p.call+(p.shook?' ⤺ shook → ':' → ')+p.type+(p.loc!=null?p.loc:'')):null),
    byResult:group(p=>p.result?(p.result==='inplay'?'inplay:'+(p.ip||'out'):p.result):null)};}
// ---------- Bullpen session report ----------
// Per called pitch: d = squares from nearest target; sev = d, except landing in 5 when aimed elsewhere = MAX_MISS (middle-middle mistake).
// "Good" = sev <= 1 (on target or 1 square off).
function pitchMiss(p,throws){throws=throws||p.throws;const t=aims(p);const loc=land(p);if(!t.length||loc==null||!GRID_XY[loc])return null;let best=null,bt=null;
  t.forEach(z=>{const d=missDist(loc,z);if(d!=null&&(best==null||d<best)){best=d;bt=z;}});if(best==null)return null;
  const mm=loc===5&&!t.includes(5);const up=chUp(p);let sev=mm?MAX_MISS:best;if(up)sev=Math.max(sev,CH_MIN_SEV);sev=adjSev(p,sev);const way=isWay(loc);const a=GRID_XY[loc],b=GRID_XY[bt];const dx=a[0]-b[0],dy=a[1]-b[1];
  const hand=p.hand==='L'?'L':'R';// no batter -> RHB for in/away
  const toward3B=dx>0;// pitcher's view: +x = 3B side, where an RHB stands
  const noBat=p.hand!=='L'&&p.hand!=='R'&&(throws==='L'||throws==='R');
  const horiz=dx===0?null:noBat?((dx>0)===(gloveCol(throws)===2)?'glove side':'arm side'):((toward3B===(hand==='R'))?'in':'away');const vert=dy===0?null:(dy<0?'up':'down');
  return{d:best,sev,mm,chUp:up,badAim:t.some(z=>!PC.validCalled(penaltyType(p),z)),way,low:lowGood(p),waste:wasteAim(p),good:isGoodSev(sev),target:bt,vert,horiz};}
// hit the spot = exactly on a target, by the same rule as the report (a change-up up in the zone never counts as a hit).
// One rule for Stats Spot%, the report's Bullseyes and the Game marks.
const hitSpot=p=>{const m=pitchMiss(p);return !!m&&m.d===0&&!m.chUp;};
// Gameday-style marker status for one pitch: 'souvenir' (middle-middle mistake), 'good' (hit spot, or competitive when nothing was aimed), 'miss'
function pitchMark(p,throws){if(!p||p.loc==null)return null;const m=pitchMiss(p,throws);if(m)return m.mm?'souvenir':m.good?'good':'miss';return isCompetitive(p.loc)?'good':'miss';}
// miss directions in report order, and the most common one for a group
const MISS_DIRS=['up','down','in','away','glove side','arm side'];
const topDir=g=>MISS_DIRS.map(d=>[d,g[d]||0]).sort((a,b)=>b[1]-a[1])[0];
// best / weakest spot from a list ranked best-first: weakest only when it is clearly worse than the best
function bestWeak(rank){const best=rank.length?rank[0]:null,lw=rank[rank.length-1];return{best,weakest:rank.length>1&&(lw.goodPct<best.goodPct||lw.avgMiss>=1.5)?lw:null};}
const MARK_LABEL={good:'On target',miss:'Missed',souvenir:'Souvenir'};
// last n pitches of the current at-bat (game) or session (bullpen), numbered in sequence (1 = first of the at-bat / session)
function recentPitches(list,n){const all=(list||[]).filter(p=>!p.deleted&&!p.noPitch).map((p,i)=>({p,no:i+1}));return n?all.slice(-n):all;}
function grpStats(list,thr){thr=thr||(()=>null);list=list.filter(countsAsPitch);const c=list.map(p=>({p,m:pitchMiss(p,thr(p))})).filter(x=>x.m);const good=c.filter(x=>x.m.good).length;
  // strike % = strikes / pitches aimed in the zone (or with no spot); waste pitches are reported on their own
  // raw strike % (all pitches) stays visible; feedback uses competitive % = (strikes + ring balls) / all
  const strikes=list.filter(strikeOf).length;const comp=list.filter(p=>isCompetitive(p.loc)).length;const wl=c.filter(x=>x.m.waste);
  return{n:list.length,strikes,strikePct:pct(strikes,list.length),comp,compPct:pct(comp,list.length),wayOff:list.filter(p=>isWay(p.loc)).length,waste:{n:wl.length,good:wl.filter(x=>x.m.good).length},called:c.length,good,goodPct:pct(good,c.length),
    avgMiss:c.length?Math.round(10*c.reduce((a,x)=>a+x.m.sev,0)/c.length)/10:null,mm:c.filter(x=>x.m.mm).length,
    hits:c.filter(x=>x.m.d===0&&!x.m.chUp).length,chUp:c.filter(x=>x.m.chUp).length,
    ...Object.fromEntries(MISS_DIRS.map(d=>[d,c.filter(x=>x.m.d>0&&(x.m.vert===d||x.m.horiz===d)).length]))};}
const TYPE_NAME={FB:'Fastball',CH:'Change-up',CB:'Curveball',DR:'Drop',DC:'Drop curve',RS:'Rise',SC:'Screw'};
const FIX={up:'finishing down',down:'staying on top / getting it up',in:'working it away',away:'getting it in','glove side':'staying through it to the arm side','arm side':'finishing to the glove side'};
// throws: optional {pitcherId:'L'|'R'} (or a function p=>throws) so no-batter pitches read glove/arm side
function sessionReport(pitches,throws){const thr=typeof throws==='function'?throws:(p=>(throws||{})[p.pitcherId]||p.throws||null);const G=l=>grpStats(l,thr);
  const P=(pitches||[]).filter(p=>p.loc!=null);const all=G(P);
  const byType={};P.forEach(p=>{const k=p.type||'?';(byType[k]=byType[k]||[]).push(p);});for(const k in byType)byType[k]=G(byType[k]);
  // spot = type + intended location (call text when logged)
  const spots={};P.forEach(p=>{const m=pitchMiss(p,thr(p));if(!m)return;const lab=(p.call||`${p.type||'?'} ${locInfo(m.target,p.hand==='L'||p.hand==='R'?p.hand:'N',thr(p)).label.replace(' (ball)',' (waste)')}`);const k=(p.type||'?')+'|'+m.target;
    (spots[k]=spots[k]||{key:k,label:lab,type:p.type,target:m.target,hand:p.hand,list:[]}).list.push(p);});
  const spotArr=Object.values(spots).map(s=>Object.assign(s,G(s.list),{list:undefined})).filter(s=>s.called>=2);
  const rank=spotArr.slice().sort((a,b)=>a.avgMiss-b.avgMiss||b.goodPct-a.goodPct||b.called-a.called);
  const {best,weakest}=bestWeak(rank);
  const h=Math.floor(P.length/2);const trend=P.length>=8?{first:G(P.slice(0,h)),second:G(P.slice(h))}:null;
  const fb=[],flagged=new Set();const nm=t=>TYPE_NAME[t]||t;
  // 1) a consistent miss direction per pitch type
  Object.entries(byType).sort((a,b)=>b[1].called-a[1].called).forEach(([t,g])=>{if(g.called<3)return;const miss=g.called-g.hits;
    const [d,c]=topDir(g);
    if(c>=3&&c>=0.5*g.called){flagged.add(t);fb.push({w:1,t:`${nm(t)} missed ${d} ${c} of ${g.called} times – focus on ${FIX[d]}.`});}});
  if(byType.CH&&byType.CH.chUp>=2){flagged.add('CH');fb.push({w:0.5,t:`Change-up up in the zone ${byType.CH.chUp} time${byType.CH.chUp===1?'':'s'} – keep it at the knees.`});}
  if(all.mm)fb.push({w:0,t:`${all.mm} souvenir${all.mm===1?'':'s'} 🎁 (right down the middle when you didn't aim there) – hitters send those out of the park. If you miss, miss off the plate.`});
  if(best&&best.avgMiss<=1&&best.called>=3&&!flagged.has(best.type))fb.push({w:2,t:`Great command on ${best.label} – ${best.good} of ${best.called} on target.`});
  if(trend&&trend.first.called>=3&&trend.second.called>=3){const a=trend.first.goodPct,b=trend.second.goodPct;
    if(b-a>=15)fb.push({w:3,t:`You got sharper as you went: ${Math.round(a)}% on target early, ${Math.round(b)}% late.`});
    else if(a-b>=15)fb.push({w:1.5,t:`You lost your spots late (${Math.round(a)}% on target early, ${Math.round(b)}% late) – stay strong with your mechanics when you get tired.`});}
  if(all.waste.n>=2){const w=all.waste;if(w.good>=w.n*0.6)fb.push({w:3.5,t:`Waste pitches: ${w.good} of ${w.n} on target – nice job missing off the plate on purpose.`});else fb.push({w:2.4,t:`Waste pitches: ${w.good} of ${w.n} on target – when you aim off the plate, keep it off the plate.`});}
  if(all.n>=5&&all.compPct!=null){if(all.compPct<70)fb.push({w:2.5,t:`Only ${Math.round(all.compPct)}% competitive pitches (in the zone or just off it) – too many way off.`});else if(all.compPct>=85)fb.push({w:4,t:`Nice job staying competitive: ${Math.round(all.compPct)}% in the zone or just off it.`});}
  if(all.wayOff>=2)fb.push({w:2.3,t:`${all.wayOff} pitches way off (nowhere near the plate) – stay tall and finish your pitch.`});
  if(weakest&&weakest.avgMiss>=2)fb.push({w:2.2,t:`Work on: ${weakest.label} (${weakest.good} of ${weakest.called} on target) – rep it next pen.`});
  fb.sort((a,b)=>a.w-b.w);let lines=[...new Set(fb.map(x=>x.t))].slice(0,4);
  if(lines.length<2){if(!all.called)lines.push('Turn on the call sheet (or tap an intended spot) so you can see how often you hit your spot.');
    if(lines.length<2)lines.push(`${all.n} pitch${all.n===1?'':'es'} logged${all.goodPct!=null?` · ${Math.round(all.goodPct)}% on target`:''} – keep building.`);}
  // one section per pitch type: its own numbers, best / work-on spot and 1-2 kid-friendly lines
  const types={};Object.entries(byType).sort((a,b)=>b[1].n-a[1].n).forEach(([t,g])=>{const {best:tb,weakest:tw}=bestWeak(rank.filter(s=>(s.type||'?')===t));
    types[t]={stats:g,best:tb,weakest:tw,feedback:typeFeedback(t,g,tb,tw)};});
  return Object.assign({},all,{byType,types,best,weakest,trend,feedback:lines.slice(0,4)});}
function typeFeedback(t,g,best,weak){const nm=TYPE_NAME[t]||t,out=[];
  if(!g.called)return[`${g.n} ${nm.toLowerCase()}${g.n===1?'':'s'} thrown – tap where you're aiming to see how close you get.`];
  if(t==='CH'&&g.chUp)out.push(`Up in the zone ${g.chUp} time${g.chUp===1?'':'s'} – keep it at the knees.`);
  if(g.mm)out.push(`${g.mm} souvenir${g.mm===1?'':'s'} 🎁 – if you miss, miss off the plate.`);
  const [d,c]=topDir(g);if(out.length<2&&g.goodPct<75&&c>=2&&c>=0.5*(g.called-g.hits)&&!(t==='CH'&&d==='up'&&g.chUp))out.push(`Misses mostly ${d} – focus on ${FIX[d]}.`);
  if(out.length<2&&g.goodPct>=75)out.push(`Great command – ${g.good} of ${g.called} on target${best?`, best at ${best.label}`:''}.`);
  else if(out.length<2&&weak)out.push(`Work on ${weak.label} (${weak.good} of ${weak.called} on target).`);
  if(!out.length)out.push(`${g.good} of ${g.called} on target – keep repping it.`);return out.slice(0,2);}

// ---------- count-based charts (game pitches carry the count before each pitch) ----------
const COUNTS=['0-0','1-0','0-1','2-0','1-1','0-2','3-0','2-1','1-2','3-1','2-2','3-2'];
function countStats(pitches){const P=(pitches||[]).filter(p=>countsAsPitch(p)&&p.b!=null&&p.s!=null&&p.abn!=null);const by={};COUNTS.forEach(c=>by[c]={n:0,strikes:0,called:0,good:0,types:{}});
  P.forEach(p=>{const k=p.b+'-'+p.s;const c=by[k];if(!c)return;c.n++;const st=strikeOf(p);if(st)c.strikes++;const t=p.type||'?';c.types[t]=(c.types[t]||0)+1;
    const m=pitchMiss(p);if(m){c.called++;if(m.good)c.good++;}});
  COUNTS.forEach(k=>{const c=by[k];c.strikePct=pct(c.strikes,c.n);c.goodPct=pct(c.good,c.called);});
  const fp=P.filter(p=>p.b===0&&p.s===0);const fps=fp.filter(strikeOf).length;
  // 0-2 outcomes: every at-bat that reached 0-2, how it ended
  const abs=[];let cur=null;P.forEach(p=>{if(!cur||cur.done||cur.abn!==p.abn){cur={abn:p.abn,done:false,list:[]};abs.push(cur);}cur.list.push(p);if(p.end)cur.done=true;});const o2={n:0,K:0,BB:0,HBP:0,inPlay:0,hit:0,out:0,open:0};
  abs.map(x=>x.list).forEach(a=>{if(!a.some(p=>p.b===0&&p.s===2))return;o2.n++;const e=a.find(p=>p.end);if(!e){o2.open++;return;}
    if(e.end==='K'||e.end==='K-D3')o2.K++;else if(e.end==='BB')o2.BB++;else if(e.end==='HBP')o2.HBP++;else{o2.inPlay++;if(['1B','2B','3B','HR'].includes(e.ip||e.end))o2.hit++;else o2.out++;}});
  return{by,counts:COUNTS,fps,fpsN:fp.length,fpsPct:pct(fps,fp.length),o2};}
// ---------- season trends: one point per outing (game or bullpen session) ----------
function trendPoints(st,pid,mode){const out=[];const add=(kind,box,date)=>{const P=box.pitches.filter(p=>!p.deleted&&p.pitcherId===pid&&countsAsPitch(p));if(!P.length)return;const g=grpStats(P.filter(p=>p.loc!=null));
    out.push({kind,id:box.id,date:date||'',ts:P[0].ts||0,n:P.length,compPct:g.compPct,goodPct:g.goodPct,strikePct:kind==='game'?summarize(P).strikePct:g.strikePct,mm:g.mm,label:kind==='game'?('vs '+(box.opponent||'?')):'Bullpen'});};
  if(mode!=='bullpen')(st.games||[]).forEach(g=>add('game',g,g.date));if(mode!=='game')(st.sessions||[]).forEach(s=>add('bullpen',s,s.date));
  return out.sort((a,b)=>(a.date||'').localeCompare(b.date||'')||a.ts-b.ts);}
// ---- shake-offs (Jim, Oct 2026): pitches she threw after shaking off the coach's call ----
// p.shook=true, p.call = the coach's call (type + aim), p.type/p.loc/p.result = what she actually threw.
// Hard contact = line drive or an extra-base hit (2B/3B/HR). "Followed" = called pitches that were not shaken off.
const HITS=['1B','2B','3B','HR'];
const isK=p=>p.end==='K'||p.end==='K-D3';
const isHard=p=>p.result==='inplay'&&(p.bb==='LD'||['2B','3B','HR'].includes(p.ip));
function shakeLine(P){const n=P.length;return{n,strikePct:pct(P.filter(p=>p.result&&isStrike(p.result)).length,n),balls:P.filter(p=>p.result==='ball').length,
  hits:P.filter(p=>p.result==='inplay'&&HITS.includes(p.ip)).length,hard:P.filter(isHard).length,k:P.filter(isK).length};}
function outcomeOf(p){if(!p)return '';if(p.result==='inplay')return (p.ip?p.ip:'In play')+(p.bb?' ('+p.bb+')':'');const r={ball:'Ball',called:'Called strike',swinging:'Swinging strike',foul:'Foul',foultip:'Foul tip',hbp:'HBP',kd3:'K – reached',kd3out:'K – thrown out'}[p.result]||p.result||'';return r+(isK(p)&&!/^K/.test(r)?' · K':'');}
function shakeoffs(pitches){const P=(pitches||[]).filter(p=>!p.deleted&&countsAsPitch(p));const byT=P.slice().sort((a,b)=>(a.ts||0)-(b.ts||0));
  const prevOf=p=>{const q=byT[byT.indexOf(p)-1];return q&&p.abn!=null&&q.abn===p.abn?q:null;}; // pitch before it in the same at-bat
  const S=byT.filter(p=>p.shook),F=byT.filter(p=>!p.shook&&p.call);
  return{n:S.length,shook:shakeLine(S),followed:shakeLine(F),
    list:S.map(p=>{const q=prevOf(p);return{id:p.id,called:p.call||p.callRaw||'?',thrown:(p.type||'?')+(p.loc!=null?' '+p.loc:''),count:(p.b!=null&&p.s!=null)?`${p.b}-${p.s}`:'',
      prev:q?`${q.type||'?'} · ${outcomeOf(q)}`:'',outcome:outcomeOf(p),inning:p.inning,batter:p.batter||''};})};}
Object.assign(PC,{shakeoffs,shakeLine,isHard,heatSummary,strikeOf,hitSpot,MISS_DIRS,topDir,bestWeak,pitchMark,MARK_LABEL,recentPitches,heatItems,HEAT_KEYS,heatFilter,heatData,CH_MIN_SEV,GOOD_MAX_SEV,isGoodSev,wasteAim,isBullpenPitch,WAY_SEV,LOW_RING,LOW_TYPES,LOW_CALL,penaltyType,lowGood,adjSev,chUp,missData,MISS_SCALE,missColor,VIRIDIS,heatColor,kCredit,summarize,pitchMiss,grpStats,TYPE_NAME,FIX,sessionReport,typeFeedback,COUNTS,countStats,trendPoints});
})(typeof window!=='undefined'?window:globalThis);
