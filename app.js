/* Thunder Elite pitch charting – UI */
(function(){'use strict';
const $=id=>document.getElementById(id);
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage=null;try{storage=window.localStorage;storage.setItem('__t','1');storage.removeItem('__t');}catch(e){storage=null;}
const store=PC.makeStore(storage);
const S=()=>store.state;
const dirty=(k,id)=>{store.markDirty(k,id);};
const save=()=>{schedSync();if(!store.save()&&!store.isTest&&!store.saveOk)toast('Not saving: storage blocked. Open in Safari (not private).');};
let tab='game';
const D={type:null,callTxt:'',parsed:null,target:null,loc:null,ip:false}; // current pitch draft
let callOn=false,bpHand='N'; // bullpen default: no batter (in/away calls map as RHB)
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1300);}
// ---------- helpers ----------
const allTypes=()=>PC.BASE_TYPES.concat(S().customTypes.map(c=>({code:c.code.toUpperCase(),name:c.name})));
const pById=id=>S().pitchers.find(p=>p.id===id);
const pName=id=>{const p=pById(id);return p?(p.name+(p.num?' #'+p.num:'')):'?';};
const game=()=>S().games.find(g=>g.id===S().activeGame)||null;
const session=()=>S().sessions.find(s=>s.id===S().activeSession)||null;
// no code = local coach mode; a code the server rejected = 'unknown' (look-only until fixed), never coach
const role=()=>{const sy=store.real.sync;if(!sy.teamCode)return 'coach';if(sy.role===null)return 'unknown';return sy.role||'coach';};
const ROLE_TABS={pcoach:['bullpen','stats','setup'],coach:['game','bullpen','stats','setup'],player:['bullpen','stats','setup'],viewer:['stats','setup'],unknown:['stats','setup']};
// pitchers this code may see: null = all (coach/viewer), [own] = player, list = pitching coach
function mine(){const r=role(),y=store.real.sync;if(r==='player')return y.pitcherId?[y.pitcherId]:[];if(r==='pcoach')return y.pitcherIds||[];return null;}
const vis=pid=>{const m=mine();return !m||m.includes(pid);};
function curPitcherId(){const s=S();if(role()==='pcoach'){const m=mine();if(!m.includes(s.curPitcher))s.curPitcher=m.find(id=>pById(id))||m[0]||null;return s.curPitcher;}if(role()==='player'){const id=store.real.sync.pitcherId;if(id&&pById(id)){s.curPitcher=id;return id;}}if(!s.curPitcher||!pById(s.curPitcher)||pById(s.curPitcher).archived){const a=store.activePitchers()[0];s.curPitcher=a?a.id:null;}return s.curPitcher;}
function curHand(){if(tab==='game'){const g=game();if(g){const b=g.lineup[g.cur.slot];return(g.cur.hand||(b&&b.hand)||'R');}}return bpHand;}
function throwsOf(){const p=pById(curPitcherId());return p?p.throws:'R';}
const buzz=p=>{try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}};
function confirmSave(t){buzz(35);let f=document.getElementById('flash');if(!f){f=document.createElement('div');f.id='flash';document.body.appendChild(f);}f.textContent='✓ '+t;f.classList.add('on');clearTimeout(f._t);f._t=setTimeout(()=>f.classList.remove('on'),700);}
const oneHand=()=>S().oneHand!==false;
function advance(step){if(!oneHand())return;const el=step==='loc'?$('zone'):step==='result'?$('resBtns'):($('wbCard')&&!$('wbCard').classList.contains('hide')?$('wbCard'):$('types'));if(el&&el.scrollIntoView)setTimeout(()=>el.scrollIntoView({behavior:'auto',block:step==='result'?'end':'start'}),30);}
function pcCheck(pid,before,after){ensureSettings();const th=S().settings.alerts;const a=PC.alertLevel(before,th),b=PC.alertLevel(after,th);if(b.lvl>a.lvl){buzz([220,90,220]);toast(`⚠️ ${pName(pid)} has thrown ${after} pitches (alert at ${b.at})`);}}
function resetDraft(){D.cell=null;D.bb=null;Object.assign(D,{type:null,callTxt:'',parsed:null,target:null,loc:null,ip:false});$('callTxt').value='';}
// ---------- zone ----------
const ZX0=20,ZY0=24,CW=20,CHh=24;
const QUAD={11:'M0 0H40V24H20V48H0Z',12:'M60 0H100V48H80V24H60Z',13:'M0 72H20V96H40V120H0Z',14:'M100 72V120H60V96H80V72Z',15:'M40 0H60V24H40Z',16:'M0 48H20V72H0Z',17:'M80 48H100V72H80Z',18:'M40 96H60V120H40Z'};
const QLBL={11:[10,12],12:[90,12],13:[10,108],14:[90,108],15:[50,12],16:[10,60],17:[90,60],18:[50,108]};
function zoneOf(x,y){if(x>=ZX0&&x<=80&&y>=ZY0&&y<=96){const c=Math.min(2,Math.floor((x-ZX0)/CW)),r=Math.min(2,Math.floor((y-ZY0)/CHh));return r*3+c+1;}
  if(x<-14||x>114||y<-6||y>132)return null;
  if(x>=40&&x<=60)return y<60?15:18; if(y>=48&&y<=72)return x<50?16:17;
  return x<50?(y<60?11:13):(y<60?12:14);}
const center=z=>z<10?[ZX0+((z-1)%3+.5)*CW,ZY0+(((z-1)/3|0)+.5)*CHh]:QLBL[z];
function zoneSVG(svg,hand,o={}){let h='';
  for(const q in QUAD)h+=`<path data-z="${q}" class="zb" d="${QUAD[q]}" stroke="#0d1117" stroke-width=".8"/>`;
  for(let i=0;i<9;i++)h+=`<rect data-z="${i+1}" class="zs" x="${ZX0+(i%3)*CW}" y="${ZY0+((i/3)|0)*CHh}" width="${CW}" height="${CHh}" stroke="#0d1117" stroke-width=".8"/>`;
  h+='<path d="M20 24H80V96H20Z" fill="none" stroke="#e6edf3" stroke-width="1"/>';
  const lab=o.labels||{};
  if(!o.noNums)for(const q in QLBL)h+=`<text class="zl" x="${QLBL[q][0]}" y="${QLBL[q][1]-(lab[q]?3:0)}">${q}</text>${lab[q]?`<text class="zl" style="font-size:5px;fill:#8fb0ff" x="${QLBL[q][0]}" y="${QLBL[q][1]+4}">${lab[q]}</text>`:''}`;
  if(!o.noNums)for(let i=1;i<=9;i++){const[c,r]=center(i);h+=`<text class="zl" x="${c}" y="${r-(lab[i]?3:0)}">${i}</text>${lab[i]?`<text class="zl" style="font-size:5px;fill:#8fb0ff" x="${c}" y="${r+5}">${lab[i]}</text>`:''}`;}
  // side labels by handedness (RHB stands on pitcher's right)
  if(o.noSide)h+=`<text class="side" transform="translate(-8 60) rotate(-90)">1B side</text><text class="side" transform="translate(108 60) rotate(90)">3B side</text>`;
  else{  const inRight=PC.insideCol(hand)===2;
  const gl=hand==='N'&&(o.throws==='L'||o.throws==='R');const gR=o.throws==='L';
  h+=gl?`<text class="side" transform="translate(-8 60) rotate(-90)">${gR?'ARM':'GLOVE'}</text><text class="side" transform="translate(108 60) rotate(90)">${gR?'GLOVE':'ARM'}</text>`:`<text class="side" transform="translate(-8 60) rotate(-90)">${inRight?'AWAY':'IN'}</text><text class="side" transform="translate(108 60) rotate(90)">${inRight?'IN':'AWAY'}</text>`;
  h+=hand==='N'?`<text class="side" style="fill:#8b949e;font-size:5px" x="50" y="128">${gl?`No batter · glove/arm side (${o.throws}HP) · IN/A calls map as RHB`:'No batter · in/away shown as RHB'}</text>`:`<text class="side" style="fill:#5b8cff;font-size:5.5px" x="${inRight?88:12}" y="128">${hand==='L'?'LHB':'RHB'} ${inRight?'▶':'◀'}</text><text class="side" x="${inRight?12:88}" y="128" style="opacity:.5">${inRight?'LHB side':'RHB side'}</text>`;
  }
  svg.innerHTML=h+(o.extra||'');}
function drawZone(){const hand=curHand();let ex='';const tset=D.parsed&&D.parsed.targets.length?D.parsed.targets:(D.target?[D.target]:[]);
  const lab={};tset.forEach(z=>lab[z]='TARGET');
  zoneSVG($('zone'),hand,{labels:lab,throws:throwsOf()});
  tset.forEach(z=>{const e=$('zone').querySelector(`[data-z="${z}"]`);e&&e.classList.add('zt');});
  if(D.loc){const e=$('zone').querySelector(`[data-z="${D.loc}"]`);e&&e.classList.add(tset.includes(D.loc)?'zta':'za');}
  document.querySelectorAll('#wayBtns [data-z]').forEach(b=>b.classList.toggle('sel',+b.dataset.z===D.loc));}
const locTxt=z=>PC.isWay(z)?PC.WAY[z]:'@'+z;
function tapLoc(z){const way=PC.isWay(z);
  if(tab==='bullpen'){if(!D.type&&D.parsed)D.type=D.parsed.type;
    const r=PC.bullpenTap({type:D.type,target:D.target,callTargets:callOn&&D.parsed?D.parsed.targets:[]},z);
    if(r.action==='need_type'){toast('Pick the pitch type first');return;}
    if(r.action==='target'){if(way)return toast('Way off can\'t be a target – tap a box to aim');D.target=z;render();return;}
    D.loc=z;logBullpen(r.targets);return;}
  if(callOn&&D.parsed&&!D.parsed.targets.length&&!D.target){if(way)return toast('Tap the called target box first');D.target=z;}
  else{D.loc=z;}
  render();if(tab==='game'&&D.loc)advance('result');}
