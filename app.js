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
const role=()=>{const sy=store.real.sync;return sy.teamCode&&sy.role?sy.role:'coach';};
const ROLE_TABS={coach:['game','bullpen','stats','setup'],player:['bullpen','stats','setup'],viewer:['stats','setup']};
function curPitcherId(){const s=S();if(role()==='player'){const id=store.real.sync.pitcherId;if(id&&pById(id)){s.curPitcher=id;return id;}}if(!s.curPitcher||!pById(s.curPitcher)||pById(s.curPitcher).archived){const a=store.activePitchers()[0];s.curPitcher=a?a.id:null;}return s.curPitcher;}
function curHand(){if(tab==='game'){const g=game();if(g){const b=g.lineup[g.cur.slot];return(g.cur.hand||(b&&b.hand)||'R');}}return bpHand;}
function throwsOf(){const p=pById(curPitcherId());return p?p.throws:'R';}
function resetDraft(){Object.assign(D,{type:null,callTxt:'',parsed:null,target:null,loc:null,ip:false});$('callTxt').value='';}
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
  if(D.loc){const e=$('zone').querySelector(`[data-z="${D.loc}"]`);e&&e.classList.add(tset.includes(D.loc)?'zta':'za');}}
$('zone').addEventListener('click',e=>{const svg=$('zone');const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(svg.getScreenCTM().inverse());
  const z=zoneOf(p.x,p.y);if(!z)return;
  if(tab==='bullpen'){if(!D.type&&D.parsed)D.type=D.parsed.type;
    const r=PC.bullpenTap({type:D.type,target:D.target,callTargets:callOn&&D.parsed?D.parsed.targets:[]},z);
    if(r.action==='need_type'){toast('Pick the pitch type first');return;}
    if(r.action==='target'){D.target=z;render();return;}
    D.loc=z;logBullpen(r.targets);return;}
  if(callOn&&D.parsed&&!D.parsed.targets.length&&!D.target){D.target=z;}
  else{D.loc=z;}
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
$('hL').onclick=()=>setHand('L');$('hR').onclick=()=>setHand('R');$('hN').onclick=()=>setHand('N');$('bpTest').onclick=()=>toggleTest();
function setHand(h){if(tab==='game'&&game()){game().cur.hand=h;dirty('games',game().id);save();}else bpHand=h;if(D.callTxt)D.parsed=PC.parseCall(D.callTxt,h,throwsOf(),S().customTypes);render();}
// ---------- record building ----------
function baseRec(){return{id:PC.uuid(),ts:Date.now(),pitcherId:curPitcherId(),hand:curHand(),type:D.type||(D.parsed&&D.parsed.type)||null,
  call:callOn&&D.parsed?D.parsed.norm:null,callRaw:callOn&&D.callTxt?D.callTxt:null,targets:callOn?(D.parsed&&D.parsed.targets.length?D.parsed.targets:(D.target?[D.target]:[])):[],loc:D.loc||null};}
function logBullpen(targets){if(role()==='viewer')return;let s=session();if(!s||(role()==='player'&&s.pitcherId!==store.real.sync.pitcherId))s=newSession();const r=baseRec();r.b=0;r.s=0;if(targets)r.targets=targets;s.pitches.push(r);dirty('pitches',r.id);save();
  const ok=PC.hitSpot(r);toast(`${r.type||'?'} @${r.loc}${r.targets.length?(ok?' ✓ hit spot':' ✗ missed'):''}`);resetDraft();render();}
function newSession(){const s={id:'s_'+PC.uid(),date:new Date().toISOString().slice(0,10),started:Date.now(),pitches:[]};if(role()==='player')s.pitcherId=store.real.sync.pitcherId;S().sessions.push(s);S().activeSession=s.id;dirty('sessions',s.id);save();return s;}
$('bpNew').onclick=()=>{newSession();resetDraft();render();toast('New bullpen session');};
// game result
$('resBtns').addEventListener('click',e=>{const r=e.target.dataset.r;if(!r)return;if(r==='inplay'){D.ip=true;render();return;}recordGame(r);});
$('ipBtns').addEventListener('click',e=>{const ip=e.target.dataset.ip;if(ip==null)return;if(!ip){D.ip=false;render();return;}recordGame('inplay',ip);});
function recordGame(result,ip,noPitch){const g=game();if(!g)return;const c=g.cur;const b=g.lineup[c.slot]||{};
  const r=Object.assign(baseRec(),{inning:c.inning,outsBefore:c.outs,slot:c.slot,batter:b.name||'',batterNum:b.num||'',b:c.b,s:c.s,abn:c.abn,result,ip:ip||null,firstPitch:c.b===0&&c.s===0,prevHand:c.hand||null});
  let o;if(noPitch){o={b:c.b,s:c.s,end:'IBB',outs:0};r.noPitch=true;r.type=null;r.loc=null;r.call=null;r.targets=[];}else o=PC.applyPitch(c,result,ip);
  r.end=o.end;g.pitches.push(r);dirty('pitches',r.id);dirty('games',g.id);c.b=o.b;c.s=o.s;
  if(o.end){c.outs+=o.outs;let msg={BB:'Walk',K:'Strikeout',HBP:'Hit by pitch',IBB:'Intentional walk','K-D3':'Strikeout – reached on dropped 3rd',out:'Out',E:'Reached on error',FC:"Fielder's choice"}[o.end]||o.end;
    c.b=0;c.s=0;c.abn++;c.slot=(c.slot+1)%Math.max(1,g.lineup.length);c.hand=null;
    if(c.outs>=3){c.outs=0;c.inning++;msg+=' · side retired';}toast(msg);}
  resetDraft();save();render();}
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
function openPDlg(p){pdEdit=p?p.id:null;$('pDlgT').textContent=p?'Edit pitcher':'Add pitcher';$('pdName').value=p?p.name:'';$('pdNum').value=p?p.num:'';$('pdThrows').value=p?p.throws:'R';$('pDlg').showModal();}
$('pDlg').addEventListener('close',()=>{if($('pDlg').returnValue!=='ok')return;const o={name:$('pdName').value,num:$('pdNum').value,throws:$('pdThrows').value};
  if(!o.name.trim())return toast('Name required');
  if(pdEdit)store.editPitcher(pdEdit,o);else{const p=store.addPitcher(o);S().curPitcher=p.id;save();toast('Added '+p.name+(store.isTest?' (test only)':''));}
  if(D.callTxt)D.parsed=PC.parseCall(D.callTxt,curHand(),throwsOf(),S().customTypes);render();});
$('addP').onclick=()=>{if(role()==='coach')openPDlg();};$('addPQuick').onclick=()=>{if(role()==='coach')openPDlg();};
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
function renderStats(){const s=S();const sel=$('sScope').value||(s.activeGame||'all');const me=role()==='player'?store.real.sync.pitcherId:null;
  const GS=me?s.games.filter(g=>g.pitches.some(p=>p.pitcherId===me)):s.games,SS=me?s.sessions.filter(x=>x.pitcherId===me||x.pitches.some(p=>p.pitcherId===me)):s.sessions;
  const opts=[['all','Everything'],['games','All games'],['bullpen','All bullpen']].concat(GS.slice().reverse().map(g=>[g.id,`${g.date} ${vsAt(g)} ${g.opponent}${PC.gameStatus(g)==='scheduled'?' (scheduled)':''}${g.event?' ('+g.event+')':''}`])).concat(SS.slice().reverse().map(x=>[x.id,`Bullpen ${x.date} (${me?x.pitches.filter(p=>p.pitcherId===me).length:x.pitches.length})`]));
  $('sScope').innerHTML=opts.map(([v,l])=>`<option value="${v}" ${v===sel?'selected':''}>${H(l)}</option>`).join('');
  const own=role()==='player'?store.real.sync.pitcherId:null;const pf=own||$('sPitcher').value;$('sPitcher').disabled=!!own;$('sPitcher').innerHTML=(own?'':'<option value="">All pitchers</option>')+s.pitchers.filter(p=>!own||p.id===own).map(p=>`<option value="${p.id}" ${p.id===pf?'selected':''}>${H(p.name)}${p.archived?' (archived)':''}</option>`).join('');
  const all=scopePitches($('sScope').value);const P=pf?all.filter(p=>p.pitcherId===pf):all;const sum=PC.summarize(P);
  const isGame=P.some(p=>p.result);
  $('sReport').classList.toggle('hide',!s.sessions.some(q=>q.id===$('sScope').value));
  $('sGrid').innerHTML=[['Pitches',sum.n],['Strike %',fmt(sum.strikePct)],['1st-pitch K%',isGame?fmt(sum.fpsPct):'–'],['Hit spot',fmt(sum.spotPct)],['Called',sum.spotN],['Balls',sum.n-sum.strikes]].map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
  const pids=[...new Set(all.map(p=>p.pitcherId))];
  $('sPit').innerHTML='<tr><th>Pitcher</th><th>#</th><th>K%</th><th>FPS%</th><th>Spot</th></tr>'+pids.map(id=>{const q=PC.summarize(all.filter(p=>p.pitcherId===id));return`<tr><td>${H(pName(id))}</td><td>${q.n}</td><td>${fmt(q.strikePct)}</td><td>${fmt(q.fpsPct)}</td><td>${fmt(q.spotPct)}</td></tr>`;}).join('');
  const tbl=(o,lbl)=>`<tr><th>${lbl}</th><th>#</th><th>K%</th><th>Spot</th><th>Whiff</th><th>InPlay</th></tr>`+Object.entries(o).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td><td>${fmt(v.strikePct)}</td><td>${fmt(v.spotPct)}</td><td>${v.whiff}</td><td>${v.inPlay}</td></tr>`).join('');
  $('sType').innerHTML=tbl(sum.byType,'Type');
  $('sCall').innerHTML=Object.keys(sum.byCall).length?tbl(sum.byCall,'Call')+'<tr><td colspan=6 class="mut">Call → thrown</td></tr>'+Object.entries(sum.callVsThrown).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td><td>${fmt(v.strikePct)}</td><td>${fmt(v.spotPct)}</td><td>${v.whiff}</td><td>${v.inPlay}</td></tr>`).join(''):'<tr><td class="mut">No called pitches logged</td></tr>';
  $('sRes').innerHTML='<tr><th>Result</th><th>#</th></tr>'+Object.entries(sum.byResult).map(([k,v])=>`<tr><td>${H(k)}</td><td>${v.n}</td></tr>`).join('');
  const mx=Math.max(1,...Object.values(sum.byLoc).map(v=>v.n));const lab={};for(const k in sum.byLoc)lab[k]=sum.byLoc[k].n+' · '+fmt(sum.byLoc[k].strikePct);
  zoneSVG($('sHeat'),'R',{labels:lab});for(const k in sum.byLoc){const e=$('sHeat').querySelector(`[data-z="${k}"]`);if(e){e.style.fill=`rgba(245,${Math.round(197-150*sum.byLoc[k].n/mx)},24,${.25+.6*sum.byLoc[k].n/mx})`;}}}

// ---------- bullpen session report ----------
let RPT=null;
function reportFor(sess){const own=role()==='player'?store.real.sync.pitcherId:null;let P=sess.pitches.filter(p=>!p.deleted);if(own)P=P.filter(p=>p.pitcherId===own);
  const pids=[...new Set(P.map(p=>p.pitcherId).filter(Boolean))];const who=pids.length?pids.map(pName).join(', '):(sess.pitcherId?pName(sess.pitcherId):'Bullpen');
  const items=P.map(p=>({p,src:'bullpen',sessionId:sess.id,side:'N'}));const thm={};S().pitchers.forEach(q=>thm[q.id]=q.throws);return{sess,P,who,r:PC.sessionReport(P,thm),miss:(()=>{const d=PC.missData(items,{});P.forEach(p=>{const m=PC.pitchMiss(p,thm[p.pitcherId]);if(!m||!p.targets)return;p.targets.forEach(z=>{const c=d.cells[z];if(c&&m.good)c.good=(c.good||0)+1;});});return d;})(),test:!!store.isTest};}
function paintMiss(svg,d,kid){if(kid)return paintKid(svg,d);zoneSVG(svg,'R',{noNums:true,noSide:true});let ex='';PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=svg.querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
  const col=PC.missColor(c.avg);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';const lbl=c.n?`Aimed at zone ${z}: ${c.n}, avg miss ${c.avg}${c.mm?`, ${c.mm} middle-middle mistakes`:''}`:`Zone ${z}: none aimed`;el.setAttribute('aria-label',lbl);el.innerHTML=`<title>${lbl}</title>`;
  if(c.n){ex+=`<text x="${cx}" y="${cy-2.5}" style="fill:${tc};font-size:6px;font-weight:800;text-anchor:middle;dominant-baseline:middle">${c.avg<=1?'✓':'✗'}${c.avg.toFixed(1)}</text><text x="${cx}" y="${cy+4}" style="fill:${tc};font-size:4px;font-weight:700;text-anchor:middle">n=${c.n}</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+9}" style="fill:${tc};font-size:3.8px;font-weight:800;text-anchor:middle">⚠MM ${c.mm}</text>`;}});svg.insertAdjacentHTML('beforeend',ex);}
