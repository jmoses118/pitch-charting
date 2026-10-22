/* Thunder Elite pitch charting – UI game.js: Game view: wristband panel, results, game controls, game/bullpen mode lock, new-game form.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
// ---- wristband call sheet (game, coach) ----
const sheets=()=>(S().callSheets||[]).filter(x=>!x.deleted);
function curSheet(){const l=sheets();const p=curPitcherId();return l.find(x=>x.id===S().activeSheet)||l.find(x=>p&&x.pitcherId===p)||l[0]||null;}
let lastCell=null; // for "Same call"
function callCell(r,c){if((clearFoulChips(),scoreGuard()))return;const sh=curSheet();if(!sh)return;$('wbDet').open=false;const t=(sh.rows[r]||[])[c];if(t==null||!String(t).trim())return toast('Empty box');
  if(!callOn){callOn=true;S().callOn=true;save();}D.cell={sheet:sh.id,r,c};lastCell={r,c};setCall(String(t));if(D.parsed){const band=PC.bandAim(sh,D.parsed);if(band)placeCall(D.parsed.type,[band]);}else toast(`Can't read "${t}"`);render();setTimeout(()=>advance('loc'),0);
  $('wbMsg').textContent=`${r+1}-${sh.cols[c]||c+1}: ${t}`+(D.parsed?(D.parsed.targets.length?` → zone ${D.parsed.targets.join('/')}`:' → no spot, tap target'):' (not understood)');render();}
$('wbTbl').addEventListener('click',e=>{const b=e.target.closest('button[data-r]');if(b)callCell(+b.dataset.r,+b.dataset.c);});
function wbRefGo(){const sh=curSheet();const x=PC.parseCellRef($('wbRef').value,sh);if(!x)return toast('Use row-col, e.g. 3-05');$('wbRef').value='';callCell(x.r,x.c);}
$('wbGo').onclick=wbRefGo;$('wbRef').addEventListener('keydown',e=>{if(e.key==='Enter')wbRefGo();});
$('wbSheet').onchange=e=>{S().activeSheet=e.target.value;D.cell=null;save();render();};
function renderWristband(){const show=tab==='game'&&!!game()&&role()==='coach';$('wbCard').classList.toggle('hide',!show);if(!show)return;const sh=curSheet();
  $('wbSheet').innerHTML=sheetOptions(sh);if(!sh){$('wbTbl').innerHTML='';return;}
  const h=curHand(),th=pitcherHand(),ct=S().customTypes;
  $('wbTbl').innerHTML=sheetTable(sh,c=>`<th>${H(c)}</th>`,(row,r,c)=>{const t=row[c]||'';const on=D.cell&&D.cell.sheet===sh.id&&D.cell.r===r&&D.cell.c===c;const bad=t.trim()&&!PC.parseCall(t,h,th,ct);return `<td class="${on?'on':''} ${bad?'bad':''}"><button data-r="${r}" data-c="${c}">${H(t)}</button></td>`;});}
// game result — big buttons. Foul logs immediately; Early / On time / Late can update that pitch for a few seconds. In play opens the drill-down. Cancel logs nothing.
var redoStack=[];
var foulWatch=null,foulTimer=null;
function paintFoulChips(){const el=$('foulChips');if(!el)return;const on=!!foulWatch;el.classList.toggle('hide',!on);if(!on)return;
  const g=game(),p=g&&g.pitches.find(x=>x.id===foulWatch);el.querySelectorAll('[data-ft]').forEach(b=>b.classList.toggle('on',!!(p&&b.dataset.ft===p.foulTime)));
  if(document.body.classList.contains('coachmode')){const band=document.querySelector('.cband');if(band){const r=band.getBoundingClientRect();const st=$('cStatus').getBoundingClientRect();el.style.right='auto';const h=el.offsetHeight||60;let left=Math.max(4,r.left),width=Math.max(148,Math.round(r.width));if(left+width>st.left-4)width=Math.max(148,st.left-4-left);el.style.left=left+'px';el.style.width=width+'px';let top=r.bottom+4;if(top+h>innerHeight-4)top=Math.max(4,r.bottom-h);if(top<r.top)top=r.top;el.style.top=top+'px';}}
  else{el.style.left='';el.style.width='';el.style.right='';el.style.top='';}}
function clearFoulChips(){foulWatch=null;clearTimeout(foulTimer);paintFoulChips();}
function armFoulChips(id){foulWatch=id;clearTimeout(foulTimer);foulTimer=setTimeout(clearFoulChips,FOUL_CHIP_MS);paintFoulChips();}
function applyFoulTime(ft){const g=game();if(!foulWatch||!g)return;const p=g.pitches.find(x=>x.id===foulWatch);if(!p){clearFoulChips();return;}
  p.foulTime=PC.cleanFoul(ft);dirty('pitches',p.id);save();paintFoulChips();}
function persistRedo(){redoStack=PC.redoState(redoStack);if(store.isTest)return;store.real.redo=redoStack.slice();store.save();}
function loadRedo(){redoStack=PC.redoState(store.real&&store.real.redo);}
function clearRedo(){redoStack=[];persistRedo();}
function clearEditUndo(){editUndo=null;}
function pushRedo(item){redoStack=PC.redoPush(redoStack,item);persistRedo();}
$('resBtns').addEventListener('click',e=>{const r=e.target.closest('[data-r]');if(!r)return;if((clearFoulChips(),PC.scoreStep(pullDraft())!=='result')){toast('Tap where it went first');return;}if(r.dataset.r==='inplay'){D.ip=true;D.foul=false;render();return;}recordGame(r.dataset.r);});
$('foulChips').addEventListener('click',e=>{const b=e.target.closest('[data-ft]');if(b)applyFoulTime(b.dataset.ft);});
$('ipBtns').addEventListener('click',e=>{const bb=e.target.closest('[data-bb]');if(bb){D.bb=D.bb===bb.dataset.bb?null:bb.dataset.bb;document.querySelectorAll('#ipBtns [data-bb]').forEach(x=>x.classList.toggle('sel',x.dataset.bb===D.bb));return;}const ip=(e.target.closest('[data-ip]')||{}).dataset?.ip;if(ip==null)return;if(!ip){D.ip=false;render();return;}recordGame('inplay',ip);});
let extraOpen=false;
$('moreTog').onclick=()=>{extraOpen=!extraOpen;$('pitchExtra').classList.toggle('hide',!extraOpen);$('moreTog').setAttribute('aria-expanded',extraOpen?'true':'false');$('moreTog').textContent=extraOpen?'Less':'More';};
document.querySelector('#pitchExtra').addEventListener('click',e=>{const b=e.target.closest('[data-flag]');if(!b)return;D.wpPb=D.wpPb===b.dataset.flag?null:b.dataset.flag;render();});
$('velo').addEventListener('input',e=>{D.velo=e.target.value;});
$('velo').addEventListener('change',e=>{const v=noteVelo(e.target.value);D.velo=v;e.target.value=v==null?'':v;});
function recordGame(result,ip,noPitch){const g=game();if(!g||scoreGuard())return;if(!g.scorer)g.scorer=myDevice();const c=g.cur;if((result==='kd3'||result==='kd3out')&&c.s!==2){toast('Dropped 3rd strike only with 2 strikes');return;}if(g.ended){toast('Game is over');return;}let applied=null;if(!noPitch){applied=PC.scoreApply(pullDraft(),{op:'result',result,ip:ip||null});if(!applied.ok){toast({need_type:D.shook?'Pick the pitch she threw':'Pick the pitch type first',need_called:'Tap the called location first',need_actual:'Tap where it went first'}[applied.reason]||'Finish the pitch first');return;}}if(c.outs>=3){toast('3 outs – tap Next inn first');return;}clearFoulChips();const b=g.lineup[c.slot]||{};
  const r=Object.assign(baseRec(),{inning:c.inning,outsBefore:c.outs,slot:c.slot,batter:b.name||'',batterNum:b.num||'',b:c.b,s:c.s,abn:c.abn,result,ip:ip||null,firstPitch:c.b===0&&c.s===0,prevHand:c.hand||null});
  if(applied){const chart=PC.scoreCommit(applied.draft);if(chart){stampChart(r,chart);r.result=chart.result;if(result==='inplay')r.ip=ip||chart.ip||null;}}
  let o;if(noPitch){o={b:c.b,s:c.s,end:'IBB',outs:0};r.noPitch=true;r.type=null;r.loc=null;r.call=null;r.targets=[];}else{try{o=PC.applyPitch(c,result,ip);}catch(e){toast(String(e.message||e));return;}}
  if(result==='inplay'&&PC.BB_TYPES.includes(D.bb))r.bb=D.bb;if(result==='inplay'&&D.spray)r.spray=D.spray;if(result==='foul')r.foulTime=null;r.mode='game';if(noPitch){r.calledLoc=null;r.actualLoc=null;r.calledType=null;r.wpPb=null;r.velo=null;}const inn0=c.inning;const pcBefore=PC.pitchCount(g.pitches,r.pitcherId);r.end=o.end;clearRedo();clearEditUndo();g.pitches.push(r);dirty('pitches',r.id);dirty('games',g.id);c.b=o.b;c.s=o.s;if(result==='foul')armFoulChips(r.id);
  if(o.end){c.outs+=o.outs;let msg={BB:'Walk',K:'Strikeout',HBP:'Hit by pitch',IBB:'Intentional walk','K-D3':'Strikeout – reached on dropped 3rd',out:'Out',E:'Reached on error',FC:"Fielder's choice",DP:'Double play'}[o.end]||o.end;
    c.b=0;c.s=0;c.abn++;c.slot=(c.slot+1)%Math.max(1,g.lineup.length);c.hand=null;
    if(c.outs>=3){c.outs=0;c.inning++;msg+=' · side retired';sideCard={inning:inn0,gameId:g.id};}toast(msg);}
  confirmSave(o.end?({BB:'Walk',K:'Strikeout','K-D3':'K (D3)',HBP:'HBP',IBB:'IBB'}[o.end]||o.end):`${{ball:'Ball',called:'Strike',swinging:'Swing & miss',foul:'Foul',foultip:'Foul tip',inplay:'In play'}[result]||result} · ${c.b}-${c.s}`);
  pcCheck(r.pitcherId,pcBefore,PC.pitchCount(g.pitches,r.pitcherId));
  resetDraft();save();render();if(oneHand())advance('call');}
$('ibb').onclick=async()=>{if(scoreGuard())return;if(await ask('Intentional walk (no pitches counted, per GC)?',false))recordGame('ibb',null,true);};
function undoLast(){if(scoreGuard())return;
  if(D.bbAsk){D.bbAsk=null;render();return;}
  if(D.ip){D.ip=false;D.spray=null;render();return;}
  if(D.draft&&D.draft.actual!=null){pushRedo({kind:'loc',loc:D.draft.actual,sheet:!!D.sheet});D.draft.actual=null;D.draft.result=null;mirrorDraft();D.sheet=false;render();toast('Location cleared');return;}
  if(tab!=='game'&&((D.draft&&D.draft.called&&D.draft.called.length)||D.callTxt)){pushRedo({kind:'aim',called:aimSet(),callTxt:D.callTxt,type:D.type,parsed:D.parsed});if(D.draft&&D.draft.called&&D.draft.called.length){D.draft.called=[];mirrorDraft();}else resetDraft();render();return;}
  if(editUndo){const snap=editUndo;if(undoEditSnap(snap)){toast('Location restored');return;}}
  if(tab==='game'){const g=game();if(!g||!g.pitches.length)return toast('Nothing to undo');const after={inning:g.cur.inning,outs:g.cur.outs,slot:g.cur.slot,b:g.cur.b,s:g.cur.s,abn:g.cur.abn,hand:g.cur.hand};const r=g.pitches.pop();store.tombstone(r,{mode:'game',game_id:g.id});dirty('games',g.id);
    Object.assign(g.cur,{inning:r.inning,outs:r.outsBefore,slot:r.slot,b:r.b,s:r.s,abn:r.abn,hand:r.prevHand});if(r.id===foulWatch)clearFoulChips();pushRedo({kind:'pitch',mode:'game',box:g.id,pitch:r,after});}
  else{const s=session();if(!s||!s.pitches.length)return toast('Nothing to undo');const r=s.pitches.pop();store.tombstone(r,{mode:'bullpen',session_id:s.id});pushRedo({kind:'pitch',mode:'bullpen',box:s.id,pitch:r});}
  resetDraft();save();render();toast('Last pitch undone');}
function redoLast(){if(scoreGuard())return;const t=PC.redoPop(redoStack);redoStack=t.stack;persistRedo();const a=t.item;if(!a)return toast('Nothing to redo');
  if(a.kind==='loc'){if(!D.draft)D.draft=blankDraft();D.draft.actual=a.loc;mirrorDraft();if(a.sheet)D.sheet=true;render();return;}
  if(a.kind==='aim'){D.callTxt=a.callTxt||'';D.parsed=a.parsed;$('callTxt').value=D.callTxt;takeDraft(PC.scoreApply({mode:tab==='bullpen'?'bullpen':'game'},{op:'call',type:a.type,called:a.called&&a.called.length?a.called:(a.target?[a.target]:[])}));render();return;}
  const box=a.mode==='game'?S().games.find(g=>g.id===a.box):S().sessions.find(s=>s.id===a.box);if(!box)return toast('Nothing to redo');
  store.untomb(a.pitch.id);box.pitches.push(a.pitch);dirty('pitches',a.pitch.id);if(a.mode==='game'&&a.after){Object.assign(box.cur,a.after);dirty('games',box.id);}
  resetDraft();save();render();toast('Pitch restored');}
$('undo').onclick=undoLast;$('redo').onclick=redoLast;
// game controls
$('outPlus').onclick=()=>{if(scoreGuard())return;const c=game().cur;c.outs++;if(c.outs>=3){c.outs=0;c.inning++;c.b=0;c.s=0;toast('Side retired');}dirty('games',game().id);save();render();};
$('outMinus').onclick=()=>{if(scoreGuard())return;const c=game().cur;if(c.outs>0)c.outs--;dirty('games',game().id);save();render();};
$('innPlus').onclick=()=>{if(scoreGuard())return;const c=game().cur;c.inning++;c.outs=0;c.b=0;c.s=0;dirty('games',game().id);save();render();};
$('batter').onchange=async e=>{const c=game().cur;if(c.b||c.s){if(!await ask('Count is not 0-0. Switch batter anyway?',false)){render();return;}}c.slot=+e.target.value;c.b=0;c.s=0;c.abn++;c.hand=null;dirty('games',game().id);save();render();};
$('bHand').onclick=()=>setHand(curHand()==='L'?'R':'L');
$('pitcher').onchange=e=>{S().curPitcher=e.target.value;save();render();if(tab==='game'&&game())toast('Pitching change: '+pName(e.target.value));};
// ---------- game / bullpen are mutually exclusive on this device (PC.modeLock) ----------
const canGame=()=>ROLE_TABS[role()].includes('game');
async function endGame(){const g=game();if(!g||scoreGuard()||!await ask(PC.endMsg(g),true))return;if(!PC.endGame(S(),g.id,true))return;dirty('games',g.id);save();render();}
async function discardDraft(id){const g=(S().games||[]).find(x=>x.id===id);if(!g||!PC.canDiscard(g,myDevice())||!await ask(PC.discardMsg(g),true))return;if(!PC.discardGame(S(),id,true,myDevice()))return;dirty('games',id);save();render();}
function pauseGame(){const g=game();if(!g||scoreGuard())return;PC.pauseGame(S());resetDraft();save();render();toast('Game paused – resume it from the Game tab');}
function resumeGame(id){const s=session();if(canGame()&&PC.sessionOpen(s))return toast(PC.LOCK_MSG.bullpen);const pid=PC.gamePitcherId(S().games.find(x=>x.id===id));if(pid)S().curPitcher=pid;S().activeGame=id;resetDraft();save();render();toast('Game resumed');}
function endBullpen(){const s=session();if(!s||scoreGuard())return;if(!s.pitches.length)return toast('No pitches in this session yet');delete s.paused;openReport(s);S().activeSession=null;resetDraft();save();render();}
function pauseBullpen(){const s=session();if(!s||scoreGuard())return;if(s.pitches.length)s.paused=Date.now();S().activeSession=null;resetDraft();save();render();toast('Bullpen paused – resume it from the Bullpen tab');}
function resumeBullpen(id){if(canGame()&&PC.gameInProgress(game()))return toast(PC.LOCK_MSG.game);const s=S().sessions.find(x=>x.id===id);if(!s)return;delete s.paused;S().activeSession=id;resetDraft();save();render();toast('Bullpen resumed');}
$('gEnd').onclick=endGame;$('gPause').onclick=pauseGame;$('lkEndG').onclick=endGame;$('lkPauseG').onclick=pauseGame;$('lkGoG').onclick=()=>{tab='game';render();};
$('lkEndBp').onclick=endBullpen;$('lkPauseBp').onclick=pauseBullpen;$('bpPause').onclick=pauseBullpen;
$('bpResume').onclick=()=>{const x=PC.pausedSessions(S())[0];if(x)resumeBullpen(x.id);};
$('pickList').addEventListener('click',e=>{const d=e.target.closest('[data-dd]');if(d)return discardDraft(d.dataset.dd);const sg=e.target.closest('[data-sg]');if(sg)return startScheduled(sg.dataset.sg);const b=e.target.closest('[data-rg]');if(b)resumeGame(b.dataset.rg);});
function renderModeLock(){const s=S(),lk=PC.modeLock(s,tab,canGame());
  $('lockBp').classList.toggle('hide',!(lk&&lk.by==='game'));$('lockGame').classList.toggle('hide',!(lk&&lk.by==='bullpen'));
  if(lk&&lk.by==='game'){const g=lk.game;$('lockBp').querySelector('.lockMsg').textContent=PC.LOCK_MSG.game;$('lockBpSub').textContent=`${vsAt(g)} ${g.opponent||''} · inning ${g.cur.inning} · ${PC.pitchCount(g.pitches)} pitches`;}
  if(lk&&lk.by==='bullpen'){const x=lk.session;$('lockGame').querySelector('.lockMsg').textContent=PC.LOCK_MSG.bullpen;$('lockGameSub').textContent=`${x.pitcherId?pName(x.pitcherId)+' · ':''}${x.pitches.length} pitches`;}
  $('bpCard').classList.toggle('hide',!!(lk&&lk.by==='game'));
  const showPick=tab==='game'&&!game()&&!lk&&canGame();const pg=showPick?PC.pausedGames(s):[];
  const g=game(),sch=PC.todaysScheduled(s,today()),land=LANDSCAPE.matches,move=land&&showPick;
  $('gamePick').classList.toggle('hide',!showPick);$('pickEmpty').classList.toggle('hide',!showPick||pg.length||(move&&sch.length));
  const html=sch.map(x=>`<div class="prow"><button data-sg="${H(x.id)}" class="primary startg"><b>Start</b> ${H((x.date||'').slice(5))} ${H(x.time||'')} ${vsAt(x)} ${H(x.opponent)}<br><small>${[x.gameNo,x.field,x.location].filter(Boolean).map(H).join(' · ')}</small></button>${x.link&&/^https:\/\//.test(x.link)?`<a href="${H(x.link)}" target="_blank" rel="noopener" class="gclink">GC</a>`:''}</div>`).join('');
  $('pickList').innerHTML=(move?html:'')+pg.map(pickRow).join('');
  $('schedList').innerHTML=move?'':html;
  $('schedCard').classList.toggle('hide',!(tab==='game'&&!g&&!lk&&sch.length)||land);
  const ps=tab==='bullpen'&&!session()&&!lk?PC.pausedSessions(s):[];$('bpResume').classList.toggle('hide',!ps.length);if(ps.length)$('bpResume').textContent=`▶ Resume paused bullpen (${ps[0].pitcherId?pName(ps[0].pitcherId)+', ':''}${ps[0].pitches.length} pitches)`;
  return lk;}
// new game form
let draftLineup=[];function blankLineup(){draftLineup=Array.from({length:9},(_,i)=>({slot:i+1,name:'',num:'',hand:'R'}));}
blankLineup();
function renderLineupForm(){$('gLineup').innerHTML=draftLineup.map((b,i)=>`<div class="prow"><span class="mut" style="width:20px">${i+1}</span><input data-i="${i}" data-f="name" value="${H(b.name)}" placeholder="Name"><input data-i="${i}" data-f="num" value="${H(b.num)}" placeholder="#" style="width:56px;flex:none" inputmode="numeric"><button data-i="${i}" data-f="hand" style="width:52px">${b.hand}</button></div>`).join('');}
$('gLineup').addEventListener('input',e=>{const{i,f}=e.target.dataset;if(f)draftLineup[i][f]=e.target.value;});
$('gLineup').addEventListener('click',e=>{const{i,f}=e.target.dataset;if(f==='hand'){draftLineup[i].hand=draftLineup[i].hand==='L'?'R':'L';renderLineupForm();}});
$('gAddB').onclick=()=>{draftLineup.push({slot:draftLineup.length+1,name:'',num:'',hand:'R'});renderLineupForm();};
const vsAt=g=>g.homeAway==='away'?'@':'vs';
// One tap starts a game that schedule sync already filled in. Lineup can be edited after it starts.
function startScheduled(id,opponent){if(canGame()&&PC.sessionOpen(session()))return toast(PC.LOCK_MSG.bullpen);const g=S().games.find(x=>x.id===id);if(!g||PC.gameStatus(g)!=='scheduled')return;
  const lineup=(g.lineup&&g.lineup.length)?g.lineup.map((b,i)=>({slot:i+1,name:String(b.name||'').trim()||('Batter '+(i+1)),num:String(b.num||'').trim(),hand:b.hand==='L'?'L':'R'})):Array.from({length:9},(_,i)=>({slot:i+1,name:'Batter '+(i+1),num:'',hand:'R'}));
  const opp=opponent==null?g.opponent:opponent;
  const msg=PC.createGameMsg({opponent:opp,pitcherId:curPitcherId()});if(msg)return toast(msg);
  if(!PC.createGame(S(),{opponent:opp,pitcherId:curPitcherId(),scheduledId:id,date:g.date||today(),event:g.event||'',homeAway:g.homeAway||'tbd',lineup,scorer:myDevice()}))return;
  dirty('games',id);save();resetDraft();clearRedo();clearEditUndo();render();toast('Game on');}
$('schedList').addEventListener('click',e=>{if(e.target.closest('a'))return;const b=e.target.closest('[data-sg]');if(b)startScheduled(b.dataset.sg);});
let setupSchedId=null;
function paintConfirm(){$('gStart').disabled=!!PC.createGameMsg({opponent:$('gOpp').value,pitcherId:$('gPitcher').value});}
function openSetup(){if(canGame()&&PC.sessionOpen(session()))return toast(PC.LOCK_MSG.bullpen);setupSchedId=null;const cur=curPitcherId();
  $('gPitcher').innerHTML='<option value=""></option>'+store.activePitchers().map(p=>`<option value="${H(p.id)}"${p.id===cur?' selected':''}>${H(PC.pitcherLabel(p))}</option>`).join('');
  if(!$('gDate').value)$('gDate').value=today();
  $('setupSched').innerHTML=PC.todaysScheduled(S(),today()).map(x=>`<button type="button" class="ghost" data-fill="${H(x.id)}">${H(x.opponent||'Game')}</button>`).join('');
  paintConfirm();openSheet($('setupDlg'));}
function pickRow(x){const who=H(PC.pitcherLabel(pById(PC.gamePitcherId(x)))),when=H([x.date,x.time].filter(Boolean).join(' '));
  const meta=PC.gameDraft(x)?`${H(vsAt(x))} ${H(x.opponent)} <span class="drafttag">Draft</span><br><small class="mut">${who}${when?' · '+when:''}</small>`:`${H(vsAt(x))} ${H(x.opponent)}<br><small class="mut">${who}${when?' · '+when:''} · ${PC.pitchCount(x.pitches)} pitches · inning ${x.cur?x.cur.inning:1}</small>`;
  const dis=PC.canDiscard(x,myDevice())?`<button type="button" class="gdismiss" data-dd="${H(x.id)}">Discard</button>`:'';
  return `<div class="grow"><div class="gmeta">${meta}</div>${dis}<button type="button" class="primary resume" data-rg="${H(x.id)}">Resume</button></div>`;}
$('pickNew').onclick=openSetup;$('setupCancel').onclick=()=>$('setupDlg').close('cancel');
$('gOpp').addEventListener('input',paintConfirm);$('gPitcher').addEventListener('change',paintConfirm);
$('setupSched').addEventListener('click',e=>{const b=e.target.closest('[data-fill]');if(!b)return;const g=S().games.find(x=>x.id===b.dataset.fill);if(!g)return;setupSchedId=g.id;$('gOpp').value=g.opponent||'';if(g.homeAway)$('gHA').value=g.homeAway;if(g.date)$('gDate').value=g.date;$('gEvent').value=g.event||'';paintConfirm();});
$('gStart').onclick=()=>{if($('gStart').disabled)return;if(canGame()&&PC.sessionOpen(session()))return toast(PC.LOCK_MSG.bullpen);const pid=$('gPitcher').value;if(pid)S().curPitcher=pid;
  if(setupSchedId){const id=setupSchedId,opp=$('gOpp').value;setupSchedId=null;$('setupDlg').close();return startScheduled(id,opp);}
  const lineup=draftLineup.map((b,i)=>({slot:i+1,name:b.name.trim()||('Batter '+(i+1)),num:b.num.trim(),hand:b.hand}));
  const o={opponent:$('gOpp').value,pitcherId:pid,date:$('gDate').value||today(),event:$('gEvent').value.trim(),homeAway:$('gHA').value,lineup,scorer:myDevice()};
  const msg=PC.createGameMsg(o);if(msg)return toast(msg);const g=PC.createGame(S(),o);if(!g)return;
  $('setupDlg').close();$('gOpp').value='';dirty('games',g.id);blankLineup();save();resetDraft();clearRedo();clearEditUndo();render();toast('Game on! Pick your pitcher up top.');};
// result picker = bottom sheet over the tab bar; wristband = toggle sheet (one tap away, never pushes the zone)
function placeScoreDock(){const open=!$('resSheet').classList.contains('hide');const dest=open?$('bsFoot'):$('urHome');const undo=$('undo'),redo=$('redo');if(undo.parentNode!==dest)dest.appendChild(undo);if(redo.parentNode!==dest)dest.appendChild(redo);}
$('resTog').onclick=()=>{if(PC.scoreStep(pullDraft())!=='result'){toast('Tap where it went first');return;}D.sheet=true;render();};$('resClose').onclick=()=>{D.sheet=false;D.ip=false;D.foul=false;render();};
$('wbTog').onclick=()=>{$('wbDet').open=!$('wbDet').open;};
$('wbDet').addEventListener('toggle',()=>{const o=$('wbDet').open;document.body.classList.toggle('wbopen',o);$('wbTog').setAttribute('aria-expanded',String(o));});
// Edit a past pitch's actual location. The list stays; later pitches are not undone.
// The last edit is what Undo reverses, until a new pitch is logged.
var editId=null,editLoc=null,editUndo=null;
function undoEditSnap(snap){if(!snap)return false;const hit=findPitch(snap.id);if(!hit||!editAllowed(hit))return false;const changed=PC.revertEdit(hit.p,snap);if(editUndo&&editUndo.id===snap.id)editUndo=null;if(!changed)return true;dirty('pitches',hit.p.id);save();render();return true;}
function findPitch(id){const s=S();
  for(const g of s.games||[]){const p=(g.pitches||[]).find(x=>x.id===id);if(p)return{p:p,box:g};}
  for(const x of s.sessions||[]){const p=(x.pitches||[]).find(q=>q.id===id);if(p)return{p:p,box:x};}
  return null;}
function editAllowed(hit){return !!hit&&PC.canEditBox(hit.box,myDevice(),role());}
function paintEdit(){const hit=findPitch(editId);if(!hit)return;const p=hit.p,th=pById(p.pitcherId);
  zoneSVG($('editZone'),p.hand==='L'?'L':(p.hand==='N'?'N':'R'),{orient:true,compact:true,throws:th&&th.throws?th.throws:'R'});
  if(editLoc!=null&&editLoc<=18){const e=$('editZone').querySelector('[data-z="'+editLoc+'"]');if(e)e.classList.add('za');}
  document.querySelectorAll('#editWay [data-z],#editAct [data-z]').forEach(b=>b.classList.toggle('sel',+b.dataset.z===editLoc));
  $('editPick').textContent=editLoc!=null?'Actual location: '+locTxt(editLoc):'Tap where it actually went';}
function openEdit(id){const hit=findPitch(id);if(!hit)return;if(!editAllowed(hit))return toast('Only the scoring phone can change a pitch.');
  editId=id;editLoc=PC.actualOf(hit.p);
  $('editSub').textContent='Aim and result stay the same.';
  paintEdit();openSheet($('editDlg'));}
function pickEdit(z){z=+z;if(!PC.validActual(z))return;editLoc=z;paintEdit();}
function onPitchTap(e){const b=e.target.closest('[data-edit]');if(b)openEdit(b.dataset.edit);}
$('log').addEventListener('click',onPitchTap);$('recent').addEventListener('click',onPitchTap);$('pitchList').addEventListener('click',onPitchTap);
$('editZone').addEventListener('click',e=>{const svg=$('editZone');const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const m=svg.getScreenCTM();if(!m)return;const p=pt.matrixTransform(m.inverse());const z=zoneAt(p.x,p.y);if(z)pickEdit(z);});
$('editWay').addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(b)pickEdit(+b.dataset.z);});
$('editAct').addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(b)pickEdit(+b.dataset.z);});
$('editDlg').addEventListener('close',()=>{const id=editId;editId=null;if($('editDlg').returnValue!=='ok')return;const hit=findPitch(id);
  if(!hit||!editAllowed(hit))return toast('Only the scoring phone can change a pitch.');if(editLoc==null)return toast('Tap where it actually went');
  const n=hit.box.pitches.length,snap=Object.assign({id},PC.editSnap(hit.p));
  if(!PC.editActual(hit.p,editLoc)||hit.box.pitches.length!==n)return;
  const calledNow=hit.p.calledLoc==null?null:hit.p.calledLoc,nowX=hit.p.actual_x==null?null:hit.p.actual_x,nowY=hit.p.actual_y==null?null:hit.p.actual_y,nowXY=hit.p.xy_loc==null?null:hit.p.xy_loc;
  if(hit.p.loc===snap.loc&&hit.p.actualLoc===snap.actualLoc&&calledNow===snap.calledLoc&&!!hit.p.edited===snap.edited&&nowX===snap.actual_x&&nowY===snap.actual_y&&nowXY===snap.xy_loc)return;
  editUndo=snap;
  dirty('pitches',hit.p.id);save();render();undoToast('Location updated',()=>{if(undoEditSnap(snap))toast('Location restored');},5000);});
loadRedo();
const FOUL_CHIP_MS=3000;