$('zone').addEventListener('click',e=>{const svg=$('zone');const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  const z=zoneOf(p.x,p.y);if(z)tapLoc(z);});
$('wayBtns').addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(b)tapLoc(+b.dataset.z);});
// ---------- call entry ----------
function setCall(t){D.callTxt=t;$('callTxt').value=t;D.parsed=PC.parseCall(t,curHand(),throwsOf(),S().customTypes);D.target=null;if(D.parsed&&!D.type)D.type=D.parsed.type;render();}
$('callTxt').addEventListener('input',e=>{D.callTxt=e.target.value;D.parsed=PC.parseCall(D.callTxt,curHand(),throwsOf(),S().customTypes);D.target=null;if(D.parsed)D.type=D.parsed.type;render(true);});
$('callAlt').addEventListener('click',e=>{const z=e.target.dataset.alt;if(!z||!D.parsed)return;D.parsed.targets=[+z];D.target=null;render();});
$('callClr').onclick=()=>{setCall('');D.type=null;render();};
$('callTypes').addEventListener('click',e=>{const c=e.target.dataset.c;if(!c)return;const suf=(D.parsed&&D.parsed.suffix)||'';setCall(c+(suf?(' '+suf):''));D.type=PC.normType(c,S().customTypes);render();});
$('callSuf').addEventListener('click',e=>{const s=e.target.dataset.s;if(s==null)return;const t=(D.parsed&&D.parsed.type)||'FB';setCall(s==='H+'&&!D.parsed?'H+':(t+(s?' '+s:'')));});
// ---- wristband call sheet (game, coach) ----
const sheets=()=>(S().callSheets||[]).filter(x=>!x.deleted);
function curSheet(){const l=sheets();const p=curPitcherId();return l.find(x=>x.id===S().activeSheet)||l.find(x=>p&&x.pitcherId===p)||l[0]||null;}
function callCell(r,c){const sh=curSheet();if(!sh)return;const t=(sh.rows[r]||[])[c];if(t==null||!String(t).trim())return toast('Empty box');
  if(!callOn){callOn=true;S().callOn=true;save();}D.type=null;setCall(String(t));D.cell={sheet:sh.id,r,c};if(D.parsed)D.type=D.parsed.type;else toast(`Can't read "${t}"`);setTimeout(()=>advance('loc'),0);
  $('wbMsg').textContent=`${r+1}-${sh.cols[c]||c+1}: ${t}`+(D.parsed?(D.parsed.targets.length?` → zone ${D.parsed.targets.join('/')}`:' → no spot, tap target'):' (not understood)');render();}
$('wbTbl').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(b)callCell(+b.dataset.r,+b.dataset.c);});
function wbRefGo(){const sh=curSheet();const x=PC.parseCellRef($('wbRef').value,sh);if(!x)return toast('Use row-col, e.g. 3-05');$('wbRef').value='';callCell(x.r,x.c);}
$('wbGo').onclick=wbRefGo;$('wbRef').addEventListener('keydown',e=>{if(e.key==='Enter')wbRefGo();});
$('wbSheet').onchange=e=>{S().activeSheet=e.target.value;D.cell=null;save();render();};
function renderWristband(){const show=tab==='game'&&!!game()&&role()==='coach';$('wbCard').classList.toggle('hide',!show);if(!show)return;const sh=curSheet();
  $('wbSheet').innerHTML=sheets().map(x=>`<option value="${H(x.id)}" ${sh&&x.id===sh.id?'selected':''}>${H(x.name)}</option>`).join('');if(!sh){$('wbTbl').innerHTML='';return;}
  const h=curHand(),th=throwsOf(),ct=S().customTypes;
  $('wbTbl').innerHTML=`<tr><th class="rh"></th>${sh.cols.map(c=>`<th>${H(c)}</th>`).join('')}</tr>`+sh.rows.map((row,r)=>`<tr class="${r%2?'b':''}"><th class="rh">${r+1}</th>${sh.cols.map((_,c)=>{const t=row[c]||'';const on=D.cell&&D.cell.sheet===sh.id&&D.cell.r===r&&D.cell.c===c;const bad=t.trim()&&!PC.parseCall(t,h,th,ct);
    return `<td class="${on?'on':''} ${bad?'bad':''}"><button data-r="${r}" data-c="${c}">${H(t)}</button></td>`;}).join('')}</tr>`).join('');}
// setup editor
let csId=null;const csCur=()=>sheets().find(x=>x.id===csId)||sheets()[0]||null;
function csDirty(sh){dirty('call_sheets',sh.id);save();}
function renderCS(){const show=role()==='coach';$('csCard').classList.toggle('hide',!show);if(!show)return;const sh=csCur();
  $('csSel').innerHTML=sheets().map(x=>`<option value="${H(x.id)}" ${sh&&x.id===sh.id?'selected':''}>${H(x.name)}</option>`).join('');
  if(!sh){$('csTbl').innerHTML='';$('csName').value='';return;}csId=sh.id;if(document.activeElement!==$('csName'))$('csName').value=sh.name;
  $('csPitcher').innerHTML='<option value="">Any pitcher</option>'+S().pitchers.map(p=>`<option value="${H(p.id)}" ${sh.pitcherId===p.id?'selected':''}>${H(p.name)}</option>`).join('');
  if($('csTbl').contains(document.activeElement))return;
  $('csTbl').innerHTML=`<tr><th class="rh"></th>${sh.cols.map((c,i)=>`<th><input data-col="${i}" value="${H(c)}" maxlength="4"></th>`).join('')}</tr>`+sh.rows.map((row,r)=>`<tr class="${r%2?'b':''}"><th class="rh">${r+1}</th>${sh.cols.map((_,c)=>`<td><input data-r="${r}" data-c="${c}" value="${H(row[c]||'')}" maxlength="16" autocapitalize="characters"></td>`).join('')}</tr>`).join('');}
$('csTbl').addEventListener('change',e=>{const sh=csCur();const i=e.target;if(!sh)return;if(i.dataset.col!=null)sh.cols[+i.dataset.col]=i.value.trim().slice(0,4);else{sh.rows[+i.dataset.r][+i.dataset.c]=i.value.trim().slice(0,16);}
  const ok=!i.value.trim()||i.dataset.col!=null||PC.parseCall(i.value,'R','R',S().customTypes);i.style.color=ok?'':'var(--red)';if(!ok)toast(`"${i.value}" isn't a code I know`);csDirty(sh);});
$('csSel').onchange=e=>{csId=e.target.value;renderCS();};
$('csName').onchange=e=>{const sh=csCur();if(!sh)return;sh.name=e.target.value.trim().slice(0,80)||'Sheet';csDirty(sh);render();};
$('csPitcher').onchange=e=>{const sh=csCur();if(!sh)return;sh.pitcherId=e.target.value||null;csDirty(sh);};
$('csNew').onclick=()=>{const n=sheets().length+1;const sh={id:'cs_'+Date.now().toString(36),name:'Wristband '+n,pitcherId:null,cols:PC.sheetCols(8),rows:Array.from({length:7},()=>Array(8).fill(''))};S().callSheets=S().callSheets||[];S().callSheets.push(sh);csId=sh.id;csDirty(sh);render();};
$('csDel').onclick=()=>{const sh=csCur();if(!sh||!confirm(`Delete "${sh.name}"?`))return;sh.deleted=true;csId=null;if(S().activeSheet===sh.id)S().activeSheet=null;csDirty(sh);render();};
const csEdit=f=>()=>{const sh=csCur();if(!sh)return;f(sh);$('csTbl').innerHTML='';csDirty(sh);render();};
$('csAddR').onclick=csEdit(sh=>sh.rows.push(Array(sh.cols.length).fill('')));
$('csDelR').onclick=csEdit(sh=>{if(sh.rows.length>1)sh.rows.pop();});
$('csAddC').onclick=csEdit(sh=>{if(sh.cols.length<12){sh.cols.push(String(sh.cols.length+1).padStart(2,'0'));sh.rows.forEach(r=>r.push(''));}});
$('csDelC').onclick=csEdit(sh=>{if(sh.cols.length>1){sh.cols.pop();sh.rows.forEach(r=>r.length=sh.cols.length);}});
$('oneHand').onchange=e=>{S().oneHand=e.target.checked;save();render();};
// pitch-count banner (game) + rest-day reminder (pitcher select)
// team settings (alerts, soft limits, rest guide) are coach-only and sync to Supabase (team_settings) so every coach phone shares them
function ensureSettings(){const s=S();s.settings=s.settings||{};const st=s.settings;if(!Array.isArray(st.alerts))st.alerts=PC.DEFAULT_ALERTS.slice();if(!Array.isArray(st.rest))st.rest=PC.DEFAULT_REST.map(x=>Object.assign({},x));st.limits=Object.assign({},PC.DEFAULT_LIMITS,st.limits);if(typeof st.showRest!=='boolean')st.showRest=false;return st;}
const saveSettings=()=>{dirty('team_settings',PC.TEAM_SETTINGS_ID);save();render();};
const today=()=>PC.localDate(Date.now());
const wlSeen={}; // pitcher|day -> last limit level shown, so the over-limit buzz fires once when it is crossed
function renderAlerts(){const set=ensureSettings();const cp=curPitcherId();const g=game();const R0=role();
  const showA=tab==='game'&&g&&cp;const n=showA?PC.pitchCount(g.pitches,cp):0;const a=PC.alertLevel(n,set.alerts);const el=$('pcAlert');
  // today / weekend workload line under the pitcher select (game + bullpen tabs)
  const wl=$('wlMsg');const showW=cp&&(tab==='game'||tab==='bullpen');let wa=null;
  if(showW){const w=PC.workload(S(),cp,today());wa=PC.workloadAlert(w,set.limits);wl.className='wl'+(wa.lvl>=0?' l'+wa.lvl:'');wl.textContent=PC.workloadText(w);
    const k=cp+'|'+today(),prev=wlSeen[k];wlSeen[k]=wa.lvl;if(prev!=null&&wa.lvl===1&&prev<1&&R0!=='viewer'){buzz([220,90,220]);toast(`⚠️ ${pName(cp)} is at her ${wa.day.lvl===1?'daily':'weekend'} limit`);}}
  else wl.className='hide';
  const msgs=[];if(showA&&a.lvl>=0)msgs.push(`${n} pitches – past the ${a.at} alert${a.next?` (next at ${a.next})`:''}`);
  if(wa&&wa.day.lvl>=0)msgs.push(`today ${wa.day.n}/${wa.day.limit}`);if(wa&&wa.weekend.lvl>=0)msgs.push(`weekend ${wa.weekend.n}/${wa.weekend.limit}`);
  const lvl=Math.max(showA?Math.min(1,a.lvl):-1,wa?wa.lvl:-1);el.className=msgs.length?'l'+Math.max(0,lvl):'hide';if(msgs.length)el.textContent=`⚠️ ${pName(cp)}: ${msgs.join(' · ')}`;
  const rm=$('restMsg');const ri=set.showRest&&cp&&R0!=='player'&&R0!=='viewer'&&(tab==='game'||tab==='bullpen')?PC.restInfo(S(),cp,new Date().toISOString().slice(0,10),set.rest):null;
  if(!ri||(tab==='game'&&g&&g.id===ri.gameId)){rm.className='hide';return;}
  const fd=d=>new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'});
  rm.className=ri.ok?'ok':'no';rm.textContent=`${ri.ok?'✅':'⛔'} Last outing ${fd(ri.date)}${ri.opponent?' vs '+ri.opponent:''}: ${ri.n} pitches → ${ri.days} day${ri.days===1?'':'s'} rest. ${ri.ok?'Ready to pitch.':'Rest until '+fd(ri.ready)+'.'}`;}
