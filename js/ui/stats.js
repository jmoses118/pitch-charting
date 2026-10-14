/* Thunder Elite pitch charting – UI stats.js: Stats view: tables, count charts, season trends, zone heat map.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
// ---------- stats ----------
function scopePitches(sc){const s=S();let out=[];
  if(sc==='all'||sc==='games')s.games.forEach(g=>out=out.concat(g.pitches));
  if(sc==='all'||sc==='bullpen')s.sessions.forEach(x=>out=out.concat(x.pitches));
  if(sc.startsWith('g_'))out=(s.games.find(g=>g.id===sc)||{pitches:[]}).pitches;
  if(sc.startsWith('s_'))out=(s.sessions.find(g=>g.id===sc)||{pitches:[]}).pitches;return out;}
const fmt=v=>v==null?'–':v+'%';
// ---------- count charts, game notes, season trends ----------
const kidRole=()=>role()==='player';
function renderStatsExtra(sel,pf,all,P){const kid=kidRole();
  // game note per pitcher
  $('sNote').innerHTML=sel.startsWith('g_')&&pf?`<div class="card">${noteBox({gameId:sel,pitcherId:pf},kid)||'<div class="mut">No coach note for this game yet.</div>'}</div>`:'';
  // by count
  const G=P.filter(p=>p.abn!=null&&p.b!=null);const cs=PC.countStats(G);$('sCountCard').classList.toggle('hide',!G.length);
  if(G.length){const o=cs.o2;const T=PC.TYPE_NAME;
    $('cTop').innerHTML=`<span class="tag">${kid?'First pitch a strike':'1st-pitch strike'} ${fmt(cs.fpsPct)} (${cs.fps}/${cs.fpsN})</span><span class="tag">0-2 counts: ${o.n}</span>`;
    $('cTbl').innerHTML=`<tr><th>Count</th><th>#</th><th>Mix</th><th>${kid?'Strikes':'K%'}</th><th>On target</th></tr>`+cs.counts.filter(k=>cs.by[k].n).map(k=>{const c=cs.by[k];const mix=Object.entries(c.types).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`${H(t)} ${Math.round(100*n/c.n)}%`).join(' · ');
      const tag=k==='0-0'?'':(+k[0]>+k[2]?' <span class="mut">behind</span>':+k[0]<+k[2]?' <span class="mut">ahead</span>':'');return`<tr><td><b>${k}</b>${tag}</td><td>${c.n}</td><td>${mix}</td><td>${fmt(c.strikePct)}</td><td>${c.called?fmt(c.goodPct):'–'}</td></tr>`;}).join('');
    $('c02').innerHTML=o.n?`<b>After 0-2:</b> ${o.K} strikeout${o.K===1?'':'s'}, ${o.inPlay} put in play (${o.hit} hit${o.hit===1?'':'s'}, ${o.out} out${o.out===1?'':'s'}), ${o.BB} walk${o.BB===1?'':'s'}${o.HBP?`, ${o.HBP} HBP`:''}${o.open?`, ${o.open} in progress`:''}.`:'No 0-2 counts yet.';}
  renderTrends(pf);}
const TMET={compPct:{l:'Competitive %',k:'In the zone or close',c:'#3fb950',pct:1},goodPct:{l:'On target %',k:'On target',c:'#58a6ff',pct:1},strikePct:{l:'Strike %',k:'Strikes',c:'#d29922',pct:1},mm:{l:'Souvenirs',k:'Souvenirs 🎁',c:'#f47067'},n:{l:'Pitch count',k:'Pitches',c:'#bc8cff'}};
let tSel=['compPct','goodPct','strikePct'];
function renderTrends(pf){const M=mine();const pid=pf||(M&&M.length===1?M[0]:null);const kid=kidRole();
  $('tMetrics').innerHTML=Object.entries(TMET).map(([k,m])=>`<button data-tm="${k}" class="${tSel.includes(k)?'sel':''}" style="font-size:12px;padding:4px 8px;min-height:30px;border-left:4px solid ${m.c}">${kid?m.k:m.l}</button>`).join('');
  if(!pid){$('tChart').innerHTML='<text x="160" y="85" fill="#8b949e" font-size="12" text-anchor="middle">Pick a pitcher above to see trends</text>';$('tNote').textContent='';return;}
  const pts=PC.trendPoints(S(),pid,$('tMode').value);const W=320,Hh=170,x0=30,x1=310,y0=12,y1=140;
  if(pts.length<1){$('tChart').innerHTML='<text x="160" y="85" fill="#8b949e" font-size="12" text-anchor="middle">No outings yet</text>';$('tNote').textContent='';return;}
  const X=i=>pts.length===1?(x0+x1)/2:x0+(x1-x0)*i/(pts.length-1);let h='';
  [0,25,50,75,100].forEach(v=>{const y=y1-(y1-y0)*v/100;h+=`<line x1="${x0}" x2="${x1}" y1="${y}" y2="${y}" stroke="#30363d" stroke-width=".5"/><text x="${x0-4}" y="${y+3}" fill="#8b949e" font-size="8" text-anchor="end">${v}%</text>`;});
  tSel.forEach(k=>{const m=TMET[k];const vals=pts.map(p=>p[k]);const mx=m.pct?100:Math.max(1,...vals.filter(v=>v!=null));const Y=v=>y1-(y1-y0)*v/mx;let d='';
    vals.forEach((v,i)=>{if(v==null)return;d+=(d?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1);});h+=`<path d="${d}" fill="none" stroke="${m.c}" stroke-width="2"/>`;
    vals.forEach((v,i)=>{if(v==null)return;h+=`<circle cx="${X(i)}" cy="${Y(v)}" r="${pts[i].kind==='game'?3.2:2.4}" fill="${pts[i].kind==='game'?m.c:'#0d1117'}" stroke="${m.c}" stroke-width="1.5"><title>${H(pts[i].date+' '+pts[i].label)}: ${m.pct?Math.round(v)+'%':v}</title></circle>`;if(!m.pct)h+=`<text x="${X(i)}" y="${Y(v)-5}" fill="${m.c}" font-size="8" text-anchor="middle">${v}</text>`;});});
  pts.forEach((p,i)=>{if(pts.length<=8||i%Math.ceil(pts.length/8)===0)h+=`<text x="${X(i)}" y="${y1+12}" fill="#8b949e" font-size="7.5" text-anchor="middle">${H((p.date||'').slice(5))}</text><text x="${X(i)}" y="${y1+21}" fill="#6e7681" font-size="6.5" text-anchor="middle">${p.kind==='game'?'G':'BP'}</text>`;});
  $('tChart').innerHTML=h;$("tNote").textContent=`${pName(pid)}: ${pts.length} outing${pts.length===1?'':'s'} · filled dot = game, open dot = bullpen${tSel.some(k=>!TMET[k].pct)?' · counts use their own scale':''}`;}
$('tMetrics').addEventListener('click',e=>{const b=e.target.closest('[data-tm]');if(!b)return;const k=b.dataset.tm;tSel=tSel.includes(k)?tSel.filter(x=>x!==k):tSel.concat(k);if(!tSel.length)tSel=[k];renderStats();});
$('tMode').onchange=()=>renderStats();
function renderStats(){const s=S();const sel=$('sScope').value||(s.activeGame||'all');const me=role()==='player'?store.real.sync.pitcherId:null;const M=mine();
  const GS=M?s.games.filter(g=>g.pitches.some(p=>vis(p.pitcherId))):s.games,SS=M?s.sessions.filter(x=>(x.pitcherId&&vis(x.pitcherId))||x.pitches.some(p=>vis(p.pitcherId))):s.sessions;
  const opts=[['all','Everything'],['games','All games'],['bullpen','All bullpen']].concat(GS.slice().reverse().map(g=>[g.id,`${g.date} ${vsAt(g)} ${g.opponent}${PC.gameStatus(g)==='scheduled'?' (scheduled)':''}${g.event?' ('+g.event+')':''}`])).concat(SS.slice().reverse().map(x=>[x.id,`Bullpen ${x.date} (${M?x.pitches.filter(p=>vis(p.pitcherId)).length:x.pitches.length})`]));
  $('sScope').innerHTML=opts.map(([v,l])=>`<option value="${H(v)}" ${v===sel?'selected':''}>${H(l)}</option>`).join('');
  const own=role()==='player'?store.real.sync.pitcherId:null;const pf=own||$('sPitcher').value;$('sPitcher').disabled=!!own;$('sPitcher').innerHTML=(own?'':`<option value="">${M?'All my pitchers':'All pitchers'}</option>`)+s.pitchers.filter(p=>(!own||p.id===own)&&vis(p.id)).map(p=>`<option value="${H(p.id)}" ${p.id===pf?'selected':''}>${H(PC.pitcherLabel(p))}${p.archived?' (archived)':''}</option>`).join('');
  const all=scopePitches($('sScope').value).filter(p=>vis(p.pitcherId));const P=pf?all.filter(p=>p.pitcherId===pf):all;const sum=PC.summarize(P,pf?{all,pid:pf}:null);
  const isGame=P.some(p=>p.result);
  $('sReport').classList.toggle('hide',!s.sessions.some(q=>q.id===$('sScope').value));
  {const thm={};s.pitchers.forEach(q=>thm[q.id]=q.throws);const tr=PC.sessionReport(P.filter(p=>!p.noPitch),thm);const has=Object.keys(tr.types).length>0;$('sTypesCard').classList.toggle('hide',!has);$('sTypes').innerHTML=has?typeSectionsHTML(tr,'sT_'):'';if(has)paintTypeMaps($('sTypes'),P.map(p=>({p})),'sT_');}
  $('sGrid').innerHTML=[['Pitches',sum.n],['Strike %',fmt(sum.strikePct)],['1st-pitch K%',isGame?fmt(sum.fpsPct):'–'],['Hit spot',fmt(sum.spotPct)],['Called',sum.spotN],['Balls',sum.n-sum.strikes]].concat(!isGame?[['Competitive',fmt(sum.compPct)],['Way off',sum.wayOff]]:[]).map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
  const pids=[...new Set(all.map(p=>p.pitcherId))];
  $('sPit').innerHTML='<tr><th>Pitcher</th><th>#</th><th>K%</th><th>FPS%</th><th>Spot</th><th title="Strikeouts incl. dropped 3rd">SO</th></tr>'+pids.map(id=>{const q=PC.summarize(all.filter(p=>p.pitcherId===id),{all,pid:id});return`<tr><td>${H(pName(id))}</td><td>${q.n}</td><td>${fmt(q.strikePct)}</td><td>${fmt(q.fpsPct)}</td><td>${fmt(q.spotPct)}</td><td>${q.k}${q.kd3?` <small>(${q.kd3} D3)</small>`:''}</td></tr>`;}).join('');
  const tbl=(o,lbl)=>`<tr><th>${lbl}</th><th>#</th><th>K%</th><th>Spot</th><th>Whiff</th><th>InPlay</th></tr>`+Object.entries(o).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td><td>${fmt(v.strikePct)}</td><td>${fmt(v.spotPct)}</td><td>${v.whiff}</td><td>${v.inPlay}</td></tr>`).join('');
  $('sType').innerHTML=tbl(sum.byType,'Type');
  $('sCall').innerHTML=Object.keys(sum.byCall).length?tbl(sum.byCall,'Call')+'<tr><td colspan=6 class="mut">Call → thrown</td></tr>'+Object.entries(sum.callVsThrown).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td><td>${fmt(v.strikePct)}</td><td>${fmt(v.spotPct)}</td><td>${v.whiff}</td><td>${v.inPlay}</td></tr>`).join(''):'<tr><td class="mut">No called pitches logged</td></tr>';
  $('sRes').innerHTML='<tr><th>Result</th><th>#</th></tr>'+Object.entries(sum.byResult).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td></tr>`).join('');
  const mx=Math.max(1,...Object.values(sum.byLoc).map(v=>v.n));const lab={};for(const k in sum.byLoc)lab[k]=sum.byLoc[k].n+' · '+fmt(sum.byLoc[k].strikePct);
  zoneSVG($('sHeat'),'R',{labels:lab});for(const k in sum.byLoc){const e=$('sHeat').querySelector(`[data-z="${k}"]`);if(e){e.style.fill=`rgba(245,${Math.round(197-150*sum.byLoc[k].n/mx)},24,${.25+.6*sum.byLoc[k].n/mx})`;}}
  try{renderStatsExtra(sel,pf,all,P);}catch(e){console.error(e);}}

// ---------- zone heat map ----------
const HKEY='te_pitch_heat_v1';let HF={},HV='miss';try{const o=JSON.parse(storage&&storage.getItem(HKEY)||'{}');HF=o.f||{};HV=o.v==='actual'?'actual':'miss';}catch(e){}
const saveHF=()=>{try{storage&&storage.setItem(HKEY,JSON.stringify({f:HF,v:HV}));}catch(e){}};
const SIDE_L={R:'RHB',L:'LHB',N:'No batter'},SRC_L={game:'Games',bullpen:'Bullpen'},TH_L={R:'RHP',L:'LHP'};
function heatOptions(items){items=items.filter(i=>vis(i.p.pitcherId));const s=S(),own=role()==='player'?store.real.sync.pitcherId:null;const uniq=a=>[...new Set(a.filter(Boolean))];
  return{type:uniq(items.map(i=>i.p.type)).sort().map(v=>[v,v]),pitcher:s.pitchers.filter(p=>!own||p.id===own).map(p=>[p.id,PC.pitcherLabel(p)]),throws:[['R','RHP'],['L','LHP']],
    batter:uniq(items.map(i=>i.batter)).sort().map(v=>[v,v]),side:[['R','RHB'],['L','LHB'],['N','No batter']],src:[['game','Games'],['bullpen','Bullpen']],
    game:(own?s.games.filter(g=>g.pitches.some(p=>p.pitcherId===own)):s.games).map(g=>[g.id,`${g.date||''} ${vsAt(g)} ${g.opponent}`]),session:s.sessions.map(x=>[x.id,`Bullpen ${x.date||''} (${x.pitches.length})`])};}
// one sentence that always accounts for every pitch: shown + left out (no aim in Miss, no location in Landed)
const pz=n=>`${n} pitch${n===1?'':'es'}`;
function heatSummary(d,miss){const out=d.matched-d.total;
  if(miss)return `Showing ${d.total} of ${pz(d.matched)} (the ones with an aim). Box = where she aimed · color = how far off.`+(d.mm?` 🎁 ${d.mm} souvenir${d.mm===1?'':'s'}.`:'')+(out?` ${out} with no aim aren't shown – see Landed.`:'');
  return `${pz(d.total)} · where they landed`+(out?` · ${pz(out)} with no location left out`:'');}
const HF_LBL={type:'Pitch',pitcher:'Pitcher',throws:'Pitcher hand',batter:'Batter',side:'Batter side',src:'Source',game:'Game',session:'Bullpen session'};
function heatChipText(k,v,opts){const o=(opts[k]||[]).find(x=>x[0]===v);return `${HF_LBL[k]}: ${o?o[1]:v}`;}
function renderHeat(){const items0=PC.heatItems(S());const own=role()==='player'?store.real.sync.pitcherId:null;const items=(own?items0.filter(i=>i.p.pitcherId===own):items0).filter(i=>vis(i.p.pitcherId));
  const opts=heatOptions(items);const f=Object.assign({},HF);if(own)f.pitcher=own;
  const miss=HV==='miss';const d=miss?PC.missData(items,f):PC.heatData(items,f,'actual');
  $('hvA').classList.toggle('sel',!miss);$('hvI').classList.toggle('sel',miss);$('hvA').setAttribute('aria-pressed',String(!miss));$('hvI').setAttribute('aria-pressed',String(miss));
  const act=PC.HEAT_KEYS.filter(k=>HF[k]&&!(own&&k==='pitcher'));
  $('hfChips').innerHTML=(act.length?act.map(k=>`<button class="tag" data-hfx="${H(k)}" aria-label="Remove filter ${H(heatChipText(k,HF[k],opts))}" style="min-height:34px;font-size:13px;background:#1d2a55;border:1px solid #2f4fb0">${H(heatChipText(k,HF[k],opts))} ✕</button>`).join(''):'<span class="mut">All pitches'+(own?' (yours)':'')+'</span>');
  $('hfReset').disabled=!act.length;
  $('hSummary').textContent=heatSummary(d,miss);
  const empty=d.total===0;$('hEmpty').classList.toggle('hide',!empty);$('hMap').classList.toggle('hide',empty);$('hLegend').classList.toggle('hide',empty);if(empty)return;
  if(miss&&own){paintKid($('hMap'),d);hookDrill($('hMap'),d);$('hSummary').textContent=`${d.total} pitch${d.total===1?'':'es'} with a spot aimed`+(d.mm?` · 🎁 ${d.mm} souvenir${d.mm===1?'':'s'}`:'');$('hLegend').innerHTML=`<div style="font-size:13px;line-height:1.4">${KID_LEGEND}</div>`;return;}
  zoneSVG($('hMap'),'R',{noNums:true,noSide:true});let ex='';
  PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=$('hMap').querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
    const col=miss?PC.missColor(c.avg):PC.heatColor(c.n,d.max);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';
    const lbl=miss?(c.n?`Aimed at zone ${z}: ${c.n} pitch${c.n===1?'':'es'}, average miss ${c.avg} square${c.avg===1?'':'s'}, ${c.hit} hit exactly${c.mm?`, ${c.mm} souvenir${c.mm===1?'':'s'}`:''}`:`Zone ${z}: no pitches aimed here`):`Zone ${z}: ${c.n} pitch${c.n===1?'':'es'}`;
    el.innerHTML=`<title>${lbl}</title>`;el.setAttribute('aria-label',lbl);
    if(miss){if(c.n){ex+=`<text x="${cx}" y="${cy-2.5}" style="fill:${tc};font-size:4.6px;font-weight:800;text-anchor:middle;dominant-baseline:middle;pointer-events:none">${missTxt(c.avg)}</text>`;
        ex+=`<text x="${cx}" y="${cy+4}" style="fill:${tc};font-size:4px;font-weight:700;text-anchor:middle;pointer-events:none">${pitchN(c.n)}</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+9}" style="fill:${tc};font-size:3.8px;font-weight:800;text-anchor:middle;pointer-events:none">🎁${c.mm}</text>`;}}
    else ex+=`<text x="${cx}" y="${cy-1}" style="fill:${tc};font-size:7px;font-weight:800;text-anchor:middle;dominant-baseline:middle;pointer-events:none">${c.n||''}</text>`;
    ex+=`<text x="${cx+(z<10?8:7)}" y="${cy-(z<10?9:8)}" style="fill:${tc};opacity:.65;font-size:3.6px;text-anchor:end;pointer-events:none">${z}</text>`;});
  $('hMap').insertAdjacentHTML('beforeend',ex);if(miss)hookDrill($('hMap'),d);
  $('hLegend').innerHTML=miss?`<div class="row wrap" style="gap:6px;font-size:12px" aria-label="Miss scale">${PC.MISS_SCALE.map(s=>`<span class="row" style="gap:4px"><span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${s.fill}"></span>${s.label}</span>`).join('')}<span class="mut">squares off</span></div><div class="mut" style="font-size:12px;margin-top:4px">Ring (11–18) = competitive: scored by distance, never counts against them. Bullpen: CH / drop / drop curve landing low ring (13, 18, 14) = good. 🚫 Way off = miss (3 squares), not a souvenir. Game strike % unchanged.</div>
    <div class="mut" style="font-size:12px;margin-top:4px">Pitcher's view · each box = intended spot · ${MISS_LEGEND} · 🎁 Souvenir = landed right down the middle when aimed elsewhere (always scored as the biggest miss) · CH rule: a change-up landing in the top/middle row (or higher) is a miss, scored at least 2 squares · squares are counted like a king's move, diagonals = 1, outside spots 11–18 count as the ring around the zone (max 4).</div>`
   :`<div class="row" style="gap:6px;font-size:12px" aria-label="Color scale from 1 to ${d.max} pitches"><span class="mut">1</span><div style="flex:1;height:12px;border-radius:6px;background:linear-gradient(90deg,${PC.VIRIDIS.join(',')})"></div><span class="mut">${d.max}</span></div><div class="mut" style="font-size:12px;margin-top:4px">Pitcher's view · number = pitches that landed there · dark = fewer, yellow = most · 11–18 are outside the zone</div>`;}
function openHF(){const items0=PC.heatItems(S());const own=role()==='player'?store.real.sync.pitcherId:null;const opts=heatOptions(own?items0.filter(i=>i.p.pitcherId===own):items0);
  $('hfForm').innerHTML=PC.HEAT_KEYS.filter(k=>!(own&&k==='pitcher')).map(k=>`<label class="mut" style="font-size:13px">${HF_LBL[k]}<select data-hk="${H(k)}" style="width:100%;margin-top:2px"><option value="">Any</option>${(opts[k]||[]).map(([v,l])=>`<option value="${H(v)}" ${HF[k]===v?'selected':''}>${H(l)}</option>`).join('')}</select></label>`).join('');openSheet($('hfDlg'));}
$('hfOpen').onclick=openHF;
$('hfDlg').addEventListener('close',()=>{const rv=$('hfDlg').returnValue;if(rv==='reset')HF={};else if(rv==='ok'){HF={};$('hfForm').querySelectorAll('select').forEach(s=>{if(s.value)HF[s.dataset.hk]=s.value;});}else return;saveHF();renderHeat();});
$('hfChips').addEventListener('click',e=>{const k=e.target.dataset.hfx;if(k){delete HF[k];saveHF();renderHeat();}});
$('hfReset').onclick=$('hfReset2').onclick=()=>{HF={};saveHF();renderHeat();};
$('hvA').onclick=()=>{HV='actual';saveHF();renderHeat();};$('hvI').onclick=()=>{HV='miss';saveHF();renderHeat();};
$('sScope').onchange=renderStats;$('sPitcher').onchange=renderStats;
