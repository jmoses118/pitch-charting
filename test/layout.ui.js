// Regression (PR G): walk EVERY tab and state (Game idle / scheduled list / in progress, Bullpen, Stats, Setup) at 390x844, 375x667, 430x932
// and assert no text is clipped or ellipsized (scrollWidth > clientWidth), the pitcher name never truncates, nothing runs off-screen, and nothing overlaps.
// Throwaway profile, Supabase blocked, test data only (first names). usage: node test/layout.ui.js <url>
const {chromium}=require('playwright-core');const fs=require('fs'),path=require('path');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const SHOT=process.env.SHOT_DIR||'';if(SHOT)require('fs').mkdirSync(SHOT,{recursive:true});const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const PROD=require('../logic.js').pcPickConfig.PROD;
const {AUDIT}=require('./lib/audit');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for(const [W,H] of [[390,844],[375,667],[430,932]]){const tag=`${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?3:1,colorScheme:'dark'});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a);
  await p.goto(BASE);await ev(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'},{id:'p_x',name:'Alexandria',num:'12',throws:'L'}];S.curPitcher='p_x';
    const s={id:'s1',date:'2026-10-12',pitcherId:'p_x',started:1,ended:2,pitches:[]};[[3,3],[7,5],[9,14],[1,1]].forEach(([t,l],i)=>s.pitches.push({id:'x'+i,pitcherId:'p_x',type:'FB',targets:[t],loc:l,b:0,s:0}));S.sessions.push(s);__app.store.save();__app.render();});
  const check=async(state,prep)=>{await prep();await p.waitForTimeout(300);await ev(()=>scrollTo(0,0));const probs=await ev(AUDIT);const dup=await ev(()=>[document.getElementById('wlMsg'),document.getElementById('wlMini')].filter(e=>e.getBoundingClientRect().height>0).length);if(dup>1)probs.push('workload counts shown twice');
    if(SHOT&&W===390)await p.screenshot({path:SHOT+state.replace(/[^a-z]+/g,'-').replace(/-$/,'')+'.png'});ok(!probs.length,`${tag} ${state}: no clipping/overlap${probs.length?' → '+probs.slice(0,6).join(' | '):''}`);};
  await check('game idle',()=>p.click('nav [data-t="game"]'));
  await check('game scheduled list',async()=>{await ev(()=>{const S=__app.store.real;[['10-17','12:00 PM','Outlaws Premier 2031 Lightel','P7','Field 20','Berliner Sports Park, Columbus'],['10-18','8:30 AM','Team All American 14U','P43','Field 9','Berliner Sports Park, Columbus']].forEach(([d,t,o,n,f,l],i)=>S.games.push({id:'sg'+i,date:'2026-'+d,time:t,opponent:o,gameNo:n,field:f,location:l,status:'scheduled',link:'https://web.gc.com/x',lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0}}));__app.store.save();__app.render();});});
  await check('game in progress',()=>ev(()=>{const S=__app.store.real;S.games.push({id:'g1',date:'2026-10-13',opponent:'Central Ohio Pride 13-Sharrow',homeAway:'away',status:'active',started:1,event:'Fall Classic',lineup:[{slot:1,name:'B1',num:'1',hand:'R'}],cur:{inning:3,outs:2,slot:0,b:3,s:2,abn:9},pitches:[]});S.activeGame='g1';__app.store.save();__app.render();}));
  if(W===375||W===390){const face=await ev(()=>{const s=document.getElementById('pitcher'),cs=getComputedStyle(s),text=s.options[s.selectedIndex].text;const room=s.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);const c=document.createElement('canvas').getContext('2d');c.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily;const m=/^(.*?)(?:…)? #12$/.exec(text);const n=m?m[1].length:0;return {text,n,px:parseFloat(cs.fontSize),fits:c.measureText(text).width<=room+1};});
    ok(face.n>=8&&face.fits&&face.px>=14&&/#12$/.test(face.text),`${tag}: at least 8 name characters plus #12 are visible (${face.text})`);}
  await check('bullpen',async()=>{await ev(()=>{const S=__app.store.real;S.games.find(g=>g.id==='g1').ended=Date.now();S.games.find(g=>g.id==='g1').status='final';S.activeGame=null;__app.store.save();__app.render();});await p.click('nav [data-t="bullpen"]');});
  await check('stats',()=>p.click('nav [data-t="stats"]'));
  await check('setup (all sections open)',async()=>{await p.click('nav [data-t="setup"]');await ev(()=>document.querySelectorAll('#tab-setup details').forEach(d=>d.open=true));});
  ok(!errs.length,`${tag}: no page errors `+errs.join('|'));await c.close();}