function renderAlertCard(){const show=role()==='coach';$('alertCard').classList.toggle('hide',!show);if(!show)return;const st=ensureSettings();
  const setVal=(id,v)=>{if(document.activeElement!==$(id))$(id).value=v;};setVal('alTh',st.alerts.join(', '));setVal('limDay',st.limits.day||'');setVal('limWk',st.limits.weekend||'');
  $('showRest').checked=st.showRest;$('restBox').classList.toggle('hide',!st.showRest);if(!st.showRest||$('restTbl').contains(document.activeElement))return;
  $('restTbl').innerHTML='<tr><th>Up to (pitches)</th><th>Rest days</th><th></th></tr>'+st.rest.map((r,i)=>`<tr><td><input data-ri="${i}" data-k="max" inputmode="numeric" value="${r.max>=9999?'':r.max}" placeholder="any"></td><td><input data-ri="${i}" data-k="days" inputmode="numeric" value="${r.days}"></td><td><button data-rdel="${i}">✕</button></td></tr>`).join('');}
$('alTh').onchange=e=>{const v=e.target.value.split(/[ ,;]+/).map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<400).sort((a,b)=>a-b);S().settings.alerts=v.length?v:PC.DEFAULT_ALERTS.slice();saveSettings();toast('Alerts at '+S().settings.alerts.join(', '));};
$('restTbl').addEventListener('change',e=>{const i=e.target.dataset.ri;if(i==null)return;const r=S().settings.rest[+i];const v=e.target.value.trim();if(e.target.dataset.k==='max')r.max=v===''?9999:Math.max(0,parseInt(v)||0);else r.days=Math.max(0,Math.min(14,parseInt(v)||0));S().settings.rest.sort((a,b)=>a.max-b.max);$('restTbl').innerHTML='';saveSettings();});
$('restTbl').addEventListener('click',e=>{const i=e.target.dataset.rdel;if(i==null)return;S().settings.rest.splice(+i,1);if(!S().settings.rest.length)S().settings.rest=PC.DEFAULT_REST.map(x=>Object.assign({},x));saveSettings();});
$('restAdd').onclick=()=>{S().settings.rest.push({max:9999,days:4});saveSettings();};
$('restReset').onclick=()=>{S().settings.rest=PC.DEFAULT_REST.map(x=>Object.assign({},x));S().settings.alerts=PC.DEFAULT_ALERTS.slice();S().settings.limits=Object.assign({},PC.DEFAULT_LIMITS);S().settings.showRest=false;saveSettings();toast('Defaults restored');};
$('limDay').onchange=e=>{ensureSettings().limits.day=PC.cleanLimit(e.target.value);saveSettings();};
$('limWk').onchange=e=>{ensureSettings().limits.weekend=PC.cleanLimit(e.target.value);saveSettings();};
$('showRest').onchange=e=>{ensureSettings().showRest=e.target.checked;saveSettings();};
$('callOn').onchange=e=>{callOn=e.target.checked;S().callOn=callOn;save();render();};
$('types').addEventListener('click',e=>{const c=e.target.dataset.c;if(!c)return;D.type=D.type===c?null:c;render();if(tab==='game'&&D.type)advance('loc');});
$('hL').onclick=()=>setHand('L');$('hR').onclick=()=>setHand('R');$('hN').onclick=()=>setHand('N');$('bpTest').onclick=()=>toggleTest();
function setHand(h){if(tab==='game'&&game()){game().cur.hand=h;dirty('games',game().id);save();}else bpHand=h;if(D.callTxt)D.parsed=PC.parseCall(D.callTxt,h,throwsOf(),S().customTypes);render();}
// ---------- record building ----------
function baseRec(){return{id:PC.uuid(),ts:Date.now(),pitcherId:curPitcherId(),hand:curHand(),type:D.type||(D.parsed&&D.parsed.type)||null,
  call:callOn&&D.parsed?D.parsed.norm:null,callRaw:callOn&&D.callTxt?D.callTxt:null,targets:callOn?(D.parsed&&D.parsed.targets.length?D.parsed.targets:(D.target?[D.target]:[])):[],loc:D.loc||null};}
function logBullpen(targets){if(role()==='viewer')return;let s=session();if(!s||(role()==='player'&&s.pitcherId!==store.real.sync.pitcherId)||(role()==='pcoach'&&s.pitcherId!==curPitcherId()))s=newSession();const r=baseRec();r.b=0;r.s=0;if(targets)r.targets=targets;s.pitches.push(r);dirty('pitches',r.id);save();
  const ok=PC.hitSpot(r);buzz(25);toast(`${r.type||'?'} ${locTxt(r.loc)}${r.targets.length?(ok?' ✓ hit spot':' ✗ missed'):''}`);resetDraft();render();}
function newSession(){const s={id:'s_'+PC.uid(),date:new Date().toISOString().slice(0,10),started:Date.now(),pitches:[]};if(role()==='player')s.pitcherId=store.real.sync.pitcherId;if(role()==='pcoach')s.pitcherId=curPitcherId();S().sessions.push(s);S().activeSession=s.id;dirty('sessions',s.id);save();return s;}
$('bpNew').onclick=()=>{newSession();resetDraft();render();toast('New bullpen session');};
// game result
$('resBtns').addEventListener('click',e=>{const r=e.target.dataset.r;if(!r)return;if(r==='inplay'){D.ip=true;render();return;}recordGame(r);});
$('ipBtns').addEventListener('click',e=>{const bb=e.target.closest('[data-bb]');if(bb){D.bb=D.bb===bb.dataset.bb?null:bb.dataset.bb;document.querySelectorAll('#ipBtns [data-bb]').forEach(x=>x.classList.toggle('sel',x.dataset.bb===D.bb));return;}const ip=(e.target.closest('[data-ip]')||{}).dataset?.ip;if(ip==null)return;if(!ip){D.ip=false;render();return;}recordGame('inplay',ip);});
function recordGame(result,ip,noPitch){const g=game();if(!g)return;const c=g.cur;if((result==='kd3'||result==='kd3out')&&c.s!==2){toast('Dropped 3rd strike only with 2 strikes');return;}if(g.ended){toast('Game is over');return;}if(c.outs>=3){toast('3 outs – tap Next inn first');return;}const b=g.lineup[c.slot]||{};
  const r=Object.assign(baseRec(),{inning:c.inning,outsBefore:c.outs,slot:c.slot,batter:b.name||'',batterNum:b.num||'',b:c.b,s:c.s,abn:c.abn,result,ip:ip||null,firstPitch:c.b===0&&c.s===0,prevHand:c.hand||null});
  let o;if(noPitch){o={b:c.b,s:c.s,end:'IBB',outs:0};r.noPitch=true;r.type=null;r.loc=null;r.call=null;r.targets=[];}else{try{o=PC.applyPitch(c,result,ip);}catch(e){toast(String(e.message||e));return;}}
  if(result==='inplay'&&D.bb)r.bb=D.bb;const pcBefore=PC.pitchCount(g.pitches,r.pitcherId);r.end=o.end;g.pitches.push(r);dirty('pitches',r.id);dirty('games',g.id);c.b=o.b;c.s=o.s;
  if(o.end){c.outs+=o.outs;let msg={BB:'Walk',K:'Strikeout',HBP:'Hit by pitch',IBB:'Intentional walk','K-D3':'Strikeout – reached on dropped 3rd',out:'Out',E:'Reached on error',FC:"Fielder's choice",DP:'Double play'}[o.end]||o.end;
    c.b=0;c.s=0;c.abn++;c.slot=(c.slot+1)%Math.max(1,g.lineup.length);c.hand=null;
    if(c.outs>=3){c.outs=0;c.inning++;msg+=' · side retired';}toast(msg);}
  confirmSave(o.end?({BB:'Walk',K:'Strikeout','K-D3':'K (D3)',HBP:'HBP',IBB:'IBB'}[o.end]||o.end):`${{ball:'Ball',called:'Strike',swinging:'Swing & miss',foul:'Foul',foultip:'Foul tip',inplay:'In play'}[result]||result} · ${c.b}-${c.s}`);
  pcCheck(r.pitcherId,pcBefore,PC.pitchCount(g.pitches,r.pitcherId));
  resetDraft();save();render();if(oneHand())advance('call');}
$('ibb').onclick=()=>{if(confirm('Intentional walk (no pitches counted, per GC)?'))recordGame('ibb',null,true);};
$('undo').onclick=()=>{if(tab==='game'){const g=game();if(!g||!g.pitches.length)return toast('Nothing to undo');const r=g.pitches.pop();store.tombstone(r,{mode:'game',game_id:g.id});dirty('games',g.id);
    Object.assign(g.cur,{inning:r.inning,outs:r.outsBefore,slot:r.slot,b:r.b,s:r.s,abn:r.abn,hand:r.prevHand});}
  else{if(D.target||D.type||D.callTxt){if(D.target)D.target=null;else resetDraft();render();return;}const s=session();if(!s||!s.pitches.length)return toast('Nothing to undo');const r=s.pitches.pop();store.tombstone(r,{mode:'bullpen',session_id:s.id});}
  resetDraft();save();render();toast('Last pitch undone');};
