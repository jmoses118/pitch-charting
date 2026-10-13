/* Thunder Elite pitch charting – UI */
(function(){'use strict';
const $=id=>document.getElementById(id);
const H=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let storage=null;try{storage=window.localStorage;storage.setItem('__t','1');storage.removeItem('__t');}catch(e){storage=null;}
const store=PC.makeStore(storage);
const S=()=>store.state;
const save=()=>{if(!store.save()&&!store.isTest&&!store.saveOk)toast('Not saving: storage blocked. Open in Safari (not private).');};
let tab='game';
const D={type:null,callTxt:'',parsed:null,target:null,loc:null,ip:false}; // current pitch draft
let callOn=false,bpHand='R';
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),1300);}
// ---------- helpers ----------
const allTypes=()=>PC.BASE_TYPES.concat(S().customTypes.map(c=>({code:c.code.toUpperCase(),name:c.name})));
const pById=id=>S().pitchers.find(p=>p.id===id);
const pName=id=>{const p=pById(id);return p?(p.name+(p.num?' #'+p.num:'')):'?';};
const game=()=>S().games.find(g=>g.id===S().activeGame)||null;
const session=()=>S().sessions.find(s=>s.id===S().activeSession)||null;
function curPitcherId(){const s=S();if(!s.curPitcher||!pById(s.curPitcher)||pById(s.curPitcher).archived){const a=store.activePitchers()[0];s.curPitcher=a?a.id:null;}return s.curPitcher;}
function curHand(){if(tab==='game'){const g=game();if(g){const b=g.lineup[g.cur.slot];return(g.cur.hand||(b&&b.hand)||'R');}}return bpHand;}
function throwsOf(){const p=pById(curPitcherId());return p?p.throws:'R';}
function resetDraft(){Object.assign(D,{type:null,callTxt:'',parsed:null,target:null,loc:null,ip:false});$('callTxt').value='';}
// ---------- zone ----------
const ZX0=20,ZY0=24,CW=20,CHh=24;
const QUAD={11:'M0 0H50V24H20V60H0Z',12:'M50 0H100V60H80V24H50Z',13:'M0 60H20V96H50V120H0Z',14:'M100 60V120H50V96H80V60Z'};
const QLBL={11:[10,12],12:[90,12],13:[10,108],14:[90,108]};
function zoneOf(x,y){if(x>=ZX0&&x<=80&&y>=ZY0&&y<=96){const c=Math.min(2,Math.floor((x-ZX0)/CW)),r=Math.min(2,Math.floor((y-ZY0)/CHh));return r*3+c+1;}
  if(x<-14||x>114||y<-6||y>132)return null;return x<50?(y<60?11:13):(y<60?12:14);}
const center=z=>z<10?[ZX0+((z-1)%3+.5)*CW,ZY0+(((z-1)/3|0)+.5)*CHh]:QLBL[z];
function zoneSVG(svg,hand,o={}){let h='';
  for(const q in QUAD)h+=`<path data-z="${q}" class="zb" d="${QUAD[q]}" stroke="#0d1117" stroke-width=".8"/>`;
  for(let i=0;i<9;i++)h+=`<rect data-z="${i+1}" class="zs" x="${ZX0+(i%3)*CW}" y="${ZY0+((i/3)|0)*CHh}" width="${CW}" height="${CHh}" stroke="#0d1117" stroke-width=".8"/>`;
  h+='<path d="M20 24H80V96H20Z" fill="none" stroke="#e6edf3" stroke-width="1"/>';
  const lab=o.labels||{};
  for(const q in QLBL)h+=`<text class="zl" x="${QLBL[q][0]}" y="${QLBL[q][1]-(lab[q]?3:0)}">${q}</text>${lab[q]?`<text class="zl" style="font-size:5px;fill:#f5c518" x="${QLBL[q][0]}" y="${QLBL[q][1]+4}">${lab[q]}</text>`:''}`;
  for(let i=1;i<=9;i++){const[c,r]=center(i);h+=`<text class="zl" x="${c}" y="${r-(lab[i]?3:0)}">${i}</text>${lab[i]?`<text class="zl" style="font-size:5px;fill:#f5c518" x="${c}" y="${r+5}">${lab[i]}</text>`:''}`;}
  // side labels by handedness (RHB stands on pitcher's right)
  const inRight=PC.insideCol(hand)===2;
  h+=`<text class="side" transform="translate(-8 60) rotate(-90)">${inRight?'AWAY':'IN'}</text><text class="side" transform="translate(108 60) rotate(90)">${inRight?'IN':'AWAY'}</text>`;
  h+=`<text class="side" style="fill:#f5c518;font-size:5.5px" x="${inRight?88:12}" y="128">${hand==='L'?'LHB':'RHB'} ${inRight?'▶':'◀'}</text><text class="side" x="${inRight?12:88}" y="128" style="opacity:.5">${inRight?'LHB side':'RHB side'}</text>`;
  svg.innerHTML=h+(o.extra||'');}
