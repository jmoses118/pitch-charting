/* Thunder Elite pitch charting – UI coach.js: the coach's pitch-calling screen (Game, landscape 844×390): full wristband,
   status box with the spoken call, strike zone and docked results together; ✎ Aim; in-play spray; side-retired card;
   band setup; Field / Night palettes; mirror; portrait rotate prompt; bullpen bottom pad.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
// ---------- UI preferences (this phone only) ----------
const PREF={get:(k,d)=>{try{const v=storage&&storage.getItem('te_ui_'+k);return v==null?d:v;}catch(e){return d;}},set:(k,v)=>{try{storage&&storage.setItem('te_ui_'+k,v);}catch(e){}}};
const THEMES=['field','night','auto'],THEME_LABEL={field:'☀ Field (day)',night:'☾ Night',auto:'◐ Auto (sunset)'};
function themeNow(){const t=PREF.get('theme','field');if(t!=='auto')return t;const h=new Date().getHours();return h>=19||h<7?'night':'field';}
function applyTheme(){const t=themeNow();document.documentElement.dataset.theme=t;const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='field'?'#ffffff':'#000000';}
applyTheme();
// ---------- modes ----------
const LANDSCAPE=matchMedia('(orientation: landscape) and (max-height: 500px)'),PORTRAIT=matchMedia('(orientation: portrait)');
[LANDSCAPE,PORTRAIT].forEach(m=>m.addEventListener&&m.addEventListener('change',()=>render()));
const coachGame=lk=>!lk&&tab==='game'&&!!game()&&role()==='coach';
let sideCard=null,cMsg=null;
// ---------- zone: 5×5 grid (pitcher's view); ring quads 11–14 are L-shaped, so they own 3 cells each ----------
const Z5=[[11,11,15,12,12],[11,1,2,3,12],[16,4,5,6,17],[13,7,8,9,14],[13,13,18,14,14]];
const Z5_LABEL=new Set(['0,0','0,2','0,4','2,0','2,4','4,0','4,2','4,4']); // where each ring number is printed
// ---------- status strip messages (replace toasts while calling: nothing covers the count) ----------
function coachMsg(t,kind){cMsg={t,kind:kind||'info',at:Date.now()};renderHint();clearTimeout(coachMsg.t);coachMsg.t=setTimeout(()=>{cMsg=null;renderHint();},2600);}
const RES_BTNS=[['ball','Ball','b-ball'],['called','Called K','b-cs'],['swinging','Swing','b-ss'],['foul','Foul','b-foul'],['inplay','In play ▸','b-ip'],['hbp','HBP','b-hbp'],['foultip','Foul tip','b-ss']];
const IP_BTNS=[['out','Out'],['1B','1B'],['2B','2B'],['3B','3B'],['HR','HR'],['E','E'],['FC','FC'],['DP','DP']];
const inningTag=g=>(g.homeAway==='home'?'T':g.homeAway==='away'?'B':'Inn ')+g.cur.inning;
function callCode(){const sh=curSheet();return D.cell&&sh&&D.cell.sheet===sh.id?PC.cellCode(sh,D.cell.r,D.cell.c):'';}
function hintText(){const g=game();if(sideCard)return '';if(D.aimEdit)return['✎','Tap the new aim'];if(D.ip)return['','Pick the outcome'];
  if(!curSheet())return['1','Add a call sheet in Setup, or tap a result'];if(!D.parsed)return['1','Tap a band cell to call'];if(!D.loc)return['2','Tap where it went (or a result)'];return['3','Tap the result'];}
function renderHint(){const e=$('cxHint');if(!e)return;if(cMsg&&!D.aimEdit){e.className='cs-hint msg '+cMsg.kind;e.textContent=cMsg.t;return;}const h=hintText();e.className='cs-hint';e.innerHTML=h?`<span class="cs-n">${H(h[0])}</span>${H(h[1])}`:'';}
function sizeCoach(){const sh=curSheet(),cols=sh?Math.max(...sh.rows.map(r=>r.length),1):8,rows=sh?sh.rows.length:7;const el=$('coach'),cs=getComputedStyle(el);
  const padX=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight),padY=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
  const W=el.clientWidth-padX,Hh=el.clientHeight-padY,RES=106,GAP=7,HDR=24,RH=28;
  // band cells and inner zone cells share the room; both aim for 48px (ring = 2/3), the band never needs to scroll
  let k=Math.min(48,Math.floor((Hh-HDR-3)/rows));let z=48;const mid=z=>Math.round(z*3+z*4/3+8);
  if(RH+cols*k+GAP+mid(z)+GAP+RES>W){const f=(W-RH-2*GAP-RES-8)/(cols+13/3);k=Math.min(k,Math.floor(f));z=Math.min(48,Math.floor(f));}
  el.style.setProperty('--k',k+'px');el.style.setProperty('--z',z+'px');el.style.setProperty('--mid',mid(z)+'px');}
function renderCoach(){const g=game();if(!g)return;const sh=curSheet(),c=g.cur,hand=curHand(),cp=curPitcherId();
  document.body.classList.toggle('mirror',PREF.get('mirror','0')==='1');sizeCoach();
  // band
  $('cNoBand').classList.toggle('hide',!!sh);$('cBand').classList.toggle('hide',!sh);
  if(sh){const cols=sh.cols&&sh.cols.length?sh.cols:PC.sheetCols(Math.max(...sh.rows.map(r=>r.length)));
    $('cBand').innerHTML=`<thead><tr><th class="corner" aria-hidden="true"></th>${cols.map(x=>`<th scope="col">${H(x)}</th>`).join('')}</tr></thead><tbody>`+sh.rows.map((row,r)=>`<tr><th scope="row">${r+1}</th>${cols.map((_,ci)=>{const t=(row[ci]||'').trim();const on=D.cell&&D.cell.sheet===sh.id&&D.cell.r===r&&D.cell.c===ci;
      return `<td><button data-r="${r}" data-c="${ci}" class="${on?'on':''}" aria-pressed="${on}" aria-label="${H(PC.cellCode(sh,r,ci))} ${H(t||'empty')}" ${t?'':'disabled'}>${H(t)}</button></td>`;}).join('')}</tr>`).join('')+'</tbody>';}
  $('coach').classList.toggle('dim',!!(D.aimEdit||D.ip));
  // status
  const pit=S().pitchers.find(p=>p.id===cp);$('cxPitcher').textContent=pit?PC.pitcherLabel(pit):'Pick a pitcher';$('cxInn').textContent=inningTag(g);$('cxOuts').textContent=c.outs+(c.outs===1?' out':' outs');$('cxCount').textContent=c.b+'-'+c.s;
  const b=g.lineup[c.slot]||{};$('cxBat').innerHTML=`<span class="ic" aria-hidden="true">👤</span><b>${b.num?'#'+H(b.num)+' ':''}${H(b.name||'Batter '+(c.slot+1))}</b> · ${hand==='L'?'LHB':'RHB'} · <span title="Pitches">⚾ ${PC.pitchCount(g.pitches,cp)}</span>`;
  const code=callCode(),aims=aimSet();$('cxCode').innerHTML=D.parsed?`${H(code)}&nbsp; ${H(D.callTxt)}`:'<span class="cs-none">– –&nbsp; no call yet</span>';
  $('cxAim').textContent=D.parsed?(aims.length?'aim '+aims.join('/'):'no spot')+(D.aim?' ✎':''):'';
  renderHint();const n=store.pendingCount(),st=store.real.sync;$('cxNet').textContent=store.isTest?'Test mode – not saved':!navigator.onLine?`Offline – saved on phone${n?' · '+n+' to sync':''}`:(!st.teamCode?'Saved on phone':n?`Saved on phone · ${n} to sync`:'Saved · synced');
  // in play: spray field replaces the status details
  $('cSprayWrap').classList.toggle('hide',!D.ip);['cs-bat','cs-call','cs-hint','cs-foot'].forEach(k=>$('cStatus').querySelector('.'+k).classList.toggle('hide',!!D.ip));
  if(D.ip){$('cxIp').textContent=`IN PLAY · ${code?code+' ':''}${D.callTxt||''}${aims.length?' → '+aims.join('/'):''}${D.loc?' · landed '+D.loc:''} · tap spray (optional)`;const dot=$('cSprayDot');dot.classList.toggle('hide',!D.spray);if(D.spray){dot.setAttribute('cx',D.spray[0]*200);dot.setAttribute('cy',D.spray[1]*92);}}
  // zone
  const am=new Set(aims);$('cZone').innerHTML=Z5.map((row,r)=>row.map((z,ci)=>{const lab=z<10||Z5_LABEL.has(r+','+ci);const isA=lab&&am.has(z),isL=lab&&D.loc===z;
    return `<button data-z="${z}" class="${z<10?'zi':'zr'}${isA?' aim':''}${isA&&D.aimEdit?' editing':''}${isL?' act':''}" ${lab?'':'aria-hidden="true" tabindex="-1"'} aria-label="${lab?'Zone '+z+(isA?', aim':'')+(isL?', landed':''):''}">${lab?`<span>${z}</span>${isA?'<small>AIM</small>':''}`:''}</button>`;}).join('')).join('');
  $('cZone').classList.toggle('editing',!!D.aimEdit);
  // results (or in-play outcomes)
  const two=c.s===2;$('cRes').innerHTML=(D.ip?IP_BTNS.map(([v,l])=>`<button data-ip="${v}" class="${/^(out|1B|2B|3B|HR)$/.test(v)?'b-ip':''}">${l}</button>`).join('')+'<button data-cx="back">← Back</button>':
    RES_BTNS.map(([v,l,k])=>`<button data-r="${v}" class="${k}${D.parsed?'':' soft'}">${l}</button>`).join('')+`<button data-cx="aim" class="${D.aimEdit?'on':''}" aria-pressed="${!!D.aimEdit}" ${D.parsed?'':'disabled'}>✎ Aim</button>`)+
    `<button data-cx="undo" aria-label="Undo last pitch">↶<small>Undo</small></button>`+(D.ip?'':`<button data-cx="same" aria-label="Same call as last pitch" ${lastCell?'':'disabled'}>⟳<small>Same</small></button>`);
  // side retired card
  const sc=sideCard&&sideCard.gameId===g.id?sideCard:null;$('cSide').classList.toggle('hide',!sc);
  if(sc){const ps=g.pitches.filter(p=>p.inning===sc.inning&&!p.noPitch);const q=PC.summarize(ps);const k=ps.filter(p=>p.end==='K'||p.end==='K-D3').length,hits=ps.filter(p=>/^(1B|2B|3B|HR)$/.test(p.ip||'')).length;
    $('cSideSum').textContent=`${g.homeAway==='away'?'Bottom':g.homeAway==='home'?'Top':'Inning'} ${sc.inning}: ${ps.length} pitches · ${k} K · ${hits} H · ${fmt(q.strikePct)} strikes`;}
  $('cmKd3').disabled=$('cmKd3o').disabled=!two;$('cmTheme').textContent='Display: '+THEME_LABEL[PREF.get('theme','field')];$('cmMirror').textContent='Mirror sides: '+(PREF.get('mirror','0')==='1'?'on':'off');
  const und=PC.unmappedCells(sh||{rows:[]},S().customTypes);$('cmBand').textContent=`Band setup${und.length&&!PC.bandSetupDone(sh,S().customTypes)?` (${und.reduce((n,u)=>n+u.cells.length,0)} cells need an aim)`:''}`;$('cmBand').disabled=!sh||!und.length;}
// ---------- coach input ----------
$('cBand').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(b&&!b.disabled){sideCard=null;cMsg=null;callCell(+b.dataset.r,+b.dataset.c);}});
let lpT=null,lpDone=false; // long-press (≥400 ms) on a zone cell sets the aim directly
const zoneBtn=e=>e.target.closest('#cZone button[data-z]');
$('cZone').addEventListener('pointerdown',e=>{const b=zoneBtn(e);if(!b)return;lpDone=false;clearTimeout(lpT);lpT=setTimeout(()=>{if(!D.parsed)return;lpDone=true;D.aim=+b.dataset.z;D.aimEdit=false;buzz(15);render();coachMsg('✎ Aim → '+b.dataset.z);},400);});
['pointerup','pointerleave','pointercancel'].forEach(t=>$('cZone').addEventListener(t,()=>clearTimeout(lpT)));
$('cZone').addEventListener('click',e=>{const b=zoneBtn(e);if(!b)return;if(lpDone){lpDone=false;return;}const z=+b.dataset.z;sideCard=null;
  if(D.aimEdit){D.aim=z;D.aimEdit=false;render();return;}D.loc=D.loc===z?null:z;render();});
$('cRes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;sideCard=null;
  if(b.dataset.r){if(b.dataset.r==='inplay'){D.ip=true;render();return;}recordGame(b.dataset.r);return;}
  if(b.dataset.ip){recordGame('inplay',b.dataset.ip);return;}
  const x=b.dataset.cx;if(x==='back'){D.ip=false;D.spray=null;render();}else if(x==='aim'){D.aimEdit=!D.aimEdit;render();}else if(x==='undo')undoLast();else if(x==='same'&&lastCell)callCell(lastCell.r,lastCell.c);});
$('cSpray').addEventListener('click',e=>{const r=$('cSpray').getBoundingClientRect();D.spray=[+((e.clientX-r.left)/r.width).toFixed(3),+((e.clientY-r.top)/r.height).toFixed(3)];renderCoach();});
$('cSideUndo').onclick=()=>{sideCard=null;undoLast();};$('cSidePause').onclick=()=>{sideCard=null;pauseGame();};$('cSideOk').onclick=()=>{sideCard=null;render();};
// game menu (⋯): the rarely used controls live here, off the charting screen
$('cxMenu').onclick=()=>openSheet($('cMenuDlg'));
const menuDo=f=>()=>{$('cMenuDlg').close('ok');f();};
$('cmOutM').onclick=menuDo(()=>$('outMinus').click());$('cmOutP').onclick=menuDo(()=>$('outPlus').click());$('cmInn').onclick=menuDo(()=>$('innPlus').click());$('cmIbb').onclick=menuDo(()=>$('ibb').click());
$('cmKd3').onclick=menuDo(()=>recordGame('kd3'));$('cmKd3o').onclick=menuDo(()=>recordGame('kd3out'));$('cmPause').onclick=menuDo(pauseGame);$('cmEnd').onclick=menuDo(endGame);
$('cmBand').onclick=menuDo(()=>openBandSetup());
$('cmTheme').onclick=()=>{const t=PREF.get('theme','field');PREF.set('theme',THEMES[(THEMES.indexOf(t)+1)%THEMES.length]);applyTheme();render();};
$('cmMirror').onclick=()=>{PREF.set('mirror',PREF.get('mirror','0')==='1'?'0':'1');render();};
// ---------- band setup: pick an aim once for the cells whose text has a pitch type but no spot ----------
const AIM_OPTS=[1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,18];
let bandSheetId=null;
function openBandSetup(id){const sh=id?sheets().find(x=>x.id===id):curSheet();bandSheetId=sh&&sh.id;if(!sh)return toast('Add a call sheet first');const u=PC.unmappedCells(sh,S().customTypes);const total=sh.rows.reduce((n,r)=>n+r.filter(t=>String(t||'').trim()).length,0);
  $('bandT').textContent='Band setup · '+sh.name;$('bandSub').textContent=u.length?`${total-u.reduce((n,x)=>n+x.cells.length,0)} of ${total} cells already map from the call text. These have a pitch type but no spot – pick an aim once (same text shares one choice):`:'Every cell already maps to a spot.';
  $('bandList').innerHTML=u.map(x=>{const v=sh.aims&&x.norm in sh.aims?+sh.aims[x.norm]:'';return `<div class="bandrow"><div class="bandcells"><b>${x.cells.map(H).join(', ')}</b> <span class="tag">${H(x.text)}</span></div>
    <label class="bandsel">Aim <select data-norm="${H(x.norm)}" aria-label="Aim for ${H(x.text)}"><option value="" ${v===''?'selected':''}>Pick…</option><option value="0" ${v===0?'selected':''}>No spot</option>${AIM_OPTS.map(z=>`<option value="${z}" ${v===z?'selected':''}>Zone ${z}</option>`).join('')}</select></label></div>`;}).join('');
  openSheet($('bandDlg'));}
$('bandDlg').addEventListener('close',()=>{if($('bandDlg').returnValue!=='ok')return;const sh=sheets().find(x=>x.id===bandSheetId);if(!sh)return;sh.aims=Object.assign({},sh.aims);
  $('bandList').querySelectorAll('select').forEach(s=>{if(s.value!=='')sh.aims[s.dataset.norm]=+s.value;});dirty('call_sheets',sh.id);save();render();toast('Band saved');});
// ---------- portrait rotate prompt ----------
$('rotOk').onclick=()=>{PREF.set('portrait_ok','1');render();};
// ---------- bullpen bottom pad: pitch chips, way off, Undo / Pause / End within thumb reach ----------
$('pUndo').onclick=()=>undoLast();$('pPause').onclick=()=>$('bpPause').click();$('pEnd').onclick=()=>$('bpEnd').click();
function placeBullpenPad(on){const pad=$('bpPad');pad.classList.toggle('hide',!on);document.body.classList.toggle('padmode',on);
  const mv=(el,home)=>{if(el.parentNode!==home)home.appendChild(el);};
  if(on){mv($('types'),$('padTypes'));mv($('wayBtns'),$('padWay'));}else{$('types').parentNode!==document.querySelector('.entrybar')&&document.querySelector('.entrybar').prepend($('types'));const z=document.querySelector('.zonewrap');if($('wayBtns').previousElementSibling!==z)z.after($('wayBtns'));}}
// called from render(): decides which charting screen shows
function renderModes(lk,showEntry){const cg=coachGame(lk);const coach=cg&&LANDSCAPE.matches,gate=cg&&PORTRAIT.matches&&PREF.get('portrait_ok','0')!=='1';
  document.body.classList.toggle('coachmode',coach);$('coach').classList.toggle('hide',!coach);$('rotate').classList.toggle('hide',!gate);
  placeBullpenPad(!!showEntry&&tab==='bullpen');if(coach)renderCoach();if(tab==='setup')renderDisplayPrefs();}
addEventListener('online',()=>render());addEventListener('offline',()=>render());
addEventListener('resize',()=>{if(document.body.classList.contains('coachmode'))sizeCoach();});
// Setup: display prefs + band setup for the sheet being edited
$('thSel').onchange=e=>{PREF.set('theme',e.target.value);applyTheme();render();};$('mirrorChk').onchange=e=>{PREF.set('mirror',e.target.checked?'1':'0');render();};
$('csBand').onclick=()=>openBandSetup(typeof csCur==='function'&&csCur()?csCur().id:null);
function renderDisplayPrefs(){$('thSel').value=PREF.get('theme','field');$('mirrorChk').checked=PREF.get('mirror','0')==='1';}
