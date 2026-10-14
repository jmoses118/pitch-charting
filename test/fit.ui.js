// One-screen pitch entry: at 390x844 and 375x667 (iPhone SE) the pitch chips and the whole zone sit inside the viewport
// with no scrolling, in Bullpen and Game; tap boxes stay >= 48px; result picker is a bottom sheet; wristband one tap away.
// Throwaway profile, Supabase blocked, test data only. usage: node test/fit.ui.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const GAME={id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'away',status:'active',started:1,lineup:[{slot:1,name:'B1',num:'1',hand:'R'},{slot:2,name:'B2',num:'2',hand:'L'}],cur:{inning:2,outs:1,slot:0,b:1,s:1,abn:3},pitches:[]};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for(const [W,H] of [[390,844],[375,667]]){const tag=`${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const ev=(f,a)=>p.evaluate(f,a);
  await p.goto(BASE);await ev(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.customTypes=[{code:'SC',name:'Screwball'}];__app.store.save();__app.render();});
  const inView=sel=>ev(s=>{const r=document.querySelector(s).getBoundingClientRect();const nav=document.querySelector('nav').getBoundingClientRect().top;return r.width>0&&r.top>=0&&r.left>=0&&r.right<=innerWidth+.5&&r.bottom<=nav+.5;},sel);
  const fits=async mode=>{ok(await ev(()=>scrollY===0),`${tag} ${mode}: not scrolled`);
    ok(await inView('#types'),`${tag} ${mode}: pitch chips inside the viewport`);ok(await inView('#zone'),`${tag} ${mode}: whole zone above the tab bar`);
    const box=await ev(()=>{const r=document.querySelector('#zone [data-z="5"]').getBoundingClientRect();return Math.min(r.width,r.height);});ok(box>=48,`${tag} ${mode}: zone box >= 48px (${box.toFixed(1)})`);
    ok(await ev(()=>{const t=document.getElementById('types');return t.getBoundingClientRect().height<60&&getComputedStyle(t).overflowX==='auto';}),`${tag} ${mode}: pitch types are one scrollable row`);
    ok(await inView('#wayBtns'),`${tag} ${mode}: way-off buttons above the tab bar`);
    ok(await inView('#batTog'),`${tag} ${mode}: batter chip in the zone corner`);
    // the corner toggle never covers a zone box
    ok(await ev(()=>{const s=document.getElementById('batTog').getBoundingClientRect();return [...document.querySelectorAll('#zone [data-z]')].every(e=>{const r=e.getBoundingClientRect();return r.right<=s.left+.5||r.left>=s.right-.5||r.bottom<=s.top+.5||r.top>=s.bottom-.5;});}),`${tag} ${mode}: batter chip clear of the tap boxes`);};
  await p.click('nav [data-t="bullpen"]');await p.waitForTimeout(150);await fits('bullpen');
  ok(/^Today \d+ · Wknd \d+$/.test(await p.textContent('#wlMini'))&&await ev(()=>getComputedStyle(document.querySelector('.topbar')).display==='none'),`${tag}: slim header with workload counts`);
  // tap through a bullpen pitch without scrolling
  const tap=async z=>{const r=await p.$eval(`#zone [data-z="${z}"]`,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await p.mouse.click(r.x,r.y);await p.waitForTimeout(100);};
  await p.click('#types [data-c="FB"]');await tap(3);await tap(2);
  ok(await ev(()=>(__app.store.real.sessions.at(-1)||{pitches:[]}).pitches.length)===1&&await ev(()=>scrollY===0),`${tag}: bullpen pitch logged with no scrolling`);
  await ev(()=>{__app.store.real.sessions.at(-1).ended=Date.now();__app.store.real.activeSession=null;__app.store.save();});
  await ev(g=>{const S=__app.store.real;S.games.push(g);S.activeGame='g1';__app.store.save();__app.render();},GAME);
  await p.click('nav [data-t="game"]');await p.waitForTimeout(150);await fits('game');
  ok(await ev(()=>document.getElementById('resSheet').classList.contains('hide')),`${tag} game: result sheet closed until needed`);
  await p.click('#types [data-c="CH"]');await tap(7);await p.waitForTimeout(300);
  ok(await ev(()=>document.getElementById('resSheet').classList.contains('hide')&&D.loc==null&&D.called[0]===7),`${tag} game: called spot does not open the result sheet`);
  await p.click('#resTog');ok(await ev(()=>document.getElementById('resSheet').classList.contains('hide')),`${tag} game: Result stays closed until the actual spot`);
  await ev(()=>recordGame('ball'));ok(await ev(()=>__app.store.real.games[0].pitches.length===0),`${tag} game: a pitch cannot be saved without an actual location`);
  await tap(8);await p.waitForTimeout(300);
  ok(await ev(()=>{const s=document.getElementById('resSheet');const r=s.getBoundingClientRect();const h=document.getElementById('resHead').textContent;return !s.classList.contains('hide')&&getComputedStyle(s).position==='fixed'&&Math.abs(r.bottom-innerHeight)<1&&+getComputedStyle(s).zIndex>+getComputedStyle(document.querySelector('nav')).zIndex&&/7\s*→/.test(h)&&/8/.test(h);}),`${tag} game: actual spot opens the sheet, header shows aim → actual`);
  await p.click('#resBtns [data-r="called"]');await p.waitForTimeout(100);
  ok(await ev(()=>{const p=__app.store.real.games[0].pitches[0];return __app.store.real.games[0].pitches.length===1&&p.loc===8&&JSON.stringify(p.targets)==='[7]'&&document.getElementById('resSheet').classList.contains('hide');}),`${tag} game: result logged, sheet closes`);
  // wristband: one tap away, does not move the zone
  await ev(()=>{const S=__app.store.real;S.settings=S.settings||{};S.callSheets=[{id:'cs1',name:'Band A',cols:['1','2'],rows:[['FB 3','CH 7']]}];__app.store.save();__app.render();});
  const z0=await ev(()=>document.getElementById('zone').getBoundingClientRect().top);
  if(await ev(()=>!document.getElementById('wbTog').classList.contains('hide'))){await p.click('#wbTog');await p.waitForTimeout(100);
    ok(await ev(()=>document.body.classList.contains('wbopen')&&getComputedStyle(document.getElementById('wbCard')).position==='fixed'),`${tag} game: wristband sheet opens with one tap`);
    {const z1=await ev(()=>document.getElementById('zone').getBoundingClientRect().top);ok(Math.abs(z1-z0)<1,`${tag} game: wristband does not push the zone down (${z0}→${z1})`);}
    await p.click("#wbTog");await p.waitForTimeout(100);ok(await ev(()=>!document.body.classList.contains('wbopen')),`${tag} game: wristband closes`);}
  else ok(false,`${tag} game: wristband toggle visible for the coach`);
  ok(!errs.length,`${tag}: no page errors `+errs.join('|'));await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