function drawZone(){const hand=curHand();let ex='';const tset=D.parsed&&D.parsed.targets.length?D.parsed.targets:(D.target?[D.target]:[]);
  const lab={};tset.forEach(z=>lab[z]='TARGET');
  zoneSVG($('zone'),hand,{labels:lab});
  tset.forEach(z=>{const e=$('zone').querySelector(`[data-z="${z}"]`);e&&e.classList.add('zt');});
  if(D.loc){const e=$('zone').querySelector(`[data-z="${D.loc}"]`);e&&e.classList.add(tset.includes(D.loc)?'zta':'za');}}
$('zone').addEventListener('click',e=>{const svg=$('zone');const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  const z=zoneOf(p.x,p.y);if(!z)return;
  if(callOn&&D.parsed&&!D.parsed.targets.length&&!D.target){D.target=z;}
  else{D.loc=z;if(tab==='bullpen'){if(!D.type&&D.parsed)D.type=D.parsed.type;if(D.type){logBullpen();return;}else toast('Tap a pitch type');}}
  render();});
// ---------- call entry ----------
function setCall(t){D.callTxt=t;$('callTxt').value=t;D.parsed=PC.parseCall(t,curHand(),throwsOf(),S().customTypes);D.target=null;if(D.parsed&&!D.type)D.type=D.parsed.type;render();}
$('callTxt').addEventListener('input',e=>{D.callTxt=e.target.value;D.parsed=PC.parseCall(D.callTxt,curHand(),throwsOf(),S().customTypes);D.target=null;if(D.parsed)D.type=D.parsed.type;render(true);});
$('callAlt').addEventListener('click',e=>{const z=e.target.dataset.alt;if(!z||!D.parsed)return;D.parsed.targets=[+z];D.target=null;render();});
$('callClr').onclick=()=>{setCall('');D.type=null;render();};
$('callTypes').addEventListener('click',e=>{const c=e.target.dataset.c;if(!c)return;const suf=(D.parsed&&D.parsed.suffix)||'';setCall(c+(suf?(' '+suf):''));D.type=PC.normType(c,S().customTypes);render();});
$('callSuf').addEventListener('click',e=>{const s=e.target.dataset.s;if(s==null)return;const t=(D.parsed&&D.parsed.type)||'FB';setCall(s==='H+'&&!D.parsed?'H+':(t+(s?' '+s:'')));});
$('callOn').onchange=e=>{callOn=e.target.checked;S().callOn=callOn;save();render();};
$('types').addEventListener('click',e=>{const c=e.target.dataset.c;if(!c)return;D.type=D.type===c?null:c;render();});
$('hL').onclick=()=>setHand('L');$('hR').onclick=()=>setHand('R');
function setHand(h){if(tab==='game'&&game()){game().cur.hand=h;save();}else bpHand=h;if(D.callTxt)D.parsed=PC.parseCall(D.callTxt,h,throwsOf(),S().customTypes);render();}
// ---------- record building ----------
function baseRec(){return{id:PC.uid(),ts:Date.now(),pitcherId:curPitcherId(),hand:curHand(),type:D.type||(D.parsed&&D.parsed.type)||null,
  call:callOn&&D.parsed?D.parsed.norm:null,callRaw:callOn&&D.callTxt?D.callTxt:null,targets:callOn?(D.parsed&&D.parsed.targets.length?D.parsed.targets:(D.target?[D.target]:[])):[],loc:D.loc||null};}
