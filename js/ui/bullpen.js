/* Thunder Elite pitch charting – UI bullpen.js: Bullpen view: logging bullpen pitches, sessions, bullpen step prompts.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
function logBullpen(targets){if(role()==='viewer')return;if(canGame()&&PC.gameInProgress(game()))return toast(PC.LOCK_MSG.game);let s=session();if(!s||(role()==='player'&&s.pitcherId!==store.real.sync.pitcherId)||(role()==='pcoach'&&s.pitcherId!==curPitcherId()))s=newSession();const r=baseRec();r.b=0;r.s=0;if(targets)r.targets=targets;s.pitches.push(r);dirty('pitches',r.id);save();
  const ok=PC.hitSpot(r);buzz(25);toast(`${r.type||'?'} ${locTxt(r.loc)}${r.targets.length?(ok?' ✓ hit spot':' ✗ missed'):''}`);resetDraft();render();}
function newSession(){const s={id:'s_'+PC.uid(),date:new Date().toISOString().slice(0,10),started:Date.now(),pitches:[]};if(role()==='player')s.pitcherId=store.real.sync.pitcherId;if(role()==='pcoach')s.pitcherId=curPitcherId();S().sessions.push(s);S().activeSession=s.id;dirty('sessions',s.id);save();return s;}
$('bpNew').onclick=()=>{if(canGame()&&PC.gameInProgress(game()))return toast(PC.LOCK_MSG.game);newSession();resetDraft();render();toast('New bullpen session');};
function bpPhase(){const st=PC.bullpenStep({type:D.type||(D.parsed&&D.parsed.type),target:D.target,callTargets:callOn&&D.parsed?D.parsed.targets:[]});
  const it=(callOn&&D.parsed&&D.parsed.targets.length)?D.parsed.targets.join('/'):D.target;
  return st==='type'?'<b>1.</b> Choose the pitch':st==='target'?`<b>2.</b> ${H(D.type||D.parsed.type)} – tap the <b>intended</b> spot`:`<b>3.</b> ${H(D.type||D.parsed.type)} → ${it} – tap where it <b>actually</b> went`;}
$('bpEnd').onclick=endBullpen;