// game controls
$('outPlus').onclick=()=>{const c=game().cur;c.outs++;if(c.outs>=3){c.outs=0;c.inning++;c.b=0;c.s=0;toast('Side retired');}dirty('games',game().id);save();render();};
$('outMinus').onclick=()=>{const c=game().cur;if(c.outs>0)c.outs--;dirty('games',game().id);save();render();};
$('innPlus').onclick=()=>{const c=game().cur;c.inning++;c.outs=0;c.b=0;c.s=0;dirty('games',game().id);save();render();};
$('batter').onchange=e=>{const c=game().cur;if(c.b||c.s){if(!confirm('Count is not 0-0. Switch batter anyway?')){render();return;}}c.slot=+e.target.value;c.b=0;c.s=0;c.abn++;c.hand=null;dirty('games',game().id);save();render();};
$('bHand').onclick=()=>setHand(curHand()==='L'?'R':'L');
$('pitcher').onchange=e=>{S().curPitcher=e.target.value;save();render();if(tab==='game'&&game())toast('Pitching change: '+pName(e.target.value));};
$('gEnd').onclick=()=>{if(!confirm('End this game? It stays in Stats.'))return;game().ended=Date.now();game().status='final';dirty('games',game().id);S().activeGame=null;save();render();};
// new game form
let draftLineup=[];function blankLineup(){draftLineup=Array.from({length:9},(_,i)=>({slot:i+1,name:'',num:'',hand:'R'}));}
blankLineup();
function renderLineupForm(){$('gLineup').innerHTML=draftLineup.map((b,i)=>`<div class="prow"><span class="mut" style="width:20px">${i+1}</span><input data-i="${i}" data-f="name" value="${H(b.name)}" placeholder="Name"><input data-i="${i}" data-f="num" value="${H(b.num)}" placeholder="#" style="width:56px;flex:none" inputmode="numeric"><button data-i="${i}" data-f="hand" style="width:52px">${b.hand}</button></div>`).join('');}
$('gLineup').addEventListener('input',e=>{const{i,f}=e.target.dataset;if(f)draftLineup[i][f]=e.target.value;});
$('gLineup').addEventListener('click',e=>{const{i,f}=e.target.dataset;if(f==='hand'){draftLineup[i].hand=draftLineup[i].hand==='L'?'R':'L';renderLineupForm();}});
$('gAddB').onclick=()=>{draftLineup.push({slot:draftLineup.length+1,name:'',num:'',hand:'R'});renderLineupForm();};
let schedId=null;
const vsAt=g=>g.homeAway==='away'?'@':'vs';
function pickScheduled(id){const g=S().games.find(x=>x.id===id);if(!g)return;schedId=id;$('gDate').value=g.date||'';$('gOpp').value=g.opponent||'';$('gEvent').value=g.event||'';$('gHA').value=g.homeAway||'tbd';
  if(g.lineup&&g.lineup.length)draftLineup=g.lineup.map(b=>Object.assign({},b));$('newGameLbl').textContent=`Start ${g.gameNo||''} ${vsAt(g)} ${g.opponent} – set lineup`;renderLineupForm();$('noGame').scrollIntoView({behavior:'smooth'});}
$('schedList').addEventListener('click',e=>{const b=e.target.closest('[data-sg]');if(b)pickScheduled(b.dataset.sg);});
$('gStart').onclick=()=>{const lineup=draftLineup.map((b,i)=>({slot:i+1,name:b.name.trim()||('Batter '+(i+1)),num:b.num.trim(),hand:b.hand}));
  const fields={date:$('gDate').value||new Date().toISOString().slice(0,10),opponent:$('gOpp').value.trim()||'Opponent',event:$('gEvent').value.trim(),homeAway:$('gHA').value,lineup,
    cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0,hand:null},started:Date.now(),status:'active'};
  let g=schedId&&S().games.find(x=>x.id===schedId);
  if(g){Object.assign(g,fields);g.pitches=g.pitches||[];}else{g=Object.assign({id:'g_'+PC.uid(),pitches:[]},fields);S().games.push(g);}
  schedId=null;$('newGameLbl').textContent='New game';S().activeGame=g.id;dirty('games',g.id);blankLineup();save();resetDraft();render();toast('Game on! Pick your pitcher up top.');};
// ---------- pitchers ----------
let pdEdit=null;
function openPDlg(p){pdEdit=p?p.id:null;$('pDlgT').textContent=p?'Edit pitcher':'Add pitcher';$('pdName').value=p?p.name:'';$('pdNum').value=p?p.num:'';$('pdThrows').value=p?p.throws:'';$('pDlg').showModal();}
$('pDlg').addEventListener('close',()=>{if($('pDlg').returnValue!=='ok')return;const o={name:$('pdName').value,num:$('pdNum').value,throws:$('pdThrows').value};if(o.throws!=='L'&&o.throws!=='R'){toast('Pick which hand she throws with');setTimeout(()=>{$('pDlg').showModal();},0);return;}
  if(!o.name.trim())return toast('Name required');
  if(pdEdit)store.editPitcher(pdEdit,o);else{const p=store.addPitcher(o);S().curPitcher=p.id;save();toast('Added '+p.name+(store.isTest?' (test only)':''));}
  if(D.callTxt)D.parsed=PC.parseCall(D.callTxt,curHand(),throwsOf(),S().customTypes);render();});
$('addP').onclick=()=>{if(role()==='coach')openPDlg();};$('addPQuick').onclick=()=>{if(role()==='coach')openPDlg();};
function renderPitchers(){const row=p=>`<div class="prow"><span style="flex:1"><b>${H(p.name)}</b>${p.num?' #'+H(p.num):''} <span class="tag">${H(p.throws)}HP</span>${p.note?' <span class="tag">'+H(p.note)+'</span>':''}</span><button data-e="${H(p.id)}">Edit</button><button data-a="${H(p.id)}">${p.archived?'Restore':'Archive'}</button></div>`;
  $('pList').innerHTML=S().pitchers.filter(p=>!p.archived).map(row).join('')||'<div class="mut">No active pitchers</div>';
  $('pArch').innerHTML=S().pitchers.filter(p=>p.archived).map(row).join('')||'<div class="mut">None</div>';}
document.addEventListener('click',e=>{const t=e.target;if(t.dataset.e){openPDlg(pById(t.dataset.e));}else if(t.dataset.a){const p=pById(t.dataset.a);store.archivePitcher(p.id,!p.archived);render();}});
// roster
function renderRoster(){$('roster').innerHTML=S().roster.map((r,i)=>`<div class="prow"><input data-ri="${i}" data-f="name" value="${H(r.name)}"><input data-ri="${i}" data-f="num" value="${H(r.num)}" placeholder="#" style="width:56px;flex:none" inputmode="numeric"><button data-rd="${i}">✕</button></div>`).join('');}
$('roster').addEventListener('change',e=>{const{ri,f}=e.target.dataset;if(ri!=null){S().roster[ri][f]=e.target.value;save();}});
$('roster').addEventListener('click',e=>{const i=e.target.dataset.rd;if(i!=null&&confirm('Remove '+S().roster[i].name+'?')){S().roster.splice(i,1);save();render();}});
$('addR').onclick=()=>{const n=prompt('Player name');if(n){S().roster.push({name:n.trim(),num:''});save();render();}};
$('ctAdd').onclick=()=>{const c=$('ctCode').value.trim().toUpperCase().replace(/\s+/g,''),n=$('ctName').value.trim();if(!c)return;if(allTypes().some(t=>t.code===c))return toast('Code exists');S().customTypes.push({code:c,name:n||c});$('ctCode').value='';$('ctName').value='';save();render();};
$('cTypes').addEventListener('click',e=>{const i=e.target.dataset.ct;if(i!=null){S().customTypes.splice(i,1);save();render();}});
// ---------- test mode ----------
function toggleTest(){if(store.isTest){if(!confirm('Exit test mode? Everything from this test is discarded.'))return;store.exitTest();resetDraft();toast('Test data cleared');}
  else{store.enterTest();resetDraft();toast('TEST MODE – nothing is saved');}render();}
$('testBtn').onclick=toggleTest;$('exitTest2').onclick=toggleTest;
// ---------- export / import ----------
function rowsFor(scope){const s=S();if(s.isTest)return[];const rows=[];
  const pmeta=id=>pById(id)||{};
  const gs=scope==='all'||scope==='games'?s.games:(scope.startsWith('g_')?s.games.filter(g=>g.id===scope):[]);
  gs.forEach(g=>{const pc={};let n=0;g.pitches.forEach(p=>{const pm=pmeta(p.pitcherId);if(!p.noPitch){n++;pc[p.pitcherId]=(pc[p.pitcherId]||0)+1;}
    rows.push({mode:'game',game_id:g.id,date:g.date,opponent:g.opponent,event:g.event,home_away:g.homeAway,session:'',pitcher:pm.name,pitcher_num:pm.num,throws:pm.throws,inning:p.inning,outs_before:p.outsBefore,lineup_slot:p.slot+1,batter:p.batter,batter_num:p.batterNum,bats:p.hand,balls_before:p.b,strikes_before:p.s,pitch_no:p.noPitch?'':n,pitcher_pitch_no:p.noPitch?'':pc[p.pitcherId],call:p.call,call_target:(p.targets||[]).join('/'),type:p.type,location:p.loc,location_desc:p.loc?PC.locInfo(p.loc,p.hand,pm.throws).label:'',result:p.noPitch?'ibb':p.result,in_play:p.ip,strike:p.noPitch?'':(PC.isStrike(p.result)?1:0),hit_spot:p.targets&&p.targets.length&&p.loc?(PC.hitSpot(p)?1:0):'',ab_end:p.end,ts:new Date(p.ts).toISOString()});});});
  const ss=scope==='all'||scope==='bullpen'?s.sessions:(scope.startsWith('s_')?s.sessions.filter(x=>x.id===scope):[]);
  ss.forEach(x=>{x.pitches.forEach((p,i)=>{const pm=pmeta(p.pitcherId);rows.push({mode:'bullpen',session:x.id,date:x.date,pitcher:pm.name,pitcher_num:pm.num,throws:pm.throws,bats:p.hand,pitch_no:i+1,call:p.call,call_target:(p.targets||[]).join('/'),type:p.type,location:p.loc,location_desc:p.loc?PC.locInfo(p.loc,p.hand,pm.throws).label:'',strike:PC.isZone(p.loc)?1:0,hit_spot:p.targets&&p.targets.length&&p.loc?(PC.hitSpot(p)?1:0):'',ts:new Date(p.ts).toISOString()});});});
  return rows;}
