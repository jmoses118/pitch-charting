/* Thunder Elite pitch charting – UI shared.js: Shared UI: DOM helpers, store access, roles/visibility, toast, zone grid component, call entry, pitch-count banners, record building, test mode, cloud sync.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
const $=id=>document.getElementById(id);
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage=null;try{storage=window.localStorage;storage.setItem('__t','1');storage.removeItem('__t');}catch(e){storage=null;}
const store=PC.makeStore(storage);
const S=()=>store.state;
const dirty=(k,id)=>{store.markDirty(k,id);};
const save=()=>{schedSync();if(!store.save()&&!store.isTest&&!store.saveOk)toast('Not saving: storage blocked. Open in Safari (not private).');};
let tab='game';
const D={callTxt:'',parsed:null,ip:false,foul:false,foulTime:null,wpPb:null,velo:null}; // screen extras; the pitch in progress lives only on D.draft
let callOn=false,bpHand='N'; // bullpen default: no batter (in/away calls map as RHB)
// every dialog/sheet: Cancel, Escape and a tap on the backdrop close it without saving (returnValue 'cancel')
function openSheet(d){d.returnValue='';d.showModal();}
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('cancel',()=>{d.returnValue='cancel';});
  d.addEventListener('click',e=>{if(e.target!==d||!e.clientX&&!e.clientY)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close('cancel');});});
// inline sheets (result, wristband) close on Escape too
document.addEventListener('keydown',e=>{if(e.key!=='Escape'||document.querySelector('dialog[open]'))return;if($('wbDet').open)$('wbDet').open=false;else if(D.sheet||D.ip||D.foul){D.sheet=false;D.ip=false;D.foul=false;render();}});
function toast(t,ms){if(document.body.classList.contains('coachmode')&&typeof coachMsg==='function')return coachMsg(t);const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),ms||1300);}
// ---------- helpers ----------
const allTypes=()=>PC.BASE_TYPES.concat(S().customTypes.map(c=>({code:c.code.toUpperCase(),name:c.name})));
const pById=id=>S().pitchers.find(p=>p.id===id);
const pName=id=>PC.pitcherLabel(pById(id)); // first name + jersey number only (privacy for minors)
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
function confirmSave(t){buzz(35);if(document.body.classList.contains('coachmode')&&typeof coachMsg==='function')return coachMsg('✓ Saved · '+t,'ok');let f=document.getElementById('flash');if(!f){f=document.createElement('div');f.id='flash';document.body.appendChild(f);}f.textContent='✓ '+t;f.classList.add('on');clearTimeout(f._t);f._t=setTimeout(()=>f.classList.remove('on'),700);}
const oneHand=()=>S().oneHand!==false;
function advance(step){if(!oneHand())return;if(document.body.classList.contains('entrymode')){if(scrollY)scrollTo(0,0);return;} // one-screen entry: everything is already in view
  const el=step==='loc'?$('zone'):step==='result'?$('resBtns'):($('wbCard')&&!$('wbCard').classList.contains('hide')?$('wbCard'):$('types'));if(el&&el.scrollIntoView)setTimeout(()=>el.scrollIntoView({behavior:'auto',block:step==='result'?'end':'start'}),30);}
function pcCheck(pid,before,after){ensureSettings();const th=S().settings.alerts;const a=PC.alertLevel(before,th),b=PC.alertLevel(after,th);if(b.lvl>a.lvl){buzz([220,90,220]);toast(`⚠️ ${pName(pid)} has thrown ${after} pitches (alert at ${b.at})`);}}
function resetDraft(){D.cell=null;D.bb=null;D.sheet=false;D.spray=null;D.foul=false;D.foulTime=null;D.wpPb=null;D.velo=null;D.draft=blankDraft();Object.assign(D,{callTxt:'',parsed:null,ip:false});$('callTxt').value='';const vel=$('velo');if(vel)vel.value='';}
// ---------- zone ----------
const ZX0=20,ZY0=24,CW=20,CHh=24;
const QUAD={11:'M0 0H40V24H20V48H0Z',12:'M60 0H100V48H80V24H60Z',13:'M0 72H20V96H40V120H0Z',14:'M100 72V120H60V96H80V72Z',15:'M40 0H60V24H40Z',16:'M0 48H20V72H0Z',17:'M80 48H100V72H80Z',18:'M40 96H60V120H40Z'};
const QLBL={11:[10,12],12:[90,12],13:[10,108],14:[90,108],15:[50,12],16:[10,60],17:[90,60],18:[50,108]};
function zoneOf(x,y){if(x>=ZX0&&x<=80&&y>=ZY0&&y<=96){const c=Math.min(2,Math.floor((x-ZX0)/CW)),r=Math.min(2,Math.floor((y-ZY0)/CHh));return r*3+c+1;}
  if(x<-14||x>114||y<-6||y>132)return null;
  if(x>=40&&x<=60)return y<60?15:18; if(y>=48&&y<=72)return x<50?16:17;
  return x<50?(y<60?11:13):(y<60?12:14);}
const center=z=>z<10?[ZX0+((z-1)%3+.5)*CW,ZY0+(((z-1)/3|0)+.5)*CHh]:QLBL[z];
function zoneSVG(svg,hand,o={}){let h='';svg.setAttribute('viewBox',o.orient?ORIENT_VIEWBOX:PLAIN_VIEWBOX);const ly=o.orient?ORIENT_LABEL_Y:128;
  for(const q in QUAD)h+=`<path data-z="${q}" class="zb" d="${QUAD[q]}" stroke="#0d1117" stroke-width=".8"/>`;
  for(let i=0;i<9;i++)h+=`<rect data-z="${i+1}" class="zs" x="${ZX0+(i%3)*CW}" y="${ZY0+((i/3)|0)*CHh}" width="${CW}" height="${CHh}" stroke="#0d1117" stroke-width=".8"/>`;
  if(o.orient)h+=PLATE_SVG+(o.noSide?'':batterSVG(hand));
  h+='<path class="zframe" d="M20 24H80V96H20Z" fill="none" stroke="#e6edf3" stroke-width="1"/>';
  const lab=o.labels||{};
  if(!o.noNums)for(const q in QLBL)h+=`<text class="zl" x="${QLBL[q][0]}" y="${QLBL[q][1]-(lab[q]?3:0)}">${q}</text>${lab[q]?`<text class="zl" style="font-size:5px;fill:#8fb0ff" x="${QLBL[q][0]}" y="${QLBL[q][1]+4}">${lab[q]}</text>`:''}`;
  if(!o.noNums)for(let i=1;i<=9;i++){const[c,r]=center(i);h+=`<text class="zl" x="${c}" y="${r-(lab[i]?3:0)}">${i}</text>${lab[i]?`<text class="zl" style="font-size:5px;fill:#8fb0ff" x="${c}" y="${r+5}">${lab[i]}</text>`:''}`;}
  // side labels by handedness (RHB stands on pitcher's right)
  if(o.noSide)h+=`<text class="side" transform="translate(-8 60) rotate(-90)">1B side</text><text class="side" transform="translate(108 60) rotate(90)">3B side</text>`;
  else{  const inRight=PC.insideCol(hand)===2;
  const gl=hand==='N'&&(o.throws==='L'||o.throws==='R');const gR=o.throws==='L';
  h+=gl?`<text class="side" transform="translate(-8 60) rotate(-90)">${gR?'ARM':'GLOVE'}</text><text class="side" transform="translate(108 60) rotate(90)">${gR?'GLOVE':'ARM'}</text>`:`<text class="side" transform="translate(-8 60) rotate(-90)">${inRight?'AWAY':'IN'}</text><text class="side" transform="translate(108 60) rotate(90)">${inRight?'IN':'AWAY'}</text>`;
  if(o.compact)h+=`<text class="side" style="fill:${hand==='N'?'#8b949e':'#5b8cff'};font-size:5px;text-anchor:end" x="112" y="${ly}">${hand==='N'?(gl?`No batter · ${o.throws}HP`:'No batter · as RHB'):`${hand==='L'?'LHB':'RHB'} ${inRight?'▶':'◀'}`}</text>`;
  else h+=hand==='N'?`<text class="side" style="fill:#8b949e;font-size:5px" x="50" y="${ly}">${gl?`No batter · glove / arm side (${o.throws}HP)`:'No batter · in/away shown as RHB'}</text>`:`<text class="side" style="fill:#5b8cff;font-size:5.5px" x="${inRight?88:12}" y="${ly}">${hand==='L'?'LHB':'RHB'} ${inRight?'▶':'◀'}</text><text class="side" x="${inRight?12:88}" y="${ly}" style="opacity:.5">${inRight?'LHB side':'RHB side'}</text>`;
  }
  svg.innerHTML=h+(o.extra||'');}
function drawZone(){const hand=curHand();let ex='';const tset=aimSet();
  const lab={};tset.forEach(z=>lab[z]='TARGET');
  const items=renderRecent();zoneSVG($('zone'),hand,{labels:lab,throws:throwsOf(),orient:true,compact:true,extra:ballsSVG(items,throwsOf())});
  tset.forEach(z=>{const e=$('zone').querySelector(`[data-z="${z}"]`);e&&e.classList.add('zt');});
  if(D.loc){const e=$('zone').querySelector(`[data-z="${D.loc}"]`);e&&e.classList.add(tset.includes(D.loc)?'zta':'za');}
  document.querySelectorAll('#wayBtns [data-z],#actBtns [data-z]').forEach(b=>b.classList.toggle('sel',+b.dataset.z===D.loc));}
const locTxt=z=>PC.isWay(z)?PC.WAY[z]:PC.isActualOnly(z)?PC.ACTUAL_ONLY[z]:'@'+z;
function tapLoc(z){if(scoreGuard())return;const r=PC.scoreTap(pullDraft(),z);
  if(!r.ok){if(r.reason==='need_type')return toast('Pick the pitch type first');if(r.reason==='bad_target')return toast(PC.CH_AIM_MSG);if(r.reason==='need_called')return toast('Tap the called location first');return;}
  takeDraft(r);
  if(r.op==='called'){render();return;}
  if(typeof clearFoulChips==='function')clearFoulChips();
  if(r.draft.actual==null){D.sheet=false;render();return;}
  if(tab==='bullpen'){logBullpen();return;}
  D.sheet=true;D.foul=false;render();if(tab==='game')advance('result');}
$('zone').addEventListener('click',e=>{const svg=$('zone');const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  const z=zoneOf(p.x,p.y);if(z)tapLoc(z);});
$('wayBtns').addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(b)tapLoc(+b.dataset.z);});
$('actBtns').addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(b)tapLoc(+b.dataset.z);});
// ---------- call entry ----------
function clearEntry(){D.draft=blankDraft();D.sheet=false;}
function setCall(t){D.callTxt=t;$('callTxt').value=t;D.parsed=PC.parseCall(t,curHand(),throwsOf(),S().customTypes);if(D.parsed)placeCall(D.parsed.type,D.parsed.targets.slice());else clearEntry();render();}
$('callTxt').addEventListener('input',e=>{D.callTxt=e.target.value;D.parsed=PC.parseCall(D.callTxt,curHand(),throwsOf(),S().customTypes);if(D.parsed)placeCall(D.parsed.type,D.parsed.targets.slice());else clearEntry();render(true);});
$('callAlt').addEventListener('click',e=>{const z=e.target.dataset.alt;if(!z||!D.parsed)return;D.parsed.targets=[+z];placeCall(D.parsed.type,[+z]);render();});
$('callClr').onclick=()=>{setCall('');D.type=null;render();};
$('callTypes').addEventListener('click',e=>{const c=e.target.dataset.c;if(!c)return;const suf=(D.parsed&&D.parsed.suffix)||'';setCall(c+(suf?(' '+suf):''));D.type=PC.normType(c,S().customTypes);render();});
$('callSuf').addEventListener('click',e=>{const s=e.target.dataset.s;if(s==null)return;const t=(D.parsed&&D.parsed.type)||'FB';setCall(s==='H+'&&!D.parsed?'H+':(t+(s?' '+s:'')));});
// pitch-count banner (game) + rest-day reminder (pitcher select)
// team settings (alerts, soft limits, rest guide) are coach-only and sync to Supabase (team_settings) so every coach phone shares them
function ensureSettings(){const s=S();s.settings=s.settings||{};const st=s.settings;if(!Array.isArray(st.alerts))st.alerts=PC.DEFAULT_ALERTS.slice();if(!Array.isArray(st.rest))st.rest=PC.DEFAULT_REST.map(x=>Object.assign({},x));st.limits=Object.assign({},PC.DEFAULT_LIMITS,st.limits);if(typeof st.showRest!=='boolean')st.showRest=false;return st;}
const saveSettings=()=>{dirty('team_settings',PC.TEAM_SETTINGS_ID);save();render();};
const today=()=>PC.localDate(Date.now());
const wlSeen={}; // pitcher|day -> last limit level shown, so the over-limit buzz fires once when it is crossed
function renderAlerts(){const set=ensureSettings();const cp=curPitcherId();const g=game();const R0=role();
  const showA=tab==='game'&&g&&cp;const n=showA?PC.pitchCount(g.pitches,cp):0;const a=PC.alertLevel(n,set.alerts);const el=$('pcAlert');
  // today / weekend workload line under the pitcher select (game + bullpen tabs)
  const wl=$('wlMsg'),wm=$('wlMini');const showW=cp&&(tab==='game'||tab==='bullpen');let wa=null;
  if(showW){const w=PC.workload(S(),cp,today());wa=PC.workloadAlert(w,set.limits);wl.className='wl'+(wa.lvl>=0?' l'+wa.lvl:'');wl.textContent=PC.workloadText(w);wm.className='wlmini'+(wa.lvl>=0?' l'+wa.lvl:'');wm.textContent=PC.workloadShort(w);wm.title=wl.textContent;
    const k=cp+'|'+today(),prev=wlSeen[k];wlSeen[k]=wa.lvl;if(prev!=null&&wa.lvl===1&&prev<1&&R0!=='viewer'){buzz([220,90,220]);toast(`⚠️ ${pName(cp)} is at her ${wa.day.lvl===1?'daily':'weekend'} limit`);}}
  else{wl.className='hide';wm.className='hide';}
  const msgs=[];if(showA&&a.lvl>=0)msgs.push(`${n} pitches – past the ${a.at} alert${a.next?` (next at ${a.next})`:''}`);
  if(wa&&wa.day.lvl>=0)msgs.push(`today ${wa.day.n}/${wa.day.limit}`);if(wa&&wa.weekend.lvl>=0)msgs.push(`weekend ${wa.weekend.n}/${wa.weekend.limit}`);
  const lvl=Math.max(showA?Math.min(1,a.lvl):-1,wa?wa.lvl:-1);el.className=msgs.length?'l'+Math.max(0,lvl):'hide';if(msgs.length)el.textContent=`⚠️ ${pName(cp)}: ${msgs.join(' · ')}`;
  const rm=$('restMsg');const ri=set.showRest&&cp&&R0!=='player'&&R0!=='viewer'&&(tab==='game'||tab==='bullpen')?PC.restInfo(S(),cp,today(),set.rest):null;
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
$('types').addEventListener('click',e=>{const c=e.target.dataset.c;if(!c)return;
  if(D.shook){takeDraft(PC.scoreApply(pullDraft(),{op:'call',type:c,called:[]}));D.sheet=false;D.ip=false;render();return;}
  if(!D.shook&&callOn&&D.parsed){const next=tab==='bullpen'||D.type!==c?c:null;if(!next){clearEntry();render();return;}placeCall(next,D.parsed.targets||[]);render();return;}
  if(tab!=='bullpen'&&D.type===c){clearEntry();render();return;}
  placeCall(c,[]);render();if(tab==='game'&&D.type)advance('loc');});
[['hL','L'],['hR','R'],['hN','N']].forEach(([id,h])=>$(id).onclick=()=>{$('batDlg').close('ok');setHand(h);});
$('batTog').onclick=()=>openSheet($('batDlg'));$('bpTest').onclick=()=>toggleTest();
function setHand(h){if(tab==='game'&&game()){game().cur.hand=h;dirty('games',game().id);save();}else bpHand=h;if(D.callTxt)D.parsed=PC.parseCall(D.callTxt,h,throwsOf(),S().customTypes);render();}
// ---------- record building ----------
// One flow draft. Screen names (D.type, D.loc, D.shook) read and write that object. They are not a second copy.
function blankDraft(){return{mode:tab==='bullpen'?'bullpen':'game',type:null,called:[],actual:null,result:null,ip:null,shook:null,velo:null,aimEdit:false};}
function ensureDraft(){if(!D.draft)D.draft=blankDraft();return D.draft;}
function oneAim(){const c=D.draft&&D.draft.called;return c&&c.length===1?c[0]:null;}
function setOneAim(v){ensureDraft().called=v==null||v===''?[]:[v];}
Object.defineProperty(D,'type',{configurable:true,enumerable:true,get(){return D.draft?D.draft.type:null;},set(v){ensureDraft().type=v||null;}});
Object.defineProperty(D,'loc',{configurable:true,enumerable:true,get(){return D.draft?D.draft.actual:null;},set(v){ensureDraft().actual=v==null||v===''?null:v;}});
Object.defineProperty(D,'aimEdit',{configurable:true,enumerable:true,get(){return !!(D.draft&&D.draft.aimEdit);},set(v){ensureDraft().aimEdit=!!v;}});
Object.defineProperty(D,'called',{configurable:true,enumerable:true,get(){return (D.draft&&D.draft.called)||[];},set(v){ensureDraft().called=Array.isArray(v)?v.slice():[];}});
Object.defineProperty(D,'aim',{configurable:true,enumerable:true,get:oneAim,set:setOneAim});
Object.defineProperty(D,'target',{configurable:true,enumerable:true,get:oneAim,set:setOneAim});
Object.defineProperty(D,'shook',{configurable:true,enumerable:true,get(){return D.draft?D.draft.shook:null;},set(v){const d=ensureDraft();if(!v){d.shook=null;return;}
  const called=Array.isArray(v.called)?v.called.slice():(Array.isArray(v.targets)?v.targets.slice():[]);
  d.shook={type:v.type||null,called,norm:v.norm||null,raw:v.raw||v.norm||null,prevType:v.prevType||v.type||null,prevCalled:Array.isArray(v.prevCalled)?v.prevCalled.slice():called.slice()};}});
if(!D.draft)D.draft=blankDraft();
function takeDraft(r){if(r&&r.draft)D.draft=r.draft;return r;}
function aimSet(){return ((D.draft&&D.draft.called)||[]).slice();}
function pushCalled(arr){const type=D.type||null;takeDraft(PC.scoreApply({mode:tab==='bullpen'?'bullpen':'game',type,velo:D.velo==null?null:D.velo},{op:'call',type,called:arr||[]}));}
function placeCall(type,boxes){const r=PC.scoreApply({mode:tab==='bullpen'?'bullpen':'game'},{op:'call',type:type||null,called:boxes||[]});if(!r.ok){D.draft=blankDraft();D.sheet=false;return r;}takeDraft(r);D.sheet=false;D.ip=false;return r;}
function pullDraft(){const d=ensureDraft();const sk=d.shook;
  return{mode:tab==='bullpen'?'bullpen':'game',type:d.type||null,called:(d.called||[]).slice(),actual:d.actual==null?null:d.actual,result:d.result||null,ip:d.ip||null,velo:D.velo==null?null:D.velo,aimEdit:!!d.aimEdit,
    shook:sk?{type:sk.type||null,called:(sk.called||[]).slice(),norm:sk.norm||null,raw:sk.raw||null,prevType:sk.prevType||null,prevCalled:(sk.prevCalled||[]).slice()}:null};}
// A typed velocity outside 20–110 is dropped, and the coach hears about it once. Empty stays empty with no message.
function noteVelo(raw){if(raw==null||String(raw).trim()==='')return null;const v=PC.cleanVelo(raw);if(v==null)toast('Velocity must be between 20 and 110. Not saved.',2200);return v;}
// Chart fields come only from scoreCommit. Identity (who, when, the wristband text) is attached here.
function pitchFromCommit(draft){const chart=PC.scoreCommit(draft);if(!chart)return null;const sk=draft&&draft.shook;
  return{id:PC.uuid(),ts:Date.now(),pitcherId:curPitcherId(),hand:curHand(),type:chart.type,targets:(chart.targets||[]).slice(),loc:chart.loc,actualLoc:chart.actualLoc,calledLoc:chart.calledLoc,result:chart.result,ip:chart.ip||null,
    call:sk?(sk.norm||null):(callOn&&D.parsed?D.parsed.norm:null),callRaw:sk?(sk.raw||sk.norm||null):(callOn&&D.callTxt?D.callTxt:null),wpPb:PC.cleanFlag(D.wpPb),velo:noteVelo(chart.velo),...(chart.shook?{shook:true}:{})};}
// ---------- test mode ----------
function toggleTest(){if(store.isTest){if(!confirm('Exit test mode? Everything from this test is discarded.'))return;store.exitTest();resetDraft();if(typeof loadRedo==='function')loadRedo();toast('Test data cleared');}
  else{store.enterTest();resetDraft();redoStack=[];toast('TEST MODE – nothing is saved');}render();}
$('testBtn').onclick=toggleTest;$('exitTest2').onclick=toggleTest;
// ---------- cloud sync ----------
const CFG=window.PC_CONFIG||{};const sync=CFG.url&&CFG.key?PC.makeSync(store,{url:CFG.url,key:CFG.key}):null;let syncT=null,syncing=false;
// Scoring lock: the live game / bullpen session on screen is scored only from the phone that owns it (PC.canScore)
store.real.sync.scorerCol=!!CFG.scorerColumn; store.real.sync.shakeCol=!!CFG.shakeColumn; store.real.sync.chartCol=!!CFG.chartColumn; // on after 20261014140000_shake_off.sql and 20261014180000_scoring_chart.sql
const myDevice=()=>store.real.sync.deviceId;
function liveBox(){if(tab==='game'){const g=game();return PC.gameInProgress(g)?g:null;}return tab==='bullpen'?session():null;}
const viewOnly=()=>PC.lockedBox(liveBox(),myDevice());
// controls that change the live game / session: disabled on a view-only phone (viewing items – band setup, theme, mirror – stay)
const RO_EDIT_IDS=['cmOutM','cmOutP','cmEnd','cmInn','cmIbb','cmKd3','cmKd3o','cmPause','cmXtra','gEnd','gPause','lkEndG','lkPauseG','outPlus','outMinus','innPlus','ibb','bpEnd','bpPause','lkEndBp','lkPauseBp','pUndo','pRedo','pPause','pEnd','undo','redo'];
function applyViewOnly(vo){document.body.classList.toggle('viewonly',vo);const m=$('cmRo');if(m)m.classList.toggle('hide',!vo);
  for(const id of RO_EDIT_IDS){const e=$(id);if(!e)continue;if(vo){if(!e.disabled){e.disabled=true;e.dataset.rolock='1';}}else if(e.dataset.rolock){e.disabled=false;delete e.dataset.rolock;}}}
function scoreGuard(){if(!viewOnly())return false;toast(PC.SCORING_ELSEWHERE);return true;}
function openTakeover(){if(!liveBox())return;$('takeDlg').returnValue='';$('takeDlg').showModal();$('takeCancel').focus();}
$('roTake').onclick=openTakeover;
$('takeDlg').addEventListener('close',()=>{if($('takeDlg').returnValue!=='ok')return;const b=liveBox();if(!b||!PC.claimScoring(b,myDevice()))return;
  dirty(tab==='game'?'games':'sessions',b.id);save();render();toast('You are scoring now');if(typeof doSync==='function')doSync();});
function schedSync(){if(store.isTest||!sync)return;clearTimeout(syncT);syncT=setTimeout(()=>doSync(false),3000);}
async function doSync(manual,pull){if(!sync)return;if(store.isTest){if(manual)toast('Test mode never syncs');return;}
  if(!store.real.sync.teamCode){if(manual)toast('Enter the team code first');renderSync();return;}
  if(typeof navigator!=='undefined'&&navigator.onLine===false){if(manual)toast('Offline – will sync later');renderSync();return;}
  syncing=true;renderSync();const r=pull?await sync.pull():await sync.sync();syncing=false;
  if(manual)toast(r.error?'Sync failed: '+r.error.slice(0,80):(pull?`Restored: ${r.added||0} new pitches`:`Synced${r.added?' · '+r.added+' new from cloud':''}`));render();}
function renderSync(){const e=$('syncTag');if(!e)return;const mini=document.body.classList.contains('entrymode');if(store.isTest){e.textContent=mini?'☁ off':'☁ off (test)';e.title='Sync off (test mode)';e.style.background='#5c1515';e.style.color='#fff';return;}
  const st=store.real.sync,n=store.pendingCount();const t=st.last?new Date(st.last).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'never';
  const full=!sync||!st.teamCode?'☁ not set up':syncing?'☁ syncing…':st.lastError?`☁ error · ${n} pending`:`☁ ${t} · ${n} pending`;e.title=full;e.textContent=!mini?full:!sync||!st.teamCode?'☁ off':syncing?'☁ …':st.lastError?`☁ ! ${n}`:n?`☁ ${n}`:'☁ ✓';e.style.background=st.lastError?'#5c1515':n?'#5c4813':'#1d4a2a';e.style.color='#fff';
  if($('syncMsg'))$('syncMsg').textContent=`Last synced: ${t}. Pending: ${n}.${st.lastError?' Last error: '+st.lastError:''} Device ${st.deviceId}. Test mode never syncs.`;if(typeof renderRejBtn==='function')renderRejBtn();}
$('teamSave').onclick=()=>{if(store.isTest)return toast('Exit test mode first');const v=$('teamCode').value.trim().toUpperCase();if(v.length<20)return toast('Team code looks too short');const changed=store.real.sync.teamCode!==v;
  // never lose unsent work: a verified code with pending edits can't be swapped until they're sent (a rejected/typo code can always be corrected)
  if(changed&&store.real.sync.teamCode&&(['coach','player','pcoach'].includes(store.real.sync.role))&&store.pendingCount()>0){toast(`${store.pendingCount()} unsent changes – tap Sync now first (or export a backup)`);$('teamCode').value=store.real.sync.teamCode;return;}store.real.sync.teamCode=v;if(changed){store.real.sync.role=undefined;store.real.sync.teamId=null;store.real.sync.pitcherId=null;}store.markAllDirty();store.save();
  if(sync)sync.whoami().then(w=>{if(w.role===null)toast('Code not recognized');else if(w.role)toast({coach:'Coach code: full access',player:'Player code: bullpen for '+(store.real.sync.pitcherName||'you'),viewer:'View-only code',pcoach:'Pitching-coach code'}[w.role]);
    if(!ROLE_TABS[role()].includes(tab))tab=ROLE_TABS[role()][0];doSync(false);render();});else{toast('Team code saved');doSync(true);}};
$('syncNow').onclick=()=>doSync(true);
$('pullCloud').onclick=()=>{if(confirm('Download this team\'s data from the cloud and merge it into this phone?'))doSync(true,true);};
window.addEventListener('online',()=>doSync(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)doSync(false);});setInterval(()=>doSync(false),60000);
// one-screen entry: the zone fills the height left between the sticky entry bar and the tab bar,
// never shrinking a box below ZONE_MIN_BOX px; the batter toggle sits in the zone's bottom-left corner
const ZONE_MIN_BOX=48;
function fitZone(){const z=$('zone'),w=z.parentElement;if($('entry').classList.contains('hide')||!w.clientWidth)return;
  document.documentElement.style.setProperty('--hdr-h',document.querySelector('header').offsetHeight+'px');
  const pad=document.body.classList.contains('padmode')?$('bpPad').offsetHeight:0;document.documentElement.style.setProperty('--pad-h',pad+'px');
  const vb=z.viewBox.baseVal,top=w.getBoundingClientRect().top+scrollY,nav=document.querySelector('nav').offsetHeight,loc=$('locRow'),locH=!pad&&loc&&loc.offsetParent?loc.offsetHeight:0,way=pad?pad+8:(locH||$('wayBtns').offsetHeight)+16;
  const min=Math.ceil(ZONE_MIN_BOX*vb.height/CW)+1,h=Math.round(Math.max(min,Math.min(innerHeight-top-nav-way,w.clientWidth*vb.height/vb.width)));
  z.style.height=h+'px';const m=z.getScreenCTM(),r=w.getBoundingClientRect();if(!m)return;const bs=$('batTog').style;
  bs.left=(-13*m.a+m.e-r.left)+'px';bs.top=(124*m.d+m.f-r.top)+'px';bs.width=(43*m.a)+'px';}
addEventListener('resize',()=>fitZone());

// ---------- shake-off (game): she shook off the coach's call and threw her own pitch ----------
// D.shook keeps the coach's call (type + aim); she then picks the type thrown, and the pitch is scored against
// her own aim (unknown = no aim). Cancel restores the call; after recording, Undo removes the pitch as usual.
function shakeOff(){if(scoreGuard())return;if(tab!=='game'||!game()||D.shook)return;if(!D.parsed)return toast('Tap the wristband call first');
  takeDraft(PC.scoreApply(pullDraft(),{op:'shake',norm:D.parsed.norm,raw:D.callTxt||D.parsed.norm}));D.sheet=false;D.ip=false;buzz(15);if(typeof cMsg!=='undefined')cMsg=null;render();}
function cancelShake(){if(!D.shook)return;const prev=D.shook;takeDraft(PC.scoreApply({mode:'game'},{op:'call',type:prev.prevType,called:prev.prevCalled||[]}));render();toast('Shake-off canceled');}
function renderShake(){const g=tab==='game'&&!!game()&&role()==='coach'&&!viewOnly();
  // Always keep Shake-off in the stepline during a coach game (disabled until a call) so the zone never jumps
  $('shakeBtn').classList.toggle('hide',!g||!!D.shook);$('shakeBtn').disabled=!D.parsed||!!D.shook;
  $('shakeBar').classList.toggle('hide',!g||!D.shook);document.querySelector('.entrybar').classList.toggle('shaking',!!(g&&D.shook));if(D.shook)$('shakeTxt').textContent=D.type?`↶ Shook off ${D.shook.norm} · ${D.type}`:`↶ Shook off ${D.shook.norm} · pick the pitch`;}
$('shakeBtn').onclick=shakeOff;$('shakeCancel').onclick=cancelShake;
// Shake-offs section (Stats + report): per pitcher, shake-off results vs pitches that followed the call, and each shake-off
function shakeHTML(P){const ids=[...new Set(P.filter(p=>p.shook&&!p.deleted).map(p=>p.pitcherId))];if(!ids.length)return '';
  const row=(k,x)=>`<tr><td>${k}</td><td>${x.n}</td><td>${fmt(x.strikePct)}</td><td>${x.hits}</td><td>${x.hard}</td><td>${x.k}</td><td>${x.balls}</td></tr>`;
  return ids.map(id=>{const r=PC.shakeoffs(P.filter(p=>p.pitcherId===id));return `<div class="shk"><div class="lbl">Shake-offs · ${H(pName(id))}: ${r.n}</div>
  <table class="shktbl"><tr><th></th><th>Pitches</th><th>Strike %</th><th>Hits</th><th>Hard hit</th><th>K</th><th>Balls</th></tr>${row('Shook off',r.shook)}${row('Followed call',r.followed)}</table>
  <ol class="shklist">${r.list.map(x=>`<li><b>Called ${H(x.called)}</b> → threw <b>${H(x.thrown)}</b>${x.count?` · ${H(x.count)}`:''}${x.prev?` · after ${H(x.prev)}`:''} · <b>${H(x.outcome||'–')}</b></li>`).join('')}</ol></div>`;}).join('');}
