// Game and bullpen are mutually exclusive on a device: lock cards, pause/end/resume, no data loss. Throwaway profile, Supabase blocked (offline).
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const vis=s=>p.isVisible(s);const tab=async t=>{await p.click(`nav [data-t="${t}"]`);await p.waitForTimeout(120);};const clk=async s=>{await p.$eval(s,e=>e.scrollIntoView({block:'center'}));await p.click(s);await p.waitForTimeout(150);};
const st=f=>p.evaluate(f);
await p.goto(BASE);await st(()=>{__app.store.real.pitchers.push({id:'p_t',name:'Test Pitcher',num:'1',throws:'R'});__app.store.real.curPitcher='p_t';__app.store.save();__app.render();});
await tab('game');await clk('#gOpp');await p.fill('#gOpp','Storm');await clk('#gStart');ok(await vis('#inGame'),'game started');
await st(()=>{const g=__app.store.real.games.find(x=>x.id===__app.store.real.activeGame);g.pitches.push({id:crypto.randomUUID(),pitcherId:'p_t',ts:Date.now(),type:'FB',result:'ball',b:0,s:0,inning:1,abn:0,slot:0});g.cur.b=1;__app.store.save();__app.render();});
await tab('bullpen');ok(await vis('#lockBp'),'bullpen locked while game in progress');ok((await p.textContent('#lockBp .lockMsg'))==='Game in progress — end or pause the game to start a bullpen','lock message');
ok(!(await vis('#entry'))&&!(await vis('#bpCard')),'no bullpen entry while locked');
await clk('#lkGoG');ok(await vis('#inGame'),'back to the game');await tab('bullpen');
await clk('#lkPauseG');ok(!(await vis('#lockBp'))&&await vis('#entry'),'pause game unlocks bullpen');
const gid=await st(()=>__app.store.real.games[0].id);ok(await st(()=>__app.store.real.games[0].pitches.length===1&&!__app.store.real.games[0].ended),'paused game keeps its pitches');
await st(()=>{const S=__app.store.real;const s={id:'s_m',date:'2026-10-13',pitcherId:'p_t',started:1,pitches:[{id:crypto.randomUUID(),pitcherId:'p_t',ts:Date.now(),type:'FB',targets:[1],loc:1,b:0,s:0}]};S.sessions.push(s);S.activeSession='s_m';__app.store.save();__app.render();});
await tab('game');ok(await vis('#lockGame'),'game tab locked while bullpen open');ok((await p.textContent('#lockGame .lockMsg'))==='Bullpen in progress — end or pause the bullpen to start a game','reverse lock message');
ok(!(await vis('#noGame'))&&!(await vis('#pausedCard')),'no new game / resume while bullpen open');
await clk('#lkPauseBp');ok(!(await vis('#lockGame')),'pause bullpen unlocks game');ok(await vis('#pausedCard'),'paused game listed');
await tab('bullpen');ok(await vis('#bpResume'),'paused bullpen can be resumed');await clk('#bpResume');ok(await st(()=>__app.store.real.activeSession==='s_m'),'bullpen resumed');
await tab('game');await clk('#lkEndBp');ok(await vis('#rDlg'),'end bullpen opens the report');await st(()=>document.getElementById('rDlg').close());
ok(await st(()=>__app.store.real.sessions.find(s=>s.id==='s_m').pitches.length===1),'ended bullpen keeps its pitches');
await tab('game');ok(await vis('#pausedCard'),'resume list shown');await clk(`[data-rg="${gid}"]`);ok(await vis('#inGame')&&(await p.textContent('#cnt'))==='1-0','game resumed with its count');
await tab('bullpen');await clk('#lkEndG');ok(!(await vis('#lockBp')),'ending the game unlocks bullpen');ok(await st(()=>__app.store.real.games[0].status==='final'),'game final');
// player role has no game mode: a stale active game on the phone never blocks her bullpen
await st(()=>{const S=__app.store.real;S.games.push({id:'g_x',started:1,status:'active',opponent:'X',lineup:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0},pitches:[]});S.activeGame='g_x';const y=S.sync;y.teamCode='TE-XXXXX-XXXXX';y.teamId='t';y.role='player';y.pitcherId='p_t';__app.store.save();__app.render();});
ok(!(await vis('#lockBp'))&&await vis('#bpCard'),'player bullpen never locked');
ok(errs.length===0,'no page errors '+errs.join(' | '));console.log(fails?fails+' FAILED':'ALL PASS');await b.close();process.exit(fails?1:0);})();