function download(name,text,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}
const noTest=()=>{if(store.isTest){toast('Test mode: nothing to export');return true;}return false;};
$('expJSON').onclick=()=>{if(noTest())return;download('thunder-pitch-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(S(),null,1),'application/json');};
$('expCSV').onclick=()=>{if(noTest())return;download('thunder-pitches-all.csv',PC.toCSV(rowsFor('all')),'text/csv');};
$('sCSV').onclick=()=>{if(noTest())return;const sc=$('sScope').value;let rows=rowsFor(sc);const pf=$('sPitcher').value;if(pf){const n=pById(pf).name;rows=rows.filter(r=>r.pitcher===n);}
  const g=S().games.find(x=>x.id===sc);download(g?`game-${g.date}-${g.opponent.replace(/\W+/g,'_')}.csv`:`pitches-${sc}.csv`,PC.toCSV(rows),'text/csv');};
let impKind=null;$('impJSON').onclick=()=>{if(store.isTest)return toast('Exit test mode to import');impKind='json';$('file').click();};$('impCSV').onclick=()=>{if(store.isTest)return toast('Exit test mode to import');impKind='csv';$('file').click();};
$('file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const txt=await f.text();
  try{if(impKind==='json'){const o=JSON.parse(txt);if(!o.pitchers||!o.games)throw new Error('Not a backup file');if(!confirm('Replace ALL current data with this backup?'))return;store.replace(o);toast('Backup restored');}
  else{if(!store.real.sync)return;const n=importCSV(txt);toast(`Imported ${n} pitches`);}}catch(err){alert('Import failed: '+err.message);}render();};
function importCSV(txt){const rows=PC.parseCSV(txt),s=S();let n=0;const pid=(name,num,th)=>{let p=s.pitchers.find(x=>x.name===name);if(!p&&name)p=store.addPitcher({name,num,throws:th});return p?p.id:null;};
  const has=new Set(s.games.map(g=>g.id).concat(s.sessions.map(x=>x.id)));
  rows.forEach(r=>{const tg=(r.call_target||'').split('/').filter(Boolean).map(Number);const base={id:PC.uuid(),ts:Date.parse(r.ts)||Date.now(),pitcherId:pid(r.pitcher,r.pitcher_num,r.throws),hand:r.bats||'R',type:r.type||null,call:r.call||null,targets:tg,loc:r.location?+r.location:null};
    if(r.mode==='game'){if(has.has(r.game_id)&&!s.games.find(g=>g.id===r.game_id&&g.imported))return;let g=s.games.find(x=>x.id===r.game_id);
      if(!g){g={id:r.game_id||('g_'+PC.uid()),date:r.date,opponent:r.opponent,event:r.event,homeAway:r.home_away,lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0},imported:true,ended:Date.now()};s.games.push(g);}
      const slot=(+r.lineup_slot||1)-1;if(!g.lineup[slot])g.lineup[slot]={slot:slot+1,name:r.batter,num:r.batter_num,hand:r.bats};
      g.pitches.push(Object.assign(base,{inning:+r.inning,outsBefore:+r.outs_before,slot,batter:r.batter,batterNum:r.batter_num,b:+r.balls_before,s:+r.strikes_before,result:r.result==='ibb'?'ibb':r.result,noPitch:r.result==='ibb',ip:r.in_play||null,end:r.ab_end||null,firstPitch:+r.balls_before===0&&+r.strikes_before===0}));n++;}
    else{if(has.has(r.session)&&!s.sessions.find(x=>x.id===r.session&&x.imported))return;let x=s.sessions.find(q=>q.id===r.session);if(!x){x={id:r.session||('s_'+PC.uid()),date:r.date,pitches:[],imported:true};s.sessions.push(x);}x.pitches.push(base);n++;}});
  store.markAllDirty();save();return n;}
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
  const own=role()==='player'?store.real.sync.pitcherId:null;const pf=own||$('sPitcher').value;$('sPitcher').disabled=!!own;$('sPitcher').innerHTML=(own?'':`<option value="">${M?'All my pitchers':'All pitchers'}</option>`)+s.pitchers.filter(p=>(!own||p.id===own)&&vis(p.id)).map(p=>`<option value="${H(p.id)}" ${p.id===pf?'selected':''}>${H(p.name)}${p.archived?' (archived)':''}</option>`).join('');
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

// ---------- bullpen session report ----------
let RPT=null;
function reportFor(sess){const own=role()==='player'?store.real.sync.pitcherId:null;let P=sess.pitches.filter(p=>!p.deleted&&vis(p.pitcherId));if(own)P=P.filter(p=>p.pitcherId===own);
  const pids=[...new Set(P.map(p=>p.pitcherId).filter(Boolean))];const who=pids.length?pids.map(pName).join(', '):(sess.pitcherId?pName(sess.pitcherId):'Bullpen');
  const items=P.map(p=>({p,src:'bullpen',sessionId:sess.id,side:'N'}));const thm={};S().pitchers.forEach(q=>thm[q.id]=q.throws);return{sess,P,who,items,r:PC.sessionReport(P,thm),miss:PC.missData(items,{}),test:!!store.isTest};}
function paintMiss(svg,d,kid){if(kid)return paintKid(svg,d);zoneSVG(svg,'R',{noNums:true,noSide:true});let ex='';PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=svg.querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
  const col=PC.missColor(c.avg);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';const lbl=c.n?`Aimed at zone ${z}: ${c.n}, avg miss ${c.avg}${c.mm?`, ${c.mm} souvenir${c.mm===1?'':'s'}`:''}`:`Zone ${z}: none aimed`;el.setAttribute('aria-label',lbl);el.innerHTML=`<title>${lbl}</title>`;
  if(c.n){ex+=`<text x="${cx}" y="${cy-2.5}" style="fill:${tc};font-size:6px;font-weight:800;text-anchor:middle;dominant-baseline:middle">${c.avg<=1?'✓':'✗'}${c.avg.toFixed(1)}</text><text x="${cx}" y="${cy+4}" style="fill:${tc};font-size:4px;font-weight:700;text-anchor:middle">n=${c.n}</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+9}" style="fill:${tc};font-size:3.8px;font-weight:800;text-anchor:middle">🎁${c.mm}</text>`;}});svg.insertAdjacentHTML('beforeend',ex);}
const KID_LEGEND='<b style="color:#2ea043">Green</b> = you hit your spot or were 1 box off. The <b style="color:#f47067">redder</b> the box, the farther you missed. Each box shows how many were on target out of how many you aimed there. 🎁 Souvenir = right down the middle when you didn\'t aim there. The biggest miss, because hitters send those out of the park. Change-ups only count when they finish low (bottom row or below) – a change-up up in the zone is a miss. The ring just outside the box is still a good, competitive pitch (hitters chase it): on or 1 box from your spot = on target. A change-up or drop just below the knees always counts as a good pitch. 🚫 Way off = nowhere near the plate, always a miss.';
function paintKid(svg,d){zoneSVG(svg,'R',{noNums:true,noSide:true});let ex='';PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=svg.querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
  const col=PC.missColor(c.avg);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';const g=c.good||0;const lbl=c.n?`Aimed here ${c.n} time${c.n===1?'':'s'}, ${g} on target${c.mm?`, ${c.mm} souvenir${c.mm===1?'':'s'}`:''}`:'Not aimed here';el.setAttribute('aria-label',lbl);el.innerHTML=`<title>${lbl}</title>`;
  if(c.n){ex+=`<text x="${cx}" y="${cy-2}" style="fill:${tc};font-size:7px;font-weight:800;text-anchor:middle;dominant-baseline:middle">${g}/${c.n}</text><text x="${cx}" y="${cy+5}" style="fill:${tc};font-size:3.8px;font-weight:700;text-anchor:middle">on target</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+10}" style="fill:${tc};font-size:4.2px;font-weight:800;text-anchor:middle">🎁${c.mm}</text>`;}});svg.insertAdjacentHTML('beforeend',ex);}
// ---------- tap-a-box drill-down ----------
const DD_NAME=z=>z===5?'right down the middle':(z<10?'box '+z:'outside spot '+z);
function openDrill(z,c,title){const svg=$('ddMap');zoneSVG(svg,'R',{noNums:true,noSide:true});let ex='';const L=c.land||{};let near=0,far=0,mm=0,up=0;
  PC.ALL_CELLS.forEach(q=>{const el=svg.querySelector(`[data-z="${q}"]`);if(!el)return;const e=L[q];const[cx,cy]=center(q);
    if(q==z){el.style.stroke='#fff';el.style.strokeWidth='2.2';}
    if(!e){el.style.fill='#161b22';return;}const good=PC.isGoodSev(e.sev);if(e.mm)mm+=e.mm;if(e.chUp)up+=e.chUp;if(good)near+=e.n;else far+=e.n-(e.mm||0);
    const col=good?PC.MISS_SCALE[0]:PC.missColor(e.sev);el.style.fill=col.fill;const lbl=`${e.n} landed ${DD_NAME(q)}${good?' (on target)':e.mm?' – souvenir':' (missed)'}`;el.setAttribute('aria-label',lbl);el.innerHTML=`<title>${lbl}</title>`;
    ex+=`<text x="${cx}" y="${cy-1}" style="fill:${col.text};font-size:8px;font-weight:800;text-anchor:middle;dominant-baseline:middle">${e.mm?'🎁':''}${e.n}</text>`;if(e.chUp)ex+=`<text x="${cx}" y="${cy+7}" style="fill:${col.text};font-size:3.6px;font-weight:700;text-anchor:middle">CH up</text>`;});
  const [tx,ty]=center(Number(z));ex+=`<text x="${tx}" y="${ty-9}" style="fill:#fff;font-size:3.6px;font-weight:800;text-anchor:middle">AIM</text>`;svg.insertAdjacentHTML('beforeend',ex);
  const W=[21,22,23,24].filter(q=>L[q]).map(q=>`${L[q].n} ${PC.WAY[q]}`);const wn=[21,22,23,24].reduce((a,q)=>a+(L[q]?L[q].n:0),0);
  $('ddT').textContent=(title?title+' – ':'')+'aimed at '+DD_NAME(Number(z));
  $('ddCap').innerHTML=`You aimed here <b>${c.n}</b> time${c.n===1?'':'s'}: <b style="color:#2ea043">${near} on target</b> (or 1 box off)${far?`, <b style="color:#f47067">${far} missed</b>`:''}${mm?`, <b>${mm} souvenir${mm===1?'':'s'} 🎁</b>`:''}.`+(up?` ${up} change-up${up===1?' was':'s were'} up in the zone.`:'')+(wn?` <b style="color:#f47067">🚫 ${wn} way off</b> (${W.join(', ')}) – not shown on the grid.`:'');
  $('ddKey').textContent='White box = where you aimed. Numbers = how many landed there. Green = on target or 1 box off, red = missed (darker = farther), 🎁 = souvenir, 🚫 way off = nowhere near the plate (listed above).';$('ddDlg').showModal();}
$('ddClose').onclick=()=>$('ddDlg').close();$('ddDlg').addEventListener('click',e=>{if(e.target===$('ddDlg'))$('ddDlg').close();});
function hookDrill(svg,d,title){svg.querySelectorAll('[data-z]').forEach(el=>{const z=el.dataset.z,c=d.cells[z];if(!c||!c.n)return;el.setAttribute('tabindex','0');el.setAttribute('role','button');el.style.cursor='pointer';
  const go=()=>openDrill(z,c,title);el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});}