const KID_LEGEND='<b style="color:#2ea043">Green</b> = you hit your spot or were 1 box off. The <b style="color:#f47067">redder</b> the box, the farther you missed. Each box shows how many were on target out of how many you aimed there. 🔥 = fat pitch: right down the middle when you didn\'t aim there – the biggest miss, because that\'s the pitch hitters crush.';
function paintKid(svg,d){zoneSVG(svg,'R',{noNums:true,noSide:true});let ex='';PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=svg.querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
  const col=PC.missColor(c.avg);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';const g=c.good||0;const lbl=c.n?`Aimed here ${c.n} time${c.n===1?'':'s'}, ${g} on target${c.mm?`, ${c.mm} fat pitch${c.mm===1?'':'es'}`:''}`:'Not aimed here';el.setAttribute('aria-label',lbl);el.innerHTML=`<title>${lbl}</title>`;
  if(c.n){ex+=`<text x="${cx}" y="${cy-2}" style="fill:${tc};font-size:7px;font-weight:800;text-anchor:middle;dominant-baseline:middle">${g}/${c.n}</text><text x="${cx}" y="${cy+5}" style="fill:${tc};font-size:3.8px;font-weight:700;text-anchor:middle">on target</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+10}" style="fill:${tc};font-size:4.2px;font-weight:800;text-anchor:middle">🔥${c.mm}</text>`;}});svg.insertAdjacentHTML('beforeend',ex);}
