const {chromium}=require('playwright-core');const BASE=process.argv[2],SHOT=process.argv[3];(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:'dark'});const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto(BASE);
// bullpen defaults + in-screen test toggle
await p.click('nav [data-t="bullpen"]');console.log('default batter None selected:',await p.$eval('#hN',e=>e.classList.contains('sel')),'|',await p.textContent('#bpTest'));
await p.click('#bpTest');console.log('test banner:',await p.isVisible('#testbar'),'|',await p.textContent('#bpTest'));
const tap=async z=>{const s=`#zone [data-z="${z}"]`;await p.$eval(s,e=>e.scrollIntoView({block:"center"}));await p.click(s,{force:true});};
// seed realistic data INTO TEST MODE (nothing saved): mixed game + bullpen pitches
await p.evaluate(()=>{const st=__app.store.state;const T=['FB','CH','DC','DR','CB'],L=[1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,18];let s=7;const r=()=>((s=s*16807%2147483647)/2147483647);
  const pick=a=>a[Math.floor(r()*a.length)];const P=['p_woods','p_crich','p_larbus'];const g={id:'g_demo',date:'2026-10-17',opponent:'Finesse Colyer',homeAway:'tbd',lineup:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0},pitches:[],status:'final'};
  for(let i=0;i<90;i++){const z=r()<.7?pick([2,3,5,6,6,9,8,7]):pick(L);g.pitches.push({id:crypto.randomUUID(),pitcherId:pick(P),type:pick(T),loc:z,hand:r()<.7?'R':'L',batter:pick(['Smith','Jones','Lee','Diaz']),result:z<10?'called':'ball',b:0,s:0,targets:[]});}
  const se={id:'s_demo',date:'2026-10-16',pitches:[]};for(let i=0;i<60;i++){const t=pick([3,7,9,1,16,15,2,6]);const z=r()<.4?t:r()<.25?5:pick(L);se.pitches.push({id:crypto.randomUUID(),pitcherId:pick(P),type:pick(T),loc:z,hand:'N',targets:[t],b:0,s:0});}
  st.games.push(g);st.sessions.push(se);});
await p.click('nav [data-t="stats"]');await p.waitForTimeout(300);await p.click('#hvA');
console.log('summary:',await p.textContent('#hSummary'),'| chips:',await p.textContent('#hfChips'));
await p.click('#hfOpen');await p.selectOption('#hfForm select[data-hk="type"]','FB');await p.selectOption('#hfForm select[data-hk="src"]','game');await p.click('#hfDlg button[value="ok"]');await p.waitForTimeout(250);
console.log('filtered:',await p.textContent('#hSummary'),'| chips:',await p.textContent('#hfChips'));
const persisted=await p.evaluate(()=>localStorage.getItem('te_pitch_heat_v1'));console.log('persisted:',persisted);
await p.click('#hfChips [data-hfx="src"]');console.log('chip removed:',await p.textContent('#hfChips'));
await p.click('#hvI');await p.waitForTimeout(100);console.log('miss view:',await p.textContent('#hSummary'),'| aria zone 3:',await p.$eval('#hMap [data-z="3"]',e=>e.getAttribute('aria-label')));
await p.click('#hvA');console.log('actual view:',await p.textContent('#hSummary'));await p.click('#hvI');await p.click('#hfReset');
await p.$eval('#heatCard',e=>e.scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-130));await p.waitForTimeout(1600);await p.screenshot({path:SHOT});
await p.click('#hfOpen');await p.selectOption('#hfForm select[data-hk="type"]','CB');await p.selectOption('#hfForm select[data-hk="side"]','N');await p.selectOption('#hfForm select[data-hk="src"]','game');await p.click('#hfDlg button[value="ok"]');await p.waitForTimeout(250);
console.log('empty state visible:',await p.isVisible('#hEmpty'));await p.click('#hfReset2');
const before=await p.evaluate(()=>localStorage.getItem('te_pitchchart_v1'));await p.click('nav [data-t="setup"]');await p.click('#testBtn');const after=await p.evaluate(()=>localStorage.getItem('te_pitchchart_v1'));
console.log('test data discarded, saved data unchanged:',before===after,'| games after exit:',await p.evaluate(()=>__app.store.state.games.length));
console.log('errors',errs);await b.close();if(errs.length)process.exit(1);})().catch(e=>{console.error(e);process.exit(1)});
