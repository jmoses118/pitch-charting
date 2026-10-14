// PR H: the coach pitch-calling screen (Game, landscape) at 844x390 and 667x375 (iPhone SE): full wristband + status (spoken call) +
// zone + docked results on one screen, no scrolling; call → where → result; ✎ Aim and long-press; in play + spray; Undo / Same call;
// band setup; side-retired card; Field / Night palettes; mirror; on-screen saved confirmation; portrait rotate prompt; layout audit.
// Throwaway profile, Supabase blocked, test data only (first names). usage: node test/coach.ui.js <url>
const {chromium}=require('playwright-core');const {AUDIT}=require('./lib/audit');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const SHOT=process.env.SHOT_DIR||'';if(SHOT)require('fs').mkdirSync(SHOT,{recursive:true});
const GAME={id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'},{slot:2,name:'Batter 2',num:'2',hand:'R'},{slot:3,name:'Batter 3',num:'3',hand:'L'}],cur:{inning:1,outs:1,slot:1,b:1,s:1,abn:3},pitches:[]};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for(const [W,H,MIN,ZMIN,RESW] of [[844,390,48,48,48],[667,375,44,34,46]]){const tag=`${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?3:1});await c.route(/supabase\.co/,r=>r.abort());
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const ev=(f,a)=>p.evaluate(f,a);const wait=ms=>p.waitForTimeout(ms||150);
  const shot=async n=>{if(SHOT){await wait(250);await p.screenshot({path:SHOT+(W===844?'after-':'se667-after-')+n+'.png'});}};
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
  ok(sz.cell>=MIN-.5&&sz.zone>=ZMIN-.5&&sz.resW>=RESW-.5&&sz.resH>=52,`${tag}: targets band ≥${MIN}, zone ≥${ZMIN}, results ≥${RESW} (band ${sz.cell.toFixed(1)}, zone ${sz.zone.toFixed(1)}, results ${sz.resW.toFixed(0)}×${sz.resH.toFixed(0)})`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap (idle)${pr.length?' → '+pr.slice(0,5).join(' | '):''}`);}
  await shot('coach-idle');
  ok(await ev(()=>{const r=document.getElementById('cxMenu').getBoundingClientRect();return r.height>=44&&r.width>=44;}),`${tag}: ⋯ Game button ≥44px`);
  ok(await ev(()=>document.querySelectorAll('#cBand tbody th').length===7&&document.querySelector('#cBand tbody th').getBoundingClientRect().width>=19),`${tag}: row headers kept`);
  // safe area: Chromium reports env()=0, so simulate iPhone insets (47/47/21) on the coach padding and re-size
  {const out=await ev(()=>{const st=document.createElement('style');st.id='simsafe';st.textContent='.coach{padding:4px 47px 21px 47px!important}';document.head.appendChild(st);dispatchEvent(new Event('resize'));
    const bad=[];for(const s of ['#cBand','#cZone','#cRes button','#cStatus']){for(const e of document.querySelectorAll(s)){const r=e.getBoundingClientRect();if(r.left<46.5||r.right>innerWidth-46.5||r.bottom>innerHeight-20.5)bad.push(s+' '+r.left.toFixed(1)+','+r.right.toFixed(1)+','+r.bottom.toFixed(1));}}
    st.remove();dispatchEvent(new Event('resize'));return bad;});ok(!out.length,`${tag}: band/zone/results stay inside simulated iPhone safe area ${out.slice(0,3).join(' | ')}`);}
  const geo=()=>ev(()=>{const z=document.getElementById('cZone').getBoundingClientRect(),s=document.getElementById('cStatus').getBoundingClientRect();return[z.top,z.left,s.height].map(v=>v.toFixed(1)).join(',');});
  const g0=await geo();
  // ---- call → where → result ----
  await p.click('#cBand button[data-r="2"][data-c="4"]');await wait();
  ok(await ev(()=>{const st=document.getElementById('cStatus').getBoundingClientRect();let y=st.top;for(const e of document.querySelectorAll('#cStatus>:not(.hide):not(.cside)')){const r=e.getBoundingClientRect();if(r.height===0)continue;if(r.top<y-.5||r.bottom>st.bottom+.5)return false;y=r.bottom;}return true;}),`${tag}: status rows stack without overlap inside the box`);
  {const g1=await geo();ok(g1===g0,`${tag}: no layout shift after a band tap (zone/status ${g0} → ${g1})`);}
  ok(await ev(()=>{const e=document.getElementById('cxHint');const cs=getComputedStyle(e);return e.getBoundingClientRect().height<=20&&cs.whiteSpace==='nowrap'&&e.scrollWidth<=e.clientWidth+1;}),`${tag}: status hint is one line and fully visible`);
  ok((await p.textContent('#cxCode')).replace(/\s+/g,' ').trim()==='3-05 Fb In'&&/aim 6/.test(await p.textContent('#cxAim')),`${tag}: spoken call big in the status box ("3-05 Fb In", aim 6 vs RHB)`);
  ok(await ev(()=>{const e=document.querySelector('#cBand td button.on');return !!e&&getComputedStyle(e).backgroundColor==='rgb(30, 63, 208)';}),`${tag}: selected cell is royal #1E3FD0`);
  ok(await ev(()=>!!document.querySelector('#cZone button.aim[data-z="6"]')),`${tag}: aim auto-mapped and outlined on the zone`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap (called)${pr.length?' → '+pr.slice(0,5).join(' | '):''}`);}
  await p.click('#cZone button[data-z="4"]');await wait();ok(await ev(()=>!!document.querySelector('#cZone button.act[data-z="4"]')),`${tag}: actual spot marked`);{const g2=await geo();ok(g2===g0,`${tag}: no layout shift after the zone tap`);}await shot('coach-called');
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
  await p.click('#cxMenu');await wait(250);
  ok(await inView('#cMenuDlg .cmenu-g button')&&await inView('#cMenuDlg button[value=cancel]'),`${tag}: game menu fits, Cancel on screen`);
  ok(await ev(()=>{const g=document.querySelector('#cMenuDlg .cmenu-g');const e=document.getElementById('cmEnd').getBoundingClientRect(),c=document.querySelector('#cMenuDlg button[value=cancel]').getBoundingClientRect();return getComputedStyle(g).gridTemplateColumns.split(' ').length===3&&c.top-e.bottom>100;}),`${tag}: menu is a 3-col grid, End game far from Cancel`);
  await shot('game-menu');await p.click('#cMenuDlg button[value=cancel]');await wait();
  const before=await ev(()=>JSON.stringify(__app.store.real.callSheets));await p.click('#cxMenu');await wait(250);await p.click('#cmBand');await wait(250);
  ok(await ev(()=>document.getElementById('bandDlg').open&&document.querySelectorAll('#bandList select').length>=3),`${tag}: band setup lists the cells with no spot`);
  ok(await inView('#bandDlg button[value=ok]')&&await inView('#bandDlg button[value=cancel]'),`${tag}: band setup Cancel/Save visible without scrolling (sticky)`);
  ok(/saved on this phone/i.test(await p.textContent('#bandSub')),`${tag}: band setup says "saved on this phone"`);
  await shot('band-setup');await p.click('#bandDlg button[value=cancel]');await wait();ok(await ev(()=>JSON.stringify(__app.store.real.callSheets))===before,`${tag}: band setup Cancel saves nothing`);
  await p.click('#cxMenu');await wait(200);await p.click('#cmBand');await wait(200);await p.selectOption('#bandList select[data-norm="CH"]','8');await p.click('#bandDlg button[value=ok]');await wait();
  await p.click('#cBand button[data-r="1"][data-c="7"]');await wait();ok(/aim 8/.test(await p.textContent('#cxAim')),`${tag}: unmapped "CHG" cell now aims at 8 after band setup`);
  // ---- side retired ----
  await ev(()=>{const g=__app.store.real.games[0];g.cur.outs=2;g.cur.s=2;g.cur.b=0;__app.store.save();__app.render();});await p.click('#cRes [data-r="swinging"]');await wait();
  ok(await ev(()=>!document.getElementById('cSide').classList.contains('hide'))&&/Top 1: \d+ pitches · \d+ K/.test(await p.textContent('#cSideSum')),`${tag}: "Side retired" card with the inning summary`);
  {const cr=await ev(()=>{const L=c=>{const m=c.match(/[\d.]+/g).slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;});return .2126*m[0]+.7152*m[1]+.0722*m[2];};const e=document.getElementById('cSideOk'),cs=getComputedStyle(e),bg=getComputedStyle(document.getElementById('cSide')).backgroundColor;
    const r=(a,b)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);return{t:r(L(cs.color),L(bg)),b:r(L(cs.borderTopColor),L(bg)),bw:parseFloat(cs.borderTopWidth)};});
    ok(cr.t>=10&&cr.b>=3&&cr.bw>=2,`${tag}: Keep charting contrast ${cr.t.toFixed(1)}:1 text, ${cr.b.toFixed(1)}:1 border ${cr.bw}px`);}
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
// bullpen portrait pad: Way buttons 48 tall, every pitch type (incl. SC) on the pad, confirmation off the zone
{const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?3:1});await c.route(/supabase\.co/,r=>r.abort());const p=await c.newPage();await p.goto(BASE);
  await p.evaluate(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';__app.store.save();__app.render();});await p.click('nav [data-t="bullpen"]');await p.waitForTimeout(300);
  const m=await p.evaluate(()=>{const way=[...document.querySelectorAll('#bpPad #wayBtns button')].map(e=>e.getBoundingClientRect().height);const ty=[...document.querySelectorAll('#bpPad #types button')];
    const vis=ty.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.left>=0&&r.right<=innerWidth;}).map(e=>e.textContent.trim());return{way,vis,all:ty.map(e=>e.textContent.trim())};});
  ok(m.way.length===4&&Math.min(...m.way)>=48,'390x844 bullpen: Way buttons ≥48 tall '+m.way.join(','));
  ok(m.vis.length===m.all.length&&m.all.some(t=>/^SC/.test(t)),'390x844 bullpen: all pitch types on the pad incl. SC ('+m.vis.join(' ')+')');
  const ov=await p.evaluate(()=>{confirmSave('FB 3 → 2 ✗');const f=document.getElementById('flash').getBoundingClientRect(),z=document.querySelector('.zonewrap svg, .zonewrap').getBoundingClientRect();return f.bottom>z.top&&f.top<z.bottom;});
  ok(!ov,'390x844 bullpen: saved confirmation does not cover the zone');if(SHOT){await p.waitForTimeout(200);await p.screenshot({path:SHOT+'after-bullpen-pad.png'});}await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
