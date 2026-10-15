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
// ---------- status strip messages (replace toasts while calling: nothing covers the count) ----------
function coachMsg(t,kind){cMsg={t,kind:kind||'info',at:Date.now()};renderHint();clearTimeout(coachMsg.t);coachMsg.t=setTimeout(()=>{cMsg=null;renderHint();},2600);}
const RES_BTNS=[['ball','Ball','b-ball'],['called','Called K','b-cs'],['swinging','Swing','b-ss'],['foul','Foul','b-foul'],['inplay','In play ▸','b-ip'],['hbp','HBP','b-hbp'],['foultip','Foul tip','b-ss']];
const IP_BTNS=[['out','Out'],['1B','1B'],['2B','2B'],['3B','3B'],['HR','HR'],['E','E'],['FC','FC'],['DP','DP']];
const inningTag=g=>(g.homeAway==='home'?'T':g.homeAway==='away'?'B':'Inn ')+g.cur.inning;
function callCode(){const sh=curSheet();return D.cell&&sh&&D.cell.sheet===sh.id?PC.cellCode(sh,D.cell.r,D.cell.c):'';}
function hintText(){const cmp=$('coach').classList.contains('compact');if(sideCard)return '';if(D.aimEdit)return['✎','Tap the new aim'];if(D.ip)return['','Pick the outcome'];
  if(D.shook&&!D.type)return['',cmp?'Threw?':'Which pitch?']; // short: status already shows "⤺ CH7 → ?"
  if(!curSheet())return['1',cmp?'No sheet':'Add a call sheet'];
  const step=PC.scoreStep(pullDraft());
  if(step==='type')return['1',cmp?'Tap a cell':'Tap a wristband cell'];
  if(step==='called')return['2',cmp?'Aim?':'Tap the aim'];if(step==='actual')return['2',cmp?'Where?':'Tap where it went'];return['3',cmp?'Result?':'Tap the result'];}
function renderHint(){const e=$('cxHint');if(!e)return;if(D.draft&&D.draft.calledFlag&&D.called&&D.called.length){e.className='cs-hint msg warn';e.textContent=PC.aimRejectMsg(D.type,D.called[0]);return;}if(cMsg&&(!D.aimEdit||cMsg.kind==='warn')){e.className='cs-hint msg '+cMsg.kind;e.textContent=cMsg.t;return;}const h=hintText();e.className='cs-hint';e.innerHTML=h?`<span class="cs-n">${H(h[0])}</span>${H(h[1])}`:'';}
function sizeCoach(){const sh=curSheet(),cols=sh?Math.max(...sh.rows.map(r=>r.length),1):8,rows=sh?sh.rows.length:7;const el=$('coach'),cs=getComputedStyle(el);
  const padX=parseFloat(cs.paddingLeft)+parseFloat(cs.paddingRight),padY=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
  const W=el.clientWidth-padX,Hh=el.clientHeight-padY,compact=W+padX<700,GAP=7,HDR=24,LN=1.5,RH=compact?20:28,RES=compact?98:106,KMAX=compact?44:48;
  // padding already holds the safe-area insets; count the (rows+1)/(cols+1) 1.5px grid lines so the band never runs into the home bar
  const LH=(rows+1)*LN,LW=(cols+1)*LN,mid=z=>Math.round(z*3+z*4/3+8);
  let k=Math.min(KMAX,Math.floor((Hh-HDR-LH)/rows)),z=48;
  const STH=compact?112:100,ACT=48,ZONEGAP=8;z=Math.min(48,Math.floor((Hh-STH-8-8-ACT-ZONEGAP-1)/(13/3)));el.style.setProperty('--sth',STH+'px');
  if(compact)z=Math.min(z,Math.floor((W-RH-2*GAP-RES-cols*k-LW-8)/(13/3)));
  else if(RH+LW+cols*k+GAP+mid(z)+GAP+RES>W){const f=(W-RH-LW-2*GAP-RES-8)/(cols+13/3);k=Math.min(k,Math.floor(f));z=Math.min(z,Math.floor(f));}
  el.classList.toggle('compact',compact);$('cxMenu').textContent=compact?'⋯':'⋯ Game';
  el.style.setProperty('--k',k+'px');el.style.setProperty('--z',z+'px');el.style.setProperty('--mid',mid(z)+'px');el.style.setProperty('--rh',RH+'px');el.style.setProperty('--res',RES+'px');}