// ---------- per pitch type sections ----------
function typeSectionsHTML(r,pre){const rp=v=>v==null?'–':Math.round(v)+'%';return Object.entries(r.types||{}).map(([t,x],i)=>{const g=x.stats;
  return `<div class="tsec" style="border-top:1px solid var(--line);padding-top:8px;margin-top:8px"><div style="font-weight:800;font-size:17px">${H(PC.TYPE_NAME[t]||t)} <span class="mut" style="font-weight:400;font-size:13px">${g.n} thrown</span></div>
  <div class="row wrap" style="gap:6px;margin:4px 0"><span class="tag">On target ${g.called?`${g.good}/${g.called} (${rp(g.goodPct)})`:'–'}</span><span class="tag">Strikes ${rp(g.strikePct)}</span><span class="tag">Competitive ${rp(g.compPct)}</span>${g.wayOff?`<span class="tag">🚫 ${g.wayOff}</span>`:''}<span class="tag">🎁 ${g.mm}</span>${t==='CH'&&g.chUp?`<span class="tag">Up in zone ${g.chUp}</span>`:''}</div>
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
  if(!R.P.length){$('rBody').innerHTML='<h2 id="rT">Bullpen report</h2><p class="mut">No pitches in this session'+(role()==='player'?' for you':'')+'.</p>';$('rDlg').showModal();return;}
  const rp=v=>v==null?'–':Math.round(v)+'%';const st=[['Pitches',r.n],['Strikes',rp(r.strikePct)],['On target',rp(r.goodPct)],['Souvenirs',r.mm],['Competitive',rp(r.compPct)],['Spots aimed',r.called],['Bullseyes',r.hits]].concat(r.wayOff?[['🚫 Way off',r.wayOff]]:[]).concat(r.waste&&r.waste.n?[['Off-plate spots on target',`${r.waste.good}/${r.waste.n}`]]:[]);
  const sp=x=>x?`<b>${H(x.label)}</b> – ${x.good} of ${x.called} on target`:'<span class="mut">throw 2+ pitches at a spot to see this</span>';
  const tr=r.trend&&r.trend.first.called&&r.trend.second.called?`<div class="lbl" style="margin-top:10px">Early vs. late</div><div>First half: ${rp(r.trend.first.goodPct)} on target · ${rp(r.trend.first.strikePct)} strikes<br>Second half: ${rp(r.trend.second.goodPct)} on target · ${rp(r.trend.second.strikePct)} strikes</div>`:'';
  $('rBody').innerHTML=`${R.test?'<div class="tag" style="background:var(--red)">TEST – not saved</div>':''}<h2 id="rT">Bullpen report</h2><div class="mut">${H(R.who)} · ${H(sess.date||'')} </div>
  <div class="grid3" style="margin-top:8px">${st.map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
  <div class="lbl" style="margin-top:10px">Feedback</div><ul class="fb">${r.feedback.map(t=>`<li>${H(t)}</li>`).join('')}</ul>${noteBox({sessionId:sess.id,pitcherId:sess.pitcherId||(R.P[0]&&R.P[0].pitcherId)},role()==='player')}
  <div class="lbl">Where you aimed – how close you got</div><svg id="rMap" viewBox="-14 -6 128 138" style="width:100%;max-width:340px;display:block;margin:auto"></svg>
  <div style="font-size:13px;line-height:1.4;margin-top:4px">👆 Tap a box to see where those pitches went. ${KID_LEGEND}</div>
  <div class="lbl" style="margin-top:10px">Best spot / work on</div><div>⭐ Best: ${sp(r.best)}</div><div>🎯 Work on: ${sp(r.weakest)}</div>${tr}
  <div class="lbl" style="margin-top:10px">By pitch</div><div id="rTypes">${typeSectionsHTML(r,'rT_')}</div><div class="lbl" style="margin-top:10px">All pitches</div><table><tr><th>Pitch</th><th>Thrown</th><th>Strikes</th><th>On target</th><th>🎁</th></tr>${Object.entries(r.byType).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(PC.TYPE_NAME[k]||k)}</td><td>${v.n}</td><td>${rp(v.strikePct)}</td><td>${v.called?`${v.good}/${v.called}`:'–'}</td><td>${v.mm}</td></tr>`).join('')}</table>`;
  paintTypeMaps($('rBody'),R.items,'rT_');if(R.miss.total){paintMiss($('rMap'),R.miss,true);hookDrill($('rMap'),R.miss);}else $('rMap').outerHTML='<div class="mut">No intended spots logged – tap a target before the actual location to get the heat map.</div>';
  $('rDlg').showModal();}
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
$('bpEnd').onclick=()=>{const s=session();if(!s||!s.pitches.length)return toast('No pitches in this session yet');openReport(s);S().activeSession=null;resetDraft();save();render();};
$('sReport').onclick=()=>{const x=S().sessions.find(q=>q.id===$('sScope').value);openReport(x);};
// ---------- zone heat map ----------
const HKEY='te_pitch_heat_v1';let HF={},HV='miss';try{const o=JSON.parse(storage&&storage.getItem(HKEY)||'{}');HF=o.f||{};HV=o.v==='actual'?'actual':'miss';}catch(e){}
const saveHF=()=>{try{storage&&storage.setItem(HKEY,JSON.stringify({f:HF,v:HV}));}catch(e){}};
const SIDE_L={R:'RHB',L:'LHB',N:'No batter'},SRC_L={game:'Games',bullpen:'Bullpen'},TH_L={R:'RHP',L:'LHP'};
function heatOptions(items){items=items.filter(i=>vis(i.p.pitcherId));const s=S(),own=role()==='player'?store.real.sync.pitcherId:null;const uniq=a=>[...new Set(a.filter(Boolean))];
  return{type:uniq(items.map(i=>i.p.type)).sort().map(v=>[v,v]),pitcher:s.pitchers.filter(p=>!own||p.id===own).map(p=>[p.id,p.name]),throws:[['R','RHP'],['L','LHP']],
    batter:uniq(items.map(i=>i.batter)).sort().map(v=>[v,v]),side:[['R','RHB'],['L','LHB'],['N','No batter']],src:[['game','Games'],['bullpen','Bullpen']],
    game:(own?s.games.filter(g=>g.pitches.some(p=>p.pitcherId===own)):s.games).map(g=>[g.id,`${g.date||''} ${vsAt(g)} ${g.opponent}`]),session:s.sessions.map(x=>[x.id,`Bullpen ${x.date||''} (${x.pitches.length})`])};}
const HF_LBL={type:'Pitch',pitcher:'Pitcher',throws:'Pitcher hand',batter:'Batter',side:'Batter side',src:'Source',game:'Game',session:'Bullpen session'};
function heatChipText(k,v,opts){const o=(opts[k]||[]).find(x=>x[0]===v);return `${HF_LBL[k]}: ${o?o[1]:v}`;}
function renderHeat(){const items0=PC.heatItems(S());const own=role()==='player'?store.real.sync.pitcherId:null;const items=(own?items0.filter(i=>i.p.pitcherId===own):items0).filter(i=>vis(i.p.pitcherId));
  const opts=heatOptions(items);const f=Object.assign({},HF);if(own)f.pitcher=own;
  const miss=HV==='miss';const d=miss?PC.missData(items,f):PC.heatData(items,f,'actual');
  $('hvA').classList.toggle('sel',!miss);$('hvI').classList.toggle('sel',miss);$('hvA').setAttribute('aria-pressed',String(!miss));$('hvI').setAttribute('aria-pressed',String(miss));
  const act=PC.HEAT_KEYS.filter(k=>HF[k]&&!(own&&k==='pitcher'));
  $('hfChips').innerHTML=(act.length?act.map(k=>`<button class="tag" data-hfx="${H(k)}" aria-label="Remove filter ${H(heatChipText(k,HF[k],opts))}" style="min-height:34px;font-size:13px;background:#1d2a55;border:1px solid #2f4fb0">${H(heatChipText(k,HF[k],opts))} ✕</button>`).join(''):'<span class="mut">All pitches'+(own?' (yours)':'')+'</span>');
  $('hfReset').disabled=!act.length;
  const what=miss?'each box = where pitches were aimed, colored by how far they missed':'where pitches landed';
  $('hSummary').textContent=`${d.total} pitch${d.total===1?'':'es'} · ${what}`+(miss&&d.mm?` · 🎁 ${d.mm} souvenir${d.mm===1?'':'s'}`:'')+(miss&&d.matched>d.total?` · ${d.matched-d.total} had no intended spot`:'');
  const empty=d.total===0;$('hEmpty').classList.toggle('hide',!empty);$('hMap').classList.toggle('hide',empty);$('hLegend').classList.toggle('hide',empty);if(empty)return;
  if(miss&&own){paintKid($('hMap'),d);hookDrill($('hMap'),d);$('hSummary').textContent=`${d.total} pitch${d.total===1?'':'es'} with a spot aimed`+(d.mm?` · 🎁 ${d.mm} souvenir${d.mm===1?'':'s'}`:'');$('hLegend').innerHTML=`<div style="font-size:13px;line-height:1.4">${KID_LEGEND}</div>`;return;}
  zoneSVG($('hMap'),'R',{noNums:true,noSide:true});let ex='';
  PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=$('hMap').querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
    const col=miss?PC.missColor(c.avg):PC.heatColor(c.n,d.max);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';
    const lbl=miss?(c.n?`Aimed at zone ${z}: ${c.n} pitch${c.n===1?'':'es'}, average miss ${c.avg} square${c.avg===1?'':'s'}, ${c.hit} hit exactly${c.mm?`, ${c.mm} souvenir${c.mm===1?'':'s'}`:''}`:`Zone ${z}: no pitches aimed here`):`Zone ${z}: ${c.n} pitch${c.n===1?'':'es'}`;
    el.innerHTML=`<title>${lbl}</title>`;el.setAttribute('aria-label',lbl);
    if(miss){if(c.n){ex+=`<text x="${cx}" y="${cy-2.5}" style="fill:${tc};font-size:6px;font-weight:800;text-anchor:middle;dominant-baseline:middle;pointer-events:none">${c.avg<=1?'✓':'✗'}${c.avg.toFixed(1)}</text>`;
        ex+=`<text x="${cx}" y="${cy+4}" style="fill:${tc};font-size:4px;font-weight:700;text-anchor:middle;pointer-events:none">n=${c.n}</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+9}" style="fill:${tc};font-size:3.8px;font-weight:800;text-anchor:middle;pointer-events:none">🎁${c.mm}</text>`;}}
    else ex+=`<text x="${cx}" y="${cy-1}" style="fill:${tc};font-size:7px;font-weight:800;text-anchor:middle;dominant-baseline:middle;pointer-events:none">${c.n||''}</text>`;
    ex+=`<text x="${cx+(z<10?8:7)}" y="${cy-(z<10?9:8)}" style="fill:${tc};opacity:.65;font-size:3.6px;text-anchor:end;pointer-events:none">${z}</text>`;});
  $('hMap').insertAdjacentHTML('beforeend',ex);if(miss)hookDrill($('hMap'),d);
  $('hLegend').innerHTML=miss?`<div class="row wrap" style="gap:6px;font-size:12px" aria-label="Miss scale">${PC.MISS_SCALE.map(s=>`<span class="row" style="gap:4px"><span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${s.fill}"></span>${s.label}</span>`).join('')}<span class="mut">squares off</span></div><div class="mut" style="font-size:12px;margin-top:4px">Ring (11–18) = competitive: scored by distance, never counts against them. Bullpen: CH / drop / drop curve landing low ring (13, 18, 14) = good. 🚫 Way off = miss (3 squares), not a souvenir. Game strike % unchanged.</div>
    <div class="mut" style="font-size:12px;margin-top:4px">Pitcher's view · each box = intended spot · ✓/✗ + number = average miss in squares (hit or 1 square = ✓ good) · n = pitches aimed there · 🎁 Souvenir = landed right down the middle when aimed elsewhere (always scored as the biggest miss) · CH rule: a change-up landing in the top/middle row (or higher) is a miss, scored at least 2 squares · squares are counted like a king's move, diagonals = 1, outside spots 11–18 count as the ring around the zone (max 4).</div>`
   :`<div class="row" style="gap:6px;font-size:12px" aria-label="Color scale from 1 to ${d.max} pitches"><span class="mut">1</span><div style="flex:1;height:12px;border-radius:6px;background:linear-gradient(90deg,${PC.VIRIDIS.join(',')})"></div><span class="mut">${d.max}</span></div><div class="mut" style="font-size:12px;margin-top:4px">Pitcher's view · number = pitches that landed there · dark = fewer, yellow = most · 11–18 are outside the zone</div>`;}
function openHF(){const items0=PC.heatItems(S());const own=role()==='player'?store.real.sync.pitcherId:null;const opts=heatOptions(own?items0.filter(i=>i.p.pitcherId===own):items0);
  $('hfForm').innerHTML=PC.HEAT_KEYS.filter(k=>!(own&&k==='pitcher')).map(k=>`<label class="mut" style="font-size:13px">${HF_LBL[k]}<select data-hk="${H(k)}" style="width:100%;margin-top:2px"><option value="">Any</option>${(opts[k]||[]).map(([v,l])=>`<option value="${H(v)}" ${HF[k]===v?'selected':''}>${H(l)}</option>`).join('')}</select></label>`).join('');$('hfDlg').showModal();}
$('hfOpen').onclick=openHF;
$('hfDlg').addEventListener('close',()=>{const rv=$('hfDlg').returnValue;if(rv==='reset')HF={};else if(rv==='ok'){HF={};$('hfForm').querySelectorAll('select').forEach(s=>{if(s.value)HF[s.dataset.hk]=s.value;});}else return;saveHF();renderHeat();});
$('hfChips').addEventListener('click',e=>{const k=e.target.dataset.hfx;if(k){delete HF[k];saveHF();renderHeat();}});
$('hfReset').onclick=$('hfReset2').onclick=()=>{HF={};saveHF();renderHeat();};
$('hvA').onclick=()=>{HV='actual';saveHF();renderHeat();};$('hvI').onclick=()=>{HV='miss';saveHF();renderHeat();};
$('sScope').onchange=renderStats;$('sPitcher').onchange=renderStats;
// ---------- cloud sync ----------
const CFG=window.PC_CONFIG||{};const sync=CFG.url&&CFG.key?PC.makeSync(store,{url:CFG.url,key:CFG.key}):null;let syncT=null,syncing=false;
function schedSync(){if(store.isTest||!sync)return;clearTimeout(syncT);syncT=setTimeout(()=>doSync(false),3000);}
async function doSync(manual,pull){if(!sync)return;if(store.isTest){if(manual)toast('Test mode never syncs');return;}
  if(!store.real.sync.teamCode){if(manual)toast('Enter the team code first');renderSync();return;}
  if(typeof navigator!=='undefined'&&navigator.onLine===false){if(manual)toast('Offline – will sync later');renderSync();return;}
  syncing=true;renderSync();const r=pull?await sync.pull():await sync.sync();syncing=false;
  if(manual)toast(r.error?'Sync failed: '+r.error.slice(0,80):(pull?`Restored: ${r.added||0} new pitches`:`Synced${r.added?' · '+r.added+' new from cloud':''}`));render();}
function renderSync(){const e=$('syncTag');if(!e)return;if(store.isTest){e.textContent='☁ off (test)';e.style.background='#5c1515';return;}
  const st=store.real.sync,n=store.pendingCount();const t=st.last?new Date(st.last).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'never';
  e.textContent=!sync||!st.teamCode?'☁ not set up':syncing?'☁ syncing…':st.lastError?`☁ error · ${n} pending`:`☁ ${t} · ${n} pending`;e.style.background=st.lastError?'#5c1515':n?'#5c4813':'#1d4a2a';
  if($('syncMsg'))$('syncMsg').textContent=`Last synced: ${t}. Pending: ${n}.${st.lastError?' Last error: '+st.lastError:''} Device ${st.deviceId}. Test mode never syncs.`+(()=>{const rj=Object.values(st.rejected||{});return rj.length?` Rejected by server (${rj.length}): `+rj.slice(-5).map(x=>`${x.table} ${String(x.id).slice(0,8)} (${x.status})`).join(', '):'';})();}
$('teamSave').onclick=()=>{if(store.isTest)return toast('Exit test mode first');const v=$('teamCode').value.trim().toUpperCase();if(v.length<20)return toast('Team code looks too short');const changed=store.real.sync.teamCode!==v;
  // never lose unsent work: a verified code with pending edits can't be swapped until they're sent (a rejected/typo code can always be corrected)
  if(changed&&store.real.sync.teamCode&&(['coach','player','pcoach'].includes(store.real.sync.role))&&store.pendingCount()>0){toast(`${store.pendingCount()} unsent changes – tap Sync now first (or export a backup)`);$('teamCode').value=store.real.sync.teamCode;return;}store.real.sync.teamCode=v;if(changed){store.real.sync.role=undefined;store.real.sync.teamId=null;store.real.sync.pitcherId=null;}store.markAllDirty();store.save();
  if(sync)sync.whoami().then(w=>{if(w.role===null)toast('Code not recognized');else if(w.role)toast({coach:'Coach code: full access',player:'Player code: bullpen for '+(store.real.sync.pitcherName||'you'),viewer:'View-only code',pcoach:'Pitching-coach code'}[w.role]);
    if(!ROLE_TABS[role()].includes(tab))tab=ROLE_TABS[role()][0];doSync(false);render();});else{toast('Team code saved');doSync(true);}};
// coach: manage access codes
async function renderCodes(){if(!sync||role()!=='coach'||store.isTest||!store.real.sync.teamCode){$('codesCard').classList.add('hide');return;}$('codesCard').classList.remove('hide');
  $('ncPitcher').innerHTML=store.real.pitchers.filter(p=>!p.archived).map(p=>`<option value="${H(p.id)}">${H(p.name)}</option>`).join('');
  $('ncPcList').innerHTML=store.real.pitchers.filter(p=>!p.archived).map(p=>`<label class="row" style="gap:4px"><input type="checkbox" value="${H(p.id)}" style="width:20px;min-height:20px">${H(p.name)}</label>`).join('');
  try{const L=await sync.rpc('coach_list_codes');$('codesList').innerHTML=L.map(c=>`<div class="prow"><span style="flex:1"><b>${H(c.label||c.pitcher_id||'')}</b> <span class="tag">${H(c.role==='pcoach'?'pitching coach':c.role)}</span>${c.role==='pcoach'?` <span class="mut">${H((c.pitcher_ids||[]).map(pName).join(', '))}</span>`:''}${c.revoked_at?' <span class="tag">revoked</span>':''}<br><small style="user-select:all;-webkit-user-select:all">${H(c.code)}</small></span>${c.revoked_at?'':`<button data-revoke="${H(c.code)}">Revoke</button>`}</div>`).join('')||'<div class="mut">No access codes yet</div>';}
  catch(e){$('codesList').innerHTML='<div class="mut">Go online to manage codes.</div>';}}
$('codesCard').addEventListener('click',async e=>{const t=e.target;try{
  if(t.dataset.revoke){if(!confirm('Revoke this code? Anyone using it loses access right away.'))return;await sync.rpc('coach_revoke_code',{p_code:t.dataset.revoke});toast('Code revoked');}
  else if(t.id==='ncPlayer'){const id=$('ncPitcher').value;const p=pById(id);await doSync(false);const c=await sync.rpc('coach_create_code',{p_role:'player',p_pitcher_id:id,p_label:p?p.name:id});toast('New code for '+(p?p.name:id));prompt('Player code (copy it):',c);}
  else if(t.id==='ncPcoach'){const ids=[...document.querySelectorAll('#ncPcList input:checked')].map(i=>i.value);if(!ids.length)return toast('Pick at least one pitcher');await doSync(false);const c=await sync.rpc('coach_create_code',{p_role:'pcoach',p_pitcher_ids:ids,p_label:$('ncPcName').value.trim()||'Pitching coach'});$('ncPcName').value='';prompt('Pitching-coach code (copy it):',c);}
  else if(t.id==='ncViewer'){const c=await sync.rpc('coach_create_code',{p_role:'viewer',p_label:'View-only'});prompt('View-only code (copy it):',c);}
  else return;renderCodes();}catch(err){alert('Failed: '+err.message);}});
$('syncNow').onclick=()=>doSync(true);
$('pullCloud').onclick=()=>{if(confirm('Download this team\'s data from the cloud and merge it into this phone?'))doSync(true,true);};
window.addEventListener('online',()=>doSync(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)doSync(false);});setInterval(()=>doSync(false),60000);
function bpPhase(){const st=PC.bullpenStep({type:D.type||(D.parsed&&D.parsed.type),target:D.target,callTargets:callOn&&D.parsed?D.parsed.targets:[]});
  const it=(callOn&&D.parsed&&D.parsed.targets.length)?D.parsed.targets.join('/'):D.target;
  return st==='type'?'<b>1.</b> Choose the pitch':st==='target'?`<b>2.</b> ${H(D.type||D.parsed.type)} – tap the <b>intended</b> spot`:`<b>3.</b> ${H(D.type||D.parsed.type)} → ${it} – tap where it <b>actually</b> went`;}
// ---------- render ----------
function render(skipCallInput){const s=S();{const gg=game();const two=!!(gg&&gg.cur&&gg.cur.s===2);document.querySelectorAll('#resBtns [data-r="kd3"],#resBtns [data-r="kd3out"]').forEach(kb=>{kb.classList.toggle('hide',!two);kb.disabled=!two;});}document.body.classList.toggle('test',store.isTest);document.body.classList.toggle('onehand',oneHand());document.body.classList.toggle('tab-game',tab==='game');$('oneHand').checked=oneHand();try{renderAlerts();renderAlertCard();}catch(e){console.error(e);}$('testbar').classList.toggle('hide',!store.isTest);
  $('testBtn').textContent=store.isTest?'Exit test mode (discard)':'Start test mode';$('testBtn').style.background=store.isTest?'var(--red)':'';
  callOn=!!s.callOn;$('callOn').checked=callOn;$('callBox').classList.toggle('hide',!callOn);try{renderWristband();renderCS();}catch(e){console.error(e);}
  const R0=role(),tabs=ROLE_TABS[R0];if(!tabs.includes(tab))tab=tabs[0];
  document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('hide',!tabs.includes(b.dataset.t));b.classList.toggle('on',b.dataset.t===tab);});
  document.body.dataset.role=R0;$('addPQuick').classList.toggle('hide',R0!=='coach');$('pitcher').disabled=!(R0==='coach'||(R0==='pcoach'&&mine().length>1));
  ['pCard','rosterCard','impJSON','impCSV'].forEach(id=>$(id).classList.toggle('hide',R0!=='coach'));
  $('roleMsg').textContent=R0==='coach'?'':R0==='player'?`Player code: log your bullpens and view your own games (${store.real.sync.pitcherName||"your"} data only).`:R0==='pcoach'?`Pitching-coach code: view and score bullpens for your pitchers (${(mine()||[]).map(pName).join(', ')||'none yet – tap Sync now'}); add notes for their reports.`:R0==='unknown'?'Code not recognized – check it for typos. Nothing is sent until it is fixed; your unsent data stays on this phone.':'View-only code: you can look, not change.';$('roleMsg').classList.toggle('hide',R0==='coach');
  const cp=curPitcherId();
  $('pitcher').innerHTML=store.activePitchers().filter(p=>(R0!=='player'||p.id===cp)&&vis(p.id)).map(p=>`<option value="${H(p.id)}" ${p.id===cp?'selected':''}>${H(p.name)}${p.num?' #'+H(p.num):''} (${H(p.throws)})</option>`).join('')||'<option>Add a pitcher</option>';
  const g=game();
  $('modeTag').textContent=(store.isTest?'TEST · ':'')+(tab==='game'?(g?'GAME':'NO GAME'):tab==='bullpen'?'BULLPEN':tab.toUpperCase());
  ['game','bullpen','stats','setup'].forEach(t=>$('tab-'+t).classList.toggle('hide',t!==tab));
  const showEntry=(tab==='game'&&g)||tab==='bullpen';$('entry').classList.toggle('hide',!showEntry);
  $('gameHead').classList.toggle('hide',!(tab==='game'&&g));
  $('noGame').classList.toggle('hide',!!g);$('inGame').classList.toggle('hide',!g);
  const sch=s.games.filter(x=>PC.gameStatus(x)==='scheduled').sort((x,y)=>(x.date+x.gameNo).localeCompare(y.date+y.gameNo,undefined,{numeric:true}));
  $('schedCard').classList.toggle('hide',!(tab==='game'&&!g&&sch.length));
  $('schedList').innerHTML=sch.map(x=>`<div class="prow"><button data-sg="${H(x.id)}" style="flex:1;text-align:left;${schedId===x.id?'border-color:var(--acc)':''}"><b>${H((x.date||'').slice(5))} ${H(x.time||'')}</b> ${vsAt(x)} ${H(x.opponent)}<br><small class="mut">${[x.gameNo,x.field,x.location].filter(Boolean).map(H).join(' · ')}</small></button>${x.link&&/^https:\/\//.test(x.link)?`<a href="${H(x.link)}" target="_blank" rel="noopener" style="color:var(--acc);padding:0 6px">GC↗</a>`:''}</div>`).join('');
  if(tab==='game'&&!g){renderLineupForm();if(!$('gDate').value)$('gDate').value=new Date().toISOString().slice(0,10);}
  const hand=curHand();$('hL').classList.toggle('sel',hand==='L');$('hR').classList.toggle('sel',hand==='R');$('hN').classList.toggle('sel',hand==='N');$('hN').classList.toggle('hide',tab==='game');
  $('bpTest').textContent=store.isTest?'🧪 Test mode ON – tap to exit (discard)':'🧪 Start test mode (not saved)';$('bpTest').style.background=store.isTest?'var(--red)':'';$('bpTest').setAttribute('aria-pressed',String(store.isTest));
  $('batSide').classList.toggle('hide',tab==='game');
  if(g){const c=g.cur;$('inn').textContent=c.inning;$('cnt').textContent=c.b+'-'+c.s;$('outs').innerHTML=[0,1,2].map(i=>`<span class="${i<c.outs?'on':''}"></span>`).join('');
    $('pc').textContent=PC.pitchCount(g.pitches,cp);
    $('gTitle').textContent=`${g.date} ${vsAt(g)} ${g.opponent}`;$('gSub').innerHTML=[g.gameNo,g.time,g.field,g.event,g.homeAway==='tbd'?'H/A TBD':''].filter(Boolean).map(H).join(' · ')+(g.link&&/^https:\/\//.test(g.link)?` · <a href="${H(g.link)}" target="_blank" rel="noopener" style="color:var(--acc);font-weight:700">GameChanger ↗</a>`:'');
    $('batter').innerHTML=g.lineup.map((b,i)=>`<option value="${H(i)}" ${i===c.slot?'selected':''}>${i+1}. ${b.num?'#'+H(b.num)+' ':''}${H(b.name)} (${H(b.hand)})</option>`).join('');
    $('bHand').textContent='Bats '+hand;}
  // entry
  const types=allTypes();
  $('types').innerHTML=types.map(t=>`<button data-c="${H(t.code)}" class="${D.type===t.code?'sel':''}">${H(t.code)}<br><small style="font-weight:400;font-size:11px">${H(t.name)}</small></button>`).join('');
  $('callTypes').innerHTML=types.map(t=>`<button data-c="${H(t.code)}" class="${D.parsed&&D.parsed.type===t.code?'sel':''}">${H(t.code)}</button>`).join('');
  $('callSuf').innerHTML=['IN','A','H+','O','H','L'].map(x=>`<button data-s="${x}" class="${D.parsed&&D.parsed.suffix===x?'sel':''}">${x==='A'?'A (waste)':x==='H+'?'H+ (waste)':x}</button>`).join('')+'<button data-s="">no loc</button>';
  if(!skipCallInput)$('callTxt').value=D.callTxt;
  $('callAlt').innerHTML=D.parsed&&D.parsed.alts&&D.parsed.alts.length?D.parsed.alts.concat(D.parsed.targets).filter((z,i,x)=>x.indexOf(z)===i).map(z=>`<button data-alt="${z}" class="${(D.target||D.parsed.targets[0])===z?'sel':''}">CB → ${z}</button>`).join(''):'';
  $('callDesc').textContent=D.callTxt?(D.parsed?`${D.parsed.norm} = ${types.find(t=>t.code===D.parsed.type)?.name||D.parsed.type}${D.parsed.targets.length?' → zone '+D.parsed.targets.join('/'):' → tap target on grid'}${D.target?' '+D.target:''} · ${D.parsed.desc}`:'Unrecognized code'):'Type a code or tap buttons. Digits = zone (pitcher\'s view).';
  const needTarget=callOn&&D.parsed&&!D.parsed.targets.length&&!D.target;
  $('phase').innerHTML=needTarget?'Tap the <b>called target</b> on the grid':(tab==='bullpen'?bpPhase():`Optional: type + where it went${D.loc?` → <b>${D.type||''} @${D.loc}</b> (${PC.locInfo(D.loc,hand,throwsOf()).label})`:''}, then the result`);
  $('resBtns').classList.toggle('hide',tab!=='game'||D.ip);$('ipBtns').classList.toggle('hide',tab!=='game'||!D.ip);$('undo').textContent=tab==='bullpen'&&(D.type||D.target||D.callTxt)?'↶ Back a step':'↶ Undo last pitch';
  drawZone();
  // log
  const RL={ball:'Ball',called:'Called K',swinging:'Swing K',foul:'Foul',inplay:'In play',hbp:'HBP',ibb:'IBB',kd3:'K-reached',kd3out:'K (D3 out)',foultip:'Foul tip K'};
  const line=(p,i)=>`<div><span class="n">${i+1}</span><span style="flex:1">${tab==='game'?H(pName(p.pitcherId).split(' ')[0])+' vs '+H(p.batter)+': ':''}${p.call?'<b>['+H(p.call)+']</b> ':''}${H(p.type||'')}${p.loc?' <span class="tag">'+H(locTxt(p.loc))+'</span>':''}${p.targets&&p.targets.length&&p.loc?(PC.hitSpot(p)?' ✓':' ✗'):''}</span><span>${p.result?RL[p.result]+(p.ip?' '+p.ip:''):(PC.isZone(p.loc)?'K':'B')}${p.end?' · <b>'+p.end+'</b>':''}</span>${p.result?`<span class="tag">${p.b}-${p.s}</span>`:''}</div>`;
  if(tab==='game'&&g){$('logTitle').textContent='Game log (newest first)';$('log').innerHTML=g.pitches.map(line).reverse().join('')||'<div class="mut">No pitches yet</div>';}
  if(tab==='bullpen'){const x=session();$('logTitle').textContent='Session log (newest first)';$('log').innerHTML=x?x.pitches.map(line).reverse().join(''):'<div class="mut">No pitches yet</div>';
    const q=PC.summarize(x?x.pitches:[]);$('bpTitle').textContent='Bullpen '+(x?x.date:'');
    $('bpSum').textContent=`${q.n} pitches · ${fmt(q.strikePct)} strikes${q.compPct!=null?` · ${fmt(q.compPct)} competitive`:''}${q.wayOff?` · ${q.wayOff} way off`:''} · hit spot ${fmt(q.spotPct)} · `+Object.entries(q.byType).map(([k,v])=>`${k} ${v.n} (${fmt(v.strikePct)})`).join(', ');}
  if(tab==='setup'){renderCodes();renderPitchers();renderRoster();$('cTypes').innerHTML=s.customTypes.map((c,i)=>`<span class="tag" data-ct="${i}">${H(c.code)} = ${H(c.name)} ✕</span> `).join('')||'None yet';
    $('storeMsg').textContent=store.isTest?'Test mode: storage untouched.':(storage?'Saved on this device (localStorage). Export a JSON backup regularly.':'Storage is blocked here – open in Safari (not private browsing).');}
  if(tab==='stats'){renderStats();renderHeat();}
  renderSync();if(tab==='setup'&&!store.isTest&&document.activeElement!==$('teamCode'))$('teamCode').value=store.real.sync.teamCode||'';}
document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tab=b.dataset.t;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));resetDraft();render();scrollTo(0,0);});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
render();doSync(false);
window.__app={store,render,sync,doSync};
})();
