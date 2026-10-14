// PR F screenshots at 390x844: bullpen, batter option sheet, add-pitcher with Cancel (test data only, first names, Supabase blocked, no codes). usage: node test/demo.v5.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';const OUT='/workspace/pitch-charting-app/test/demo-ui-v5/';require('fs').mkdirSync(OUT,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,colorScheme:'dark',isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const shot=async n=>{await p.waitForTimeout(450);await p.screenshot({path:OUT+'after-'+n+'.png'});};
const tap=async z=>{const r=await p.$eval(`#zone [data-z="${z}"]`,e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};});await p.mouse.click(r.x,r.y);await p.waitForTimeout(120);};
await p.goto(BASE);await p.evaluate(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';__app.store.save();__app.render();});
await p.click('nav [data-t="bullpen"]');
for(const [t,a,l] of [['FB',3,3],['FB',1,2],['CH',7,5],['DC',9,14]]){await p.click(`#types [data-c="${t}"]`);await tap(a);await tap(l);}
await p.waitForTimeout(1500);await p.click('#types [data-c="DR"]');await shot('bullpen');
await p.click('#batTog');await shot('batter-sheet');await p.click('#batDlg button[value=cancel]');
await p.click('#addPQuick');await p.fill('#pdName','Zoe');await shot('add-pitcher-cancel');
console.log('errors',errs);await b.close();})();
