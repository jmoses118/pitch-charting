/* Thunder Elite pitch charting – UI main.js: Render loop, navigation, startup.
   Classic script: shares top-level bindings with the other js/ui files (load order in index.html). */
'use strict';
// ---------- render ----------
// current-step indicator above the zone: Pitch → Aim → Landed (bullpen), Pitch → Location → Result (game)
function renderSteps(needTarget){const bp=tab==='bullpen';const labels=bp?['Pitch','Aim','Landed']:['Pitch','Where','Result'];let i;
  if(bp){const st=PC.bullpenStep({type:D.type||(D.parsed&&D.parsed.type),target:D.target,callTargets:callOn&&D.parsed?D.parsed.targets:[]});i=st==='type'?0:st==='target'?1:2;}
  else i=needTarget?0:D.loc?2:D.type?1:0;
  [...$('steps').children].forEach((li,k)=>{li.textContent=labels[k];li.className=k<i?'done':k===i?'now':'';if(k===i)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});}
function render(skipCallInput){const s=S();applyViewOnly(viewOnly());if(typeof renderShake==='function')renderShake();{const gg=game();const two=!!(gg&&gg.cur&&gg.cur.s===2);document.querySelectorAll('#resBtns [data-r="kd3"],#resBtns [data-r="kd3out"]').forEach(kb=>{kb.classList.toggle('hide',!two);kb.disabled=!two;});}document.body.classList.toggle('test',store.isTest);document.body.classList.toggle('onehand',oneHand());document.body.classList.toggle('tab-game',tab==='game');$('oneHand').checked=oneHand();try{renderAlerts();renderAlertCard();}catch(e){console.error(e);}$('testbar').classList.toggle('hide',!store.isTest);
  $('testBtn').textContent=store.isTest?'Exit test mode (discard)':'Start test mode';$('testBtn').style.background=store.isTest?'var(--red)':'';
  callOn=!!s.callOn;$('callOn').checked=callOn;$('callBox').classList.toggle('hide',!callOn);try{renderWristband();renderCS();}catch(e){console.error(e);}
  const R0=role(),tabs=ROLE_TABS[R0];if(!tabs.includes(tab))tab=tabs[0];
  document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('hide',!tabs.includes(b.dataset.t));b.classList.toggle('on',b.dataset.t===tab);});
  document.body.dataset.role=R0;$('addPQuick').classList.toggle('hide',R0!=='coach');$('pitcher').disabled=!(R0==='coach'||(R0==='pcoach'&&mine().length>1));
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
  $('noGame').classList.toggle('hide',!!g||!!lk);$('inGame').classList.toggle('hide',!g);
  const sch=s.games.filter(x=>PC.gameStatus(x)==='scheduled').sort((x,y)=>(x.date+x.gameNo).localeCompare(y.date+y.gameNo,undefined,{numeric:true}));
  $('schedCard').classList.toggle('hide',!(tab==='game'&&!g&&!lk&&sch.length));
  $('schedList').innerHTML=sch.map(x=>`<div class="prow"><button data-sg="${H(x.id)}" style="flex:1;text-align:left;${schedId===x.id?'border-color:var(--acc)':''}"><b>${H((x.date||'').slice(5))} ${H(x.time||'')}</b> ${vsAt(x)} ${H(x.opponent)}<br><small class="mut">${[x.gameNo,x.field,x.location].filter(Boolean).map(H).join(' · ')}</small></button>${x.link&&/^https:\/\//.test(x.link)?`<a href="${H(x.link)}" target="_blank" rel="noopener" style="color:var(--acc);padding:0 6px">GC↗</a>`:''}</div>`).join('');
  if(tab==='game'&&!g){renderLineupForm();if(!$('gDate').value)$('gDate').value=today();}
  const hand=curHand();$('batTog').textContent=(hand==='N'?'Batter: none':hand==='L'?'Batter: LHB':'Batter: RHB')+' ▾';$('batTog').setAttribute('aria-label','Batter: '+(hand==='N'?'none':hand==='L'?'left-handed':'right-handed')+' – change');$('hL').classList.toggle('sel',hand==='L');$('hR').classList.toggle('sel',hand==='R');$('hN').classList.toggle('sel',hand==='N');$('hN').classList.toggle('hide',tab==='game');
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
  if(!skipCallInput)$('callTxt').value=D.callTxt;
  $('callAlt').innerHTML=D.parsed&&D.parsed.alts&&D.parsed.alts.length?D.parsed.alts.concat(D.parsed.targets).filter((z,i,x)=>x.indexOf(z)===i).map(z=>`<button data-alt="${z}" class="${(D.target||D.parsed.targets[0])===z?'sel':''}">CB → ${z}</button>`).join(''):'';
  $('callDesc').textContent=D.callTxt?(D.parsed?`${D.parsed.norm} = ${types.find(t=>t.code===D.parsed.type)?.name||D.parsed.type}${D.parsed.targets.length?' → zone '+D.parsed.targets.join('/'):' → tap target on grid'}${D.target?' '+D.target:''} · ${D.parsed.desc}`:'Unrecognized code'):'Type a code or tap buttons. Digits = zone (pitcher\'s view).';
  const needTarget=callOn&&D.parsed&&!D.parsed.targets.length&&!D.target;
  renderSteps(needTarget);
  $('phase').innerHTML=needTarget?'Tap the <b>called target</b> on the grid':(tab==='bullpen'?bpPhase():`Optional: type + where it went${D.loc?` → <b>${D.type||''} @${D.loc}</b> (${PC.locInfo(D.loc,hand,throwsOf()).label})`:''}, then the result`);
  $('resBtns').classList.toggle('hide',!!D.ip);$('ipBtns').classList.toggle('hide',!D.ip);$('undo').textContent=tab==='bullpen'&&(D.type||D.target||D.callTxt)?'↶ Back a step':'↶ Undo last pitch';
  const sheet=tab==='game'&&!!(D.sheet||D.ip);$('resSheet').classList.toggle('hide',!sheet);$('resTog').classList.toggle('hide',tab!=='game');
  $('resHead').textContent=D.loc?`Result · ${D.type?D.type+' ':''}${locTxt(D.loc)}`:'Result';
  const wbOn=!$('wbCard').classList.contains('hide');$('wbTog').classList.toggle('hide',!wbOn);if(!wbOn)$('wbDet').open=false;
  renderModes(lk,showEntry);drawZone();fitZone();
  // log
  const RL=RESULT_SHORT;
  const line=(p,i)=>`<div><span class="n">${i+1}</span><span style="flex:1">${tab==='game'?H(pName(p.pitcherId).split(' ')[0])+' vs '+H(p.batter)+': ':''}${p.call?'<b>['+H(p.call)+']</b> ':''}${H(p.type||'')}${p.loc?' <span class="tag">'+H(locTxt(p.loc))+'</span>':''}${p.targets&&p.targets.length&&p.loc?(PC.hitSpot(p)?' ✓':' ✗'):''}</span><span>${p.result?RL[p.result]+(p.ip?' '+p.ip:''):(PC.isZone(p.loc)?'K':'B')}${p.end?' · <b>'+p.end+'</b>':''}</span>${p.result?`<span class="tag">${p.b}-${p.s}</span>`:''}</div>`;
  if(tab==='game'&&g){$('logTitle').textContent='Game log (newest first)';$('log').innerHTML=g.pitches.map(line).reverse().join('')||'<div class="mut">No pitches yet</div>';}
  if(tab==='bullpen'){const x=session();$('logTitle').textContent='Session log (newest first)';$('log').innerHTML=x?x.pitches.map(line).reverse().join(''):'<div class="mut">No pitches yet</div>';
    const q=PC.summarize(x?x.pitches:[]);$('bpTitle').textContent='Bullpen '+(x?x.date:'');
    $('bpSum').textContent=`${q.n} pitches · ${fmt(q.strikePct)} strikes${q.compPct!=null?` · ${fmt(q.compPct)} competitive`:''}${q.wayOff?` · ${q.wayOff} way off`:''} · hit spot ${fmt(q.spotPct)} · `+Object.entries(q.byType).map(([k,v])=>`${k} ${v.n} (${fmt(v.strikePct)})`).join(', ');}
  if(tab==='setup'){renderCodes();renderPitchers();renderRoster();$('cTypes').innerHTML=s.customTypes.map((c,i)=>`<span class="tag" data-ct="${i}">${H(c.code)} = ${H(c.name)} ✕</span> `).join('')||'None yet';
    $('storeMsg').textContent=store.isTest?'Test mode: storage untouched.':(storage?'Saved on this device (localStorage). Export a JSON backup regularly.':'Storage is blocked here – open in Safari (not private browsing).');}
  if(tab==='stats'){renderStats();renderHeat();}
  renderSync();if(tab==='setup'&&!store.isTest&&document.activeElement!==$('teamCode'))$('teamCode').value=store.real.sync.teamCode||'';}
document.querySelector('nav').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;tab=b.dataset.t;document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x===b));resetDraft();render();scrollTo(0,0);});
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
render();doSync(false);
window.__app={store,render,sync,doSync};