function logBullpen(){let s=session();if(!s)s=newSession();const r=baseRec();r.b=0;r.s=0;s.pitches.push(r);save();
  const ok=PC.hitSpot(r);toast(`${r.type||'?'} @${r.loc}${r.targets.length?(ok?' ✓ hit spot':' ✗ missed'):''}`);const keepCall=false;D.loc=null;D.target=null;if(!keepCall){D.callTxt='';D.parsed=null;$('callTxt').value='';}render();}
function newSession(){const s={id:'s_'+PC.uid(),date:new Date().toISOString().slice(0,10),started:Date.now(),pitches:[]};S().sessions.push(s);S().activeSession=s.id;save();return s;}
$('bpNew').onclick=()=>{newSession();resetDraft();render();toast('New bullpen session');};
// game result
$('resBtns').addEventListener('click',e=>{const r=e.target.dataset.r;if(!r)return;if(r==='inplay'){D.ip=true;render();return;}recordGame(r);});
$('ipBtns').addEventListener('click',e=>{const ip=e.target.dataset.ip;if(ip==null)return;if(!ip){D.ip=false;render();return;}recordGame('inplay',ip);});
function recordGame(result,ip,noPitch){const g=game();if(!g)return;const c=g.cur;const b=g.lineup[c.slot]||{};
  const r=Object.assign(baseRec(),{inning:c.inning,outsBefore:c.outs,slot:c.slot,batter:b.name||'',batterNum:b.num||'',b:c.b,s:c.s,abn:c.abn,result,ip:ip||null,firstPitch:c.b===0&&c.s===0,prevHand:c.hand||null});
  let o;if(noPitch){o={b:c.b,s:c.s,end:'IBB',outs:0};r.noPitch=true;r.type=null;r.loc=null;r.call=null;r.targets=[];}else o=PC.applyPitch(c,result,ip);
  r.end=o.end;g.pitches.push(r);c.b=o.b;c.s=o.s;
  if(o.end){c.outs+=o.outs;let msg={BB:'Walk',K:'Strikeout',HBP:'Hit by pitch',IBB:'Intentional walk','K-D3':'Strikeout – reached on dropped 3rd',out:'Out',E:'Reached on error',FC:"Fielder's choice"}[o.end]||o.end;
    c.b=0;c.s=0;c.abn++;c.slot=(c.slot+1)%Math.max(1,g.lineup.length);c.hand=null;
    if(c.outs>=3){c.outs=0;c.inning++;msg+=' · side retired';}toast(msg);}
  resetDraft();save();render();}
$('ibb').onclick=()=>{if(confirm('Intentional walk (no pitches counted, per GC)?'))recordGame('ibb',null,true);};
$('undo').onclick=()=>{if(tab==='game'){const g=game();if(!g||!g.pitches.length)return toast('Nothing to undo');const r=g.pitches.pop();
    Object.assign(g.cur,{inning:r.inning,outs:r.outsBefore,slot:r.slot,b:r.b,s:r.s,abn:r.abn,hand:r.prevHand});}
  else{const s=session();if(!s||!s.pitches.length)return toast('Nothing to undo');s.pitches.pop();}
  resetDraft();save();render();toast('Last pitch undone');};
