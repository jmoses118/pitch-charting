/* Thunder Elite pitch charting – UI report.js: Shared components: session/game report, tap-a-box drill-down, per-pitch-type sections, coach notes.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
// ---------- bullpen session report ----------
let RPT=null;
function reportFor(sess){const own=role()==='player'?store.real.sync.pitcherId:null;let P=sess.pitches.filter(p=>!p.deleted&&vis(p.pitcherId));if(own)P=P.filter(p=>p.pitcherId===own);
  const pids=[...new Set(P.map(p=>p.pitcherId).filter(Boolean))];const who=pids.length?pids.map(pName).join(', '):(sess.pitcherId?pName(sess.pitcherId):'Bullpen');
  const items=P.map(p=>({p,src:'bullpen',sessionId:sess.id,side:'N'}));const thm={};S().pitchers.forEach(q=>thm[q.id]=q.throws);return{sess,P,who,items,r:PC.sessionReport(P,thm),miss:PC.missData(items,{}),test:!!store.isTest};}
// kid-clear miss text: average boxes between where she aimed and where it landed (0 = on spot; 1 box off still counts as on target)
const missTxt=a=>a==null?'':a===0?'Hit spot':a<=1?'Close':Math.max(2,Math.round(a))+' off';
const pitchN=n=>n+' pitch'+(n===1?'':'es');
const MISS_LEGEND='Number = how many boxes she missed by. "Close" = 1 box off – still on target.';
function paintMiss(svg,d,kid){if(kid)return paintKid(svg,d);zoneSVG(svg,'R',{noNums:true,noSide:true});let ex='';PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=svg.querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
  const col=PC.missColor(c.avg);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';const lbl=c.n?`Aimed at zone ${z}: ${c.n}, avg miss ${c.avg}${c.mm?`, ${c.mm} souvenir${c.mm===1?'':'s'}`:''}`:`Zone ${z}: none aimed`;el.setAttribute('aria-label',lbl);el.innerHTML=`<title>${lbl}</title>`;
  if(c.n){ex+=`<text x="${cx}" y="${cy-2.5}" style="fill:${tc};font-size:4.6px;font-weight:800;text-anchor:middle;dominant-baseline:middle">${missTxt(c.avg)}</text><text x="${cx}" y="${cy+4}" style="fill:${tc};font-size:4px;font-weight:700;text-anchor:middle">${pitchN(c.n)}</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+9}" style="fill:${tc};font-size:3.8px;font-weight:800;text-anchor:middle">🎁${c.mm}</text>`;}});svg.insertAdjacentHTML('beforeend',ex);}
const KID_LEGEND='<b style="color:#2ea043">Green</b> = you hit your spot or were 1 box off. The <b style="color:#f47067">redder</b> the box, the farther you missed. Each box shows how many were on target out of how many you aimed there. 🎁 Souvenir = right down the middle when you didn\'t aim there. The biggest miss, because hitters send those out of the park. Change-ups only count when they finish low (bottom row or below) – a change-up up in the zone is a miss. The ring just outside the box is still a good, competitive pitch (hitters chase it): on or 1 box from your spot = on target. A change-up or drop just below the knees always counts as a good pitch. 🚫 Way off = nowhere near the plate, always a miss.';
function paintKid(svg,d){zoneSVG(svg,'R',{noNums:true,noSide:true});let ex='';PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=svg.querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
  const col=PC.missColor(c.avg);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';const g=c.good||0;const lbl=c.n?`Aimed here ${c.n} time${c.n===1?'':'s'}, ${g} on target${c.mm?`, ${c.mm} souvenir${c.mm===1?'':'s'}`:''}`:'Not aimed here';el.setAttribute('aria-label',lbl);el.innerHTML=`<title>${lbl}</title>`;
  if(c.n){ex+=`<text x="${cx}" y="${cy-2}" style="fill:${tc};font-size:7px;font-weight:800;text-anchor:middle;dominant-baseline:middle">${g}/${c.n}</text><text x="${cx}" y="${cy+5}" style="fill:${tc};font-size:3.8px;font-weight:700;text-anchor:middle">on target</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+10}" style="fill:${tc};font-size:4.2px;font-weight:800;text-anchor:middle">🎁${c.mm}</text>`;}});svg.insertAdjacentHTML('beforeend',ex);}
// ---------- tap-a-box drill-down ----------
const DD_NAME=z=>z===5?'right down the middle':(z<10?'box '+z:'outside spot '+z);
function openDrill(z,c,title){const svg=$('ddMap');zoneSVG(svg,'R',{noNums:true,noSide:true,orient:true});let ex='';const L=c.land||{};let near=0,far=0,mm=0,up=0;
  PC.ALL_CELLS.forEach(q=>{const el=svg.querySelector(`[data-z="${q}"]`);if(!el)return;const e=L[q];const[cx,cy]=center(q);
    if(q==z){el.style.stroke='#fff';el.style.strokeWidth='2.2';}
    if(!e){el.style.fill='#161b22';return;}const good=PC.isGoodSev(e.sev);if(e.mm)mm+=e.mm;if(e.chUp)up+=e.chUp;if(good)near+=e.n;else far+=e.n-(e.mm||0);
    const col=good?PC.MISS_SCALE[0]:PC.missColor(e.sev);el.style.fill=col.fill;const lbl=`${e.n} landed ${DD_NAME(q)}${good?' (on target)':e.mm?' – souvenir':' (missed)'}`;el.setAttribute('aria-label',lbl);el.innerHTML=`<title>${lbl}</title>`;
    const[bx,by]=markPos(q);ex+=ballSVG(bx,by,e.n,e.mm?'souvenir':good?'good':'miss',5.4);if(e.chUp)ex+=`<text x="${cx}" y="${cy+9}" style="fill:${col.text};font-size:3.6px;font-weight:700;text-anchor:middle">CH up</text>`;});
  const [tx,ty]=center(Number(z));ex+=`<text x="${tx}" y="${ty-9}" style="fill:#fff;font-size:3.6px;font-weight:800;text-anchor:middle">AIM</text>`;svg.insertAdjacentHTML('beforeend',ex);
  const W=[21,22,23,24].filter(q=>L[q]).map(q=>`${L[q].n} ${PC.WAY[q]}`);const wn=[21,22,23,24].reduce((a,q)=>a+(L[q]?L[q].n:0),0);
  $('ddT').textContent=(title?title+' – ':'')+'aimed at '+DD_NAME(Number(z));
  $('ddCap').innerHTML=`You aimed here <b>${c.n}</b> time${c.n===1?'':'s'}: <b style="color:#2ea043">${near} on target</b> (or 1 box off)${far?`, <b style="color:#f47067">${far} missed</b>`:''}${mm?`, <b>${mm} souvenir${mm===1?'':'s'} 🎁</b>`:''}.`+(up?` ${up} change-up${up===1?' was':'s were'} up in the zone.`:'')+(wn?` <b style="color:#f47067">🚫 ${wn} way off</b> (${W.join(', ')}) – not shown on the grid.`:'');
  $('ddKey').textContent='White box = where you aimed. Numbers = how many landed there. Green = on target or 1 box off, red = missed (darker = farther), 🎁 = souvenir, 🚫 way off = nowhere near the plate (listed above).';openSheet($('ddDlg'));}
$('ddClose').onclick=()=>$('ddDlg').close();
function hookDrill(svg,d,title){svg.querySelectorAll('[data-z]').forEach(el=>{const z=el.dataset.z,c=d.cells[z];if(!c||!c.n)return;el.setAttribute('tabindex','0');el.setAttribute('role','button');el.style.cursor='pointer';
  const go=()=>openDrill(z,c,title);el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});}
// ---------- per pitch type sections ----------
function typeSectionsHTML(r,pre){const rp=v=>v==null?'–':Math.round(v)+'%';return Object.entries(r.types||{}).map(([t,x],i)=>{const g=x.stats;
  return `<div class="tsec" style="border-top:1px solid var(--line);padding-top:8px;margin-top:8px"><div style="font-weight:800;font-size:17px">${H(PC.TYPE_NAME[t]||t)} <span class="mut" style="font-weight:400;font-size:13px">${g.n} thrown</span></div>
  <div class="row wrap" style="gap:6px;margin:4px 0"><span class="tag">On target ${g.called?`${g.good} of ${g.called} aimed (${rp(g.goodPct)})`:'– (no spot aimed)'}</span><span class="tag">Strikes ${rp(g.strikePct)}</span><span class="tag">Competitive ${rp(g.compPct)}</span>${g.wayOff?`<span class="tag">🚫 ${g.wayOff}</span>`:''}<span class="tag">🎁 ${g.mm}</span>${t==='CH'&&g.chUp?`<span class="tag">Up in zone ${g.chUp}</span>`:''}</div>
  <svg id="${pre}${i}" data-type="${H(t)}" viewBox="-14 -6 128 138" style="width:62%;max-width:230px;display:block;margin:auto"></svg>
  <div style="font-size:14px">⭐ Best: ${x.best?`<b>${H(x.best.label)}</b> (${x.best.good}/${x.best.called})`:'<span class="mut">–</span>'} · 🎯 Work on: ${x.weakest?`<b>${H(x.weakest.label)}</b> (${x.weakest.good}/${x.weakest.called})`:'<span class="mut">–</span>'}</div>
  <ul class="fb" style="margin:4px 0">${x.feedback.map(f=>`<li>${H(f)}</li>`).join('')}</ul></div>`;}).join('');}
function paintTypeMaps(root,items,pre){root.querySelectorAll(`svg[id^="${pre}"]`).forEach(svg=>{const t=svg.dataset.type;const d=PC.missData(items,{type:t});if(!d.total){svg.outerHTML='<div class="mut" style="text-align:center;font-size:13px">No aimed spots for this pitch yet.</div>';return;}paintKid(svg,d);hookDrill(svg,d,PC.TYPE_NAME[t]||t);});}
// ---------- notes (coach / pitching coach write, player reads on her report) ----------
const canNote=()=>role()==='coach'||role()==='pcoach';
function noteBox(o,kid){if(!o.pitcherId)return'';const n=PC.findNote(S(),o);const body=n?n.body:'';
  if(canNote()&&vis(o.pitcherId))return `<div class="lbl" style="margin-top:10px">📝 Coach note${o.gameId?' for '+H(pName(o.pitcherId)):''}</div><textarea class="noteTa" data-note="${H(JSON.stringify(o))}" maxlength="2000" rows="3" placeholder="Shows on ${H(pName(o.pitcherId))}'s report" style="width:100%">${H(body)}</textarea>`;
  return body?`<div class="card" style="margin-top:10px;background:#1b2a1b"><div class="lbl">📝 ${kid?'Note from your coach':'Coach note'}</div><div style="white-space:pre-wrap">${H(body)}</div></div>`:'';}
document.addEventListener('change',e=>{const t=e.target;if(!t.classList||!t.classList.contains('noteTa')||!canNote())return;const o=JSON.parse(t.dataset.note);if(!vis(o.pitcherId))return;
  const s=S();s.notes=s.notes||[];let n=PC.findNote(s,o);const body=t.value.slice(0,2000);if(!n){n={id:PC.noteId(o),pitcherId:o.pitcherId,sessionId:o.sessionId||null,gameId:o.gameId||null,body};s.notes.push(n);}else n.body=body;
  dirty('notes',n.id);save();toast(store.isTest?'Note saved (test only)':'Note saved');});
function openReport(sess){if(!sess)return toast('No session');const R=reportFor(sess);RPT=R;const r=R.r;
  if(!R.P.length){$('rBody').innerHTML='<h2 id="rT">Bullpen report</h2><p class="mut">No pitches in this session'+(role()==='player'?' for you':'')+'.</p>';openSheet($('rDlg'));return;}
  const rp=v=>v==null?'–':Math.round(v)+'%';const st=[['Pitches',r.n],['Strikes',rp(r.strikePct)],['On target',rp(r.goodPct)],['Souvenirs',r.mm],['Competitive',rp(r.compPct)],['Spots aimed',r.called],['Bullseyes',r.hits]].concat(r.wayOff?[['🚫 Way off',r.wayOff]]:[]).concat(r.waste&&r.waste.n?[['Off-plate spots on target',`${r.waste.good}/${r.waste.n}`]]:[]);
  const sp=x=>x?`<b>${H(x.label)}</b> – ${x.good} of ${x.called} on target`:'<span class="mut">throw 2+ pitches at a spot to see this</span>';
  const tr=r.trend&&r.trend.first.called&&r.trend.second.called?`<div class="lbl" style="margin-top:10px">Early vs. late</div><div>First half: ${rp(r.trend.first.goodPct)} on target · ${rp(r.trend.first.strikePct)} strikes<br>Second half: ${rp(r.trend.second.goodPct)} on target · ${rp(r.trend.second.strikePct)} strikes</div>`:'';
  $('rBody').innerHTML=`${R.test?'<div class="tag" style="background:var(--red)">TEST – not saved</div>':''}<h2 id="rT">Bullpen report</h2><div class="mut">${H(R.who)} · ${H(sess.date||'')} </div>
  <div class="grid3" style="margin-top:8px">${st.map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
  <div class="lbl" style="margin-top:10px">Feedback</div><ul class="fb">${r.feedback.map(t=>`<li>${H(t)}</li>`).join('')}</ul>${noteBox({sessionId:sess.id,pitcherId:sess.pitcherId||(R.P[0]&&R.P[0].pitcherId)},role()==='player')}
  <div class="lbl">Where you aimed – how close you got</div><svg id="rMap" viewBox="-14 -6 128 138" style="width:100%;max-width:340px;display:block;margin:auto"></svg>
  <div style="font-size:13px;line-height:1.4;margin-top:4px">👆 Tap a box to see where those pitches went. ${KID_LEGEND}</div>
  <div class="lbl" style="margin-top:10px">Best spot / work on</div><div>⭐ Best: ${sp(r.best)}</div><div>🎯 Work on: ${sp(r.weakest)}</div>${tr}${shakeHTML(R.P)}
  <div class="lbl" style="margin-top:10px">By pitch</div><div id="rTypes">${typeSectionsHTML(r,'rT_')}</div><div class="lbl" style="margin-top:10px">All pitches</div><table><tr><th>Pitch</th><th>Thrown</th><th>Strikes</th><th>On target</th><th>🎁</th></tr>${Object.entries(r.byType).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(PC.TYPE_NAME[k]||k)}</td><td>${v.n}</td><td>${rp(v.strikePct)}</td><td>${v.called?`${v.good}/${v.called}`:'–'}</td><td>${v.mm}</td></tr>`).join('')}</table>`;
  paintTypeMaps($('rBody'),R.items,'rT_');if(R.miss.total){paintMiss($('rMap'),R.miss,true);hookDrill($('rMap'),R.miss);}else $('rMap').outerHTML='<div class="mut">No intended spots logged – tap a target before the actual location to get the heat map.</div>';
  openSheet($('rDlg'));}
function reportPNG(R){const W=720,r=R.r,lines=[];const cv=document.createElement('canvas');const ctx=cv.getContext('2d');
  const wrap=(t,w,font)=>{ctx.font=font;const out=[];let cur='';t.split(' ').forEach(x=>{const n=cur?cur+' '+x:x;if(ctx.measureText(n).width>w){out.push(cur);cur=x;}else cur=n;});if(cur)out.push(cur);return out;};
  cv.width=W;cv.height=10;const nt=PC.findNote(store.state,{sessionId:R.sess.id,pitcherId:R.sess.pitcherId||(R.P[0]&&R.P[0].pitcherId)});const fbl=r.feedback.map(t=>wrap('• '+t,W-60,'22px sans-serif')).concat(nt&&nt.body?[wrap('📝 Coach note: '+nt.body,W-60,'22px sans-serif')]:[]);const types=Object.entries(r.byType);
  const H2=200+fbl.flat().length*30+40+5*90+30+140+70+types.length*30+(r.trend?70:0)+80;cv.width=W;cv.height=H2;
  ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H2);let y=50;const tx=(t,x,yy,f,c)=>{ctx.font=f;ctx.fillStyle=c||'#e6edf3';ctx.fillText(t,x,yy);};
  tx('THUNDER ELITE · Bullpen report'+(R.test?' (TEST)':''),30,y,'bold 28px sans-serif','#4c7dff');y+=36;tx(`${R.who} · ${R.sess.date||''}`,30,y,'22px sans-serif','#9aa4b2');y+=46;
  [['Pitches',r.n],['Strikes',r.strikePct==null?'–':Math.round(r.strikePct)+'%'],['On target',r.goodPct==null?'–':Math.round(r.goodPct)+'%'],['Souvenirs',r.mm],['Bullseyes',r.hits]].forEach(([k,v],i)=>{const x=30+i*134;ctx.fillStyle='#161b22';ctx.fillRect(x,y-30,124,72);tx(String(v),x+10,y+4,'bold 28px sans-serif');tx(k,x+10,y+32,'16px sans-serif','#9aa4b2');});y+=80;tx(`Competitive (in the zone or just off it): ${r.compPct==null?'–':Math.round(r.compPct)+'%'}${r.wayOff?` · 🚫 ${r.wayOff} way off`:''}${r.waste&&r.waste.n?` · off-plate spots ${r.waste.good}/${r.waste.n} on target`:''}`,30,y,'19px sans-serif','#c9d1d9');y+=32;
  fbl.forEach(ls=>ls.forEach(l=>{tx(l,30,y,'22px sans-serif');y+=30;}));y+=20;
  const S=90,ox=(W-5*S)/2;PC.ALL_CELLS.forEach(z=>{const [gx,gy]=PC.GRID_XY[z];const c=R.miss.cells[z];const col=PC.missColor(c.avg);const x=ox+gx*S,yy=y+gy*S;
    ctx.fillStyle=col?col.fill:'#161b22';ctx.fillRect(x+2,yy+2,S-4,S-4);ctx.textAlign='center';if(c.n){tx(`${c.good||0}/${c.n}`,x+S/2,yy+40,'bold 26px sans-serif',col.text);tx('on target'+(c.mm?' 🎁'+c.mm:''),x+S/2,yy+66,'15px sans-serif',col.text);}else tx(String(z),x+S/2,yy+52,'16px sans-serif','#555');ctx.textAlign='left';});
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(ox+S,y+S,3*S,3*S);y+=5*S+30;wrap(KID_LEGEND.replace(/<[^>]+>/g,''),W-60,'18px sans-serif').forEach(l=>{tx(l,30,y,'18px sans-serif','#c9d1d9');y+=26;});y+=14;
  tx('⭐ Best: '+(r.best?`${r.best.label} (${r.best.good} of ${r.best.called} on target)`:'–'),30,y,'19px sans-serif');y+=30;tx('🎯 Work on: '+(r.weakest?`${r.weakest.label} (${r.weakest.good} of ${r.weakest.called} on target)`:'–'),30,y,'19px sans-serif');y+=38;
  types.forEach(([k,v])=>{tx(`${PC.TYPE_NAME[k]||k}: ${v.n} thrown · ${v.strikePct==null?'–':Math.round(v.strikePct)+'%'} strikes · ${v.good}/${v.called} on target${v.mm?` · ${v.mm} souvenir${v.mm===1?'':'s'}`:''}`,30,y,'19px sans-serif');y+=30;});
  if(r.trend){y+=10;tx(`Early vs. late: ${Math.round(r.trend.first.goodPct||0)}% on target → ${Math.round(r.trend.second.goodPct||0)}%`,30,y,'19px sans-serif');}
  return new Promise(res=>cv.toBlob(res,'image/png'));}
$('rShare').onclick=async()=>{if(!RPT||!RPT.P.length)return;const b=await reportPNG(RPT);const name=`bullpen-${(RPT.who||'').replace(/#.*$/,'').trim().split(' ').pop()}-${RPT.sess.date||''}.png`.replace(/[^\w.-]/g,'_');
  const f=new File([b],name,{type:'image/png'});try{if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:'Bullpen report'});return;}}catch(e){if(e&&e.name==='AbortError')return;}
  const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);toast('Image saved');};
$('rPrint').onclick=()=>window.print();$('rClose').onclick=()=>$('rDlg').close();
$('sReport').onclick=()=>{const x=S().sessions.find(q=>q.id===$('sScope').value);openReport(x);};
