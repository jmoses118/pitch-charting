/* Thunder Elite pitch charting – UI setup.js: Setup view: call-sheet editor, pitchers, roster, export/import, access codes.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
// setup editor
let csId=null;const csCur=()=>sheets().find(x=>x.id===csId)||sheets()[0]||null;
function csDirty(sh){dirty('call_sheets',sh.id);save();}
function renderCS(){const show=role()==='coach';$('csCard').classList.toggle('hide',!show);if(!show)return;const sh=csCur();
  $('csSel').innerHTML=sheetOptions(sh);
  if(!sh){$('csTbl').innerHTML='';$('csName').value='';return;}csId=sh.id;if(document.activeElement!==$('csName'))$('csName').value=sh.name;
  $('csPitcher').innerHTML='<option value="">Any pitcher</option>'+S().pitchers.map(p=>`<option value="${H(p.id)}" ${sh.pitcherId===p.id?'selected':''}>${H(PC.pitcherLabel(p))}</option>`).join('');
  if($('csTbl').contains(document.activeElement))return;
  $('csTbl').innerHTML=sheetTable(sh,(c,i)=>`<th><input data-col="${i}" value="${H(c)}" maxlength="4"></th>`,(row,r,c)=>`<td><input data-r="${r}" data-c="${c}" value="${H(row[c]||'')}" maxlength="16" autocapitalize="characters"></td>`);}
$('csTbl').addEventListener('change',e=>{const sh=csCur();const i=e.target;if(!sh)return;if(i.dataset.col!=null)sh.cols[+i.dataset.col]=i.value.trim().slice(0,4);else{sh.rows[+i.dataset.r][+i.dataset.c]=i.value.trim().slice(0,16);}
  const ok=!i.value.trim()||i.dataset.col!=null||PC.parseCall(i.value,'R','R',S().customTypes);i.style.color=ok?'':'var(--red)';if(!ok)toast(`"${i.value}" isn't a code I know`);csDirty(sh);});
$('csSel').onchange=e=>{csId=e.target.value;renderCS();};
$('csName').onchange=e=>{const sh=csCur();if(!sh)return;sh.name=e.target.value.trim().slice(0,80)||'Sheet';csDirty(sh);render();};
$('csPitcher').onchange=e=>{const sh=csCur();if(!sh)return;sh.pitcherId=e.target.value||null;csDirty(sh);};
$('csNew').onclick=()=>{const n=sheets().length+1;const sh={id:'cs_'+Date.now().toString(36),name:'Wristband '+n,pitcherId:null,cols:PC.sheetCols(8),rows:Array.from({length:7},()=>Array(8).fill(''))};S().callSheets=S().callSheets||[];S().callSheets.push(sh);csId=sh.id;csDirty(sh);render();};
$('csDel').onclick=async()=>{const sh=csCur();if(!sh||!await ask(`Delete "${sh.name}"?`,true))return;sh.deleted=true;csId=null;if(S().activeSheet===sh.id)S().activeSheet=null;csDirty(sh);render();};
const csEdit=f=>()=>{const sh=csCur();if(!sh)return;f(sh);$('csTbl').innerHTML='';csDirty(sh);render();};
$('csAddR').onclick=csEdit(sh=>sh.rows.push(Array(sh.cols.length).fill('')));
$('csDelR').onclick=csEdit(sh=>{if(sh.rows.length>1)sh.rows.pop();});
$('csAddC').onclick=csEdit(sh=>{if(sh.cols.length<12){sh.cols.push(String(sh.cols.length+1).padStart(2,'0'));sh.rows.forEach(r=>r.push(''));}});
$('csDelC').onclick=csEdit(sh=>{if(sh.cols.length>1){sh.cols.pop();sh.rows.forEach(r=>r.length=sh.cols.length);}});
$('oneHand').onchange=e=>{S().oneHand=e.target.checked;save();render();};
// ---------- pitchers ----------
let pdEdit=null;
function openPDlg(p){pdEdit=p?p.id:null;$('pDlgT').textContent=p?'Edit pitcher':'Add pitcher';$('pdName').value=p?p.name:'';$('pdNum').value=p?p.num:'';$('pdNum').removeAttribute('aria-invalid');$('pdThrows').value=p?p.throws:'';openSheet($('pDlg'));}
function reopenPDlg(msg){$('pdNum').setAttribute('aria-invalid','true');toast(msg);setTimeout(()=>{openSheet($('pDlg'));},0);}
$('pDlg').addEventListener('close',()=>{if($('pDlg').returnValue!=='ok')return;const o={name:$('pdName').value,num:$('pdNum').value,throws:$('pdThrows').value};if(o.throws!=='L'&&o.throws!=='R'){toast('Pick which hand she throws with');setTimeout(()=>{openSheet($('pDlg'));},0);return;}
  if(!o.name.trim())return toast('Name required');
  const err=PC.jerseyError(S().pitchers,o.num,pdEdit);if(err)return reopenPDlg(err);
  o.num=PC.jerseyNum(o.num).num;$('pdNum').removeAttribute('aria-invalid');
  if(pdEdit)store.editPitcher(pdEdit,o);else{const p=store.addPitcher(o);S().curPitcher=p.id;save();toast('Added '+PC.pitcherLabel(p)+(store.isTest?' (test only)':''));}
  reparseCall();render();});
$('addP').onclick=()=>{if(role()==='coach')openPDlg();};$('addPQuick').onclick=()=>{if(role()==='coach')openPDlg();};
$('jerseyEdit').onclick=()=>{if(role()!=='coach')return;const p=pById(curPitcherId());if(p)openPDlg(p);};
function renderPitchers(){const row=p=>`<div class="prow"><span style="flex:1"><b>${H(PC.pitcherLabel(p))}</b> <span class="tag">${H(p.throws)}HP</span>${p.note?' <span class="tag">'+H(p.note)+'</span>':''}</span><button data-e="${H(p.id)}" aria-label="Edit ${H(PC.pitcherLabel(p))}">Edit</button><button data-a="${H(p.id)}">${p.archived?'Restore':'Archive'}</button></div>`;
  $('pList').innerHTML=S().pitchers.filter(p=>!p.archived).map(row).join('')||'<div class="mut">No active pitchers</div>';
  $('pArch').innerHTML=S().pitchers.filter(p=>p.archived).map(row).join('')||'<div class="mut">None</div>';}
document.addEventListener('click',e=>{const t=e.target;if(t.dataset.e){openPDlg(pById(t.dataset.e));}else if(t.dataset.a){const p=pById(t.dataset.a);store.archivePitcher(p.id,!p.archived);render();}});
// roster
function renderRoster(){$('roster').innerHTML=S().roster.map((r,i)=>`<div class="prow"><input data-ri="${i}" data-f="name" value="${H(r.name)}"><input data-ri="${i}" data-f="num" value="${H(r.num)}" placeholder="#" style="width:56px;flex:none" inputmode="numeric"><button data-rd="${i}">✕</button></div>`).join('');}
$('roster').addEventListener('change',e=>{const{ri,f}=e.target.dataset;if(ri!=null){S().roster[ri][f]=e.target.value;save();}});
$('roster').addEventListener('click',async e=>{const i=e.target.dataset.rd;if(i!=null&&await ask('Remove '+S().roster[i].name+'?',true)){S().roster.splice(i,1);save();render();}});
$('addR').onclick=()=>{const n=prompt('Player name');if(n){S().roster.push({name:n.trim(),num:''});save();render();}};
$('ctAdd').onclick=()=>{const c=$('ctCode').value.trim().toUpperCase().replace(/\s+/g,''),n=$('ctName').value.trim();if(!c)return;if(allTypes().some(t=>t.code===c))return toast('Code exists');S().customTypes.push({code:c,name:n||c});$('ctCode').value='';$('ctName').value='';save();render();};
$('cTypes').addEventListener('click',e=>{const i=e.target.dataset.ct;if(i!=null){S().customTypes.splice(i,1);save();render();}});
// ---------- export / import ----------
function rowsFor(scope){const s=S();if(s.isTest)return[];const rows=[];
  const pmeta=id=>pById(id)||{};
  const gs=scope==='all'||scope==='games'?s.games:(scope.startsWith('g_')?s.games.filter(g=>g.id===scope):[]);
  gs.forEach(g=>{const pc={};let n=0;g.pitches.forEach(p=>{const pm=pmeta(p.pitcherId);if(!p.noPitch){n++;pc[p.pitcherId]=(pc[p.pitcherId]||0)+1;}
    rows.push(PC.csvRow(p,{mode:'game',game_id:g.id,date:g.date,opponent:g.opponent,event:g.event,home_away:g.homeAway,pitcher:pm,pitch_no:p.noPitch?'':n,pitcher_pitch_no:p.noPitch?'':pc[p.pitcherId]}));});});
  const ss=scope==='all'||scope==='bullpen'?s.sessions:(scope.startsWith('s_')?s.sessions.filter(x=>x.id===scope):[]);
  ss.forEach(x=>{x.pitches.forEach((p,i)=>{const pm=pmeta(p.pitcherId);rows.push(PC.csvRow(p,{mode:'bullpen',session:x.id,date:x.date,pitcher:pm,pitch_no:i+1}));});});
  return rows;}
function download(name,text,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);}
const noTest=()=>{if(store.isTest){toast('Test mode: nothing to export');return true;}return false;};
$('expJSON').onclick=()=>{if(noTest())return;download('thunder-pitch-backup-'+today()+'.json',JSON.stringify(S(),null,1),'application/json');};
$('expCSV').onclick=()=>{if(noTest())return;download('thunder-pitches-all.csv',PC.toCSV(rowsFor('all')),'text/csv');};
$('sCSV').onclick=()=>{if(noTest())return;const sc=$('sScope').value;let rows=rowsFor(sc);const pf=$('sPitcher').value;if(pf){const n=pById(pf).name;rows=rows.filter(r=>r.pitcher===n);}
  const g=S().games.find(x=>x.id===sc);download(g?PC.csvGameFile(g):PC.csvScopeFile(sc),PC.toCSV(rows),'text/csv');};
$('csvPD').onclick=()=>{if(noTest())return;const pf=$('sPitcher').value,date=$('csvDate').value;if(!pf||!date)return toast('Pick a pitcher and a date');const p=pById(pf);if(!p)return;const rows=PC.filterPitcherDate(rowsFor('all'),{pitcher:p.name,num:p.num||'',date});
  download(PC.csvPitcherFile(p,date),PC.toCSV(rows),'text/csv');toast(rows.length?`${rows.length} pitches`:'No pitches that day');};
let impKind=null;$('impJSON').onclick=()=>{if(store.isTest)return toast('Exit test mode to import');impKind='json';$('file').click();};$('impCSV').onclick=()=>{if(store.isTest)return toast('Exit test mode to import');impKind='csv';$('file').click();};
$('file').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;const txt=await f.text();
  try{if(impKind==='json'){const o=JSON.parse(txt);if(!o.pitchers||!o.games)throw new Error('Not a backup file');if(!await ask('Replace ALL current data with this backup?',true))return;store.replace(o);if(typeof loadRedo==='function')loadRedo();toast('Backup restored');}
  else{if(!store.real.sync)return;const imp=importCSV(txt);toast(`Imported ${imp.n} pitch${imp.n===1?'':'es'}`+(imp.flagged?` · ${imp.flagged} flagged`:''));}}catch(err){alert('Import failed: '+err.message);}render();};
function importCSV(txt){const rows=PC.parseCSV(txt),s=S();let n=0,flagged=0;const pid=(name,num,th)=>{let p=s.pitchers.find(x=>x.name===name);if(!p&&name)p=store.addPitcher({name,num,throws:th});return p?p.id:null;};
  const has=new Set(s.games.map(g=>g.id).concat(s.sessions.map(x=>x.id)));
  rows.forEach(r=>{const spots=PC.importSpots(r);const base=PC.csvApply({id:PC.uuid(),ts:Date.parse(r.ts)||Date.now(),pitcherId:pid(r.pitcher,r.pitcher_num,r.throws),hand:r.bats||'R',type:r.type||null,call:r.call||null,targets:spots.targets,loc:spots.loc,calledLoc:spots.calledLoc,actualLoc:spots.actualLoc,foulTime:r.foul_time||null,wpPb:r.wp_pb||null,velo:r.velocity?+r.velocity:null,mode:r.mode==='bullpen'?'bullpen':'game',...(spots.calledFlag?{calledFlag:true}:{})},r);const keep=()=>{if(spots.calledFlag)flagged++;n++;};
    if(r.mode==='game'){if(has.has(r.game_id)&&!s.games.find(g=>g.id===r.game_id&&g.imported))return;let g=s.games.find(x=>x.id===r.game_id);
      if(!g){g={id:r.game_id||('g_'+PC.uid()),date:r.date,opponent:r.opponent,event:r.event,homeAway:r.home_away,lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0},imported:true,ended:Date.now()};s.games.push(g);}
      const slot=(+r.lineup_slot||1)-1;if(!g.lineup[slot])g.lineup[slot]={slot:slot+1,name:r.batter,num:r.batter_num,hand:r.bats};
      g.pitches.push(Object.assign(base,{inning:+r.inning,outsBefore:+r.outs_before,slot,batter:r.batter,batterNum:r.batter_num,b:+r.balls_before,s:+r.strikes_before,result:r.result==='ibb'?'ibb':r.result,noPitch:r.result==='ibb',ip:r.in_play||null,end:r.ab_end||null,firstPitch:+r.balls_before===0&&+r.strikes_before===0}));keep();}
    else{if(has.has(r.session)&&!s.sessions.find(x=>x.id===r.session&&x.imported))return;let x=s.sessions.find(q=>q.id===r.session);if(!x){x={id:r.session||('s_'+PC.uid()),date:r.date,pitches:[],imported:true};s.sessions.push(x);}x.pitches.push(base);keep();}});
  store.markAllDirty();save();return{n,flagged};}
// coach: manage access codes
async function renderCodes(){if(!sync||role()!=='coach'||store.isTest||!store.real.sync.teamCode){$('codesCard').classList.add('hide');return;}$('codesCard').classList.remove('hide');
  $('ncPitcher').innerHTML=store.real.pitchers.filter(p=>!p.archived).map(p=>`<option value="${H(p.id)}">${H(PC.pitcherLabel(p))}</option>`).join('');
  $('ncPcList').innerHTML=store.real.pitchers.filter(p=>!p.archived).map(p=>`<label class="row" style="gap:4px"><input type="checkbox" value="${H(p.id)}" style="width:44px;min-height:44px">${H(PC.pitcherLabel(p))}</label>`).join('');
  try{const L=await sync.rpc('coach_list_codes');$('codesList').innerHTML=L.map(c=>`<div class="prow"><span style="flex:1"><b>${H(c.label||c.pitcher_id||'')}</b> <span class="tag">${H(c.role==='pcoach'?'pitching coach':c.role)}</span>${c.role==='pcoach'?` <span class="mut">${H((c.pitcher_ids||[]).map(pName).join(', '))}</span>`:''}${c.revoked_at?' <span class="tag">revoked</span>':''}<br><small style="user-select:all;-webkit-user-select:all">${H(c.code)}</small></span>${c.revoked_at?'':`<button data-revoke="${H(c.code)}">Revoke</button>`}</div>`).join('')||'<div class="mut">No access codes yet</div>';}
  catch(e){$('codesList').innerHTML='<div class="mut">Go online to manage codes.</div>';}}
$('codesCard').addEventListener('click',async e=>{const t=e.target;try{
  if(t.dataset.revoke){if(!await ask('Revoke this code? Anyone using it loses access right away.',true))return;await sync.rpc('coach_revoke_code',{p_code:t.dataset.revoke});toast('Code revoked');}
  else if(t.id==='ncPlayer'){const id=$('ncPitcher').value;const p=pById(id);await doSync(false);const c=await sync.rpc('coach_create_code',{p_role:'player',p_pitcher_id:id,p_label:p?PC.pitcherLabel(p):id});toast('New code for '+(p?p.name:id));prompt('Player code (copy it):',c);}
  else if(t.id==='ncPcoach'){const ids=[...document.querySelectorAll('#ncPcList input:checked')].map(i=>i.value);if(!ids.length)return toast('Pick at least one pitcher');await doSync(false);const c=await sync.rpc('coach_create_code',{p_role:'pcoach',p_pitcher_ids:ids,p_label:$('ncPcName').value.trim()||'Pitching coach'});$('ncPcName').value='';prompt('Pitching-coach code (copy it):',c);}
  else if(t.id==='ncViewer'){const c=await sync.rpc('coach_create_code',{p_role:'viewer',p_label:'View-only'});prompt('View-only code (copy it):',c);}
  else return;renderCodes();}catch(err){alert('Failed: '+err.message);}});

// ---------- Setup → Sync problems: rows the server refused (view, retry or discard; nothing changes until Apply) ----------
const REJ_KIND={pitches:'Pitch',games:'Game',sessions:'Bullpen session',pitchers:'Pitcher',call_sheets:'Call sheet',notes:'Note',team_settings:'Team settings'};
function rejWhat(r){const s=store.real;if(r.table==='pitches'){let hit=null;s.games.forEach(g=>g.pitches.forEach(p=>{if(p.id===r.id)hit={p,where:`${g.date||''} vs ${g.opponent||'?'}`};}));s.sessions.forEach(x=>x.pitches.forEach(p=>{if(p.id===r.id)hit={p,where:`bullpen ${x.date||''}`};}));
    if(hit){const pit=s.pitchers.find(q=>q.id===hit.p.pitcherId);return `${pit?PC.pitcherLabel(pit):'Pitcher (not on this phone)'} · ${hit.p.type||'pitch'}${hit.p.loc?' → '+hit.p.loc:''} · ${hit.where}`;}return 'deleted pitch';}
  if(r.table==='games'){const g=s.games.find(x=>x.id===r.id);return g?`${g.date||''} vs ${g.opponent||'?'}`:'';}
  if(r.table==='sessions'){const x=s.sessions.find(y=>y.id===r.id);return x?`${x.date||''} · ${x.pitches.length} pitch${x.pitches.length===1?'':'es'}`:'';}
  if(r.table==='pitchers'){return PC.pitcherLabel(s.pitchers.find(p=>p.id===r.id));}return '';}
const rejWhen=t=>{const d=new Date(t);return d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+', '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});};
// toast with an Undo button (about 6 s); used after discarding sync problems
function undoToast(text,undo,ms){let e=$('undoToast');if(!e){e=document.createElement('div');e.id='undoToast';e.setAttribute('role','status');document.body.appendChild(e);}
  e.innerHTML=`<span>${H(text)}</span><button type="button">Undo</button>`;e.classList.add('on');clearTimeout(undoToast.t);const hide=()=>e.classList.remove('on');
  e.querySelector('button').onclick=()=>{clearTimeout(undoToast.t);hide();undo();};undoToast.t=setTimeout(hide,ms||6000);}
function renderRejBtn(){const b=$('rejBtn');if(!b)return;const n=store.isTest?0:PC.rejectedList(store.real).length;b.classList.toggle('hide',!n);b.textContent=`⚠ Sync problems (${n}) – view`;}
function openRejected(){const L=PC.rejectedList(store.real);
  $('rejList').innerHTML=L.length?L.map(r=>`<div class="rejrow" data-key="${H(r.key)}"><div><b>${H(REJ_KIND[r.table]||r.table)}</b> <span class="mut">${H(rejWhat(r))}</span></div>
    <div class="rejwhy">Why: ${H(PC.syncWhy(r))} · ${H(rejWhen(r.at))}</div>
    <details class="rejdet"><summary>Details</summary><div class="mut rejerr">${H(String(r.status))}${r.error?' · '+H(r.error.slice(0,160)):''}</div></details>
    <div class="seg rejseg" role="radiogroup" aria-label="What to do with this change">${[['keep','Keep'],['retry','Retry'],['discard','Discard']].map(([v,l])=>`<button type="button" role="radio" data-act="${v}" aria-checked="${v==='keep'}" class="${v==='keep'?'on':''}">${l}</button>`).join('')}</div></div>`).join('')
    +`<button type="button" id="rejAllRetry" class="ghost" style="width:100%">Retry all</button>`:'<div class="mut">No sync problems.</div>';
  openSheet($('rejDlg'));}
$('rejBtn').onclick=openRejected;
$('rejList').addEventListener('click',e=>{if(e.target.id==='rejAllRetry'){$('rejList').querySelectorAll('.rejrow').forEach(row=>setRejAct(row,'retry'));return;}const b=e.target.closest('[data-act]');if(b)setRejAct(b.closest('.rejrow'),b.dataset.act);});
function setRejAct(row,act){row.dataset.act=act;row.querySelectorAll('[data-act]').forEach(x=>{const on=x.dataset.act===act;x.classList.toggle('on',on);x.setAttribute('aria-checked',on);});}
$('rejDlg').addEventListener('close',()=>{if($('rejDlg').returnValue!=='ok')return;let re=0;const gone={};
  $('rejList').querySelectorAll('.rejrow').forEach(row=>{const k=row.dataset.key,a=row.dataset.act;if(a==='retry'&&PC.retryRejected(store.real,k))re++;if(a==='discard'){const r=store.real.sync.rejected[k];if(PC.discardRejected(store.real,k))gone[k]=r;}});
  const dc=Object.keys(gone).length;store.save();render();
  if(dc)undoToast(`${dc} change${dc===1?'':'s'} discarded${re?` · ${re} to retry`:''}`,()=>{Object.assign(store.real.sync.rejected=store.real.sync.rejected||{},gone);store.save();render();toast('Discard undone');});else if(re)toast(`${re} to retry`);
  if(re)doSync(true);});
