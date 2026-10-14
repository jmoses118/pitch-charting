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
    PC.quarantine(S,'pitches',pid,403,'new row violates row-level security policy for table "pitches"');PC.quarantine(S,'sessions','s_1',400,'invalid input syntax');__app.store.save();__app.render();},PID);
  await p.click('nav [data-t="setup"]');await w(300);
  ok(await ev(()=>{const b=document.getElementById('rejBtn');return !b.classList.contains('hide')&&/Sync problems \(2\)/.test(b.textContent);}),`${tag}: Setup shows "Sync problems (2)"`);
  await p.click('#rejBtn');await w(250);
  ok(await ev(()=>document.getElementById('rejDlg').open&&document.querySelectorAll('#rejList .rejrow').length===2),`${tag}: dialog lists both rejected rows`);
  ok(/Avery #45 · FB → 5 · bullpen 2026-10-14/.test(await p.textContent('#rejList'))&&/Server said 403/.test(await p.textContent('#rejList')),`${tag}: rows say what and why in plain words (first name only)`);
  {const pr=await ev(AUDIT);ok(!pr.length,`${tag}: no clipping/overlap${pr.length?' → '+pr.slice(0,4).join(' | '):''}`);}
  const vis=s=>ev(s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight+.5;},s);
  ok(await vis('#rejDlg button[value=cancel]')&&await vis('#rejApply'),`${tag}: Cancel and Apply visible (≥44px) without scrolling`);
  ok(await ev(()=>[...document.querySelectorAll('.rejseg button')].every(e=>e.getBoundingClientRect().height>=44)),`${tag}: Keep/Retry/Discard ≥44px`);
  await p.click('.rejrow:nth-child(1) [data-act=retry]');await p.click('.rejrow:nth-child(2) [data-act=discard]');if(SHOT){await w(200);await p.screenshot({path:`${SHOT}setup-sync-problems-${tag}.png`});}
  await p.click('#rejDlg button[value=cancel]');await w();
  ok(await ev(()=>PC.rejectedList(__app.store.real).length===2),`${tag}: Cancel changes nothing`);
  await p.click('#rejBtn');await w(200);await p.click('.rejrow[data-key^="pitches"] [data-act=retry]');await p.click('.rejrow[data-key^="sessions"] [data-act=discard]');await p.click('#rejApply');await w(300);
  ok(await ev(pid=>{const s=__app.store.real.sync;return PC.rejectedList(__app.store.real).length===0&&!!s.queue.pitches[pid]&&!s.queue.sessions.s_1;},PID),`${tag}: Apply re-queues Retry and drops Discard`);
  ok(await ev(()=>document.getElementById('rejBtn').classList.contains('hide')),`${tag}: button hides when there are no problems`);
  ok(!errs.length,`${tag}: no page errors `+errs.join('|'));await c.close();}
// ---- change-up aims: coach screen (landscape) ----
{const c=await ctx(844,390);const p=await c.newPage();const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);await p.goto(BASE);
  await ev(()=>{const S=__app.store.real;S.curPitcher='p_woods';S.games.push({id:'g_1',date:'2026-10-14',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]});S.activeGame='g_1';__app.store.save();__app.render();});await w(300);
  await p.click('#cBand button[data-r="0"][data-c="6"]');await w();ok(/CH7/.test(await p.textContent('#cxCode')),'coach: CH7 called');
  await p.click('#cRes [data-cx="aim"]');await w();
  ok(await ev(()=>{const n=[...document.querySelectorAll('#cZone button.noaim')].map(e=>+e.dataset.z);return [1,2,3,5,6,11,12,15,16,17].every(z=>n.includes(z))&&![4,7,8,9,13,14,18].some(z=>n.includes(z));}),'coach ✎ Aim: only 4, 7, 8, 9, 13, 14, 18 are offered for a change-up');
  await p.click('#cZone button[data-z="2"]');await w();ok(/Change-ups are aimed low/.test(await p.textContent('#cxHint'))&&await ev(()=>!!document.querySelector('#cZone .aim[data-z="7"]')),'coach: tapping box 2 for a change-up is refused, aim stays 7');
  await p.click('#cZone button[data-z="8"]');await w();ok(await ev(()=>!!document.querySelector('#cZone .aim[data-z="8"]')),'coach: box 8 accepted');
  await p.click('#cxMenu');await w(200);await p.click('#cmBand');await w(250);
  ok(await ev(()=>{const s=document.querySelector('#bandList select[data-norm="CH"]');const v=[...s.options].map(o=>+o.value).filter(v=>v>0);return JSON.stringify(v)==='[4,7,8,9,13,14,18]';}),'band setup: change-up aim choices are 4, 7, 8, 9, 13, 14, 18');
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
