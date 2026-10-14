// One-screen entry (v4) screenshots at 390x844: bullpen, game, result sheet (test data only, first names, Supabase blocked, no codes). usage: node test/demo.v4.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';const OUT='/workspace/pitch-charting-app/test/demo-ui-v4/';require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,colorScheme:'dark',isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const shot=async n=>{await p.waitForTimeout(400);await p.screenshot({path:OUT+'after-'+n+'.png'});};
const tap=async z=>{const r=await p.$eval(`#zone [data-z="${z}"]`,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await p.mouse.click(r.x,r.y);await p.waitForTimeout(120);};
await p.goto(BASE);await p.evaluate(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.callSheets=[{id:'cs1',name:'Band A',cols:['1','2','3'],rows:[['FB 3','CH 7','DC 9'],['FB IN','DR 8','FB A']]}];__app.store.save();__app.render();});
await p.click('nav [data-t="bullpen"]');await p.click('#batTog');await p.click('#hR');
for(const [t,a,l] of [['FB',3,3],['FB',1,2],['CH',7,5],['DC',9,14]]){await p.click(`#types [data-c="${t}"]`);await tap(a);await tap(l);}
await p.click('#types [data-c="DR"]');await shot('bullpen');
await p.evaluate(()=>{const S=__app.store.real;S.sessions.at(-1).ended=Date.now();S.activeSession=null;
  S.games.push({id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'away',status:'active',started:1,lineup:[{slot:1,name:'B1',num:'1',hand:'L'},{slot:2,name:'B2',num:'2',hand:'R'}],cur:{inning:2,outs:1,slot:0,b:1,s:1,abn:3},
  pitches:[{id:crypto.randomUUID(),pitcherId:'p_a',type:'FB',targets:[3],loc:1,result:'called',abn:3,hand:'L',b:0,s:0},{id:crypto.randomUUID(),pitcherId:'p_a',type:'DC',targets:[9],loc:17,result:'ball',abn:3,hand:'L',b:0,s:1}]});S.activeGame='g1';__app.store.save();__app.render();});
await p.click('nav [data-t="game"]');await p.click('#types [data-c="CH"]');await shot('game');
await tap(7);await shot('result-sheet');
await p.click('#resClose');await p.click('#wbTog');await shot('wristband-sheet');
console.log('errors',errs);await b.close();})();