function renderCoach(){const g=game();if(!g)return;const sh=curSheet(),c=g.cur,hand=curHand(),cp=curPitcherId();
  document.body.classList.toggle('mirror',PREF.get('mirror','0')==='1');sizeCoach();
  // band
  $('cNoBand').classList.toggle('hide',!!sh);$('cBand').classList.toggle('hide',!sh);
  if(sh){const cols=sh.cols&&sh.cols.length?sh.cols:PC.sheetCols(Math.max(...sh.rows.map(r=>r.length)));
    $('cBand').innerHTML=`<thead><tr><th class="corner" aria-hidden="true"></th>${cols.map(x=>`<th scope="col">${H(x)}</th>`).join('')}</tr></thead><tbody>`+sh.rows.map((row,r)=>`<tr><th scope="row">${r+1}</th>${cols.map((_,ci)=>{const t=(row[ci]||'').trim();const on=D.cell&&D.cell.sheet===sh.id&&D.cell.r===r&&D.cell.c===ci;
      return `<td><button data-r="${r}" data-c="${ci}" class="${on?'on':''}" aria-pressed="${on}" aria-label="${H(PC.cellCode(sh,r,ci))} ${H(t||'empty')}" ${t?'':'disabled'}>${H(t)}</button></td>`;}).join('')}</tr>`).join('')+'</tbody>';}
  $('coach').classList.toggle('dim',!!(D.aimEdit||D.ip));
  // status
  const pit=S().pitchers.find(p=>p.id===cp);$('cxPitcher').textContent=pit?PC.pitcherLabel(pit):'Pick a pitcher';$('cxInn').textContent=inningTag(g);const cmp=$('coach').classList.contains('compact');$('cxOuts').textContent=cmp?'●'.repeat(c.outs)+'○'.repeat(Math.max(0,3-c.outs)):c.outs+(c.outs===1?' out':' outs');$('cxOuts').setAttribute('aria-label',c.outs+' out'+(c.outs===1?'':'s'));$('cxCount').textContent=c.b+'-'+c.s;
  const b=g.lineup[c.slot]||{};$('cxBat').innerHTML=cmp?`<b>${b.num?'#'+H(b.num):H(b.name||'Batter '+(c.slot+1))}</b> · ${hand==='L'?'LHB':'RHB'} · <span title="Pitches">⚾ ${PC.pitchCount(g.pitches,cp)}</span>`:`<span class="ic" aria-hidden="true">👤</span><b>${b.num?'#'+H(b.num)+' ':''}${H(b.name||'Batter '+(c.slot+1))}</b> · ${hand==='L'?'LHB':'RHB'} · <span title="Pitches">⚾ ${PC.pitchCount(g.pitches,cp)}</span>`;
  const code=callCode(),aims=aimSet();$('cxCode').innerHTML=D.shook?`⤺ ${H(D.shook.norm)} → ${H(D.type||'?')}`:D.parsed?`${H(code)}&nbsp; ${H(D.callTxt)}`:'<span class="cs-none">– –&nbsp; no call yet</span>';
  const own=D.parsed&&D.parsed.targets&&D.parsed.targets.length===1&&D.aim===+D.parsed.targets[0]; // pencil only for an override, not the call's own spot
  $('cxAim').textContent=D.shook?(D.aim?'aim '+D.aim+' ✎':''):D.parsed?(aims.length?'aim '+aims.join('/'):'no spot')+(D.aim&&!own?' ✎':''):'';
  renderHint();const n=store.pendingCount(),st=store.real.sync;$('cxNet').textContent=store.isTest?'Test mode – not saved':!navigator.onLine?`Offline – saved on phone${n?' · '+n+' to sync':''}`:(!st.teamCode?'Saved on phone':n?`Saved on phone · ${n} to sync`:'Saved · synced');
  // in play: spray field replaces the status details
  $('cSprayWrap').classList.toggle('hide',!D.ip);['cs-bat','cs-call','cs-hint','cs-foot'].forEach(k=>$('cStatus').querySelector('.'+k).classList.toggle('hide',!!D.ip));
  if(D.ip){$('cxIp').textContent=`IN PLAY · ${code?code+' ':''}${D.callTxt||''}${aims.length?' → '+aims.join('/'):''}${D.loc?' · landed '+D.loc:''} · spray optional`;const dot=$('cSprayDot');dot.classList.toggle('hide',!D.spray);if(D.spray){dot.setAttribute('cx',D.spray[0]*200);dot.setAttribute('cy',D.spray[1]*92);}}
  $('cAct').classList.toggle('hide',!!D.ip);$('cContact').classList.toggle('hide',!D.ip);
  document.querySelectorAll('#cContact [data-bb]').forEach(b=>b.classList.toggle('on',b.dataset.bb===D.bb));
  // zone
  const am=new Set(aims);$('cZone').innerHTML=Z5.map(row=>row.map(z=>{const isA=am.has(z),isL=D.loc===z;
    return `<button type="button" data-z="${z}" class="${z<10?'zi':'zr'}${isA?' aim':''}${isA&&D.aimEdit?' editing':''}${D.aimEdit&&!PC.validCalled(D.type,z)?' noaim':''}${isL?' act':''}" aria-label="Zone ${z}${isA?', aim':''}${isL?', landed':''}"><span>${z}</span>${isA?'<small>AIM</small>':''}</button>`;}).join('')).join('');
  $('cZone').classList.toggle('editing',!!D.aimEdit);
  // results (or in-play outcomes)
  const two=c.s===2;const ur=`<button data-cx="undo" aria-label="Undo last pitch">↶<small>Undo</small></button><button data-cx="redo" aria-label="Redo" ${redoStack.length?'':'disabled'}>↷<small>Redo</small></button>`;
  const ready=PC.scoreStep(pullDraft())==='result';
  if(viewOnly())$('cRes').innerHTML=`<div class="cro" role="status"><b>👁 Scoring on another phone</b><span>View only</span><button data-cx="take">Take over scoring</button></div>`;else if(D.shook&&!D.type)$('cRes').innerHTML=allTypes().map(t=>`<button data-ty="${H(t.code)}" aria-label="She threw ${H(t.name)}">${H(t.code)}</button>`).join('')+`<button data-cx="unshake" class="shkx">✕ Cancel</button>`;
  else $('cRes').innerHTML=(D.ip?IP_BTNS.map(([v,l])=>`<button data-ip="${v}" class="${/^(out|1B|2B|3B|HR)$/.test(v)?'b-ip':''}">${l}</button>`).join('')+'<button data-cx="back">← Back</button>':
    RES_BTNS.map(([v,l,k])=>`<button data-r="${v}" class="${k}${ready?'':' soft'}" ${ready?'':'disabled'}>${l}</button>`).join('')+`<button data-cx="aim" class="${D.aimEdit?'on':''}" aria-pressed="${!!D.aimEdit}" ${D.parsed||D.shook?'':'disabled'}>✎ Aim</button>`)+
    ur+(D.ip?'':`<button data-cx="same" aria-label="Same call as last pitch" ${lastCell?'':'disabled'}>⟳<small>Same</small></button>`+(D.shook?`<button data-cx="unshake" class="shkx" aria-label="Cancel shake-off">✕<small>Shake</small></button>`:`<button data-cx="shake" class="shk" aria-label="Shake-off: she shook off the call" ${D.parsed?'':'disabled'}>⤺<small>Shake-off</small></button>`));
  document.querySelectorAll('#cAct [data-z]').forEach(b=>b.classList.toggle('sel',+b.dataset.z===D.loc));
  // side retired card
  const sc=sideCard&&sideCard.gameId===g.id?sideCard:null;$('cSide').classList.toggle('hide',!sc);
  if(sc){const ps=g.pitches.filter(p=>p.inning===sc.inning&&!p.noPitch);const q=PC.summarize(ps);const k=ps.filter(p=>p.end==='K'||p.end==='K-D3').length,hits=ps.filter(p=>/^(1B|2B|3B|HR)$/.test(p.ip||'')).length;
    $('cSideSum').textContent=`${g.homeAway==='away'?'Bottom':g.homeAway==='home'?'Top':'Inning'} ${sc.inning}: ${ps.length} pitch${ps.length===1?'':'es'} · ${k} K · ${hits} H · ${fmt(q.strikePct)} strikes`;}
  $('cmKd3').disabled=$('cmKd3o').disabled=!two;$('cmTheme').textContent='Display: '+THEME_LABEL[PREF.get('theme','field')];$('cmMirror').textContent='Mirror sides: '+(PREF.get('mirror','0')==='1'?'on':'off');
  const und=PC.unmappedCells(sh||{rows:[]},S().customTypes);$('cmBand').textContent=`Band setup${und.length&&!PC.bandSetupDone(sh,S().customTypes)?` (${und.reduce((n,u)=>n+u.cells.length,0)} cells need an aim)`:''}`;$('cmBand').disabled=!sh||!und.length;}
