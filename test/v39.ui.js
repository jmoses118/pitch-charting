// v39 (Code Reviewer fixes): Setup → Sync problems screen (view / retry / discard / Cancel) at three iPhone sizes,
// change-up aim limits in the coach screen, bullpen and band setup, and local dates after 8 PM ET.
// Throwaway profile, Supabase blocked, test data only (first names). usage: node test/v39.ui.js <url>
const {chromium}=require('playwright-core');const {AUDIT}=require('./lib/audit');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const SHOT=process.env.SHOT_DIR||'';if(SHOT)require('fs').mkdirSync(SHOT,{recursive:true});
const PID='3b0e7c1a-0000-4000-8000-00000000000a';
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const ctx=async(w,h,o)=>{const c=await b.newContext(Object.assign({viewport:{width:w,height:h},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?3:1},o||{}));await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));return c;};
// ---- Sync problems screen at three iPhone sizes ----
for(const [W,H] of [[390,844],[375,667],[430,932]]){const tag=`${W}x${H}`;const c=await ctx(W,H);const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);
  await p.goto(BASE);await ev(pid=>{const S=__app.store.real;S.sessions.push({id:'s_1',date:'2026-10-14',pitches:[{id:pid,pitcherId:'p_woods',ts:Date.now(),type:'FB',loc:5,targets:[5]}]});
    PC.quarantine(S,'pitches',pid,403,'new row violates row-level security policy for table "pitches"');PC.quarantine(S,'sessions','s_1',400,'invalid input syntax');PC.quarantine(S,'games','g_x',409,'duplicate key value violates unique constraint "games_pkey"');PC.quarantine(S,'pitchers','p_x',401,'JWT expired');__app.store.save();__app.render();},PID);
  await p.click('nav [data-t="setup"]');await w(300);
  ok(await ev(()=>{const b=document.getElementById('rejBtn');return !b.classList.contains('hide')&&/Sync problems \(4\)/.test(b.textContent);}),`${tag}: Setup shows "Sync problems (4)"`);
  await p.click('#rejBtn');await w(250);
  ok(await ev(()=>document.getElementById('rejDlg').open&&document.querySelectorAll('#rejList .rejrow').length===4),`${tag}: dialog lists all 4 rejected rows`);
  ok(/Avery #45 · FB → 5 · bullpen 2026-10-14/.test(await p.textContent('#rejList')),`${tag}: rows say what (first name only)`);
  {const why=await ev(()=>Object.fromEntries([...document.querySelectorAll('.rejrow')].map(r=>[r.dataset.key.split(':')[0],r.querySelector('.rejwhy').textContent])));
   const exp={pitches:"This phone isn't allowed to save that. Ask your coach to check your team code.",sessions:"The server couldn't read this change. Try Retry; if it fails again, Discard.",games:'This was already saved from another phone. Usually safe to Discard.',pitchers:'Your sign-in ran out. Tap Retry – it will send after you sign in again.'};
   ok(Object.keys(exp).every(k=>new RegExp('^Why: '+exp[k].replace(/[.?()]/g,'\\$&')+' · [A-Z][a-z]{2} \\d{1,2}, \\d{1,2}:\\d{2} [AP]M$').test(why[k])),`${tag}: plain "Why: … · Oct 14, 8:56 AM" for 401/403/409/400 `+JSON.stringify(why));}
  ok(await ev(()=>{const vis=[...document.querySelectorAll('.rejrow')].map(r=>r.innerText).join(' ');return !/row-level|constraint|JWT|pitches"|games_pkey|Server said/.test(vis)&&[...document.querySelectorAll('.rejdet')].every(d=>!d.open);}),`${tag}: raw server text hidden behind a closed Details toggle`);
  await p.click('.rejrow[data-key^="games"] .rejdet summary');ok(/games_pkey/.test(await ev(()=>document.querySelector('.rejrow[data-key^="games"] .rejdet').innerText)),`${tag}: Details shows the raw server text`);await p.click('.rejrow[data-key^="games"] .rejdet summary');
  ok(await ev(()=>{const d=getComputedStyle(document.querySelector('.rejrow [data-act=discard]'));return d.color==='rgb(201, 42, 42)'||d.borderTopColor===d.color&&d.color!=='rgb(0, 0, 0)';})&&await ev(()=>{const d=getComputedStyle(document.querySelector('.rejrow [data-act=discard]'));return d.borderTopColor===d.color;}),`${tag}: unselected Discard has red text and outline`);
  ok((await p.textContent('#rejSub')).trim()==="These changes didn't reach the cloud. They're safe on this phone. Pick Retry or Discard for each, then tap Apply.",`${tag}: sheet subtitle copy`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  const vis=s=>ev(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight+.5;},s);
  ok(await vis('#rejDlg button[value=cancel]')&&await vis('#rejApply'),`${tag}: Cancel and Apply visible (≥44px) without scrolling`);
  ok(await ev(()=>[...document.querySelectorAll('.rejseg button')].every(e=>e.getBoundingClientRect().height>=44)),`${tag}: Keep/Retry/Discard ≥44px`);
  await p.click('.rejrow:nth-child(1) [data-act=retry]');await p.click('.rejrow:nth-child(2) [data-act=discard]');if(SHOT){await w(200);await p.screenshot({path:`${SHOT}setup-sync-problems-${tag}.png`});}
  await p.click('#rejDlg button[value=cancel]');await w();
  ok(await ev(()=>PC.rejectedList(__app.store.real).length===4),`${tag}: Cancel changes nothing`);
  await p.click('#rejBtn');await w(200);await p.click('.rejrow[data-key^="pitches"] [data-act=retry]');await p.click('.rejrow[data-key^="sessions"] [data-act=discard]');await p.click('#rejApply');await w(300);
  ok(await ev(pid=>{const s=__app.store.real.sync;return PC.rejectedList(__app.store.real).length===2&&!!s.queue.pitches[pid]&&!s.queue.sessions.s_1&&!s.rejected['sessions:s_1'];},PID),`${tag}: Apply re-queues Retry and drops Discard`);
  ok(/^1 change discarded/.test(await ev(()=>document.querySelector('#undoToast.on span')?.textContent||''))&&await ev(()=>document.querySelector('#undoToast button').getBoundingClientRect().height>=44),`${tag}: "1 change discarded · Undo" toast`);
  if(SHOT&&W===390){await p.screenshot({path:`${SHOT}setup-undo-toast-${tag}.png`});}
  await p.click('#undoToast button');await w();ok(await ev(()=>!!__app.store.real.sync.rejected['sessions:s_1']),`${tag}: Undo brings the discarded change back`);
  await ev(()=>{['games:g_x','pitchers:p_x','sessions:s_1'].forEach(k=>PC.discardRejected(__app.store.real,k));__app.render();});
  ok(await ev(()=>document.getElementById('rejBtn').classList.contains('hide')),`${tag}: button hides when there are no problems`);
  // band setup from Setup: change-up reason line + a flagged old high aim
  await ev(()=>{const sh=__app.store.real.callSheets[0];sh.aims={CH:2};__app.store.save();__app.render();});await p.evaluate(()=>document.getElementById('csCard').open=true);await p.click('#csBand');await w(250);
  ok(await ev(()=>{const r=document.querySelector('#bandList select[data-norm="CH"]').closest('.bandrow');return r.classList.contains('bandbad')&&/Change-ups aim low: 4, 7, 8, 9, 13, 14 or 18\./.test(r.textContent)&&/Was zone 2 – change-ups can't aim high\. Pick a low box\./.test(r.textContent)&&r.querySelector('select').value==='';})&&/1 change-up aim needs a new low box\./.test(await p.textContent('#bandSub')),`${tag}: band setup explains the change-up limit and flags the old zone 2 aim`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: band setup no clipping${pr.length?' → '+pr.slice(0,3).join(' | '):''}`);}
  if(SHOT){await p.evaluate(()=>{const r=document.querySelector('#bandList .bandbad');r&&r.scrollIntoView({block:'center'});});await w(200);await p.screenshot({path:`${SHOT}band-setup-ch-${tag}.png`});}
  await p.click('#bandDlg button[value=cancel]');
  ok(!errs.length,`${tag}: no page errors `+errs.join('|'));await c.close();}
// ---- change-up aims: coach screen (landscape, 3 sizes) ----
for(const [W,H] of [[844,390],[667,375],[932,430]]){const tag=`${W}x${H}`;const c=await ctx(W,H);const p=await c.newPage();const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);await p.goto(BASE);
  await ev(()=>{const S=__app.store.real;S.curPitcher='p_woods';S.games.push({id:'g_1',date:'2026-10-14',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]});S.activeGame='g_1';__app.store.save();__app.render();});await w(300);
  await p.click('#cBand button[data-r="0"][data-c="6"]');await w();ok(/CH7/.test(await p.textContent('#cxCode')),`${tag} coach: CH7 called`);
  await p.click('#cRes [data-cx="aim"]');await w();
  ok(await ev(()=>{const n=[...document.querySelectorAll('#cZone button.noaim')].map(e=>+e.dataset.z);return [1,2,3,5,6,11,12,15,16,17].every(z=>n.includes(z))&&![4,7,8,9,13,14,18].some(z=>n.includes(z));}),`${tag} coach ✎ Aim: only 4, 7, 8, 9, 13, 14, 18 are offered for a change-up`);
  ok(await ev(()=>{const b=document.querySelector('#cZone button.noaim[data-z="2"]'),cs=getComputedStyle(b);return cs.opacity==='1'&&cs.borderTopStyle==='dashed'&&getComputedStyle(b.querySelector('span')).color==='rgb(91, 100, 114)';}),`${tag} coach: faded boxes are dashed outlines with #5B6472 numbers`);
  await p.click('#cZone button[data-z="2"]');await w();{const exp=W<700?'CH: aim low':'Change-up: aim low';
   ok((await p.textContent('#cxHint')).trim()===exp&&await ev(()=>!!document.querySelector('#cZone .aim[data-z="7"]')),`${tag} coach: box 2 refused with "${exp}", aim stays 7`);
   ok(await ev(()=>{const h=document.getElementById('cxHint'),m=document.getElementById('cxMenu');return h.scrollWidth<=h.clientWidth+1&&m.scrollWidth<=m.clientWidth+1&&m.getBoundingClientRect().width>=44;}),`${tag} coach: warning not truncated and ⋯ Game label not squeezed`);}
  if(SHOT){await w(100);await p.screenshot({path:`${SHOT}coach-ch-aim-${tag}.png`});}
  await p.click('#cZone button[data-z="8"]');await w();ok(await ev(()=>!!document.querySelector('#cZone .aim[data-z="8"]')),`${tag} coach: box 8 accepted`);
  await p.click('#cxMenu');await w(200);await p.click('#cmBand');await w(250);
  ok(await ev(()=>{const s=document.querySelector('#bandList select[data-norm="CH"]');const v=[...s.options].map(o=>+o.value).filter(v=>v>0);return JSON.stringify(v)==='[4,7,8,9,13,14,18]';}),`${tag} band setup: change-up aim choices are 4, 7, 8, 9, 13, 14, 18`);
  await c.close();}
// ---- change-up aims: bullpen (portrait) + local date after 8 PM ET ----
{const c=await ctx(390,844,{timezoneId:'America/New_York'});const p=await c.newPage();await p.clock.install({time:new Date('2026-10-16T21:30:00-04:00')});const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);await p.goto(BASE);
  await ev(()=>{const S=__app.store.real;S.curPitcher='p_woods';__app.store.save();__app.render();});await p.click('nav [data-t="bullpen"]');await w(300);
  const tapZ=async z=>{const xy=await p.$eval(`#zone [data-z="${z}"]`,e=>{const s=e.ownerSVGElement,pt=s.createSVGPoint(),bb=e.getBBox();pt.x=bb.x+bb.width/2;pt.y=bb.y+bb.height/2;const q=pt.matrixTransform(s.getScreenCTM());return[q.x,q.y];});await p.mouse.click(xy[0],xy[1]);};
  await p.click('#types button:has-text("CH")');await tapZ(2);await w();
  ok(await ev(()=>!/TARGET/.test(document.getElementById('zone').textContent))&&/Change-ups are aimed low/.test(await p.textContent('#toast')),'bullpen: a change-up can\'t be aimed at box 2');
  await tapZ(8);await w();await tapZ(9);await w();
  const s=await ev(()=>{const x=__app.store.real.sessions.at(-1);return x&&{date:x.date,t:x.pitches.at(-1).targets,day:PC.pitchDay(x.pitches.at(-1),x)};});
  ok(!!s&&JSON.stringify(s.t)==='[8]','bullpen: change-up aimed at 8 logs target 8');
  ok(!!s&&s.date==='2026-10-16'&&s.day==='2026-10-16','9:30 PM ET: new bullpen session dated today (2026-10-16), not tomorrow (UTC)');
  await p.click('nav [data-t="game"]');await w(200);ok(await ev(()=>document.getElementById('gDate').value)==='2026-10-16','9:30 PM ET: new game date defaults to today');
  await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