// game controls
$('outPlus').onclick=()=>{const c=game().cur;c.outs++;if(c.outs>=3){c.outs=0;c.inning++;c.b=0;c.s=0;toast('Side retired');}save();render();};
$('outMinus').onclick=()=>{const c=game().cur;if(c.outs>0)c.outs--;save();render();};
$('innPlus').onclick=()=>{const c=game().cur;c.inning++;c.outs=0;c.b=0;c.s=0;save();render();};
$('batter').onchange=e=>{const c=game().cur;if(c.b||c.s){if(!confirm('Count is not 0-0. Switch batter anyway?')){render();return;}}c.slot=+e.target.value;c.b=0;c.s=0;c.abn++;c.hand=null;save();render();};
$('bHand').onclick=()=>setHand(curHand()==='L'?'R':'L');
$('pitcher').onchange=e=>{S().curPitcher=e.target.value;save();render();if(tab==='game'&&game())toast('Pitching change: '+pName(e.target.value));};
$('gEnd').onclick=()=>{if(!confirm('End this game? It stays in Stats.'))return;game().ended=Date.now();S().activeGame=null;save();render();};
// new game form
let draftLineup=[];function blankLineup(){draftLineup=Array.from({length:9},(_,i)=>({slot:i+1,name:'',num:'',hand:'R'}));}
blankLineup();
function renderLineupForm(){$('gLineup').innerHTML=draftLineup.map((b,i)=>`<div class="prow"><span class="mut" style="width:20px">${i+1}</span><input data-i="${i}" data-f="name" value="${H(b.name)}" placeholder="Name"><input data-i="${i}" data-f="num" value="${H(b.num)}" placeholder="#" style="width:56px;flex:none" inputmode="numeric"><button data-i="${i}" data-f="hand" style="width:52px">${b.hand}</button></div>`).join('');}
$('gLineup').addEventListener('input',e=>{const{i,f}=e.target.dataset;if(f)draftLineup[i][f]=e.target.value;});
$('gLineup').addEventListener('click',e=>{const{i,f}=e.target.dataset;if(f==='hand'){draftLineup[i].hand=draftLineup[i].hand==='L'?'R':'L';renderLineupForm();}});
$('gAddB').onclick=()=>{draftLineup.push({slot:draftLineup.length+1,name:'',num:'',hand:'R'});renderLineupForm();};
$('gStart').onclick=()=>{const lineup=draftLineup.map((b,i)=>({slot:i+1,name:b.name.trim()||('Batter '+(i+1)),num:b.num.trim(),hand:b.hand}));
  const g={id:'g_'+PC.uid(),date:$('gDate').value||new Date().toISOString().slice(0,10),opponent:$('gOpp').value.trim()||'Opponent',event:$('gEvent').value.trim(),homeAway:$('gHA').value,lineup,pitches:[],
    cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0,hand:null},started:Date.now()};
  S().games.push(g);S().activeGame=g.id;blankLineup();save();resetDraft();render();toast('Game on! Pick your pitcher up top.');};
// ---------- pitchers ----------
let pdEdit=null;
function openPDlg(p){pdEdit=p?p.id:null;$('pDlgT').textContent=p?'Edit pitcher':'Add pitcher';$('pdName').value=p?p.name:'';$('pdNum').value=p?p.num:'';$('pdThrows').value=p?p.throws:'R';$('pDlg').showModal();}
$('pDlg').addEventListener('close',()=>{if($('pDlg').returnValue!=='ok')return;const o={name:$('pdName').value,num:$('pdNum').value,throws:$('pdThrows').value};
  if(!o.name.trim())return toast('Name required');
  if(pdEdit)store.editPitcher(pdEdit,o);else{const p=store.addPitcher(o);S().curPitcher=p.id;save();toast('Added '+p.name+(store.isTest?' (test only)':''));}
  if(D.callTxt)D.parsed=PC.parseCall(D.callTxt,curHand(),throwsOf(),S().customTypes);render();});