// ---------- coach input ----------
$('cBand').addEventListener('click',e=>{if(viewOnly()){toast(PC.SCORING_ELSEWHERE);return;}const b=e.target.closest('button[data-r]');if(b&&!b.disabled){sideCard=null;cMsg=null;callCell(+b.dataset.r,+b.dataset.c);}});
let lpT=null,lpDone=false; // long-press (≥400 ms) on a zone cell sets the aim directly
const zoneBtn=e=>e.target.closest('#cZone button[data-z]');
$('cZone').addEventListener('pointerdown',e=>{if(viewOnly())return;const b=zoneBtn(e);if(!b)return;lpDone=false;clearTimeout(lpT);lpT=setTimeout(()=>{if(!pullDraft().type)return;lpDone=true;const r=PC.scoreApply(pullDraft(),{op:'called',z:+b.dataset.z});if(!r.ok){coachMsg(PC.aimRejectMsg(pullDraft().type,+b.dataset.z,$('coach').classList.contains('compact')?'tiny':'short'),'warn');return;}takeDraft(r);buzz(15);render();coachMsg('✎ Aim → '+b.dataset.z);},400);});
['pointerup','pointerleave','pointercancel'].forEach(t=>$('cZone').addEventListener(t,()=>clearTimeout(lpT)));
function coachZoneAct(z,aimEdit){const cmp=$('coach').classList.contains('compact');const draft=pullDraft();draft.aimEdit=!!aimEdit;const r=PC.scoreTap(draft,z);
  if(!r.ok){if(r.reason==='bad_target')coachMsg(PC.aimRejectMsg(draft.type,z,cmp?'tiny':'short'),'warn');else if(r.reason==='need_type')coachMsg(cmp?'Threw?':'Pick the pitch first','warn');else if(r.reason==='need_called')coachMsg(cmp?'Aim?':'Tap the aim first','warn');return;}
  takeDraft(r);
  if(r.op==='called'){render();coachMsg('✎ Aim → '+z);return;}
  if(typeof clearFoulChips==='function')clearFoulChips();if(r.draft.actual==null)D.sheet=false;render();}