function openReport(sess){if(!sess)return toast('No session');const R=reportFor(sess);RPT=R;const r=R.r;
  if(!R.P.length){$('rBody').innerHTML='<h2 id="rT">Bullpen report</h2><p class="mut">No pitches in this session'+(role()==='player'?' for you':'')+'.</p>';$('rDlg').showModal();return;}
  const rp=v=>v==null?'–':Math.round(v)+'%';const st=[['Pitches',r.n],['Strikes',rp(r.strikePct)],['On target',rp(r.goodPct)],['Fat pitches',r.mm],['Spots aimed',r.called],['Bullseyes',r.hits]];
  const sp=x=>x?`<b>${H(x.label)}</b> – ${x.good} of ${x.called} on target`:'<span class="mut">throw 2+ pitches at a spot to see this</span>';
  const tr=r.trend&&r.trend.first.called&&r.trend.second.called?`<div class="lbl" style="margin-top:10px">Early vs. late</div><div>First half: ${rp(r.trend.first.goodPct)} on target · ${rp(r.trend.first.strikePct)} strikes<br>Second half: ${rp(r.trend.second.goodPct)} on target · ${rp(r.trend.second.strikePct)} strikes</div>`:'';
  $('rBody').innerHTML=`${R.test?'<div class="tag" style="background:var(--red)">TEST – not saved</div>':''}<h2 id="rT">Bullpen report</h2><div class="mut">${H(R.who)} · ${H(sess.date||'')} </div>
  <div class="grid3" style="margin-top:8px">${st.map(([k,v])=>`<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('')}</div>
  <div class="lbl" style="margin-top:10px">Feedback</div><ul class="fb">${r.feedback.map(t=>`<li>${H(t)}</li>`).join('')}</ul>
  <div class="lbl">Where you aimed – how close you got</div><svg id="rMap" viewBox="-14 -6 128 138" style="width:100%;max-width:340px;display:block;margin:auto"></svg>
  <div style="font-size:13px;line-height:1.4;margin-top:4px">${KID_LEGEND}</div>
  <div class="lbl" style="margin-top:10px">Best spot / work on</div><div>⭐ Best: ${sp(r.best)}</div><div>🎯 Work on: ${sp(r.weakest)}</div>${tr}
  <div class="lbl" style="margin-top:10px">By pitch</div><table><tr><th>Pitch</th><th>Thrown</th><th>Strikes</th><th>On target</th><th>Fat</th></tr>${Object.entries(r.byType).sort((a,b)=>b[1].n-a[1].n).map(([k,v])=>`<tr><td>${H(PC.TYPE_NAME[k]||k)}</td><td>${v.n}</td><td>${rp(v.strikePct)}</td><td>${v.called?`${v.good}/${v.called}`:'–'}</td><td>${v.mm}</td></tr>`).join('')}</table>`;
  if(R.miss.total)paintMiss($('rMap'),R.miss,true);else $('rMap').outerHTML='<div class="mut">No intended spots logged – tap a target before the actual location to get the heat map.</div>';
  $('rDlg').showModal();}
function reportPNG(R){const W=720,r=R.r,lines=[];const cv=document.createElement('canvas');const ctx=cv.getContext('2d');
  const wrap=(t,w,font)=>{ctx.font=font;const out=[];let cur='';t.split(' ').forEach(x=>{const n=cur?cur+' '+x:x;if(ctx.measureText(n).width>w){out.push(cur);cur=x;}else cur=n;});if(cur)out.push(cur);return out;};
  cv.width=W;cv.height=10;const fbl=r.feedback.map(t=>wrap('• '+t,W-60,'22px sans-serif'));const types=Object.entries(r.byType);
  const H2=200+fbl.flat().length*30+40+5*90+30+140+70+types.length*30+(r.trend?70:0)+80;cv.width=W;cv.height=H2;
  ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H2);let y=50;const tx=(t,x,yy,f,c)=>{ctx.font=f;ctx.fillStyle=c||'#e6edf3';ctx.fillText(t,x,yy);};
  tx('THUNDER ELITE · Bullpen report'+(R.test?' (TEST)':''),30,y,'bold 28px sans-serif','#4c7dff');y+=36;tx(`${R.who} · ${R.sess.date||''}`,30,y,'22px sans-serif','#9aa4b2');y+=46;
  [['Pitches',r.n],['Strikes',r.strikePct==null?'–':Math.round(r.strikePct)+'%'],['On target',r.goodPct==null?'–':Math.round(r.goodPct)+'%'],['Fat pitches',r.mm],['Bullseyes',r.hits]].forEach(([k,v],i)=>{const x=30+i*134;ctx.fillStyle='#161b22';ctx.fillRect(x,y-30,124,72);tx(String(v),x+10,y+4,'bold 28px sans-serif');tx(k,x+10,y+32,'16px sans-serif','#9aa4b2');});y+=80;
  fbl.forEach(ls=>ls.forEach(l=>{tx(l,30,y,'22px sans-serif');y+=30;}));y+=20;
  const S=90,ox=(W-5*S)/2;PC.ALL_CELLS.forEach(z=>{const [gx,gy]=PC.GRID_XY[z];const c=R.miss.cells[z];const col=PC.missColor(c.avg);const x=ox+gx*S,yy=y+gy*S;
    ctx.fillStyle=col?col.fill:'#161b22';ctx.fillRect(x+2,yy+2,S-4,S-4);ctx.textAlign='center';if(c.n){tx(`${c.good||0}/${c.n}`,x+S/2,yy+40,'bold 26px sans-serif',col.text);tx('on target'+(c.mm?' 🔥'+c.mm:''),x+S/2,yy+66,'15px sans-serif',col.text);}else tx(String(z),x+S/2,yy+52,'16px sans-serif','#555');ctx.textAlign='left';});
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.strokeRect(ox+S,y+S,3*S,3*S);y+=5*S+30;wrap(KID_LEGEND.replace(/<[^>]+>/g,''),W-60,'18px sans-serif').forEach(l=>{tx(l,30,y,'18px sans-serif','#c9d1d9');y+=26;});y+=14;
  tx('⭐ Best: '+(r.best?`${r.best.label} (${r.best.good} of ${r.best.called} on target)`:'–'),30,y,'19px sans-serif');y+=30;tx('🎯 Work on: '+(r.weakest?`${r.weakest.label} (${r.weakest.good} of ${r.weakest.called} on target)`:'–'),30,y,'19px sans-serif');y+=38;
  types.forEach(([k,v])=>{tx(`${PC.TYPE_NAME[k]||k}: ${v.n} thrown · ${v.strikePct==null?'–':Math.round(v.strikePct)+'%'} strikes · ${v.good}/${v.called} on target${v.mm?` · ${v.mm} fat`:''}`,30,y,'19px sans-serif');y+=30;});
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
function heatOptions(items){const s=S(),own=role()==='player'?store.real.sync.pitcherId:null;const uniq=a=>[...new Set(a.filter(Boolean))];
  return{type:uniq(items.map(i=>i.p.type)).sort().map(v=>[v,v]),pitcher:s.pitchers.filter(p=>!own||p.id===own).map(p=>[p.id,p.name]),throws:[['R','RHP'],['L','LHP']],
    batter:uniq(items.map(i=>i.batter)).sort().map(v=>[v,v]),side:[['R','RHB'],['L','LHB'],['N','No batter']],src:[['game','Games'],['bullpen','Bullpen']],
    game:(own?s.games.filter(g=>g.pitches.some(p=>p.pitcherId===own)):s.games).map(g=>[g.id,`${g.date||''} ${vsAt(g)} ${g.opponent}`]),session:s.sessions.map(x=>[x.id,`Bullpen ${x.date||''} (${x.pitches.length})`])};}
const HF_LBL={type:'Pitch',pitcher:'Pitcher',throws:'Pitcher hand',batter:'Batter',side:'Batter side',src:'Source',game:'Game',session:'Bullpen session'};
function heatChipText(k,v,opts){const o=(opts[k]||[]).find(x=>x[0]===v);return `${HF_LBL[k]}: ${o?o[1]:v}`;}
function renderHeat(){const items0=PC.heatItems(S());const own=role()==='player'?store.real.sync.pitcherId:null;const items=own?items0.filter(i=>i.p.pitcherId===own):items0;
  const opts=heatOptions(items);const f=Object.assign({},HF);if(own)f.pitcher=own;
  const miss=HV==='miss';const d=miss?PC.missData(items,f):PC.heatData(items,f,'actual');
  $('hvA').classList.toggle('sel',!miss);$('hvI').classList.toggle('sel',miss);$('hvA').setAttribute('aria-pressed',String(!miss));$('hvI').setAttribute('aria-pressed',String(miss));
  const act=PC.HEAT_KEYS.filter(k=>HF[k]&&!(own&&k==='pitcher'));
  $('hfChips').innerHTML=(act.length?act.map(k=>`<button class="tag" data-hfx="${k}" aria-label="Remove filter ${H(heatChipText(k,HF[k],opts))}" style="min-height:34px;font-size:13px;background:#1d2a55;border:1px solid #2f4fb0">${H(heatChipText(k,HF[k],opts))} ✕</button>`).join(''):'<span class="mut">All pitches'+(own?' (yours)':'')+'</span>');
  $('hfReset').disabled=!act.length;
  const what=miss?'each box = where pitches were aimed, colored by how far they missed':'where pitches landed';
  $('hSummary').textContent=`${d.total} pitch${d.total===1?'':'es'} · ${what}`+(miss&&d.mm?` · ⚠ ${d.mm} middle-middle mistake${d.mm===1?'':'s'}`:'')+(miss&&d.matched>d.total?` · ${d.matched-d.total} had no intended spot`:'');
  const empty=d.total===0;$('hEmpty').classList.toggle('hide',!empty);$('hMap').classList.toggle('hide',empty);$('hLegend').classList.toggle('hide',empty);if(empty)return;
  if(miss&&own){paintKid($('hMap'),d);$('hSummary').textContent=`${d.total} pitch${d.total===1?'':'es'} with a spot aimed`+(d.mm?` · 🔥 ${d.mm} fat pitch${d.mm===1?'':'es'}`:'');$('hLegend').innerHTML=`<div style="font-size:13px;line-height:1.4">${KID_LEGEND}</div>`;return;}
  zoneSVG($('hMap'),'R',{noNums:true,noSide:true});let ex='';
  PC.ALL_CELLS.forEach(z=>{const c=d.cells[z],el=$('hMap').querySelector(`[data-z="${z}"]`);if(!el)return;const[cx,cy]=center(z);
    const col=miss?PC.missColor(c.avg):PC.heatColor(c.n,d.max);el.style.fill=col?col.fill:'#161b22';const tc=col?col.text:'#6e7681';
    const lbl=miss?(c.n?`Aimed at zone ${z}: ${c.n} pitch${c.n===1?'':'es'}, average miss ${c.avg} square${c.avg===1?'':'s'}, ${c.hit} hit exactly${c.mm?`, ${c.mm} middle-middle mistake${c.mm===1?'':'s'}`:''}`:`Zone ${z}: no pitches aimed here`):`Zone ${z}: ${c.n} pitch${c.n===1?'':'es'}`;
    el.innerHTML=`<title>${lbl}</title>`;el.setAttribute('aria-label',lbl);
    if(miss){if(c.n){ex+=`<text x="${cx}" y="${cy-2.5}" style="fill:${tc};font-size:6px;font-weight:800;text-anchor:middle;dominant-baseline:middle;pointer-events:none">${c.avg<=1?'✓':'✗'}${c.avg.toFixed(1)}</text>`;
        ex+=`<text x="${cx}" y="${cy+4}" style="fill:${tc};font-size:4px;font-weight:700;text-anchor:middle;pointer-events:none">n=${c.n}</text>`;if(c.mm)ex+=`<text x="${cx}" y="${cy+9}" style="fill:${tc};font-size:3.8px;font-weight:800;text-anchor:middle;pointer-events:none">⚠MM ${c.mm}</text>`;}}
    else ex+=`<text x="${cx}" y="${cy-1}" style="fill:${tc};font-size:7px;font-weight:800;text-anchor:middle;dominant-baseline:middle;pointer-events:none">${c.n||''}</text>`;
    ex+=`<text x="${cx+(z<10?8:7)}" y="${cy-(z<10?9:8)}" style="fill:${tc};opacity:.65;font-size:3.6px;text-anchor:end;pointer-events:none">${z}</text>`;});
  $('hMap').insertAdjacentHTML('beforeend',ex);
  $('hLegend').innerHTML=miss?`<div class="row wrap" style="gap:6px;font-size:12px" aria-label="Miss scale">${PC.MISS_SCALE.map(s=>`<span class="row" style="gap:4px"><span style="display:inline-block;width:16px;height:16px;border-radius:4px;background:${s.fill}"></span>${s.label}</span>`).join('')}<span class="mut">squares off</span></div>
    <div class="mut" style="font-size:12px;margin-top:4px">Pitcher's view · each box = intended spot · ✓/✗ + number = average miss in squares (hit or 1 square = ✓ good) · n = pitches aimed there · MM = middle-middle mistakes: landed in 5 when aimed elsewhere, always scored as a 4-square miss · squares are counted like a king's move, diagonals = 1, outside spots 11–18 count as the ring around the zone (max 4).</div>`
   :`<div class="row" style="gap:6px;font-size:12px" aria-label="Color scale from 1 to ${d.max} pitches"><span class="mut">1</span><div style="flex:1;height:12px;border-radius:6px;background:linear-gradient(90deg,${PC.VIRIDIS.join(',')})"></div><span class="mut">${d.max}</span></div><div class="mut" style="font-size:12px;margin-top:4px">Pitcher's view · number = pitches that landed there · dark = fewer, yellow = most · 11–18 are outside the zone</div>`;}
