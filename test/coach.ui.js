// PR H: the coach pitch-calling screen (Game, landscape) at 844x390 and 667x375 (iPhone SE): full wristband + status (spoken call) +
// zone + docked results on one screen, no scrolling; call → where → result; ✎ Aim and long-press; in play + spray; Undo / Same call;
// band setup; side-retired card; Field / Night palettes; mirror; on-screen saved confirmation; portrait rotate prompt; layout audit.
// Throwaway profile, Supabase blocked, test data only (first names). usage: node test/coach.ui.js <url>
const {chromium}=require('playwright-core');const {AUDIT}=require('./lib/audit');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const SHOT=process.env.SHOT_DIR||'';if(SHOT)require('fs').mkdirSync(SHOT,{recursive:true});
const GAME={id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'},{slot:2,name:'Batter 2',num:'2',hand:'R'},{slot:3,name:'Batter 3',num:'3',hand:'L'}],cur:{inning:1,outs:1,slot:1,b:1,s:1,abn:3},pitches:[]};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for(const [W,H,MIN] of [[844,390,48],[667,375,40]]){const tag=`${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?3:1});await c.route(/supabase\.co/,r=>r.abort());
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const ev=(f,a)=>p.evaluate(f,a);const wait=ms=>p.waitForTimeout(ms||150);
  const shot=async n=>{if(SHOT&&W===844){await wait(250);await p.screenshot({path:SHOT+'after-'+n+'.png'});}};
  await p.goto(BASE);await ev(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';__app.store.save();__app.render();},GAME);
  await p.click('nav [data-t="game"]').catch(()=>{});await wait(300);
  const G=()=>ev(()=>__app.store.real.games[0]);const inView=sel=>ev(s=>[...document.querySelectorAll(s)].every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=-.5&&r.top>=-.5&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5;}),sel);
  // ---- layout ----
  ok(await ev(()=>document.body.classList.contains('coachmode')&&getComputedStyle(document.querySelector('nav')).display==='none'),`${tag}: coach screen replaces the portrait entry (tab bar hidden)`);
  ok(await ev(()=>document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1),`${tag}: no scrolling`);
  ok(await ev(()=>document.querySelectorAll('#cBand tbody tr').length===7&&document.querySelectorAll('#cBand tbody tr:first-child td').length===8),`${tag}: full wristband, rows 1–7 × cols 01–08`);
  ok(await ev(()=>[...document.querySelectorAll('#cBand thead th')].slice(1).map(e=>e.textContent).join(',')==='01,02,03,04,05,06,07,08'),`${tag}: column headers 01–08`);
  for(const [sel,name] of [['#cBand td button','band cells'],['#cZone','zone'],['#cRes button','results'],['#cxCode','status call']])ok(await inView(sel),`${tag}: ${name} fully on screen`);
  const sz=await ev(()=>{const m=s=>Math.min(...[...document.querySelectorAll(s)].map(e=>{const r=e.getBoundingClientRect();return Math.min(r.width,r.height);}));return{cell:m('#cBand td button'),zone:m('#cZone .zi'),resW:Math.min(...[...document.querySelectorAll('#cRes button')].map(e=>e.getBoundingClientRect().width)),resH:Math.min(...[...document.querySelectorAll('#cRes button')].map(e=>e.getBoundingClientRect().height))};});
  ok(sz.cell>=MIN-.5&&sz.zone>=MIN-.5&&sz.resW>=48&&sz.resH>=52,`${tag}: targets ≥${MIN}px (band ${sz.cell.toFixed(1)}, zone ${sz.zone.toFixed(1)}, results ${sz.resW.toFixed(0)}×${sz.resH.toFixed(0)})`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap (idle)${pr.length?' → '+pr.slice(0,5).join(' | '):''}`);}
  await shot('coach-idle');
  // ---- call → where → result ----
  await p.click('#cBand button[data-r="2"][data-c="4"]');await wait();
  ok((await p.textContent('#cxCode')).replace(/\s+/g,' ').trim()==='3-05 Fb In'&&/aim 6/.test(await p.textContent('#cxAim')),`${tag}: spoken call big in the status box ("3-05 Fb In", aim 6 vs RHB)`);
  ok(await ev(()=>{const e=document.querySelector('#cBand td button.on');return !!e&&getComputedStyle(e).backgroundColor==='rgb(30, 63, 208)';}),`${tag}: selected cell is royal #1E3FD0`);
  ok(await ev(()=>!!document.querySelector('#cZone button.aim[data-z="6"]')),`${tag}: aim auto-mapped and outlined on the zone`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap (called)${pr.length?' → '+pr.slice(0,5).join(' | '):''}`);}
  await p.click('#cZone button[data-z="4"]');await wait();ok(await ev(()=>!!document.querySelector('#cZone button.act[data-z="4"]')),`${tag}: actual spot marked`);await shot('coach-called');
  await p.click('#cRes [data-r="ball"]');await wait();
  {const g=await G();const r=g.pitches.at(-1);ok(g.pitches.length===1&&r.result==='ball'&&r.loc===4&&JSON.stringify(r.targets)==='[6]'&&r.callRaw==='Fb In',`${tag}: 3 taps log call + aim 6 + landed 4 + ball`);}
  ok(/✓ Saved · Ball · 2-1/.test(await p.textContent('#cxHint'))&&await ev(()=>!document.querySelector('#cBand td button.on')&&!document.querySelector('#cZone .act')),`${tag}: on-screen saved confirmation, zone + band cleared`);
  ok(await ev(()=>{const h=document.getElementById('cxHint').getBoundingClientRect(),c=document.getElementById('cxCount').getBoundingClientRect();return h.top>=c.bottom;}),`${tag}: confirmation never covers the count`);
  // ---- Same call, ✎ Aim, long-press ----
  await p.click('#cRes [data-cx="same"]');await wait();ok((await p.textContent('#cxCode')).replace(/\s+/g,' ').trim()==='3-05 Fb In',`${tag}: Same call repeats 3-05`);
  await p.click('#cRes [data-cx="aim"]');await wait();ok(/new aim/.test(await p.textContent('#cxHint')),`${tag}: ✎ Aim mode prompts for the new aim`);
  await p.click('#cZone button[data-z="5"]');await wait();ok(await ev(()=>!!document.querySelector('#cZone .aim[data-z="5"]')&&!document.querySelector('#cZone.editing')),`${tag}: ✎ Aim moves the aim to 5 and exits`);
  await p.click('#cRes [data-r="called"]');await wait();ok(JSON.stringify((await G()).pitches.at(-1).targets)==='[5]',`${tag}: edited aim is logged`);
  await p.click('#cBand button[data-r="0"][data-c="0"]');await wait();
  {const bx=await p.$eval('#cZone button[data-z="8"]',e=>{const r=e.getBoundingClientRect();return[r.x+r.width/2,r.y+r.height/2];});await p.mouse.move(bx[0],bx[1]);await p.mouse.down();await wait(520);await p.mouse.up();await wait();}
  ok(await ev(()=>!!document.querySelector('#cZone .aim[data-z="8"]')&&!document.querySelector('#cZone .act')),`${tag}: long-press sets the aim (8) without marking a landing`);
  // ---- in play + spray ----
  await p.click('#cZone button[data-z="2"]');await p.click('#cRes [data-r="inplay"]');await wait();
  ok(await ev(()=>!document.getElementById('cSprayWrap').classList.contains('hide')&&document.querySelectorAll('#cRes [data-ip]').length===8),`${tag}: In play swaps in outcomes + spray field`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap (in play)${pr.length?' → '+pr.slice(0,5).join(' | '):''}`);}
  {const r=await p.$eval('#cSpray',e=>e.getBoundingClientRect());await p.mouse.click(r.x+r.width*.3,r.y+r.height*.4);}await wait();await shot('coach-inplay');
  await p.click('#cRes [data-ip="1B"]');await wait();{const r=(await G()).pitches.at(-1);ok(r.result==='inplay'&&r.ip==='1B'&&Array.isArray(r.spray)&&r.loc===2,`${tag}: in-play outcome logs with spray ${JSON.stringify(r.spray)}`);}
  // ---- Undo ----
  {const n=(await G()).pitches.length;await p.click('#cRes [data-cx="undo"]');await wait();ok((await G()).pitches.length===n-1,`${tag}: always-visible Undo removes the last pitch`);}
  // ---- band setup (menu) ----
  const before=await ev(()=>JSON.stringify(__app.store.real.callSheets));await p.click('#cxMenu');await wait(250);await p.click('#cmBand');await wait(250);
  ok(await ev(()=>document.getElementById('bandDlg').open&&document.querySelectorAll('#bandList select').length>=3),`${tag}: band setup lists the cells with no spot`);
  await shot('band-setup');await p.click('#bandDlg button[value=cancel]');await wait();ok(await ev(()=>JSON.stringify(__app.store.real.callSheets))===before,`${tag}: band setup Cancel saves nothing`);
  await p.click('#cxMenu');await wait(200);await p.click('#cmBand');await wait(200);await p.selectOption('#bandList select[data-norm="CH"]','8');await p.click('#bandDlg button[value=ok]');await wait();
  await p.click('#cBand button[data-r="1"][data-c="7"]');await wait();ok(/aim 8/.test(await p.textContent('#cxAim')),`${tag}: unmapped "CHG" cell now aims at 8 after band setup`);
  // ---- side retired ----
  await ev(()=>{const g=__app.store.real.games[0];g.cur.outs=2;g.cur.s=2;g.cur.b=0;__app.store.save();__app.render();});await p.click('#cRes [data-r="swinging"]');await wait();
  ok(await ev(()=>!document.getElementById('cSide').classList.contains('hide'))&&/Top 1: \d+ pitches · \d+ K/.test(await p.textContent('#cSideSum')),`${tag}: "Side retired" card with the inning summary`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap (side retired)${pr.length?' → '+pr.slice(0,5).join(' | '):''}`);}await shot('side-retired');
  await p.click('#cSideOk');await wait();ok(await ev(()=>document.getElementById('cSide').classList.contains('hide')),`${tag}: Keep charting dismisses the card`);
  // ---- palettes + mirror ----
  ok(await ev(()=>document.documentElement.dataset.theme)==='field',`${tag}: Field palette by default`);
  await p.click('#cxMenu');await wait(200);await p.click('#cmTheme');await wait(150);await p.click('#cMenuDlg button[value=cancel]');await wait();
  ok(await ev(()=>document.documentElement.dataset.theme)==='night',`${tag}: Night palette from the game menu`);
  await p.click('#cBand button[data-r="2"][data-c="4"]');await p.click('#cZone button[data-z="4"]');await wait();
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap (night)${pr.length?' → '+pr.slice(0,5).join(' | '):''}`);}await shot('coach-night');
  await ev(()=>{localStorage.setItem('te_ui_mirror','1');__app.render();});await wait();ok(await ev(()=>document.querySelector('.cres').getBoundingClientRect().left<document.querySelector('.cband').getBoundingClientRect().left),`${tag}: Mirror swaps band and results`);
  await ev(()=>{localStorage.setItem('te_ui_mirror','0');localStorage.setItem('te_ui_theme','field');document.documentElement.dataset.theme='field';__app.render();});
  ok(!errs.length,`${tag}: no page errors `+errs.join('|'));await c.close();}
// portrait: coach game asks to rotate (fallback: chart in portrait)
{const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());const p=await c.newPage();await p.goto(BASE);
  await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';__app.store.save();__app.render();},GAME);await p.waitForTimeout(250);
  ok(await p.evaluate(()=>!document.getElementById('rotate').classList.contains('hide')),'390x844 portrait: coach game shows the rotate prompt');
  await p.click('#rotOk');ok(await p.evaluate(()=>document.getElementById('rotate').classList.contains('hide')&&!document.getElementById('entry').classList.contains('hide')),'portrait fallback: "Chart in portrait instead" works');await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
