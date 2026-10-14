// RULE-11: editing a jersey number saves, and Cancel leaves it unchanged.
// RULE-12: the Thunder Elite branding stays.
// usage: node test/jersey.ui.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://127.0.0.1:8766/';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto(BASE);await p.click('nav [data-t="setup"]');await p.waitForTimeout(200);
const num=()=>p.evaluate(()=>__app.store.real.pitchers.find(x=>x.id==='p_woods').num);
const label=()=>p.evaluate(()=>document.querySelector('#pList [data-e="p_woods"]').parentElement.textContent);
ok(await p.title()==='Thunder Elite · Pitch Chart','RULE-12 title stays Thunder Elite');
ok(await p.getAttribute('.brand img','alt')==='Thunder Elite','RULE-12 wordmark stays Thunder Elite');
await p.click('#pList [data-e="p_woods"]');await p.waitForTimeout(200);
await p.fill('#pdNum','99');await p.click('#pDlg button[value="cancel"]');await p.waitForTimeout(200);
ok(await num()==='45'&&!/99/.test(await label()),'RULE-11 Cancel leaves the jersey number unchanged');
await p.click('#pList [data-e="p_woods"]');await p.waitForTimeout(200);
await p.fill('#pdNum','12');await p.click('#pdOk');await p.waitForTimeout(200);
ok(await num()==='12'&&/Avery #12/.test(await label()),'RULE-11 saving the jersey number updates the pitcher');
const list=await p.textContent('#pList');
ok(!/Woods|Crich|Larbus/.test(list),'RULE-10 no surnames in the pitcher list');
ok(!errs.length,'no page errors '+errs.join('|'));
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
