/* Thunder Elite pitch charting – UI main.js: Render loop, navigation, startup.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
// ---------- render ----------
// current-step indicator above the zone: Pitch → Aim → Landed (bullpen), Pitch → Location → Result (game)
function renderSteps(){const mode=tab==='bullpen'?'bullpen':'game';const steps=PC.flowSteps(mode);const cur=PC.scoreStep(pullDraft());let i=steps.indexOf(cur);if(i<0)i=steps.length;const ol=$('steps');
  ol.style.setProperty('--steps',String(steps.length));ol.classList.toggle('s4',steps.length>3);
  ol.innerHTML=steps.map((s,k)=>{const lb=s==='actual'&&mode==='bullpen'?'Landed':PC.flowLabel(s);const cls=k<i?'done':k===i?'now':'';return `<li class="${cls}"${k===i?' aria-current="step"':''}>${lb}</li>`;}).join('');}
function render(skipCallInput){const s=S();applyViewOnly(viewOnly());if(typeof renderShake==='function')renderShake();{const gg=game();const two=!!(gg&&gg.cur&&gg.cur.s===2);document.querySelectorAll('#resBtns [data-r="kd3"],#resBtns [data-r="kd3out"]').forEach(kb=>{kb.classList.toggle('hide',!two);kb.disabled=!two;});}document.body.classList.toggle('test',store.isTest);document.body.classList.toggle('onehand',oneHand());document.body.classList.toggle('tab-game',tab==='game');$('oneHand').checked=oneHand();try{renderAlerts();renderAlertCard();}catch(e){console.error(e);}$('testbar').classList.toggle('hide',!store.isTest);
  $('testBtn').textContent=store.isTest?'Exit test mode (discard)':'Start test mode';$('testBtn').style.background=store.isTest?'var(--red)':'';
  callOn=!!s.callOn;$('callOn').checked=callOn;$('callBox').classList.toggle('hide',!callOn);try{renderWristband();renderCS();}catch(e){console.error(e);}
  const R0=role(),tabs=ROLE_TABS[R0];if(!tabs.includes(tab))tab=tabs[0];
  document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('hide',!tabs.includes(b.dataset.t));b.classList.toggle('on',b.dataset.t===tab);});
  document.body.dataset.role=R0;$('addPQuick').classList.toggle('hide',R0!=='coach');$('jerseyEdit').classList.toggle('hide',R0!=='coach');$('pitcher').disabled=!(R0==='coach'||(R0==='pcoach'&&mine().length>1));
  ['pCard','rosterCard','impJSON','impCSV'].forEach(id=>$(id).classList.toggle('hide',R0!=='coach'));
  $('roleMsg').textContent=R0==='coach'?'':R0==='player'?`Player code: log your bullpens and view your own games (${store.real.sync.pitcherName||"your"} data only).`:R0==='pcoach'?`Pitching-coach code: view and score bullpens for your pitchers (${(mine()||[]).map(pName).join(', ')||'none yet – tap Sync now'}); add notes for their reports.`:R0==='unknown'?'Code not recognized – check it for typos. Nothing is sent until it is fixed; your unsent data stays on this phone.':'View-only code: you can look, not change.';$('roleMsg').classList.toggle('hide',R0==='coach');
  const cp=curPitcherId();
  $('pitcher').innerHTML=store.activePitchers().filter(p=>(R0!=='player'||p.id===cp)&&vis(p.id)).map(p=>`<option value="${H(p.id)}" ${p.id===cp?'selected':''}>${H(PC.pitcherLabel(p))}</option>`).join('')||'<option>Add a pitcher</option>';
  const g=game();
  $('modeTag').textContent=(store.isTest?'TEST · ':'')+(tab==='game'?(g?'GAME':'NO GAME'):tab==='bullpen'?'BULLPEN':tab.toUpperCase());
  ['game','bullpen','stats','setup'].forEach(t=>$('tab-'+t).classList.toggle('hide',t!==tab));
  const lk=renderModeLock();const showEntry=!lk&&((tab==='game'&&g)||tab==='bullpen');$('entry').classList.toggle('hide',!showEntry);document.body.classList.toggle('entrymode',showEntry);
  // sync chip: logo row normally; while charting the logo row hides, so it moves (compact) next to the pitcher
  {const st=$('syncTag'),home=showEntry?$('addPQuick'):$('modeTag');if(st.nextSibling!==home)home.parentNode.insertBefore(st,home);}
  $('gameHead').classList.toggle('hide',!(tab==='game'&&g));
  $('inGame').classList.toggle('hide',!g);
  if(tab==='game'&&!g){renderLineupForm();if(!$('gDate').value)$('gDate').value=today();}
  const hand=curHand();$('batTog').textContent=(hand==='N'?'Batter: none':hand==='L'?'Batter: LHB':'Batter: RHB')+' ▾';$('batTog').setAttribute('aria-label','Batter: '+(hand==='N'?'none':hand==='L'?'left-handed':'right-handed')+' – change');$('hL').classList.toggle('sel',hand==='L');$('hR').classList.toggle('sel',hand==='R');$('hN').classList.toggle('sel',hand==='N');$('hN').classList.toggle('hide',tab==='game');
  const showHands=tab!=='bullpen'||!!(S().settings&&S().settings.showBatterHand);$('hL').classList.toggle('hide',!showHands);$('hR').classList.toggle('hide',!showHands);if($('bpHands'))$('bpHands').checked=!!(S().settings&&S().settings.showBatterHand);
  $('bpTest').textContent=store.isTest?'🧪 Test mode ON – tap to exit (discard)':'🧪 Start test mode (not saved)';$('bpTest').style.background=store.isTest?'var(--red)':'';$('bpTest').setAttribute('aria-pressed',String(store.isTest));
  if(g){const c=g.cur;$('inn').textContent=c.inning;$('cnt').textContent=c.b+'-'+c.s;$('outs').innerHTML=[0,1,2].map(i=>`<span class="${i<c.outs?'on':''}"></span>`).join('');
    $('pc').textContent=PC.pitchCount(g.pitches,cp);
    $('gTitle').textContent=`${g.date} ${vsAt(g)} ${g.opponent}`;$('gSub').innerHTML=[g.gameNo,g.time,g.field,g.event,g.homeAway==='tbd'?'H/A TBD':''].filter(Boolean).map(H).join(' · ')+(g.link&&/^https:\/\//.test(g.link)?` · <a href="${H(g.link)}" target="_blank" rel="noopener" style="color:var(--acc);font-weight:700">GameChanger ↗</a>`:'');
    $('batter').innerHTML=g.lineup.map((b,i)=>`<option value="${H(i)}" ${i===c.slot?'selected':''}>${i+1}. ${b.num?'#'+H(b.num)+' ':''}${H(b.name)} (${H(b.hand)})</option>`).join('');
    $('bHand').textContent='Bats '+hand;}
  // entry
  const types=allTypes();
  $('types').innerHTML=types.map(t=>`<button data-c="${H(t.code)}" class="${D.type===t.code?'sel':''}" title="${H(t.name)}" aria-label="${H(t.name)}" aria-pressed="${D.type===t.code}">${H(t.code)}</button>`).join('');
  $('callTypes').innerHTML=types.map(t=>`<button data-c="${H(t.code)}" class="${D.parsed&&D.parsed.type===t.code?'sel':''}">${H(t.code)}</button>`).join('');
  $('callSuf').innerHTML=['IN','A','H+','O','H','L'].map(x=>`<button data-s="${x}" class="${D.parsed&&D.parsed.suffix===x?'sel':''}">${x==='A'?'A (waste)':x==='H+'?'H+ (waste)':x}</button>`).join('')+'<button data-s="">no loc</button>';
  if(skipCallInput!==true)$('callTxt').value=D.callTxt;
  $('callAlt').innerHTML=D.parsed&&D.parsed.alts&&D.parsed.alts.length?D.parsed.alts.concat(D.parsed.targets).filter((z,i,x)=>x.indexOf(z)===i).map(z=>`<button data-alt="${z}" class="${(D.target||D.parsed.targets[0])===z?'sel':''}">CB → ${z}</button>`).join(''):'';
  $('callDesc').textContent=D.callTxt?(D.parsed?`${D.parsed.norm} = ${types.find(t=>t.code===D.parsed.type)?.name||D.parsed.type}${D.parsed.targets.length?' → zone '+D.parsed.targets.join('/'):' → tap target on grid'}${D.target?' '+D.target:''} · ${D.parsed.desc}`:'Unrecognized code'):'Type a code or tap buttons. Digits = zone (pitcher\'s view).';
  renderSteps();
  const step=PC.scoreStep(pullDraft()),aims=aimSet();
  const aimNote=PC.aimNote(pullDraft());
  $('phase').innerHTML=aimNote?H(aimNote):tab==='bullpen'?bpPhase():step==='type'?'Pick the pitch type':step==='called'?'Tap the <b>called target</b> on the grid':step==='actual'?'Tap where it went':`Tap the result${aims.length?` · ${aims.join('/')} → ${locTxt(D.loc)}`:''}`;
  $('resBtns').classList.toggle('hide',!!D.ip);$('ipBtns').classList.toggle('hide',!D.ip);
  $('undo').textContent=D.loc?'Undo location':(editUndo?'Undo edit':tab==='bullpen'&&(D.type||D.target||D.callTxt)?'Undo step':'Undo');
  $('redo').disabled=!redoStack.length;$('pRedo').disabled=!redoStack.length;
  if(D.loc==null)D.sheet=false;const onResult=tab==='game'&&D.loc!=null&&PC.scoreStep(pullDraft())==='result';if(!onResult)D.ip=D.ip&&onResult;
  const sheet=tab==='game'&&!!(D.ip||(onResult&&D.sheet));$('resSheet').classList.toggle('hide',!sheet);$('resTog').classList.toggle('hide',tab!=='game');
  const aimTxt=aimSet();$('resHead').textContent=D.ip?'Ball in play':D.loc?`Result · ${D.type?D.type+' ':''}${aimTxt.length?aimTxt.join('/')+' → ':''}${locTxt(D.loc)}`:'Result';
  if(typeof placeScoreDock==='function')placeScoreDock();
  document.querySelectorAll('#pitchExtra [data-flag]').forEach(b=>b.classList.toggle('sel',b.dataset.flag===D.wpPb));
  if(document.activeElement!==$('velo'))$('velo').value=D.velo==null?'':D.velo;
  const wbOn=!$('wbCard').classList.contains('hide');$('wbTog').classList.toggle('hide',!wbOn);if(!wbOn)$('wbDet').open=false;
  renderModes(lk,showEntry);drawZone();fitZone();if(typeof paintFoulChips==='function')paintFoulChips();
  {const msg=(window.PC_CONFIG&&window.PC_CONFIG.banner)||'';
   const both=!!(store.isTest&&msg&&!showEntry&&!document.body.classList.contains('coachmode'));
   const n=$('envNote');if(n)n.textContent=both?' · '+msg:'';
   const b=$('envBar');if(b)b.classList.toggle('hide',!(msg&&!both));}
  // log
  if(tab==='game'&&g){$('logTitle').textContent='Game log (newest first)';$('log').innerHTML=g.pitches.map((p,i)=>pitchLine(p,i,'game')).reverse().join('')||'<div class="mut">No pitches yet</div>';}
  if(tab==='bullpen'){const x=session();$('logTitle').textContent='Session log (newest first)';$('log').innerHTML=x?x.pitches.map((p,i)=>pitchLine(p,i,'bullpen')).reverse().join(''):'<div class="mut">No pitches yet</div>';
    const q=PC.summarize(x?x.pitches:[]);$('bpTitle').textContent='Bullpen '+(x?x.date:'');
    $('bpSum').textContent=`${q.n} pitch${q.n===1?'':'es'} · hit spot ${fmt(q.spotPct)}${q.compPct!=null?` · ${fmt(q.compPct)} competitive`:''}${q.wayOff?` · ${q.wayOff} way off`:''} · `+Object.entries(q.byType).map(([k,v])=>`${k} ${v.n}`).join(', ');}
  if(tab==='setup'){renderCodes();renderPitchers();renderRoster();$('cTypes').innerHTML=s.customTypes.map((c,i)=>`<span class="tag" data-ct="${i}">${H(c.code)} = ${H(c.name)} ✕</span> `).join('')||'None yet';
    $('storeMsg').textContent=store.isTest?'Test mode: storage untouched.':(storage?'Saved on this device (localStorage). Export a JSON backup regularly.':'Storage is blocked here – open in Safari (not private browsing).');}
  if(tab==='stats'){renderStats();renderHeat();}
  renderSync();if(tab==='setup'&&!store.isTest&&document.activeElement!==$('teamCode'))$('teamCode').value=store.real.sync.teamCode||'';fitPitcherFace();paintVersion();if(bootWorker.consider)bootWorker.consider();parkVersionNote();}
function paintVersion(){const t=PC.APP_VERSION;const a=$('setupVer'),b=$('menuVer');if(a)a.textContent=t;if(b)b.textContent=t;}
// Coach uses the status footer. Portrait sits under the count. Neither covers a control.
function parkVersionNote(){if(!noteVersion.live)return;const text=noteVersion.text,el=$('verNote');
  if(document.body.classList.contains('coachmode')){if(el)el.classList.remove('on');if(!(cMsg&&cMsg.ver)){coachMsg(text,'ok',PC.VERSION_NOTE_MS);if(cMsg)cMsg.ver=1;}return;}
  if(cMsg&&cMsg.ver){cMsg=null;if(typeof renderHint==='function')renderHint();}if(!el)return;el.textContent=text;el.classList.add('on');if(typeof fitZone==='function')fitZone();}
function noteVersion(){if(!storage)return;let seen=null;try{seen=storage.getItem(PC.VERSION_SEEN_KEY);}catch(e){return;}
  const n=PC.versionNotice(seen,PC.APP_VERSION);try{storage.setItem(PC.VERSION_SEEN_KEY,n.store);}catch(e){return;}
  if(!n.show)return;noteVersion.live=true;noteVersion.text=n.text;parkVersionNote();clearTimeout(noteVersion.t);
  noteVersion.t=setTimeout(()=>{noteVersion.live=false;const el=$('verNote');if(el)el.classList.remove('on');if(cMsg&&cMsg.ver){cMsg=null;if(typeof renderHint==='function')renderHint();}if(typeof fitZone==='function')fitZone();},PC.VERSION_NOTE_MS);}
function bootWorker(){if(!('serviceWorker' in navigator)||location.protocol==='file:')return;const had=!!navigator.serviceWorker.controller;let reloaded=false,pending=false,idle=false,idleT=0,waitKind='';
  function clearIdle(){if(!idleT)return;if(waitKind==='idle'&&typeof cancelIdleCallback==='function')cancelIdleCallback(idleT);else clearTimeout(idleT);idleT=0;waitKind='';}
  function arm(){clearIdle();const go=()=>{idleT=0;waitKind='';idle=true;consider();};
    if(typeof requestIdleCallback==='function'){waitKind='idle';idleT=requestIdleCallback(go);}else{waitKind='time';idleT=setTimeout(go,1500);}}
  function sheetOpen(){return !!(D.sheet||D.ip||D.foul||document.querySelector('dialog[open]'));}
  function consider(){if(!pending||reloaded)return;const snap={draft:pullDraft(),syncing:syncing,sheetOpen:sheetOpen(),hidden:document.visibilityState==='hidden',idle:idle};
    if(!PC.safeToReload(snap)){idle=false;clearIdle();waitKind='time';idleT=setTimeout(()=>{idleT=0;waitKind='';arm();},800);return;}
    if(!PC.reloadDue(snap))return;reloaded=true;pending=false;clearIdle();location.reload();}
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!PC.workerUpdated(had,reloaded))return;pending=true;consider();if(pending)arm();});
  document.addEventListener('visibilitychange',consider);bootWorker.consider=consider;
  navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).then(reg=>{if(!reg)return;const poke=()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{});};document.addEventListener('visibilitychange',poke);addEventListener('pageshow',poke);poke();}).catch(()=>{});}
// The closed pitcher control keeps the jersey. The font can shrink to 14px, then the name ellipsizes.
function fitPitcherFace(){const sel=$('pitcher');if(!sel||!sel.options.length)return;const opt=sel.options[sel.selectedIndex];if(!opt||!opt.value)return;const p=pById(sel.value);if(!p)return;
  const face=PC.pitcherFace(p);const name=face.name,jersey=face.num?'#'+face.num:'',full=face.label;sel.title=full;
  const maxPx=document.body.classList.contains('entrymode')?16:19,minPx=14;const probe=fitPitcherFace.c||(fitPitcherFace.c=document.createElement('canvas').getContext('2d'));
  const faceCs=()=>getComputedStyle(sel);
  const room=()=>{const cs=faceCs();return sel.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);};
  // The font shorthand is empty when tabular-nums is set, so measure from the longhands.
  const fits=(px,text)=>{const cs=faceCs();probe.font=`${cs.fontStyle} ${cs.fontWeight} ${px}px ${cs.fontFamily}`;return probe.measureText(text).width<=room()-2;};
  let px=maxPx;while(px>minPx&&!fits(px,full))px-=1;sel.style.fontSize=px+'px';
  let text=full;if(!fits(px,full)&&jersey){const tail=' '+jersey;const ell=i=>(i<=0?'…':name.slice(0,i)+'…')+tail;let n=name.length;while(n>0&&!fits(px,ell(n)))n--;text=ell(n);if(!fits(px,text))text='…'+tail;}
  opt.text=text;}
addEventListener('resize',()=>fitPitcherFace());
document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tab=b.dataset.t;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));resetDraft();render();scrollTo(0,0);});
bootWorker();
LANDSCAPE.addEventListener('change',render);
render();noteVersion();doSync(false);
window.__app={store,render,sync,doSync};