const GAME={id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'away',status:'active',started:1,lineup:[{slot:1,name:'B1',num:'1',hand:'R'}],cur:{inning:2,outs:1,slot:0,b:1,s:1,abn:3},pitches:[]};
for(const [W,H] of [[390,844],[375,667],[430,932],[844,390],[667,375],[932,430]]){const tag=`${W}x${H}`,land=W>H;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
  const p=await c.newPage();const ev=(f,a)=>p.evaluate(f,a);const wait=()=>p.waitForTimeout(200);
  const envNow=()=>ev(()=>{const el=document.getElementById('envBar'),cs=getComputedStyle(el),r=el.getBoundingClientRect(),top=document.querySelector('.topbar').getBoundingClientRect();
    const shown=cs.display!=='none'&&r.height>1;return {shown,text:el.textContent,banner:(window.PC_CONFIG&&window.PC_CONFIG.banner)||'',overflow:shown&&(el.scrollWidth>el.clientWidth+1||r.right>innerWidth+1||r.left<-1),overlap:shown&&r.bottom>top.top+.5&&r.top<top.bottom-.5,side:document.documentElement.scrollWidth>innerWidth+1,h:Math.round(r.height),entry:document.body.classList.contains('entrymode'),coach:document.body.classList.contains('coachmode')};});
  await p.goto(BASE);await wait();
  const see=async where=>{const s=await envNow();ok(!!s.banner&&s.shown&&s.text===s.banner&&!s.overflow&&!s.overlap&&!s.side,`${tag} ${where}: banner visible, matches config, fits`);if(where==='setup')console.log('HEIGHT '+tag+' setup '+s.h+'px');return s;};
  await see('game, no game');
  await p.click('nav [data-t="stats"]');await wait();await see('stats');
  await p.click('nav [data-t="setup"]');await wait();await see('setup');
  await ev(g=>{const S=__app.store.real;S.games.push(g);S.activeGame='g1';__app.store.save();__app.render();},GAME);
  await p.click('nav [data-t="game"]');await wait();
  {const s=await envNow();ok(!s.shown&&(land?s.coach:s.entry&&!s.coach),`${tag}: banner hidden on ${land?'coach':'scoring'}`);}
  await ev(()=>{const S=__app.store.real;const g=S.games.find(x=>x.id==='g1');g.ended=Date.now();g.status='final';S.activeGame=null;__app.store.save();__app.render();});
  await p.click('nav [data-t="bullpen"]');await wait();
  {const s=await envNow();ok(!s.shown&&s.entry,`${tag}: banner hidden on bullpen entry`);}
  await c.close();}
{const c=await b.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));await c.addInitScript(url=>localStorage.setItem('pc_supabase',JSON.stringify({url:url,key:'x'})),PROD.url);
  const p=await c.newPage();await p.goto(BASE);await p.waitForTimeout(200);
  const s=await p.evaluate(()=>{const el=document.getElementById('envBar'),r=el.getBoundingClientRect();return {text:el.textContent,banner:window.PC_CONFIG.banner,shown:getComputedStyle(el).display!=='none',overflow:el.scrollWidth>el.clientWidth+1||r.right>innerWidth+1||r.left<-1,side:document.documentElement.scrollWidth>innerWidth+1};});
  ok(s.shown&&s.text===s.banner&&/This address was refused/.test(s.text)&&!s.overflow&&!s.side,'375: refused banner fits');
  await p.click('nav [data-t="setup"]');await p.click('#testBtn');await p.waitForTimeout(200);
  const m=await p.evaluate(()=>{const env=document.getElementById('envBar'),test=document.getElementById('testbar');const on=e=>getComputedStyle(e).display!=='none'&&e.getBoundingClientRect().height>1;const bars=[env,test].filter(on);return {n:bars.length,id:bars.map(e=>e.id).join(','),text:test.textContent,side:document.documentElement.scrollWidth>innerWidth+1};});
  ok(m.n===1&&m.id==='testbar'&&/TEST MODE/.test(m.text)&&/This address was refused/.test(m.text)&&!m.side,'375: test mode and the warning share one bar');
  await p.click('nav [data-t="bullpen"]');await p.waitForTimeout(200);
  const bp=await p.evaluate(()=>({note:document.getElementById('envNote').textContent,env:getComputedStyle(document.getElementById('envBar')).display,entry:document.body.classList.contains('entrymode')}));
  ok(bp.entry&&bp.env==='none'&&bp.note==='','375: bullpen entry keeps the test bar alone');
  await c.close();}
const root=path.join(__dirname,'..');
function localType(rel){if(rel.endsWith('.css'))return 'text/css';if(rel.endsWith('.js'))return 'text/javascript';if(rel.endsWith('.svg'))return 'image/svg+xml';if(rel.endsWith('.png'))return 'image/png';if(rel.endsWith('.json')||rel.endsWith('.webmanifest'))return 'application/json';return 'text/html';}
async function localFiles(route){const u=new URL(route.request().url());let rel=decodeURIComponent(u.pathname.replace(/^\/pitch-charting\/?/,''));if(!rel||rel.endsWith('/'))rel+='index.html';const file=path.normalize(path.join(root,rel));if(file!==root&&!file.startsWith(root+path.sep))return route.abort();if(!fs.existsSync(file)||!fs.statSync(file).isFile())return route.abort();return route.fulfill({status:200,contentType:localType(rel),body:fs.readFileSync(file)});}
for(const [label,arg] of [['plain',null],['staging override','https://staging-example.supabase.co'],['production override',PROD.url]]){
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());await c.route('https://jmoses118.github.io/pitch-charting/**',localFiles);
  await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));if(arg)await c.addInitScript(url=>localStorage.setItem('pc_supabase',JSON.stringify({url:url,key:'sb_publishable_other'})),arg);
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto('https://jmoses118.github.io/pitch-charting/');await p.waitForTimeout(300);
  for(const tab of ['game','bullpen','stats','setup']){await p.click('nav [data-t="'+tab+'"]');await p.waitForTimeout(150);
    const s=await p.evaluate(()=>{const el=document.getElementById('envBar');return {host:location.hostname,banner:window.PC_CONFIG.banner,shown:getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().height>1};});
    ok(s.host==='jmoses118.github.io'&&s.banner===''&&!s.shown,`live host ${label} ${tab}: banner hidden`);}
  ok(!errs.length,`live host ${label}: no page errors `+errs.join('|'));await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