function openHF(){const items0=PC.heatItems(S());const own=role()==='player'?store.real.sync.pitcherId:null;const opts=heatOptions(own?items0.filter(i=>i.p.pitcherId===own):items0);
  $('hfForm').innerHTML=PC.HEAT_KEYS.filter(k=>!(own&&k==='pitcher')).map(k=>`<label class="mut" style="font-size:13px">${HF_LBL[k]}<select data-hk="${k}" style="width:100%;margin-top:2px"><option value="">Any</option>${(opts[k]||[]).map(([v,l])=>`<option value="${H(v)}" ${HF[k]===v?'selected':''}>${H(l)}</option>`).join('')}</select></label>`).join('');$('hfDlg').showModal();}
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
  if($('syncMsg'))$('syncMsg').textContent=`Last synced: ${t}. Pending: ${n}.${st.lastError?' Last error: '+st.lastError:''} Device ${st.deviceId}. Test mode never syncs.`;}
$('teamSave').onclick=()=>{if(store.isTest)return toast('Exit test mode first');const v=$('teamCode').value.trim().toUpperCase();if(v.length<20)return toast('Team code looks too short');const changed=store.real.sync.teamCode!==v;store.real.sync.teamCode=v;if(changed){store.real.sync.role=undefined;store.real.sync.teamId=null;store.real.sync.pitcherId=null;}store.markAllDirty();store.save();
  if(sync)sync.whoami().then(w=>{if(w.role===null)toast('Code not recognized');else if(w.role)toast({coach:'Coach code: full access',player:'Player code: bullpen for '+(store.real.sync.pitcherName||'you'),viewer:'View-only code'}[w.role]);
    if(!ROLE_TABS[role()].includes(tab))tab=ROLE_TABS[role()][0];doSync(false);render();});else{toast('Team code saved');doSync(true);}};
