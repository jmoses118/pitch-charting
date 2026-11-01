// TB-1..TB-7. The pitcher bar shows on Game and Bullpen and is display:none on Stats and Setup.
// Landscape Game idle and the scheduled list already hide it (style.css, short landscape).
// Landscape Game in progress is the coach screen: the name stays on #cxPitcher.
// usage: node test/topbar.ui.js <url>
const {chromium}=require('playwright-core');
const fs=require('fs');
const BASE=process.argv[2]||'http://127.0.0.1:8766/';
const SHOT=process.env.SHOT_DIR||'';
if(SHOT)fs.mkdirSync(SHOT,{recursive:true});
let fails=0;
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const near=(a,b,tol)=>Math.abs(a-b)<=tol;
const SIZES=[[375,667],[390,844],[430,932],[440,956],[667,375],[844,390]];
const BAR=56;
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
  let cssChecked=false;
  for(const [W,H] of SIZES){
    const tag=`${W}x${H}`;
    const land=W>H;
    const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});
    await c.route(/supabase\.co/,r=>r.abort());
    await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
    const p=await c.newPage();
    const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
    const ev=(f,a)=>p.evaluate(f,a);
    await p.goto(BASE);
    await ev(()=>{const S=__app.store.real;S.pitchers=[{id:'p_r',name:'Reese',num:'7',throws:'L'},{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_r';S.games=[];S.sessions=[];S.activeGame=null;S.activeSession=null;__app.store.save();__app.render();});
    const go=async name=>{
      const nav=await ev(()=>getComputedStyle(document.querySelector('nav')).display!=='none');
      if(nav)await p.click(`nav [data-t="${name}"]`);
      else await ev(n=>{tab=n;render();scrollTo(0,0);},name);
      await p.waitForTimeout(160);
      await ev(()=>scrollTo(0,0));
    };
    const shot=async state=>{if(SHOT)await p.screenshot({path:SHOT+'/'+tag+'-'+state+'.png'});};
    const metrics=()=>ev(()=>{
      const rect=el=>el.getBoundingClientRect();
      const slot=el=>{const cs=getComputedStyle(el);if(cs.display==='none')return 0;return rect(el).height+parseFloat(cs.marginBottom);};
      const hdr=document.querySelector('header'),top=document.querySelector('.topbar'),pick=document.querySelector('.pickrow');
      const csH=getComputedStyle(hdr),csT=getComputedStyle(top);
      const box=id=>{const el=document.getElementById(id),r=rect(el);return {w:r.width,h:r.height};};
      const tabbable=[...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(el=>{
        if(el.disabled||el.tabIndex<0)return false;
        for(let n=el;n;n=n.parentElement){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return false;}
        return true;}).map(el=>el.id).filter(Boolean);
      const announced=id=>{const el=document.getElementById(id);for(let n=el;n;n=n.parentElement){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden')return false;}return true;};
      const pitcher=document.getElementById('pitcher');
      const stat=document.querySelector('#tab-stats .card'),setup=document.querySelector('#tab-setup .card');
      return {
        headerTop:rect(hdr).top,headerBottom:rect(hdr).bottom,wordTop:rect(document.querySelector('.brand img')).top,navTop:rect(document.querySelector('nav')).top,
        pickDisplay:getComputedStyle(pick).display,pickSlot:slot(pick),wlSlot:slot(document.getElementById('wlMsg')),wlDisplay:getComputedStyle(document.getElementById('wlMsg')).display,
        gap:rect(hdr).bottom-rect(top).bottom,gapExpect:parseFloat(csT.marginBottom)+parseFloat(csH.paddingBottom)+parseFloat(csH.borderBottomWidth),
        mainPad:parseFloat(getComputedStyle(document.querySelector('main')).paddingTop),
        statsCardTop:rect(stat).top,setupCardTop:rect(setup).top,
        label:pitcher.options[pitcher.selectedIndex]?pitcher.options[pitcher.selectedIndex].text:'',value:pitcher.value,title:pitcher.title,
        boxes:{pitcher:box('pitcher'),jersey:box('jerseyEdit'),add:box('addPQuick')},
        tabbable,announced:{pitcher:announced('pitcher'),jersey:announced('jerseyEdit'),add:announced('addPQuick')},
        body:document.body.className,coach:document.body.classList.contains('coachmode'),entry:document.body.classList.contains('entrymode'),
        cx:(document.getElementById('cxPitcher').textContent||'').trim(),
        dom:!!(document.getElementById('pitcher')&&document.getElementById('jerseyEdit')&&document.getElementById('addPQuick')),
        handlers:!!(document.getElementById('jerseyEdit').onclick&&document.getElementById('addPQuick').onclick&&document.getElementById('pitcher').onchange),
        navShown:getComputedStyle(document.querySelector('nav')).display!=='none',
        cur:__app.store.real.curPitcher
      };
    });
    const barOn=m=>m.pickDisplay!=='none';
    const tapsOk=m=>['pitcher','jersey','add'].every(k=>m.boxes[k].h>=48&&m.boxes[k].w>=48);
    // TB-1 Game idle. Short landscape keeps the existing hide.
    await go('game');
    const idle=await metrics();
    await shot('game-idle');
    ok(idle.dom&&idle.handlers,`${tag} TB-4 pitcher, jersey, and add stay in the DOM with their handlers`);
    if(land){
      ok(!barOn(idle)&&idle.boxes.pitcher.h===0,`${tag} TB-1 landscape Game idle keeps the bar hidden`);
    }else{
      ok(barOn(idle)&&idle.label==='Reese #7'&&tapsOk(idle),`${tag} TB-1 Game idle shows Reese #7 at least 48px (${idle.label}, ${JSON.stringify(idle.boxes)})`);
      ok(Math.abs(idle.pickSlot-BAR)<=1,`${tag} TB-3 the bar slot is 56px (${idle.pickSlot})`);
    }
    // Scheduled list, still Reese, game not started.
    await ev(()=>{const S=__app.store.real;const day=PC.localDate(Date.now());S.games.push({id:'sg1',date:day,time:'18:00',opponent:'Storm',homeAway:'home',status:'scheduled',lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0}});S.activeGame=null;__app.store.save();__app.render();});
    await p.waitForTimeout(120);await ev(()=>scrollTo(0,0));
    const sched=await metrics();
    await shot('game-scheduled');
    ok(!!await p.$('[data-sg="sg1"]'),`${tag} scheduled game is on the list`);
    if(land)ok(!barOn(sched),`${tag} TB-1 landscape scheduled list keeps the bar hidden`);
    else ok(barOn(sched)&&sched.label==='Reese #7'&&tapsOk(sched),`${tag} TB-1 scheduled list shows Reese #7 at least 48px`);
    // Game in progress.
    await ev(()=>{const S=__app.store.real;S.games.push({id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'B',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]});S.activeGame='g1';__app.store.save();__app.render();});
    await p.waitForTimeout(160);
    const prog=await metrics();
    await shot('game-inprogress');
    if(land){
      ok(prog.coach&&prog.cx==='Reese #7',`${tag} TB-1 coach screen keeps Reese #7 (${prog.cx})`);
    }else{
      ok(barOn(prog)&&prog.label==='Reese #7'&&tapsOk(prog),`${tag} TB-1 Game in progress shows Reese #7 at least 48px`);
      ok(await ev(()=>!document.getElementById('pitcher').disabled),`${tag} TB-1 switching pitchers stays one tap on the charting screen`);
    }
    await ev(()=>{const S=__app.store.real;const g=S.games.find(x=>x.id==='g1');g.ended=Date.now();g.status='final';S.activeGame=null;__app.store.save();__app.render();});
    await go('bullpen');
    const bull=await metrics();
    await shot('bullpen');
    ok(barOn(bull)&&bull.label==='Reese #7'&&tapsOk(bull),`${tag} TB-1 Bullpen shows Reese #7 at least 48px (${bull.label}, ${JSON.stringify(bull.boxes)})`);
    ok(bull.body.includes('tab-bullpen')&&!/\btab-game\b/.test(bull.body)&&!bull.body.includes('tab-stats')&&!bull.body.includes('tab-setup'),`${tag} TB-1 Bullpen sets only tab-bullpen`);
    // TB-5 then TB-1/TB-3/TB-6 on Stats and Setup. Avery is the global pick.
    await ev(()=>{__app.store.real.curPitcher='p_a';delete document.getElementById('sPitcher').dataset.picked;__app.store.save();__app.render();});
    await go('stats');
    const stats=await metrics();
    await shot('stats');
    const sLabel=await ev(()=>{const s=document.getElementById('sPitcher');return s.options[s.selectedIndex].text;});
    ok(sLabel==='Avery #45',`${tag} TB-5 Stats opens on Avery (${sLabel})`);
    ok(stats.body.includes('tab-stats'),`${tag} TB-1 body carries tab-stats`);
    ok(stats.pickDisplay==='none'&&stats.boxes.pitcher.w===0&&stats.boxes.pitcher.h===0&&stats.boxes.jersey.w===0&&stats.boxes.add.w===0,`${tag} TB-1/TB-6 Stats bar is display:none and 0x0`);
    ok(!stats.announced.pitcher&&!stats.announced.jersey&&!stats.announced.add,`${tag} TB-6 Stats bar is not announced`);
    ok(!['pitcher','jerseyEdit','addPQuick'].some(id=>stats.tabbable.includes(id)),`${tag} TB-6 Stats bar is out of tab order`);
    ok(stats.wlDisplay==='none'&&stats.wlSlot===0&&near(stats.gap,stats.gapExpect,1),`${tag} TB-3 no empty gap where the bar and workload line sat (${stats.gap.toFixed(1)} vs ${stats.gapExpect})`);
    // Main's Stats header is Game idle minus the workload line, and still includes the 56px bar.
    // Short landscape Game idle already hides that bar, so main's Stats header is the idle header plus 56.
    const mainHeader=idle.headerBottom-idle.wlSlot+(barOn(idle)?0:BAR);
    ok(near(mainHeader-stats.headerBottom,BAR,1),`${tag} TB-3 Stats header is 56px shorter than main (${stats.headerBottom.toFixed(1)} vs ${mainHeader.toFixed(1)})`);
    ok(near(mainHeader+stats.mainPad-stats.statsCardTop,BAR,1),`${tag} TB-3 Stats first card is 56px higher than main (${stats.statsCardTop.toFixed(1)})`);
    ok(stats.headerTop===0&&near(stats.headerTop,idle.headerTop,0)&&near(stats.wordTop,idle.wordTop,0),`${tag} TB-3 header top and wordmark match Game idle (${stats.headerTop}, ${stats.wordTop})`);
    ok(stats.navShown&&near(stats.navTop,idle.navTop,0)&&bull.navShown&&near(bull.navTop,idle.navTop,0),`${tag} TB-3 nav top matches across tabs (${idle.navTop}, ${stats.navTop}, ${bull.navTop})`);
    if(!cssChecked){
      cssChecked=true;
      const css=await ev(()=>[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText);}catch(e){return [];}}).join('\n'));
      ok(/body\.tab-stats[^{]*\.pickrow[^{]*\{[^}]*display:\s*none/.test(css)&&/body\.tab-setup[^{]*\.pickrow[^{]*\{[^}]*display:\s*none/.test(css),`${tag} TB-1 the hide is keyed off the body tab class`);
      const back=await ev(()=>{document.body.classList.remove('tab-stats');const d=getComputedStyle(document.querySelector('.pickrow')).display;document.body.classList.add('tab-stats');return d;});
      ok(back==='flex',`${tag} TB-1 dropping tab-stats shows the bar again (${back})`);
    }
    await p.selectOption('#sPitcher','p_r');
    await p.waitForTimeout(120);
    const picked=await ev(()=>({stat:document.getElementById('sPitcher').value,cur:__app.store.real.curPitcher}));
    ok(picked.stat==='p_r'&&picked.cur==='p_a',`${tag} TB-5 choosing Reese in Stats leaves the global pick on Avery`);
    await go('game');
    const backGame=await metrics();
    ok(backGame.cur==='p_a'&&backGame.value==='p_a'&&backGame.title==='Avery #45'&&(barOn(backGame)?backGame.label==='Avery #45':/#45$/.test(backGame.label)),`${tag} TB-5 Game still shows Avery (${backGame.label}, ${backGame.title})`);
    // TB-2 one-tap scheduled start uses the global pick.
    await p.$eval('[data-sg="sg1"]',e=>e.scrollIntoView({block:'center'}));
    await p.click('[data-sg="sg1"]');
    await p.waitForTimeout(180);
    const started=await ev(()=>{const g=__app.store.real.games.find(x=>x.id==='sg1');return {pid:g&&g.cur&&g.cur.pitcherId,active:__app.store.real.activeGame,cur:__app.store.real.curPitcher};});
    ok(started.pid==='p_a'&&started.active==='sg1'&&started.cur==='p_a',`${tag} TB-2 scheduled start uses Avery (${JSON.stringify(started)})`);
    await go('setup');
    const setup=await metrics();
    await shot('setup');
    ok(setup.body.includes('tab-setup')&&setup.pickDisplay==='none'&&setup.boxes.pitcher.h===0,`${tag} TB-1 Setup bar is display:none`);
    ok(!setup.announced.pitcher&&!setup.announced.jersey&&!setup.announced.add&&!['pitcher','jerseyEdit','addPQuick'].some(id=>setup.tabbable.includes(id)),`${tag} TB-6 Setup bar is not announced or in tab order`);
    ok(near(setup.gap,setup.gapExpect,1)&&setup.wlDisplay==='none',`${tag} TB-3 Setup has no empty gap under the brand row`);
    ok(near(setup.headerBottom,stats.headerBottom,1),`${tag} TB-3 Setup header matches Stats`);
    const lead=setup.setupCardTop-setup.headerBottom;
    ok(near(mainHeader+lead-setup.setupCardTop,BAR,1),`${tag} TB-3 Setup first card is 56px higher than main`);
    ok(near(setup.headerTop,idle.headerTop,0)&&near(setup.wordTop,idle.wordTop,0)&&near(setup.navTop,idle.navTop,0),`${tag} TB-3 Setup header, wordmark, and nav match Game idle`);
    // TB-4 Setup's own Add pitcher still selects her on the Game bar.
    await p.$eval('#addP',e=>e.scrollIntoView({block:'center'}));
    await p.click('#addP');
    await p.waitForTimeout(150);
    ok(await ev(()=>document.getElementById('pDlg').open),`${tag} TB-4 Setup Add pitcher opens the dialog`);
    await p.fill('#pdName','Quinn');
    await p.fill('#pdNum','22');
    await p.selectOption('#pdThrows','R');
    await p.click('#pdOk');
    await p.waitForTimeout(180);
    await go('game');
    const added=await metrics();
    const who=await ev(()=>{const S=__app.store.real;const p=S.pitchers.find(x=>x.name==='Quinn');const pit=document.getElementById('pitcher');const text=pit.options[pit.selectedIndex].text;return {id:p&&p.id,cur:S.curPitcher,text,title:pit.title,cx:(document.getElementById('cxPitcher').textContent||'').trim(),coach:document.body.classList.contains('coachmode')};});
    const shown=who.coach?who.cx:who.text;
    ok(who.cur&&who.cur===who.id&&who.title==='Quinn #22'&&shown==='Quinn #22',`${tag} TB-4 new pitcher is selected on Game (${JSON.stringify(who)})`);
    // Pitching coach charts Bullpen. The name stays, and a second pitcher is one tap.
    await ev(()=>{const y=__app.store.real.sync;y.teamCode='TE-TEST-TEST-TEST-TESTX';y.role='pcoach';y.pitcherIds=['p_r','p_a'];__app.store.real.curPitcher='p_r';__app.store.save();__app.render();});
    await go('bullpen');
    const pc=await metrics();
    ok(barOn(pc)&&pc.label==='Reese #7'&&pc.boxes.pitcher.h>=48&&pc.boxes.pitcher.w>=48,`${tag} pitching coach Bullpen shows Reese #7 at least 48px`);
    const pcEnabled=await ev(()=>!document.getElementById('pitcher').disabled);
    ok(pcEnabled,`${tag} pitching coach switches pitcher in one tap`);
    await p.selectOption('#pitcher','p_a');
    await p.waitForTimeout(120);
    const pc2=await metrics();
    ok(pc2.label==='Avery #45'&&pc2.cur==='p_a',`${tag} pitching coach tap selects Avery (${pc2.label})`);
    await go('stats');
    const pcStats=await metrics();
    ok(pcStats.pickDisplay==='none',`${tag} TB-1 pitching coach Stats hides the bar`);
    ok(!errs.length,`${tag} no page errors ${errs.join('|')}`);
    await c.close();
  }
  await b.close();
  console.log(fails?fails+' FAILED':'ALL PASS');
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