$('addP').onclick=()=>openPDlg();$('addPQuick').onclick=()=>openPDlg();
function renderPitchers(){const row=p=>`<div class="prow"><span style="flex:1"><b>${H(p.name)}</b>${p.num?' #'+H(p.num):''} <span class="tag">${p.throws}HP</span>${p.note?' <span class="tag">'+H(p.note)+'</span>':''}</span><button data-e="${p.id}">Edit</button><button data-a="${p.id}">${p.archived?'Restore':'Archive'}</button></div>`;
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
    rows.push({mode:'game',game_id:g.id,date:g.date,opponent:g.opponent,event:g.event,home_away:g.homeAway,session:'',pitcher:pm.name,pitcher_num:pm.num,throws:pm.throws,inning:p.inning,outs_before:p.outsBefore,lineup_slot:p.slot+1,batter:p.batter,batter_num:p.batterNum,bats:p.hand,balls_before:p.b,strikes_before:p.s,pitch_no:p.noPitch?'':n,pitcher_pitch_no:p.noPitch?'':pc[p.pitcherId],call:p.call,call_target:(p.targets||[]).join('/'),type:p.type,location:p.loc,location_desc:p.loc?PC.locInfo(p.loc,p.hand).label:'',result:p.noPitch?'ibb':p.result,in_play:p.ip,strike:p.noPitch?'':(PC.isStrike(p.result)?1:0),hit_spot:p.call&&p.loc?(PC.hitSpot(p)?1:0):'',ab_end:p.end,ts:new Date(p.ts).toISOString()});});});
  const ss=scope==='all'||scope==='bullpen'?s.sessions:(scope.startsWith('s_')?s.sessions.filter(x=>x.id===scope):[]);
  ss.forEach(x=>{x.pitches.forEach((p,i)=>{const pm=pmeta(p.pitcherId);rows.push({mode:'bullpen',session:x.id,date:x.date,pitcher:pm.name,pitcher_num:pm.num,throws:pm.throws,bats:p.hand,pitch_no:i+1,call:p.call,call_target:(p.targets||[]).join('/'),type:p.type,location:p.loc,location_desc:p.loc?PC.locInfo(p.loc,p.hand).label:'',strike:PC.isZone(p.loc)?1:0,hit_spot:p.call&&p.loc?(PC.hitSpot(p)?1:0):'',ts:new Date(p.ts).toISOString()});});});
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
  else{const n=importCSV(txt);toast(`Imported ${n} pitches`);}}catch(err){alert('Import failed: '+err.message);}render();};
function importCSV(txt){const rows=PC.parseCSV(txt),s=S();let n=0;const pid=(name,num,th)=>{let p=s.pitchers.find(x=>x.name===name);if(!p&&name)p=store.addPitcher({name,num,throws:th});return p?p.id:null;};
  const has=new Set(s.games.map(g=>g.id).concat(s.sessions.map(x=>x.id)));
  rows.forEach(r=>{const tg=(r.call_target||'').split('/').filter(Boolean).map(Number);const base={id:PC.uid(),ts:Date.parse(r.ts)||Date.now(),pitcherId:pid(r.pitcher,r.pitcher_num,r.throws),hand:r.bats||'R',type:r.type||null,call:r.call||null,targets:tg,loc:r.location?+r.location:null};
    if(r.mode==='game'){if(has.has(r.game_id)&&!s.games.find(g=>g.id===r.game_id&&g.imported))return;let g=s.games.find(x=>x.id===r.game_id);
      if(!g){g={id:r.game_id||('g_'+PC.uid()),date:r.date,opponent:r.opponent,event:r.event,homeAway:r.home_away,lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0},imported:true,ended:Date.now()};s.games.push(g);}
      const slot=(+r.lineup_slot||1)-1;if(!g.lineup[slot])g.lineup[slot]={slot:slot+1,name:r.batter,num:r.batter_num,hand:r.bats};
      g.pitches.push(Object.assign(base,{inning:+r.inning,outsBefore:+r.outs_before,slot,batter:r.batter,batterNum:r.batter_num,b:+r.balls_before,s:+r.strikes_before,result:r.result==='ibb'?'ibb':r.result,noPitch:r.result==='ibb',ip:r.in_play||null,end:r.ab_end||null,firstPitch:+r.balls_before===0&&+r.strikes_before===0}));n++;}
    else{if(has.has(r.session)&&!s.sessions.find(x=>x.id===r.session&&x.imported))return;let x=s.sessions.find(q=>q.id===r.session);if(!x){x={id:r.session||('s_'+PC.uid()),date:r.date,pitches:[],imported:true};s.sessions.push(x);}x.pitches.push(base);n++;}});
  save();return n;}