// coach: manage access codes
async function renderCodes(){if(!sync||role()!=='coach'||store.isTest||!store.real.sync.teamCode){$('codesCard').classList.add('hide');return;}$('codesCard').classList.remove('hide');
  $('ncPitcher').innerHTML=store.real.pitchers.filter(p=>!p.archived).map(p=>`<option value="${p.id}">${H(p.name)}</option>`).join('');
  try{const L=await sync.rpc('coach_list_codes');$('codesList').innerHTML=L.map(c=>`<div class="prow"><span style="flex:1"><b>${H(c.label||c.pitcher_id||'')}</b> <span class="tag">${c.role}</span>${c.revoked_at?' <span class="tag">revoked</span>':''}<br><small style="user-select:all;-webkit-user-select:all">${H(c.code)}</small></span>${c.revoked_at?'':`<button data-revoke="${H(c.code)}">Revoke</button>`}</div>`).join('')||'<div class="mut">No access codes yet</div>';}
  catch(e){$('codesList').innerHTML='<div class="mut">Go online to manage codes.</div>';}}
$('codesCard').addEventListener('click',async e=>{const t=e.target;try{
  if(t.dataset.revoke){if(!confirm('Revoke this code? Anyone using it loses access right away.'))return;await sync.rpc('coach_revoke_code',{p_code:t.dataset.revoke});toast('Code revoked');}
  else if(t.id==='ncPlayer'){const id=$('ncPitcher').value;const p=pById(id);await doSync(false);const c=await sync.rpc('coach_create_code',{p_role:'player',p_pitcher_id:id,p_label:p?p.name:id});toast('New code for '+(p?p.name:id));prompt('Player code (copy it):',c);}
  else if(t.id==='ncViewer'){const c=await sync.rpc('coach_create_code',{p_role:'viewer',p_label:'View-only'});prompt('View-only code (copy it):',c);}
  else return;renderCodes();}catch(err){alert('Failed: '+err.message);}});