$('cZone').addEventListener('click',e=>{if(viewOnly()){toast(PC.SCORING_ELSEWHERE);return;}const b=zoneBtn(e);if(!b)return;if(lpDone){lpDone=false;return;}sideCard=null;coachZoneAct(+b.dataset.z,D.aimEdit);});
$('cRes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;sideCard=null;
  if(b.dataset.r){if(PC.scoreStep(pullDraft())!=='result'){coachMsg($('coach').classList.contains('compact')?'Where?':'Tap where it went first','warn');return;}if(b.dataset.r==='inplay'){D.ip=true;render();return;}recordGame(b.dataset.r);return;}
  if(b.dataset.ip){recordGame('inplay',b.dataset.ip);return;}
  if(b.dataset.ty){takeDraft(PC.scoreApply(pullDraft(),{op:'call',type:b.dataset.ty,called:[]}));D.sheet=false;render();return;}
  const x=b.dataset.cx;if(x==='shake')return shakeOff();if(x==='unshake')return cancelShake();if(x==='take')return openTakeover();if(x==='back'){D.ip=false;D.spray=null;render();}else if(x==='aim'){D.aimEdit=!D.aimEdit;render();}else if(x==='undo')undoLast();else if(x==='redo')redoLast();else if(x==='same'&&lastCell)callCell(lastCell.r,lastCell.c);});
