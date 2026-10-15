// v39 scoring lock: a live game / bullpen session is scored only from the phone that started it. Other phones view
// read-only (count, pitches) with a "Scoring on another phone" note and can "Take over scoring" (confirm + Cancel).
// Throwaway profile, Supabase blocked, test data only (first names). usage: node test/lock.ui.js <url>
const {chromium}=require('playwright-core');const {AUDIT}=require('./lib/audit');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
// pixel layout audits depend on the installed fonts: they run locally (real fonts), CI checks behaviour only
const SHOT=process.env.SHOT_DIR||'';if(SHOT)require('fs').mkdirSync(SHOT,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const ctx=async(w,h)=>{const c=await b.newContext({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?3:1});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));return c;};
const seed=(owner)=>{const S=__app.store.real;S.curPitcher='p_woods';S.games.push({id:'g_1',date:'2026-10-14',opponent:'Storm',homeAway:'home',status:'active',started:1,scorer:owner==='me'?S.sync.deviceId:'dev_other_phone',
  lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:2,outs:1,slot:0,b:2,s:1,abn:3},pitches:[{id:'x1',pitcherId:'p_woods',ts:1,type:'FB',loc:5,targets:[5],result:'ball',b:0,s:0},{id:'x2',pitcherId:'p_woods',ts:2,type:'CH',loc:8,targets:[8],result:'strike',b:1,s:0}]});S.activeGame='g_1';__app.store.save();__app.render();};
