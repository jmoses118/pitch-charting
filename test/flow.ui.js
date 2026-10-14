// v48 scoring flow: one machine, per mode.
// Game cannot save without an actual location, and the result sheet stays closed until that tap.
// Bullpen saves on the actual spot (no ball/strike) and a dirt-on-dirt pitch is a hit.
// usage: node test/flow.ui.js <url>
const {chromium}=require('playwright-core');const fs=require('fs');const BASE=process.argv[2]||'http://127.0.0.1:8766/';
const SHOT='/opt/cursor/artifacts/screenshots';fs.mkdirSync(SHOT,{recursive:true});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const GAME={id:'g1',date:'2026-10-14',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const tapZ=async(p,z)=>{const xy=await p.$eval(`#zone [data-z="${z}"]`,e=>{const s=e.ownerSVGElement,pt=s.createSVGPoint(),bb=e.getBBox();const spot={12:[bb.x+bb.width-4,bb.y+4],14:[bb.x+bb.width-4,bb.y+bb.height-4],11:[bb.x+4,bb.y+4]}[e.dataset.z]||[bb.x+bb.width/2,bb.y+bb.height/2];pt.x=spot[0];pt.y=spot[1];const q=pt.matrixTransform(s.getScreenCTM());return[q.x,q.y];});await p.mouse.click(xy[0],xy[1]);};
for(const [W,H] of [[375,667],[390,844],[430,932]]){const tag=`${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const ev=(f,a)=>p.evaluate(f,a);
  await p.goto(BASE);await ev(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games=[g];S.activeGame='g1';S.sessions=[];__app.store.save();__app.render();},GAME);
  await p.click('nav [data-t="game"]');await p.waitForTimeout(200);
  await p.click('#types [data-c="CH"]');await tapZ(p,8);await p.waitForTimeout(200);
  const covered=await ev(()=>{const s=document.getElementById('resSheet');const z=document.querySelector('#zone [data-z="5"]').getBoundingClientRect();const hit=document.elementFromPoint(z.x+z.width/2,z.y+z.height/2);return s.classList.contains('hide')&&!!hit&&!s.contains(hit);});
  ok(covered,`${tag} game: sheet stays closed on the called spot and does not cover the zone`);
  await p.click('#resTog');ok(await ev(()=>document.getElementById('resSheet').classList.contains('hide')),`${tag} game: Result does not open before the actual spot`);
  const n0=await ev(()=>__app.store.real.games[0].pitches.length);await ev(()=>recordGame('ball'));
  ok(await ev(()=>__app.store.real.games[0].pitches.length)===n0,`${tag} game: cannot save without an actual location`);
  ok(await ev(()=>{const s=document.getElementById('steps');return s.scrollWidth<=s.clientWidth+1&&[...s.children].length===4&&[...s.children].every(li=>li.scrollWidth<=li.clientWidth+2);}),`${tag} game: four steps fit on one line`);
  await p.screenshot({path:`${SHOT}/flow-aim-${W}.png`});
  await tapZ(p,12);await p.waitForTimeout(250);
  const head=await p.textContent('#resHead');
  ok(/8\s*→/.test(head)&&/12/.test(head)&&await ev(()=>!document.getElementById('resSheet').classList.contains('hide')),`${tag} game: header shows aim → actual (${head})`);
  await p.screenshot({path:`${SHOT}/flow-actual-${W}.png`});
  await p.click('#resBtns [data-r="ball"]');await p.waitForTimeout(150);
  const row=await ev(()=>{const x=__app.store.real.games[0].pitches.at(-1);return x&&{type:x.type,targets:x.targets,loc:x.loc,calledLoc:x.calledLoc,result:x.result};});
  ok(JSON.stringify(row)===JSON.stringify({type:'CH',targets:[8],loc:12,calledLoc:8,result:'ball'}),`${tag} game: saved ${JSON.stringify(row)}`);
  ok(!errs.length,`${tag}: no page errors ${errs.join('|')}`);await c.close();}
{const c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const ev=f=>p.evaluate(f);
  await p.goto(BASE);await ev(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games=[{id:'g1',date:'2026-10-14',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]}];S.activeGame='g1';__app.store.save();__app.render();});
  await p.waitForTimeout(300);await p.click('#cBand button[data-r="1"][data-c="7"]');await p.waitForTimeout(150);
  await p.click('#cZone button[data-z="8"]');await p.waitForTimeout(150);
  ok(await ev(()=>D.aim===8&&D.loc==null&&[...document.querySelectorAll('#cRes [data-r]')].every(b=>b.disabled)),'coach: change-up aim is set and results stay disabled');
  await p.screenshot({path:`${SHOT}/flow-coach-aim.png`});
  await p.click('#cZone button[data-z="12"]');await p.waitForTimeout(150);
  ok(await ev(()=>D.loc===12&&[...document.querySelectorAll('#cRes [data-r]')].every(b=>!b.disabled)),'coach: actual spot enables the result');
  await p.click('#cRes [data-r="ball"]');await p.waitForTimeout(200);
  const row=await ev(()=>{const x=__app.store.real.games[0].pitches.at(-1);return x&&{type:x.type,targets:x.targets,loc:x.loc,calledLoc:x.calledLoc,result:x.result};});
  ok(JSON.stringify(row)===JSON.stringify({type:'CH',targets:[8],loc:12,calledLoc:8,result:'ball'}),'coach: saved '+JSON.stringify(row));
  await p.screenshot({path:`${SHOT}/flow-coach-saved.png`});
  ok(!errs.length,'coach: no page errors '+errs.join('|'));await c.close();}
for(const [W,H] of [[375,667],[390,844],[430,932]]){const tag=`${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=f=>p.evaluate(f);
  await p.goto(BASE);await p.click('nav [data-t="bullpen"]');await p.waitForTimeout(200);
  const steps=await ev(()=>[...document.getElementById('steps').children].map(li=>li.textContent));
  ok(steps.length===3&&steps.join(',')==='Pitch,Aim,Landed',`${tag} bullpen: three steps, no result`);
  await p.click('#types [data-c="CH"]');await p.click('#actBtns [data-z="31"]');await p.waitForTimeout(100);
  ok(await ev(()=>D.called[0]===31&&D.loc==null&&(__app.store.state.sessions.at(-1)?.pitches.length||0)===0)&&await ev(()=>document.getElementById('resSheet').classList.contains('hide')),`${tag} bullpen: dirt aim does not save and does not open a result sheet`);
  await p.click('#actBtns [data-z="31"]');await p.waitForTimeout(200);
  const row=await ev(()=>{const x=(__app.store.state.sessions.at(-1)||{pitches:[]}).pitches.at(-1);return x&&{type:x.type,targets:x.targets,loc:x.loc,result:x.result==null,hit:PC.hitSpot(x)};});
  ok(JSON.stringify(row)===JSON.stringify({type:'CH',targets:[31],loc:31,result:true,hit:true}),`${tag} bullpen: dirt on dirt is a hit and has no ball/strike ${JSON.stringify(row)}`);
  const sum=await p.textContent('#bpSum');
  ok(/hit spot/i.test(sum)&&!/strike/i.test(sum),`${tag} bullpen line leads with hit spot, not strike % (${sum})`);
  await p.click('nav [data-t="stats"]');await p.waitForTimeout(200);await p.selectOption('#sScope','bullpen');await p.waitForTimeout(150);
  const grid=await p.textContent('#sGrid');
  ok(/Hit spot %/.test(grid)&&!/Strike %/.test(grid),`${tag} bullpen stats show hit-spot %, not strike %`);
  if(W===390)await p.screenshot({path:`${SHOT}/flow-bullpen-hit.png`});
  ok(!errs.length,`${tag} bullpen: no page errors ${errs.join('|')}`);await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1);});
