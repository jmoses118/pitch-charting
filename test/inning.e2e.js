// DoD: a full half-inning at 390x844. Three in-play outs advance the inning.
// usage: node test/inning.e2e.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://127.0.0.1:8766/';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const GAME={id:'g1',date:'2026-10-15',opponent:'Storm',homeAway:'home',status:'active',started:1,
  lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'},{slot:2,name:'Batter 2',num:'2',hand:'L'},{slot:3,name:'Batter 3',num:'3',hand:'R'}],
  cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const tapZ=async z=>{const xy=await p.$eval(`#zone [data-z="${z}"]`,e=>{const s=e.ownerSVGElement,pt=s.createSVGPoint(),bb=e.getBBox();pt.x=bb.x+bb.width/2;pt.y=bb.y+bb.height/2;const q=pt.matrixTransform(s.getScreenCTM());return[q.x,q.y];});await p.mouse.click(xy[0],xy[1]);};
await p.goto(BASE);
await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games=[g];S.activeGame='g1';S.sessions=[];S.activeSession=null;__app.store.save();__app.render();},GAME);
await p.click('nav [data-t="game"]');await p.waitForTimeout(200);
for(let i=0;i<3;i++){
  await p.click('#types [data-c="FB"]');await tapZ(5);await tapZ(5);await p.waitForTimeout(200);
  ok(await p.evaluate(()=>!document.getElementById('resSheet').classList.contains('hide')),'inning pitch '+(i+1)+' opens the result sheet');
  await p.click('#resBtns [data-r="inplay"]');await p.waitForTimeout(150);
  await p.click('#ipBtns [data-ip="out"]');await p.waitForTimeout(200);
}
const end=await p.evaluate(()=>{const g=__app.store.real.games[0];return{inn:g.cur.inning,outs:g.cur.outs,n:g.pitches.length,rows:g.pitches.map(x=>({result:x.result,ip:x.ip,end:x.end,inning:x.inning}))};});
ok(end.n===3&&end.rows.every(r=>r.result==='inplay'&&r.ip==='out'&&r.end==='out'&&r.inning===1),'three in-play outs in the first inning '+JSON.stringify(end.rows));
ok(end.inn===2&&end.outs===0&&(await p.textContent('#inn'))==='2'&&await p.evaluate(()=>document.querySelectorAll('#outs .on').length)===0,'the third out advances to inning 2 with 0 outs');
ok(await p.evaluate(()=>document.getElementById('resSheet').classList.contains('hide')),'the result sheet closes after the last out');
ok(!errs.length,'no page errors '+errs.join('|'));
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
