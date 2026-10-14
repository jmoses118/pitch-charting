// v39 shake-off: the Shake-off button exists in BOTH layouts (portrait pitch flow + landscape coach screen next to
// Aim/Undo/Same) – regression guard so it can't silently disappear. Flow: call → Shake-off → pick type thrown →
// where → result; Cancel; Undo; Stats "Shake-offs" section. Throwaway profile, Supabase blocked, test data only.
// usage: node test/shake.ui.js <url>
const {chromium}=require('playwright-core');const {AUDIT}=require('./lib/audit');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
// pixel layout audits depend on the installed fonts: they run locally (real fonts), CI checks behaviour only
const SHOT=process.env.SHOT_DIR||'';if(SHOT)require('fs').mkdirSync(SHOT,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const ctx=async(w,h)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?3:1});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));return c;};
const seed=()=>{const S=__app.store.real;S.curPitcher='p_woods';S.games.push({id:'g_1',date:'2026-10-14',opponent:'Storm',homeAway:'home',status:'active',started:1,scorer:S.sync.deviceId,
  lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'},{slot:2,name:'Batter 2',num:'2',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]});S.activeGame='g_1';__app.store.save();__app.render();};
const last=()=>{const g=__app.store.real.games[0];const p=g.pitches[g.pitches.length-1];return p&&{n:g.pitches.length,shook:!!p.shook,call:p.call,type:p.type,targets:p.targets,loc:p.loc,result:p.result};};
// ---- landscape coach screen ----
for(const [W,H] of [[844,390],[667,375],[932,430]]){const tag=`${W}x${H}`;const c=await ctx(W,H);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);
  await p.goto(BASE);await ev(seed);await w(300);
  ok(await ev(()=>!!document.querySelector('#cRes [data-cx=shake]')&&['aim','undo','same'].every(k=>document.querySelector(`#cRes [data-cx=${k}]`))),`${tag} coach: Shake-off button next to Aim/Undo/Same (regression guard)`);
  ok(await ev(()=>document.querySelector('#cRes [data-cx=shake]').disabled),`${tag} coach: Shake-off disabled until a call is made`);
  await p.click('#cBand button[data-r="0"][data-c="6"]');await w();
  {const r=await ev(()=>{const e=document.querySelector('#cRes [data-cx=shake]').getBoundingClientRect();return e.height>=44&&e.bottom<=innerHeight&&e.right<=innerWidth;});ok(r,`${tag} coach: Shake-off ≥44px and on screen`);}
  {const pr=(process.env.CI?[]:await ev(AUDIT));ok(!pr.length,`${tag} coach: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  if(SHOT)await p.screenshot({path:`${SHOT}coach-shake-button-${tag}.png`});
  // Cancel restores the call
  await p.click('#cRes [data-cx=shake]');await w();ok(await ev(()=>!!document.querySelector('#cRes [data-ty=FB]')&&/⤺ CH7/.test(document.getElementById('cxCode').textContent)),`${tag} coach: Shake-off asks what she threw`);
  {const exp=W<700?'Threw?':'Which pitch?';ok((await p.textContent('#cxHint')).trim()===exp&&await ev(()=>{const h=document.getElementById('cxHint');return h.scrollWidth<=h.clientWidth+1;}),`${tag} coach: hint is "${exp}" and not truncated`);}
  {const pr=(process.env.CI?[]:await ev(AUDIT));ok(!pr.length,`${tag} coach picker: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  if(SHOT)await p.screenshot({path:`${SHOT}coach-shake-pick-${tag}.png`});
  await p.click('#cRes [data-cx=unshake]');await w();ok(await ev(()=>!document.querySelector('#cRes [data-ty]')&&/CH7/.test(document.getElementById('cxCode').textContent)&&!!document.querySelector('#cRes [data-r=ball]')),`${tag} coach: Cancel goes back to the call`);
  // full flow: shake, threw FB, landed 5, foul
  await p.click('#cRes [data-cx=shake]');await w();await p.click('#cRes [data-ty=FB]');await w();
  {const exp=W<700?'Where?':'Tap where it went';const ht=(await p.textContent('#cxHint')).trim();ok(ht===exp||ht.endsWith(exp)||ht.includes(exp),`${tag} coach: after type, hint is normal step ("${exp}") got "${ht}"`);}
  await p.click('#cZone button[data-z="5"]');await w();
  if(SHOT)await p.screenshot({path:`${SHOT}coach-shake-threw-${tag}.png`});
  await p.click('#cRes [data-r=foul]');await w(150);await p.click('#cRes [data-ft=skip]');await w(250);
  ok(JSON.stringify(await ev(last))===JSON.stringify({n:1,shook:true,call:'CH7',type:'FB',targets:[],loc:5,result:'foul'}),`${tag} coach: logs called CH7, shook, threw FB 5, foul – no aim ${JSON.stringify(await ev(last))}`);
  ok(await ev(()=>!!document.querySelector('#cRes [data-cx=shake]')),`${tag} coach: next pitch starts fresh`);
  await p.click('#cRes [data-cx=undo]');await w(250);ok(await ev(()=>__app.store.real.games[0].pitches.length===0),`${tag} coach: Undo removes the shake-off pitch`);
  ok(!errs.length,`${tag}: no page errors ${errs.join('|')}`);await c.close();}
// ---- portrait ----
for(const [W,H] of [[390,844],[375,667],[430,932]]){const tag=`${W}x${H}`;const c=await ctx(W,H);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);
  await p.goto(BASE);await ev(seed);await w(300);
  ok(await ev(()=>{const e=document.getElementById('shakeBtn');return !!e&&!!e.closest('.stepline')&&!!e.closest('#entry');}),`${tag}: portrait Shake-off button present in the stepline (regression guard)`);
  ok(await ev(()=>{const e=document.getElementById('shakeBtn');return !e.classList.contains('hide')&&e.disabled;}),`${tag}: Shake-off sits in the stepline disabled until a call is made`);
  const zBefore=await ev(()=>document.getElementById('zone').getBoundingClientRect().top);
  await ev(()=>callCell(0,6));await w();
  ok(await ev(z=>{const d=Math.abs(document.getElementById('zone').getBoundingClientRect().top-z);return d<=2;},zBefore),`${tag}: call does not push the zone (Shake-off is in the stepline)`);
  ok(await ev(()=>{const e=document.getElementById('shakeBtn').getBoundingClientRect();return !document.getElementById('shakeBtn').disabled&&e.height>=48&&e.width>0&&e.bottom<=innerHeight;}),`${tag}: Shake-off visible and enabled after the call, ≥48px`);
  const zCall=await ev(()=>document.getElementById('zone').getBoundingClientRect().top);
  await p.click('#shakeBtn');await w();
  ok(await ev(()=>!document.getElementById('shakeBar').classList.contains('hide')&&/Shook off CH7 · pick the pitch/.test(document.getElementById('shakeTxt').textContent)),`${tag}: shake-off bar shows the coach's call`);
  ok(await ev(z=>{const bar=document.getElementById('shakeBar').getBoundingClientRect();return bar.height>=48&&bar.height<=50;},zCall),`${tag}: shake bar is a fixed 48px slot`);
  ok(await ev(()=>{const e=document.getElementById('shakeCancel').getBoundingClientRect();return e.height>=48;}),`${tag}: Cancel ≥48px`);
  {const pr=(process.env.CI?[]:await ev(AUDIT));ok(!pr.length,`${tag}: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  if(SHOT){await ev(()=>{scrollTo(0,0);document.getElementById('toast').classList.remove('on');});await w(300);await p.screenshot({path:`${SHOT}game-shake-${tag}.png`});}
  await p.click('#shakeCancel');await w();ok(await ev(()=>document.getElementById('shakeBar').classList.contains('hide')&&D.type==='CH'),`${tag}: Cancel restores the call`);
  await p.click('#shakeBtn');await w();await ev(()=>recordGame('ball'));ok(await ev(()=>__app.store.real.games[0].pitches.length===0),`${tag}: won't log until she picks the pitch thrown`);
  await p.click('#types [data-c=DR]');await w();await ev(()=>tapLoc(13));await ev(()=>recordGame('swinging'));await w();
  ok(JSON.stringify(await ev(last))===JSON.stringify({n:1,shook:true,call:'CH7',type:'DR',targets:[],loc:13,result:'swinging'}),`${tag}: logs called CH7, shook, threw DR 13 ${JSON.stringify(await ev(last))}`);
  // a followed call, then stats
  await ev(()=>{callCell(0,6);tapLoc(7);recordGame('called');});
  await p.click('nav [data-t="stats"]');await w(300);
  ok(await ev(()=>{const t=document.getElementById("sShake").textContent;return /Shake-offs · Avery #45: 1/.test(t)&&/Called CH7/.test(t)&&/threw DR 13/.test(t)&&/0-0/.test(t)&&/Followed call/.test(t);}),`${tag}: Stats shows the Shake-offs section (count, shook vs followed, each one)`);
  {const pr=(process.env.CI?[]:await ev(AUDIT));ok(!pr.length,`${tag} stats: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  if(SHOT){await ev(()=>{document.getElementById('sShake').scrollIntoView({block:'center'});document.getElementById('toast').classList.remove('on');const f=document.getElementById('flash');if(f)f.remove();});await w(300);await p.screenshot({path:`${SHOT}stats-shakeoffs-${tag}.png`});}
  ok(!errs.length,`${tag}: no page errors ${errs.join('|')}`);await c.close();}
await b.close();console.log(fails?`${fails} FAILED`:'ALL PASS');process.exit(fails?1:0);})();