$('syncNow').onclick=()=>doSync(true);
$('pullCloud').onclick=()=>{if(confirm('Download this team\'s data from the cloud and merge it into this phone?'))doSync(true,true);};
window.addEventListener('online',()=>doSync(false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)doSync(false);});setInterval(()=>doSync(false),60000);
function bpPhase(){const st=PC.bullpenStep({type:D.type||(D.parsed&&D.parsed.type),target:D.target,callTargets:callOn&&D.parsed?D.parsed.targets:[]});
  const it=(callOn&&D.parsed&&D.parsed.targets.length)?D.parsed.targets.join('/'):D.target;
  return st==='type'?'<b>1.</b> Choose the pitch':st==='target'?`<b>2.</b> ${H(D.type||D.parsed.type)} – tap the <b>intended</b> spot`:`<b>3.</b> ${H(D.type||D.parsed.type)} → ${it} – tap where it <b>actually</b> went`;}
// ---------- render ----------
function render(skipCallInput){const s=S();document.body.classList.toggle('test',store.isTest);$('testbar').classList.toggle('hide',!store.isTest);
  $('testBtn').textContent=store.isTest?'Exit test mode (discard)':'Start test mode';$('testBtn').style.background=store.isTest?'var(--red)':'';
  callOn=!!s.callOn;$('callOn').checked=callOn;$('callBox').classList.toggle('hide',!callOn);
  const R0=role(),tabs=ROLE_TABS[R0];if(!tabs.includes(tab))tab=tabs[0];
  document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('hide',!tabs.includes(b.dataset.t));b.classList.toggle('on',b.dataset.t===tab);});
  document.body.dataset.role=R0;$('addPQuick').classList.toggle('hide',R0!=='coach');$('pitcher').disabled=R0!=='coach';
  ['pCard','rosterCard','impJSON','impCSV'].forEach(id=>$(id).classList.toggle('hide',R0!=='coach'));
  $('roleMsg').textContent=R0==='coach'?'':R0==='player'?`Player code: log your bullpens and view your own games (${store.real.sync.pitcherName||"your"} data only).`:'View-only code: you can look, not change.';$('roleMsg').classList.toggle('hide',R0==='coach');
  const cp=curPitcherId();
  $('pitcher').innerHTML=store.activePitchers().filter(p=>R0!=='player'||p.id===cp).map(p=>`<option value="${p.id}" ${p.id===cp?'selected':''}>${H(p.name)}${p.num?' #'+H(p.num):''} (${p.throws})</option>`).join('')||'<option>Add a pitcher</option>';
  const g=game();
  $('modeTag').textContent=(store.isTest?'TEST · ':'')+(tab==='game'?(g?'GAME':'NO GAME'):tab==='bullpen'?'BULLPEN':tab.toUpperCase());
  ['game','bullpen','stats','setup'].forEach(t=>$('tab-'+t).classList.toggle('hide',t!==tab));
  const showEntry=(tab==='game'&&g)||tab==='bullpen';$('entry').classList.toggle('hide',!showEntry);
  $('gameHead').classList.toggle('hide',!(tab==='game'&&g));
  $('noGame').classList.toggle('hide',!!g);$('inGame').classList.toggle('hide',!g);
  const sch=s.games.filter(x=>PC.gameStatus(x)==='scheduled').sort((x,y)=>(x.date+x.gameNo).localeCompare(y.date+y.gameNo,undefined,{numeric:true}));
  $('schedCard').classList.toggle('hide',!(tab==='game'&&!g&&sch.length));
  $('schedList').innerHTML=sch.map(x=>`<div class="prow"><button data-sg="${x.id}" style="flex:1;text-align:left;${schedId===x.id?'border-color:var(--acc)':''}"><b>${H((x.date||'').slice(5))} ${H(x.time||'')}</b> ${vsAt(x)} ${H(x.opponent)}<br><small class="mut">${[x.gameNo,x.field,x.location].filter(Boolean).map(H).join(' · ')}</small></button>${x.link&&/^https:\/\//.test(x.link)?`<a href="${H(x.link)}" target="_blank" rel="noopener" style="color:var(--acc);padding:0 6px">GC↗</a>`:''}</div>`).join('');
  if(tab==='game'&&!g){renderLineupForm();if(!$('gDate').value)$('gDate').value=new Date().toISOString().slice(0,10);}
  const hand=curHand();$('hL').classList.toggle('sel',hand==='L');$('hR').classList.toggle('sel',hand==='R');$('hN').classList.toggle('sel',hand==='N');$('hN').classList.toggle('hide',tab==='game');
  $('bpTest').textContent=store.isTest?'🧪 Test mode ON – tap to exit (discard)':'🧪 Start test mode (not saved)';$('bpTest').style.background=store.isTest?'var(--red)':'';$('bpTest').setAttribute('aria-pressed',String(store.isTest));
  $('batSide').classList.toggle('hide',tab==='game');
  if(g){const c=g.cur;$('inn').textContent=c.inning;$('cnt').textContent=c.b+'-'+c.s;$('outs').innerHTML=[0,1,2].map(i=>`<span class="${i<c.outs?'on':''}"></span>`).join('');
    $('pc').textContent=PC.pitchCount(g.pitches,cp);
    $('gTitle').textContent=`${g.date} ${vsAt(g)} ${g.opponent}`;$('gSub').innerHTML=[g.gameNo,g.time,g.field,g.event,g.homeAway==='tbd'?'H/A TBD':''].filter(Boolean).map(H).join(' · ')+(g.link&&/^https:\/\//.test(g.link)?` · <a href="${H(g.link)}" target="_blank" rel="noopener" style="color:var(--acc);font-weight:700">GameChanger ↗</a>`:'');
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
  $('phase').innerHTML=needTarget?'Tap the <b>called target</b> on the grid':(tab==='bullpen'?bpPhase():`Optional: type + where it went${D.loc?` → <b>${D.type||''} @${D.loc}</b> (${PC.locInfo(D.loc,hand,throwsOf()).label})`:''}, then the result`);
  $('resBtns').classList.toggle('hide',tab!=='game'||D.ip);$('ipBtns').classList.toggle('hide',tab!=='game'||!D.ip);$('undo').textContent=tab==='bullpen'&&(D.type||D.target||D.callTxt)?'↶ Back a step':'↶ Undo last pitch';
  drawZone();
  // log
  const RL={ball:'Ball',called:'Called K',swinging:'Swing K',foul:'Foul',inplay:'In play',hbp:'HBP',ibb:'IBB',kd3:'K-reached'};
  const line=(p,i)=>`<div><span class="n">${i+1}</span><span style="flex:1">${tab==='game'?H(pName(p.pitcherId).split(' ')[0])+' vs '+H(p.batter)+': ':''}${p.call?'<b>['+H(p.call)+']</b> ':''}${H(p.type||'')}${p.loc?' <span class="tag">@'+p.loc+'</span>':''}${p.targets&&p.targets.length&&p.loc?(PC.hitSpot(p)?' ✓':' ✗'):''}</span><span>${p.result?RL[p.result]+(p.ip?' '+p.ip:''):(PC.isZone(p.loc)?'K':'B')}${p.end?' · <b>'+p.end+'</b>':''}</span>${p.result?`<span class="tag">${p.b}-${p.s}</span>`:''}</div>`;
  if(tab==='game'&&g){$('logTitle').textContent='Game log (newest first)';$('log').innerHTML=g.pitches.map(line).reverse().join('')||'<div class="mut">No pitches yet</div>';}
  if(tab==='bullpen'){const x=session();$('logTitle').textContent='Session log (newest first)';$('log').innerHTML=x?x.pitches.map(line).reverse().join(''):'<div class="mut">No pitches yet</div>';
    const q=PC.summarize(x?x.pitches:[]);$('bpTitle').textContent='Bullpen '+(x?x.date:'');
    $('bpSum').textContent=`${q.n} pitches · ${fmt(q.strikePct)} strikes · hit spot ${fmt(q.spotPct)} · `+Object.entries(q.byType).map(([k,v])=>`${k} ${v.n} (${fmt(v.strikePct)})`).join(', ');}
  if(tab==='setup'){renderCodes();renderPitchers();renderRoster();$('cTypes').innerHTML=s.customTypes.map((c,i)=>`<span class="tag" data-ct="${i}">${H(c.code)} = ${H(c.name)} ✕</span> `).join('')||'None yet';
    $('storeMsg').textContent=store.isTest?'Test mode: storage untouched.':(storage?'Saved on this device (localStorage). Export a JSON backup regularly.':'Storage is blocked here – open in Safari (not private browsing).');}
  if(tab==='stats'){renderStats();renderHeat();}
  renderSync();if(tab==='setup'&&!store.isTest&&document.activeElement!==$('teamCode'))$('teamCode').value=store.real.sync.teamCode||'';}
document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tab=b.dataset.t;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));resetDraft();render();scrollTo(0,0);});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
render();doSync(false);
window.__app={store,render,sync,doSync};
})();
