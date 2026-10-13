const {chromium}=require('playwright-core');const BASE=process.argv[2],SHOT=process.argv[3];(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:'dark',acceptDownloads:true});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto(BASE);const before=await p.evaluate(()=>localStorage.getItem('te_pitchchart_v1'));
await p.click('nav [data-t="bullpen"]');await p.click('#bpTest');
const tap=async s=>{await p.$eval(s,e=>e.scrollIntoView({block:"center"}));await p.click(s,{force:true});};
// 2 real pitches through the UI: type > intended > actual
for(const [t,a,z] of [['FB',6,6],['CH',7,4]]){await tap(`#types [data-c="${t}"]`);await tap(`#zone [data-z="${a}"]`);await tap(`#zone [data-z="${z}"]`);}
console.log('ui pitches in session:',await p.evaluate(()=>{const s=__app.store.state;return s.sessions.find(x=>x.id===s.activeSession).pitches.length;}));
// seed the rest of a realistic pen into the same (test) session
await p.evaluate(()=>{const s=__app.store.state;const se=s.sessions.find(x=>x.id===s.activeSession);const add=(type,t,l)=>se.pitches.push({id:crypto.randomUUID(),ts:Date.now(),pitcherId:'p_woods',type,targets:[t],loc:l,hand:'N',b:0,s:0});
  [[6,6],[6,3],[6,6],[6,5],[6,9],[6,6]].forEach(([t,l])=>add('FB',t,l));[[7,4],[7,4],[7,7],[7,1],[7,8]].forEach(([t,l])=>add('CH',t,l));[[9,9],[9,14],[9,9],[9,6]].forEach(([t,l])=>add('DC',t,l));[[15,15],[15,2]].forEach(([t,l])=>add('RS',t,l));});
await p.click('#bpEnd');await p.waitForTimeout(300);
console.log('report open:',await p.isVisible('#rDlg'),'| test badge:',(await p.textContent('#rBody')).includes('TEST'));
console.log('stats:',await p.$$eval('#rBody .stat',e=>e.map(x=>x.innerText.replace('\n',' ')).join(' | ')));
console.log('feedback:',await p.$$eval('#rBody .fb li',e=>e.map(x=>x.textContent)));
console.log('heat cells colored:',await p.$$eval('#rMap [data-z]',e=>e.filter(x=>x.style.fill&&x.style.fill!=='rgb(22, 27, 34)').length));
await p.$eval('#rDlg',e=>e.scrollTop=0);await p.waitForTimeout(400);await p.screenshot({path:SHOT});
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:8000}),p.click('#rShare')]);const fp=await dl.path();require('fs').copyFileSync(fp,'/tmp/rp-share.png');console.log('share image (download fallback):',dl.suggestedFilename(),require('fs').statSync(fp).size,'bytes');
{const cell=await p.$('#rMap [data-z][role="button"]');await cell.click();console.log('drill-down open:',await p.isVisible('#ddDlg'),'|',await p.textContent('#ddCap'));await p.click('#ddClose');console.log('type sections:',await p.$$eval('#rTypes .tsec',e=>e.length));}
await p.click('#rClose');console.log('session closed after end:',await p.evaluate(()=>__app.store.state.activeSession==null));
// past session from Stats
await p.click('nav [data-t="stats"]');const sid=await p.evaluate(()=>__app.store.state.sessions[0].id);await p.selectOption('#sScope',sid);console.log('stats report button:',await p.isVisible('#sReport'));await p.click('#sReport');console.log('stats report open:',await p.isVisible('#rDlg'));await p.click('#rClose');
await p.click('nav [data-t="setup"]');await p.click('#testBtn');const after=await p.evaluate(()=>localStorage.getItem('te_pitchchart_v1'));console.log('test session not saved:',before===after);
console.log('errors',errs);await b.close();if(errs.length)process.exit(1);})().catch(e=>{console.error(e);process.exit(1)});