// ---------- stats ----------
function scopePitches(sc){const s=S();let out=[];
  if(sc==='all'||sc==='games')s.games.forEach(g=>out=out.concat(g.pitches));
  if(sc==='all'||sc==='bullpen')s.sessions.forEach(x=>out=out.concat(x.pitches));
  if(sc.startsWith('g_'))out=(s.games.find(g=>g.id===sc)||{pitches:[]}).pitches;
  if(sc.startsWith('s_'))out=(s.sessions.find(g=>g.id===sc)||{pitches:[]}).pitches;return out;}
const fmt=v=>v==null?'–':v+'%';
function renderStats(){const s=S();const sel=$('sScope').value||(s.activeGame||'all');
  const opts=[['all','Everything'],['games','All games'],['bullpen','All bullpen']].concat(s.games.slice().reverse().map(g=>[g.id,`${g.date} ${g.homeAway==='home'?'vs':'@'} ${g.opponent}${g.event?' ('+g.event+')':''}`])).concat(s.sessions.slice().reverse().map(x=>[x.id,`Bullpen ${x.date} (${x.pitches.length})`]));
  $('sScope').innerHTML=opts.map(([v,l])=>`<option value="${v}" ${v===sel?'selected':''}>${H(l)}</option>`).join('');
  const pf=$('sPitcher').value;$('sPitcher').innerHTML='<option value="">All pitchers</option>'+s.pitchers.map(p=>`<option value="${p.id}" ${p.id===pf?'selected':''}>${H(p.name)}${p.archived?' (archived)':''}</option>`).join('');
  const all=scopePitches($('sScope').value);const P=pf?all.filter(p=>p.pitcherId===pf):all;const sum=PC.summarize(P);
  const isGame=P.some(p=>p.result);
  $('sGrid').innerHTML=[['Pitches',sum.n],['Strike %',fmt(sum.strikePct)],['1st-pitch K%',isGame?fmt(sum.fpsPct):'–'],['Hit spot',fmt(sum.spotPct)],['Called',sum.spotN],['Balls',sum.n-sum.strikes]].map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
  const pids=[...new Set(all.map(p=>p.pitcherId))];
  $('sPit').innerHTML='<tr><th>Pitcher</th><th>#</th><th>K%</th><th>FPS%</th><th>Spot</th></tr>'+pids.map(id=>{const q=PC.summarize(all.filter(p=>p.pitcherId===id));return`<tr><td>${H(pName(id))}</td><td>${q.n}</td><td>${fmt(q.strikePct)}</td><td>${fmt(q.fpsPct)}</td><td>${fmt(q.spotPct)}</td></tr>`;}).join('');
  const tbl=(o,lbl)=>`<tr><th>${lbl}</th><th>#</th><th>K%</th><th>Spot</th><th>Whiff</th><th>InPlay</th></tr>`+Object.entries(o).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td><td>${fmt(v.strikePct)}</td><td>${fmt(v.spotPct)}</td><td>${v.whiff}</td><td>${v.inPlay}</td></tr>`).join('');
  $('sType').innerHTML=tbl(sum.byType,'Type');
  $('sCall').innerHTML=Object.keys(sum.byCall).length?tbl(sum.byCall,'Call')+'<tr><td colspan=6 class="mut">Call → thrown</td></tr>'+Object.entries(sum.callVsThrown).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td><td>${fmt(v.strikePct)}</td><td>${fmt(v.spotPct)}</td><td>${v.whiff}</td><td>${v.inPlay}</td></tr>`).join(''):'<tr><td class="mut">No called pitches logged</td></tr>';
  $('sRes').innerHTML='<tr><th>Result</th><th>#</th></tr>'+Object.entries(sum.byResult).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td></tr>`).join('');
  const mx=Math.max(1,...Object.values(sum.byLoc).map(v=>v.n));const lab={};for(const k in sum.byLoc)lab[k]=sum.byLoc[k].n+' · '+fmt(sum.byLoc[k].strikePct);
  zoneSVG($('sHeat'),'R',{labels:lab});for(const k in sum.byLoc){const e=$('sHeat').querySelector(`[data-z="${k}"]`);if(e){e.style.fill=`rgba(245,${Math.round(197-150*sum.byLoc[k].n/mx)},24,${.25+.6*sum.byLoc[k].n/mx})`;}}}
$('sScope').onchange=renderStats;$('sPitcher').onchange=renderStats;
// ---------- render ----------
function render(skipCallInput){const s=S();document.body.classList.toggle('test',store.isTest);$('testbar').classList.toggle('hide',!store.isTest);
  $('testBtn').textContent=store.isTest?'Exit test mode (discard)':'Start test mode';$('testBtn').style.background=store.isTest?'var(--red)':'';
  callOn=!!s.callOn;$('callOn').checked=callOn;$('callBox').classList.toggle('hide',!callOn);
  const cp=curPitcherId();
  $('pitcher').innerHTML=store.activePitchers().map(p=>`<option value="${p.id}" ${p.id===cp?'selected':''}>${H(p.name)}${p.num?' #'+H(p.num):''} (${p.throws})</option>`).join('')||'<option>Add a pitcher</option>';
  const g=game();
  $('modeTag').textContent=(store.isTest?'TEST · ':'')+(tab==='game'?(g?'GAME':'NO GAME'):tab==='bullpen'?'BULLPEN':tab.toUpperCase());
  ['game','bullpen','stats','setup'].forEach(t=>$('tab-'+t).classList.toggle('hide',t!==tab));
  const showEntry=(tab==='game'&&g)||tab==='bullpen';$('entry').classList.toggle('hide',!showEntry);
  $('gameHead').classList.toggle('hide',!(tab==='game'&&g));
  $('noGame').classList.toggle('hide',!!g);$('inGame').classList.toggle('hide',!g);
  if(tab==='game'&&!g){renderLineupForm();if(!$('gDate').value)$('gDate').value=new Date().toISOString().slice(0,10);}
  const hand=curHand();$('hL').classList.toggle('sel',hand==='L');$('hR').classList.toggle('sel',hand==='R');
  $('batSide').classList.toggle('hide',tab==='game');
  if(g){const c=g.cur;$('inn').textContent=c.inning;$('cnt').textContent=c.b+'-'+c.s;$('outs').innerHTML=[0,1,2].map(i=>`<span class="${i<c.outs?'on':''}"></span>`).join('');
    $('pc').textContent=PC.pitchCount(g.pitches,cp);
    $('gTitle').textContent=`${g.date} ${g.homeAway==='home'?'vs':'@'} ${g.opponent}${g.event?' · '+g.event:''}`;
    $('batter').innerHTML=g.lineup.map((b,i)=>`<option value="${i}" ${i===c.slot?'selected':''}>${i+1}. ${b.num?'#'+H(b.num)+' ':''}${H(b.name)} (${b.hand})</option>`).join('');
    $('bHand').textContent='Bats '+hand;}
  // entry
  const types=allTypes();
  $('types').innerHTML=types.map(t=>`<button data-c="${t.code}" class="${D.type===t.code?'sel':''}">${H(t.code)}<br><small style="font-weight:400;font-size:11px">${H(t.name)}</small></button>`).join('');
  $('callTypes').innerHTML=types.map(t=>`<button data-c="${t.code}" class="${D.parsed&&D.parsed.type===t.code?'sel':''}">${H(t.code)}</button>`).join('');
  $('callSuf').innerHTML=['IN','A','H+','O','H','L'].map(x=>`<button data-s="${x}" class="${D.parsed&&D.parsed.suffix===x?'sel':''}">${x==='A'?'A (waste)':x==='H+'?'H+ (waste)':x}</button>`).join('')+'<button data-s="">no loc</button>';
  if(!skipCallInput)$('callTxt').value=D.callTxt;
  $('callAlt').innerHTML=D.parsed&&D.parsed.alts&&D.parsed.alts.length?D.parsed.alts.concat(D.parsed.targets).filter((z,i,x)=>x.indexOf(z)===i).map(z=>`<button data-alt="${z}" class="${(D.target||D.parsed.targets[0])===z?'sel':''}">CB → ${z}</button>`).join(''):'';
  $('callDesc').textContent=D.callTxt?(D.parsed?`${D.parsed.norm} = ${types.find(t=>t.code===D.parsed.type)?.name||D.parsed.type}${D.parsed.targets.length?' → zone '+D.parsed.targets.join('/'):' → tap target on grid'}${D.target?' '+D.target:''} · ${D.parsed.desc}`:'Unrecognized code'):'Type a code or tap buttons. Digits = zone (pitcher\'s view).';
  const needTarget=callOn&&D.parsed&&!D.parsed.targets.length&&!D.target;
  $('phase').innerHTML=needTarget?'Tap the <b>called target</b> on the grid':(tab==='bullpen'?(D.type?`<b>${D.type}</b> – tap where it went to log`:'Tap a pitch type, then tap the zone'):`Optional: type + where it went${D.loc?` → <b>${D.type||''} @${D.loc}</b> (${PC.locInfo(D.loc,hand).label})`:''}, then the result`);
  $('resBtns').classList.toggle('hide',tab!=='game'||D.ip);$('ipBtns').classList.toggle('hide',tab!=='game'||!D.ip);$('bpBtns').classList.add('hide');
  drawZone();
  // log
  const RL={ball:'Ball',called:'Called K',swinging:'Swing K',foul:'Foul',inplay:'In play',hbp:'HBP',ibb:'IBB',kd3:'K-reached'};
  const line=(p,i)=>`<div><span class="n">${i+1}</span><span style="flex:1">${tab==='game'?H(pName(p.pitcherId).split(' ')[0])+' vs '+H(p.batter)+': ':''}${p.call?'<b>['+H(p.call)+']</b> ':''}${H(p.type||'')}${p.loc?' <span class="tag">@'+p.loc+'</span>':''}${p.call&&p.loc?(PC.hitSpot(p)?' ✓':' ✗'):''}</span><span>${p.result?RL[p.result]+(p.ip?' '+p.ip:''):(PC.isZone(p.loc)?'K':'B')}${p.end?' · <b>'+p.end+'</b>':''}</span>${p.result?`<span class="tag">${p.b}-${p.s}</span>`:''}</div>`;
  if(tab==='game'&&g){$('logTitle').textContent='Game log (newest first)';$('log').innerHTML=g.pitches.map(line).reverse().join('')||'<div class="mut">No pitches yet</div>';}
  if(tab==='bullpen'){const x=session();$('logTitle').textContent='Session log (newest first)';$('log').innerHTML=x?x.pitches.map(line).reverse().join(''):'<div class="mut">No pitches yet</div>';
    const q=PC.summarize(x?x.pitches:[]);$('bpTitle').textContent='Bullpen '+(x?x.date:'');
    $('bpSum').textContent=`${q.n} pitches · ${fmt(q.strikePct)} strikes · hit spot ${fmt(q.spotPct)} · `+Object.entries(q.byType).map(([k,v])=>`${k} ${v.n} (${fmt(v.strikePct)})`).join(', ');}
  if(tab==='setup'){renderPitchers();renderRoster();$('cTypes').innerHTML=s.customTypes.map((c,i)=>`<span class="tag" data-ct="${i}">${H(c.code)} = ${H(c.name)} ✕</span> `).join('')||'None yet';
    $('storeMsg').textContent=store.isTest?'Test mode: storage untouched.':(storage?'Saved on this device (localStorage). Export a JSON backup regularly.':'Storage is blocked here – open in Safari (not private browsing).');}
  if(tab==='stats')renderStats();}
document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tab=b.dataset.t;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));resetDraft();render();scrollTo(0,0);});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
render();
window.__app={store,render};
})();
