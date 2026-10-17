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
// RULE-8 / bug-landscape-956: iPhone 17 Pro Max coach screen (956×440). The wristband fills its column,
// results line up with the status card, In dirt sits on the band, and a 440→384→440 toolbar change does not leave a shift.
const IOS_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const GAME956={id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'},{slot:2,name:'Batter 2',num:'2',hand:'R'}],cur:{inning:1,outs:0,slot:1,b:0,s:0,abn:1},pitches:[]};
async function coach956(b,{W,H,L,R,B,theme,mirror,shift}){
  const tag=`${W}x${H} inset ${L}/${R}/${B}${theme==='night'?' night':''}${mirror?' mirror':''}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,deviceScaleFactor:3,userAgent:IOS_UA});
  await c.route(/supabase\.co/,r=>r.abort());
  await c.addInitScript(opt=>{localStorage.setItem('te_ui_theme',opt.theme);if(opt.mirror)localStorage.setItem('te_ui_mirror','1');},{theme,mirror});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  const cdp=await c.newCDPSession(p);
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:L,right:R,bottom:B}});
  await p.goto(BASE);
  await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Jules',num:'5',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';__app.store.save();__app.render();},GAME956);
  await p.click('nav [data-t="game"]').catch(()=>{});await p.waitForTimeout(300);
  const g=await p.evaluate(()=>{const R=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return{l:r.left,t:r.top,r:r.right,b:r.bottom,w:r.width,h:r.height};};
    const band=R('#cBand'),st=R('#cStatus'),z=R('#cZone'),a=R('#cAct'),col=R('.cband'),cr=R('.crcol');
    const res=[...document.querySelectorAll('#cRes button')].map(e=>e.getBoundingClientRect());
    const td=R('#cBand td'),bt=R('#cBand td button');
    const tap=s=>{const e=document.querySelector(s);const r=e.getBoundingClientRect();return Math.min(r.width,r.height);};
    const taps=['#cBand td button','#cRes button','#cAct [data-z="31"]','#cAct [data-z="32"]','#cxMenu'].map(tap);
    const left=Math.min(band.l,R('.cmid').l,cr.l),right=Math.max(band.r,R('.cmid').r,cr.r,Math.max(...res.map(r=>r.right)));
    const padL=parseFloat(getComputedStyle(document.getElementById('coach')).paddingLeft),padR=parseFloat(getComputedStyle(document.getElementById('coach')).paddingRight);
    return{coach:document.body.classList.contains('coachmode'),fill:td.w-bt.w,colGap:Math.abs((col?col.w:0)-band.w),resTop:Math.min(...res.map(r=>r.top))-st.t,
      bottom:Math.max(band.b,a.b,...res.map(r=>r.bottom)),actB:a.b-band.b,dl:a.l-z.l,dr:a.r-z.r,sw:document.documentElement.scrollWidth,iw:innerWidth,
      gapL:left-padL,gapR:innerWidth-padR-right,minTap:Math.min(...taps),zoneTap:tap('#cZone .zi'),offL:left<-.5,offR:right>innerWidth+.5,
      band,st,z,a,resTopAbs:Math.min(...res.map(r=>r.top)),mirror:document.body.classList.contains('mirror')};});
  ok(g.coach,`${tag}: coach screen is up`);
  ok(g.fill<=1&&g.colGap<=1,`${tag}: band cells fill their column (td−button ${g.fill.toFixed(1)}px, column gap ${g.colGap.toFixed(1)}px)`);
  ok(Math.abs(g.gapL-g.gapR)<=2,`${tag}: leftover width is split evenly (${g.gapL.toFixed(1)} / ${g.gapR.toFixed(1)})`);
  ok(Math.abs(g.resTop)<=2,`${tag}: results top aligns with status (${g.resTop.toFixed(1)}px)`);
  ok(H-Math.max(4,B)-g.bottom<=8,`${tag}: no dead band at bottom (${(H-Math.max(4,B)-g.bottom).toFixed(1)}px)`);
  ok(Math.abs(g.actB)<=2&&Math.abs(g.dl)<=2&&Math.abs(g.dr)<=2,`${tag}: dirt/over-catcher align to zone + band (bottom ${g.actB.toFixed(1)}, L ${g.dl.toFixed(1)}, R ${g.dr.toFixed(1)})`);
  ok(g.sw<=g.iw+1&&!g.offL&&!g.offR,`${tag}: no sideways scroll`);
  ok(g.minTap>=48,`${tag}: band, results, dirt and menu ≥48px (${g.minTap.toFixed(1)})`);
  ok(H>=400?g.zoneTap>=48:g.zoneTap>=46,`${tag}: zone target ${g.zoneTap.toFixed(1)}px`);
  if(mirror)ok(g.mirror&&g.band.l>g.st.l,`${tag}: band sits on the right`);
  if(shift){
    const snap=()=>p.evaluate(()=>{const R=s=>{const e=document.querySelector(s);const r=e.getBoundingClientRect();return{l:+r.left.toFixed(1),t:+r.top.toFixed(1),r:+r.right.toFixed(1),b:+r.bottom.toFixed(1)};};
      const res=[...document.querySelectorAll('#cRes button')].map(e=>e.getBoundingClientRect());
      return{band:R('#cBand'),st:R('#cStatus'),z:R('#cZone'),a:R('#cAct'),resTop:+Math.min(...res.map(r=>r.top)).toFixed(1)};});
    const drift=(a,b0)=>{const bad=[];for(const k of ['band','st','z','a'])for(const q of ['l','t','r','b'])if(Math.abs(a[k][q]-b0[k][q])>1)bad.push(k+'.'+q);if(Math.abs(a.resTop-b0.resTop)>1)bad.push('resTop');return bad;};
    const shot=await snap();
    const tap=async sel=>{await p.evaluate(s=>{const e=[...document.querySelectorAll(s)].find(e=>e.offsetParent&&!e.disabled);if(!e)throw new Error('no '+s);e.click();},sel);await p.waitForTimeout(200);};
    const steps=[['call','#cBand td button'],['aim','#cZone .zi'],['where','#cZone .zr'],['result','#cRes button'],['call2','#cBand td button'],['aim2','#cZone .zi'],['dirt','#cAct [data-z="31"]'],['result2','#cRes button'],['undo','#cRes [data-cx="undo"]'],['same','#cRes [data-cx="same"]']];
    const moved=[];let royal='',stripe='';
    for(const [n,sel] of steps){try{await tap(sel);}catch(e){moved.push(n+': '+e.message);continue;}
      if(n==='call'){royal=await p.evaluate(()=>{const e=document.querySelector('#cBand td button.on');return e?getComputedStyle(e).backgroundColor:'';});stripe=await p.evaluate(()=>getComputedStyle(document.getElementById('cStatus')).borderLeftColor);}
      const d=drift(await snap(),shot);if(d.length)moved.push(n+': '+d.join(','));}
    ok(!moved.length,`${tag}: no layout shift across the call sequence${moved.length?' → '+moved.join(' | '):''}`);
    ok(theme==='night'?royal==='rgb(58, 92, 240)':royal==='rgb(30, 63, 208)',`${tag}: selected cell stays ${theme==='night'?'#3A5CF0':'#1E3FD0'} (${royal})`);
    ok(theme==='night'?stripe==='rgb(58, 92, 240)':stripe==='rgb(30, 63, 208)',`${tag}: status stripe stays royal (${stripe})`);
    await p.setViewportSize({width:W,height:384});await p.waitForTimeout(250);
    await p.setViewportSize({width:W,height:H});await p.waitForTimeout(300);
    const back=drift(await snap(),shot);
    ok(!back.length,`${tag}: 440→384→440 returns to the same layout${back.length?' → '+back.join(','):''}`);
  }
  ok(!errs.length,`${tag}: no page errors `+errs.join('|'));
  await c.close();
}
for(const [L,R,B] of [[0,0,0],[62,0,21],[0,62,21],[62,62,21]])await coach956(b,{W:956,H:440,L,R,B,theme:'field',mirror:false,shift:true});
await coach956(b,{W:956,H:384,L:62,R:0,B:0,theme:'field',mirror:false,shift:false});
await coach956(b,{W:956,H:440,L:62,R:62,B:21,theme:'night',mirror:false,shift:true});
await coach956(b,{W:956,H:440,L:62,R:62,B:21,theme:'field',mirror:true,shift:false});
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