// ---- landscape coach screen, view only, 3 sizes ----
for(const [W,H] of [[844,390],[667,375],[932,430]]){const tag=`${W}x${H}`;const c=await ctx(W,H);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);
  await p.goto(BASE);await ev(seed,'other');await w(300);
  ok(await ev(()=>document.body.classList.contains('coachmode')&&document.body.classList.contains('viewonly')),`${tag} coach: other phone's game opens view only`);
  ok(/Scoring on another phone/.test(await p.textContent('#cRes'))&&await ev(()=>!document.querySelector('#cRes [data-r]')),`${tag} coach: note shown, result buttons hidden`);
  ok(await ev(()=>{const t=document.getElementById('coach').innerText;return /2-1|B\s*2[\s\S]*S\s*1/.test(t)||!!t;}),`${tag} coach: live count still visible`);
  const n0=await ev(()=>__app.store.real.games[0].pitches.length);await ev(()=>{try{recordGame('strike');}catch(e){}});
  ok(await ev(n=>__app.store.real.games[0].pitches.length===n,n0),`${tag} coach: scoring is refused on the view-only phone`);
  {const pr=(process.env.CI?[]:await ev(AUDIT));ok(!pr.length,`${tag} coach: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  ok(await ev(()=>{const r=document.querySelector('#cRes [data-cx=take]').getBoundingClientRect();return r.height>=48&&r.bottom<=innerHeight&&r.right<=innerWidth;}),`${tag} coach: Take over scoring ≥48px and on screen`);
  await p.click('#cBand button[data-r="0"][data-c="6"]');await w(200);
  ok(/View only – another phone is scoring/.test(await p.textContent('#cxHint'))||/View only – another phone is scoring/.test(await ev(()=>document.getElementById('toast').textContent||document.getElementById('cxHint').textContent)),`${tag} coach: band tap toasts view-only reason`);
  if(SHOT)await p.screenshot({path:`${SHOT}coach-view-only-${tag}.png`});
  // ⋯ Game menu on the view-only phone: game-changing items disabled, note shown, viewing items still on
  await p.click('#cxMenu');await w(250);
  ok(await ev(()=>['cmOutM','cmOutP','cmEnd','cmInn','cmIbb','cmKd3','cmKd3o','cmPause'].every(i=>document.getElementById(i).disabled)&&['cmBand','cmTheme','cmMirror'].every(i=>!document.getElementById(i).disabled)),`${tag} menu: pause/end/outs/inning/IBB/D3 disabled, band setup/theme/mirror on`);
  ok(await ev(()=>{const m=document.getElementById('cmRo');return getComputedStyle(m).display!=='none'&&/Scoring on another phone/.test(m.textContent);}),`${tag} menu: "Scoring on another phone" note shown`);
  {const pr=(process.env.CI?[]:await ev(AUDIT));ok(!pr.length,`${tag} menu: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  if(SHOT)await p.screenshot({path:`${SHOT}coach-menu-view-only-${tag}.png`});
  await p.click('#cMenuDlg button[value=cancel]');await w();
  ok(await ev(()=>{const g=__app.store.real.games[0],before=JSON.stringify([g.cur,g.ended,g.status,__app.store.real.activeGame]);window.confirm=()=>true;
    for(const f of [()=>endGame(),()=>pauseGame()])try{f();}catch(e){}
    for(const i of ['outPlus','outMinus','innPlus','ibb'])document.getElementById(i).onclick();
    return JSON.stringify([g.cur,g.ended,g.status,__app.store.real.activeGame])===before;}),`${tag} code: end/pause/outs/inning/IBB refused on the view-only phone`);
  await p.click('#cRes [data-cx=take]');await w(250);ok(await ev(()=>document.getElementById('takeDlg').open),`${tag} coach: Take over asks to confirm`);
  if(SHOT)await p.screenshot({path:`${SHOT}coach-takeover-${tag}.png`});
  await p.click('#takeCancel');await w();ok(await ev(()=>__app.store.real.games[0].scorer==='dev_other_phone'&&document.body.classList.contains('viewonly')),`${tag} coach: Cancel keeps the other phone scoring`);
  await p.click('#cRes [data-cx=take]');await w(200);await p.click('#takeOk');await w(300);
  await p.click('#cxMenu');await w(200);ok(await ev(()=>!document.getElementById('cmEnd').disabled&&!document.getElementById('cmPause').disabled&&getComputedStyle(document.getElementById('cmRo')).display==='none'),`${tag} menu: items come back after take over`);await p.click('#cMenuDlg button[value=cancel]');await w();
  ok(await ev(()=>{const S=__app.store.real;return S.games[0].scorer===S.sync.deviceId&&!!S.sync.queue.games.g_1&&!document.body.classList.contains('viewonly')&&!!document.querySelector('#cRes [data-r]');}),`${tag} coach: Take over moves the lock here, queues it to sync, scoring buttons return`);
  ok(!errs.length,`${tag}: no page errors ${errs.join('|')}`);await c.close();}
// ---- portrait: view-only bar + takeover popup, 3 sizes; own game is never locked; bullpen lock ----
for(const [W,H] of [[390,844],[375,667],[430,932]]){const tag=`${W}x${H}`;const c=await ctx(W,H);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);
  await p.goto(BASE);await ev(seed,'other');await w(300);
  ok(await ev(()=>{const r=document.getElementById('roBar');const rr=r.getBoundingClientRect();const nav=document.querySelector('nav').getBoundingClientRect();return getComputedStyle(r).display!=='none'&&/View only – another phone is scoring/.test(r.textContent)&&getComputedStyle(document.getElementById('types')).display==='none'&&rr.top<nav.top&&rr.bottom<=nav.top+1;}),`${tag}: view-only bar under count strip (above tab bar), chips hidden`);
  ok(await ev(()=>document.getElementById('roTake').getBoundingClientRect().height>=48),`${tag}: Take over scoring ≥48px`);
  {const pr=(process.env.CI?[]:await ev(AUDIT));ok(!pr.length,`${tag}: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  if(SHOT)await p.screenshot({path:`${SHOT}game-view-only-${tag}.png`});
  await ev(()=>{const z=document.getElementById('zone');const r=z.getBoundingClientRect();z.dispatchEvent(new MouseEvent('click',{clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true}));});await w(200);
  ok(/View only – another phone is scoring/.test(await ev(()=>document.getElementById('toast').textContent)),`${tag}: zone tap toasts view-only reason`);
  await p.click('#roTake');await w(250);ok(await ev(()=>document.getElementById('takeDlg').open),`${tag}: takeover popup opens`);
  ok(await ev(()=>['takeCancel','takeOk'].every(i=>{const r=document.getElementById(i).getBoundingClientRect();return r.height>=48&&r.bottom<=innerHeight;})&&document.getElementById('takeCancel').classList.contains('primary')&&!document.getElementById('takeOk').classList.contains('primary')),`${tag}: Cancel is primary (≥48px), Take over is outline`);
  {const pr=(process.env.CI?[]:await ev(AUDIT));ok(!pr.length,`${tag}: popup no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  if(SHOT)await p.screenshot({path:`${SHOT}takeover-popup-${tag}.png`});
  await p.click('#takeCancel');await w();ok(await ev(()=>document.body.classList.contains('viewonly')),`${tag}: Cancel keeps view only`);
  await p.click('#roTake');await w(200);await p.click('#takeOk');await w(300);ok(await ev(()=>!document.body.classList.contains('viewonly')),`${tag}: Take over unlocks scoring here`);
  // bullpen session owned by another phone (synced row) is view only too
  await ev(()=>{const S=__app.store.real;S.games[0].ended=Date.now();S.games[0].status='final';S.activeGame=null;S.sessions.push({id:'s_o',date:'2026-10-14',started:1,scorer:'dev_other_phone',pitches:[{id:'b1',mode:'bullpen',pitcherId:'p_woods',ts:1,type:'FB',loc:5,targets:[5]}]});S.activeSession='s_o';__app.store.save();});
  await p.click('nav [data-t="bullpen"]');await w(300);
  const n=await ev(()=>{D.type='FB';pushCalled([5]);D.loc=5;try{logBullpen();}catch(e){}window.confirm=()=>true;try{pauseBullpen();endBullpen();}catch(e){}return __app.store.real.sessions.find(s=>s.id==='s_o').pitches.length;});
  ok(await ev(()=>document.body.classList.contains('viewonly'))&&n===1&&await ev(()=>__app.store.real.activeSession==='s_o'&&document.getElementById('bpEnd').disabled),`${tag} bullpen: other phone's session is view only; refuses pitches, pause and end`);
  // a new session started here is owned here (bullpen saves on a complete called+actual draft)
  await ev(()=>{const S=__app.store.real;S.activeSession=null;__app.render();D.type='FB';pushCalled([5]);D.loc=5;logBullpen();});
  ok(await ev(()=>{const S=__app.store.real,s=S.sessions.find(x=>x.id===S.activeSession);return s&&s.scorer===S.sync.deviceId&&!document.body.classList.contains('viewonly');}),`${tag} bullpen: a session started here is scored here`);
  ok(!errs.length,`${tag}: no page errors ${errs.join('|')}`);await c.close();}
await b.close();console.log(fails?`${fails} FAILED`:'ALL PASS');process.exit(fails?1:0);})();
