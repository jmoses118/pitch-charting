// Way-off taps + competitive ring, in test mode with Supabase blocked.
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const tap=async s=>{await p.$eval(s,e=>e.scrollIntoView({block:'center'}));await p.click(s,{force:true});await p.waitForTimeout(80);};
await p.goto(BASE);await p.click('nav [data-t="bullpen"]');await p.click('#bpTest');ok(await p.isVisible('#testbar'),'test mode');
const pen=async(t,aim,land)=>{await tap(`#types [data-c="${t}"]`);await tap(`#zone [data-z="${aim}"]`);await tap(land>20?`#wayBtns [data-z="${land}"]`:`#zone [data-z="${land}"]`);};
await tap('#types [data-c="FB"]');await tap('#wayBtns [data-z="21"]');const t0=await p.evaluate(()=>(__app.store.state.sessions.at(-1)?.pitches||[]).length);ok(t0===0,'way off cannot be a target');await tap('#zone [data-z="3"]');await tap('#zone [data-z="3"]');
await pen('FB',3,12);await pen('FB',3,21);await pen('CH',8,18);await pen('FB',9,22);await pen('FB',16,16);
const P=await p.evaluate(()=>__app.store.state.sessions.at(-1).pitches.map(x=>x.loc));ok(JSON.stringify(P)==='[3,12,21,18,22,16]','logged locs '+JSON.stringify(P));
const log=await p.textContent('#log');ok(/way high/.test(log)&&/way low/.test(log),'log shows way high / way low');
await p.click('#bpEnd');await p.waitForTimeout(300);const rt=await p.textContent('#rDlg');
ok(/Competitive/.test(rt)&&/67%/.test(rt),'report: competitive 67% (4 of 6)');ok(/Way off/.test(rt),'report: way off tile');ok(/2 pitches way off/.test(rt),'report feedback mentions way off');ok(/17%/.test(rt),'raw strike % (1 of 6) still shown');
await p.$eval('#rMap [data-z="3"]',e=>e.scrollIntoView({block:'center'}));await p.dispatchEvent('#rMap [data-z="3"]','click');await p.waitForTimeout(250);const dd=await p.textContent('#ddCap');
ok(/2 on target/.test(dd)&&/1 way off/.test(dd)&&/way high/.test(dd),'drill-down: 2 on target (3, ring 12), 1 way high: '+dd);
await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
await p.click('nav [data-t="setup"]');await p.click('#testBtn');await p.waitForTimeout(150);ok(await p.evaluate(()=>!__app.store.real.sessions.some(s=>s.pitches.some(x=>x.loc>20))),'nothing kept after test mode');
ok(errs.length===0,'no page errors '+errs.join('|'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1)});