$('cAct').addEventListener('click',e=>{if(viewOnly()){toast(PC.SCORING_ELSEWHERE);return;}const b=e.target.closest('[data-z]');if(!b)return;sideCard=null;coachZoneAct(+b.dataset.z,false);});
$('cContact').addEventListener('click',e=>{const b=e.target.closest('[data-bb]');if(!b)return;D.bb=D.bb===b.dataset.bb?null:b.dataset.bb;render();});
$('cSpray').addEventListener('click',e=>{const r=$('cSpray').getBoundingClientRect();D.spray=[+((e.clientX-r.left)/r.width).toFixed(3),+((e.clientY-r.top)/r.height).toFixed(3)];renderCoach();});
$('cSideUndo').onclick=()=>{sideCard=null;undoLast();};$('cSidePause').onclick=()=>{sideCard=null;pauseGame();};$('cSideOk').onclick=()=>{sideCard=null;render();};
// game menu (⋯): the rarely used controls live here, off the charting screen
$('cxMenu').onclick=()=>{applyViewOnly(viewOnly());openSheet($('cMenuDlg'));};
const menuDo=f=>()=>{$('cMenuDlg').close('ok');f();};
$('cmOutM').onclick=menuDo(()=>$('outMinus').click());$('cmOutP').onclick=menuDo(()=>$('outPlus').click());$('cmInn').onclick=menuDo(()=>$('innPlus').click());$('cmIbb').onclick=menuDo(()=>$('ibb').click());
$('cmKd3').onclick=menuDo(()=>recordGame('kd3'));$('cmKd3o').onclick=menuDo(()=>recordGame('kd3out'));$('cmPause').onclick=menuDo(pauseGame);$('cmEnd').onclick=menuDo(endGame);
let xFlag=null;
$('cmXtra').onclick=()=>{const d=$('xDlg');d.returnValue='';xFlag=PC.cleanFlag(D.wpPb);$('xWp').classList.toggle('sel',xFlag==='wp');$('xPb').classList.toggle('sel',xFlag==='pb');$('xVelo').value=D.velo==null?'':D.velo;openSheet(d);};
$('xWp').onclick=()=>{xFlag='wp';$('xWp').classList.add('sel');$('xPb').classList.remove('sel');};
$('xPb').onclick=()=>{xFlag='pb';$('xPb').classList.add('sel');$('xWp').classList.remove('sel');};
$('xClr').onclick=()=>{xFlag=null;$('xWp').classList.remove('sel');$('xPb').classList.remove('sel');};
$('xDlg').addEventListener('close',()=>{if($('xDlg').returnValue!=='ok')return;D.wpPb=xFlag;D.velo=noteVelo($('xVelo').value);render();});
$('cmTake').onclick=menuDo(()=>openTakeover());$('cmBand').onclick=menuDo(()=>openBandSetup());
$('cmTheme').onclick=()=>{const t=PREF.get('theme','field');PREF.set('theme',THEMES[(THEMES.indexOf(t)+1)%THEMES.length]);applyTheme();render();};
$('cmMirror').onclick=()=>{PREF.set('mirror',PREF.get('mirror','0')==='1'?'0':'1');render();};
// ---------- band setup: pick an aim once for the cells whose text has a pitch type but no spot ----------
let bandSheetId=null;
function openBandSetup(id){const sh=id?sheets().find(x=>x.id===id):curSheet();bandSheetId=sh&&sh.id;if(!sh)return toast('Add a call sheet first');const u=PC.unmappedCells(sh,S().customTypes);const total=sh.rows.reduce((n,r)=>n+r.filter(t=>String(t||'').trim()).length,0);
  $('bandT').textContent='Band setup · '+sh.name;$('bandSub').textContent=u.length?`${total-u.reduce((n,x)=>n+x.cells.length,0)} of ${total} cells already map from the call text. These have a pitch type but no spot – pick an aim once (same text shares one choice). Saved on this phone.`:'Every cell already maps to a spot.';
  // a saved aim this pitch type can't use (e.g. an old high change-up aim) is flagged on its row, never dropped silently
  const was=x=>{const v=sh.aims&&x.norm in sh.aims?+sh.aims[x.norm]:null;return v>0&&!PC.validCalled(x.type,v)?v:null;};const nBad=u.filter(was).length;
  if(nBad)$('bandSub').textContent+=` ${nBad} change-up aim${nBad===1?' needs':'s need'} a new low box.`;
  $('bandList').innerHTML=u.map(x=>{const old=was(x);const v=sh.aims&&x.norm in sh.aims&&!old?+sh.aims[x.norm]:'';return `<div class="bandrow${old?' bandbad':''}"><div class="bandcells"><b>${x.cells.map(H).join(', ')}</b> <span class="tag">${H(x.text)}</span>${x.type==='CH'?`<div class="mut bandnote">${H(PC.CH_BAND_NOTE)}</div>`:''}${old?`<div class="bandwas">Was zone ${old} – change-ups can't aim high. Pick a low box.</div>`:''}</div>
    <label class="bandsel">Aim <select data-norm="${H(x.norm)}" aria-label="Aim for ${H(x.text)}"><option value="" ${v===''?'selected':''}>Pick…</option><option value="0" ${v===0?'selected':''}>No spot</option>${PC.aimOpts(x.type).map(z=>`<option value="${z}" ${v===z?'selected':''}>Zone ${z}</option>`).join('')}</select></label></div>`;}).join('');
  openSheet($('bandDlg'));}
$('bandDlg').addEventListener('close',()=>{if($('bandDlg').returnValue!=='ok')return;const sh=sheets().find(x=>x.id===bandSheetId);if(!sh)return;sh.aims=Object.assign({},sh.aims);
  $('bandList').querySelectorAll('select').forEach(s=>{if(s.value!=='')sh.aims[s.dataset.norm]=+s.value;});dirty('call_sheets',sh.id);save();render();toast('Band saved');});
// ---------- portrait rotate prompt ----------
$('rotOk').onclick=()=>{PREF.set('portrait_ok','1');render();};
// ---------- bullpen bottom pad: pitch chips, way off, Undo / Pause / End within thumb reach ----------
$('pUndo').onclick=()=>undoLast();$('pRedo').onclick=()=>redoLast();$('pPause').onclick=()=>$('bpPause').click();$('pEnd').onclick=()=>$('bpEnd').click();
function placeBullpenPad(on){const pad=$('bpPad');pad.classList.toggle('hide',!on);document.body.classList.toggle('padmode',on);
  const mv=(el,home)=>{if(el.parentNode!==home)home.appendChild(el);};
  if(on){mv($('types'),$('padTypes'));mv($('wayBtns'),$('padWay'));mv($('actBtns'),$('padAct'));}else{const eb=document.querySelector('.entrybar');if($('types').parentNode!==eb){const sb=$('shakeBar');if(sb&&sb.parentNode===eb)sb.after($('types'));else eb.prepend($('types'));}const row=$('locRow');if($('wayBtns').parentNode!==row)row.appendChild($('wayBtns'));if($('actBtns').parentNode!==row)row.appendChild($('actBtns'));}}
// called from render(): decides which charting screen shows
function renderModes(lk,showEntry){const cg=coachGame(lk);const coach=cg&&LANDSCAPE.matches,gate=cg&&PORTRAIT.matches&&PREF.get('portrait_ok','0')!=='1';
  document.body.classList.toggle('coachmode',coach);$('coach').classList.toggle('hide',!coach);$('rotate').classList.toggle('hide',!gate);
  placeBullpenPad(!!showEntry&&tab==='bullpen');if(coach)renderCoach();if(tab==='setup')renderDisplayPrefs();}
addEventListener('online',()=>render());addEventListener('offline',()=>render());
addEventListener('resize',()=>{if(document.body.classList.contains('coachmode'))sizeCoach();if(typeof paintFoulChips==='function')paintFoulChips();});
// Setup: display prefs + band setup for the sheet being edited
$('thSel').onchange=e=>{PREF.set('theme',e.target.value);applyTheme();render();};$('mirrorChk').onchange=e=>{PREF.set('mirror',e.target.checked?'1':'0');render();};
$('csBand').onclick=()=>openBandSetup(typeof csCur==='function'&&csCur()?csCur().id:null);
document.querySelectorAll('.thseg [data-th]').forEach(b=>b.onclick=()=>{PREF.set('theme',b.dataset.th);applyTheme();render();});
function renderDisplayPrefs(){const th=PREF.get('theme','field');document.querySelectorAll('.thseg [data-th]').forEach(b=>{b.classList.toggle('on',b.dataset.th===th);b.setAttribute('aria-pressed',b.dataset.th===th);});$('thSel').value=th;$('mirrorChk').checked=PREF.get('mirror','0')==='1';}
