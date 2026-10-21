/* Thunder Elite pitch charting – UI bullpen.js: Bullpen view: logging bullpen pitches, sessions, bullpen step prompts.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
function logBullpen(){if(role()==='viewer'||scoreGuard())return;if(canGame()&&PC.gameInProgress(game()))return toast(PC.LOCK_MSG.game);const chart=PC.scoreCommit(pullDraft());if(!chart)return toast('Tap where it went');let s=session();if(!s||(role()==='player'&&s.pitcherId!==store.real.sync.pitcherId)||(role()==='pcoach'&&s.pitcherId!==curPitcherId()))s=newSession();
  const r=baseRec();r.b=0;r.s=0;r.mode='bullpen';stampChart(r,chart);delete r.result;if(!s.scorer){s.scorer=myDevice();dirty('sessions',s.id);}clearRedo();if(typeof clearEditUndo==='function')clearEditUndo();s.pitches.push(r);dirty('pitches',r.id);save();
  const ok=PC.hitSpot(r);const aim=PC.calledOf(r);const act=PC.actualOf(r);confirmSave(`${r.type||'?'} ${aim!=null?aim+' → ':''}${locTxt(act).replace('@','')}${aim!=null?(ok?' ✓':' ✗'):''}`);
  const sticky=r.type;resetDraft();D.type=sticky;render();} // pitch type is sticky: the next pitch starts at the aim step
function newSession(){const s=PC.blankSession({id:'s_'+PC.uid(),date:today(),started:Date.now(),scorer:myDevice()});if(role()==='player')s.pitcherId=store.real.sync.pitcherId;if(role()==='pcoach')s.pitcherId=curPitcherId();S().sessions.push(s);S().activeSession=s.id;dirty('sessions',s.id);save();return s;}
$('bpNew').onclick=()=>{if(canGame()&&PC.gameInProgress(game()))return toast(PC.LOCK_MSG.game);newSession();resetDraft();render();toast('New bullpen session');};
// last pitch + session line (the step line already says what to tap next)
function bpLast(){const x=session();const ps=x?x.pitches.filter(p=>!p.deleted):[];if(!ps.length)return '';const p=ps[ps.length-1],q=PC.summarize(ps);
  const aim=PC.calledOf(p);const act=PC.actualOf(p);return `Last: <b>${H(p.type||'?')} ${aim!=null?aim+' → ':''}${H(locTxt(act).replace('@',''))}</b>${aim!=null?(PC.hitSpot(p)?' ✓':' ✗'):''} · ${ps.length} pitch${ps.length>1?'es':''}${q.spotPct!=null?' · '+fmt(q.spotPct)+' hit spot':''}`;}
function bpPhase(){const l=bpLast();const st=PC.scoreStep(pullDraft());if(l&&st==='called'&&D.type)return l;const it=aimSet().join('/');
  return st==='type'?'<b>1.</b> Choose the pitch':st==='called'?`<b>2.</b> ${H(D.type||(D.parsed&&D.parsed.type)||'')} – tap the <b>intended</b> spot`:`<b>3.</b> ${H(D.type||(D.parsed&&D.parsed.type)||'')} → ${H(it)} – tap where it <b>actually</b> went`;}
$('bpEnd').onclick=endBullpen;
$('bpHands').addEventListener('change',e=>{const st=ensureSettings();st.showBatterHand=!!e.target.checked;if(!st.showBatterHand)bpHand='N';e.target.blur();save();render();requestAnimationFrame(()=>requestAnimationFrame(()=>scrollTo(0,0)));});
