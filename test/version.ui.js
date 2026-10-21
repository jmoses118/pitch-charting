// INFRA-4. The running release in Setup and the game menu, and the one-time update note.
// usage: node test/version.ui.js <url>
const {chromium}=require('playwright-core');
const BASE=process.argv[2]||'http://localhost:8766/';
const SHOT=process.env.SHOT_DIR||'';
if(SHOT)require('fs').mkdirSync(SHOT,{recursive:true});
let fails=0;
const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const GAME={id:'g1',date:'2026-10-20',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]};
const SIZES=[[844,390],[667,375],[956,440]];
function labelOf(id){
  function lin(v){v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);}
  function lum(c){const m=String(c).match(/[\d.]+/g);if(!m)return 0;return 0.2126*lin(+m[0])+0.7152*lin(+m[1])+0.0722*lin(+m[2]);}
  function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
  function bg(el){let n=el;while(n){const c=getComputedStyle(n).backgroundColor,m=c.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>0.9))return c;n=n.parentElement;}return getComputedStyle(document.body).backgroundColor;}
  const el=document.getElementById(id);
  const cs=getComputedStyle(el),r=el.getBoundingClientRect();
  return {text:(el.textContent||'').trim(),size:parseFloat(cs.fontSize),weight:parseInt(cs.fontWeight,10)||400,contrast:ratio(cs.color,bg(el)),color:cs.color,bg:bg(el),w:r.width,h:r.height,clip:el.scrollWidth>el.clientWidth+1,ver:PC.APP_VERSION,theme:document.documentElement.dataset.theme};
}
(async()=>{
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
  for(const [W,H] of SIZES)for(const theme of ['field','night']){
    const tag=`${W}x${H} ${theme}`;
    const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
    await c.route(/supabase\.co/,r=>r.abort());
    await c.addInitScript(th=>{localStorage.setItem('te_ui_theme',th);},theme);
    const p=await c.newPage();
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(BASE);
    await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'12',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';localStorage.setItem('te_ui_theme',document.documentElement.dataset.theme||localStorage.getItem('te_ui_theme'));applyTheme();__app.render();},GAME);
    await p.waitForTimeout(200);
    ok(await p.evaluate(()=>document.body.classList.contains('coachmode')),`${tag}: coach screen is up`);
    await p.click('#cxMenu');
    await p.waitForFunction(()=>document.getElementById('cMenuDlg').open);
    const menu=await p.evaluate(labelOf,'menuVer');
    const menuFit=await p.evaluate(()=>{
      const el=document.getElementById('menuVer'),dlg=document.getElementById('cMenuDlg').getBoundingClientRect(),r=el.getBoundingClientRect();
      const buttons=[...document.querySelectorAll('#cMenuDlg .cmenu-g button, #cMenuDlg .dlgfoot button')];
      const hit=buttons.some(b=>{const q=b.getBoundingClientRect();const ox=Math.min(r.right,q.right)-Math.max(r.left,q.left),oy=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);return ox>1&&oy>1;});
      const cancel=document.querySelector('#cMenuDlg button[value=cancel]').getBoundingClientRect();
      const inside=r.left>=dlg.left-1&&r.right<=dlg.right+1&&r.top>=dlg.top-1&&r.bottom<=dlg.bottom+1&&r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;
      return {inside,hit,cancel:cancel.top>=-1&&cancel.bottom<=innerHeight+1&&cancel.height>=44};
    });
    ok(menu.text===menu.ver&&menu.ver===await p.evaluate(()=>PC.APP_VERSION),`${tag}: game menu shows ${menu.text}`);
    ok(menu.size>=12&&menu.size<=16&&menu.weight>=600&&!menu.clip&&menu.w>8&&menu.h>=12,`${tag}: game menu label is small and readable (${menu.size}px/${menu.weight})`);
    ok(menu.contrast>=4.5,`${tag}: game menu contrast ${menu.contrast.toFixed(2)}:1 ${menu.color} on ${menu.bg}`);
    ok(menu.theme===theme&&menuFit.inside&&!menuFit.hit&&menuFit.cancel,`${tag}: game menu label fits, misses the buttons, Cancel stays ${JSON.stringify(menuFit)}`);
    if(SHOT)await p.screenshot({path:SHOT+`version-menu-${W}x${H}-${theme}.png`});
    await p.click('#cMenuDlg button[value=cancel]');
    await p.evaluate(()=>{tab='setup';render();document.getElementById('setupVer').scrollIntoView({block:'center'});});
    await p.waitForTimeout(100);
    const setup=await p.evaluate(labelOf,'setupVer');
    const setupFit=await p.evaluate(()=>{
      const r=document.getElementById('setupVer').getBoundingClientRect();
      const head=document.querySelector('header').getBoundingClientRect();
      return r.height>=12&&r.top>=head.bottom-1&&r.bottom<=innerHeight+1&&r.left>=-1&&r.right<=innerWidth+1&&!document.body.classList.contains('coachmode');
    });
    ok(setup.text===setup.ver&&setup.theme===theme,`${tag}: Setup shows ${setup.text}`);
    ok(setup.size>=12&&setup.size<=16&&setup.weight>=600&&!setup.clip&&setup.contrast>=4.5&&setupFit,`${tag}: Setup label contrast ${setup.contrast.toFixed(2)}:1, on screen ${setupFit}`);
    if(SHOT)await p.screenshot({path:SHOT+`version-setup-${W}x${H}-${theme}.png`});
    ok(!errs.length,`${tag}: no page errors ${errs.join('|')}`);
    await c.close();
  }
  {const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
    await c.route(/supabase\.co/,r=>r.abort());
    const p=await c.newPage();
    await p.goto(BASE);
    const fresh=await p.evaluate(()=>({on:document.getElementById('verNote').classList.contains('on'),text:document.getElementById('verNote').textContent,seen:localStorage.getItem(PC.VERSION_SEEN_KEY),ver:PC.APP_VERSION}));
    ok(!fresh.on&&fresh.text===''&&fresh.seen===fresh.ver,`fresh install shows no notice and stores ${fresh.ver} ${JSON.stringify(fresh)}`);
    await p.reload();
    const again=await p.evaluate(()=>({on:document.getElementById('verNote').classList.contains('on'),text:document.getElementById('verNote').textContent,seen:localStorage.getItem(PC.VERSION_SEEN_KEY),ver:PC.APP_VERSION}));
    ok(!again.on&&again.text===''&&again.seen===again.ver,'second open of a fresh install stays quiet');
    await c.close();}
  {const c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
    await c.route(/supabase\.co/,r=>r.abort());
    await c.addInitScript(()=>{localStorage.setItem('te_ui_theme','field');if(!sessionStorage.getItem('ver_seeded')){localStorage.setItem('pc_version_seen','v0');sessionStorage.setItem('ver_seeded','1');}});
    const p=await c.newPage();
    await p.clock.install();
    await p.clock.pauseAt(Date.now());
    await p.goto(BASE);
    await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'12',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';__app.render();},GAME);
    const note=await p.evaluate(()=>{
      const h=document.getElementById('cxHint'),z=document.getElementById('cZone').getBoundingClientRect(),r=h.getBoundingClientRect();
      const miss=r.right<=z.left+1||r.left>=z.right-1||r.bottom<=z.top+1||r.top>=z.bottom-1;
      return {banner:document.getElementById('verNote').classList.contains('on'),text:(h.textContent||'').trim(),pe:getComputedStyle(h).pointerEvents,seen:localStorage.getItem(PC.VERSION_SEEN_KEY),ver:PC.APP_VERSION,miss,coach:document.body.classList.contains('coachmode')};
    });
    ok(!note.banner&&note.text==='Updated to '+note.ver&&note.seen===note.ver&&note.pe==='none'&&note.miss&&note.coach,`update note once, in the status line, off the zone ${JSON.stringify(note)}`);
    await p.evaluate(()=>render());
    ok(await p.evaluate(()=>{const h=document.getElementById('cxHint');return !document.getElementById('verNote').classList.contains('on')&&(h.textContent||'').trim()==='Updated to '+PC.APP_VERSION;}),'a redraw does not clear the note or show it twice');
    if(SHOT)await p.screenshot({path:SHOT+'version-notice-844x390-field.png'});
    const ms=await p.evaluate(()=>PC.VERSION_NOTE_MS);
    await p.clock.fastForward(ms+50);
    await p.waitForFunction(()=>!document.getElementById('verNote').classList.contains('on')&&!/Updated to v\d+/.test(document.getElementById('cxHint').textContent||''));
    ok(true,'the note dismisses itself');
    await p.reload();
    const quiet=await p.evaluate(()=>({on:document.getElementById('verNote').classList.contains('on'),text:document.getElementById('verNote').textContent,seen:localStorage.getItem(PC.VERSION_SEEN_KEY),ver:PC.APP_VERSION}));
    ok(!quiet.on&&quiet.text===''&&quiet.seen===quiet.ver,'the next open does not show the note again');
    await c.close();}
  {const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
    await c.route(/supabase\.co/,r=>r.abort());
    const p=await c.newPage();
    await p.goto(BASE);
    await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:15000});
    const sw=await p.evaluate(()=>new Promise((resolve,reject)=>{
      const t=setTimeout(()=>reject(new Error('worker version')),5000);
      navigator.serviceWorker.ready.then(reg=>{
        const mc=new MessageChannel();
        mc.port1.onmessage=e=>{clearTimeout(t);resolve(e.data);};
        reg.active.postMessage('version',[mc.port2]);
      });
    }).then(cache=>({cache,running:PC.APP_VERSION,shown:document.getElementById('setupVer').textContent.trim(),controlled:!!navigator.serviceWorker.controller})));
    ok(sw.controlled&&sw.shown===sw.running&&sw.cache==='te-pitch-'+sw.running,`running label matches the worker ${JSON.stringify(sw)}`);
    await c.close();}
  const GAME2={id:'g1',date:'2026-10-20',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]};
  const NOTE_SIZES=[[375,667,0,0,0],[390,844,0,0,0],[430,932,0,0,0],[844,390,0,0,0],[844,390,47,47,21],[667,375,0,0,0],[667,375,47,47,21],[956,440,0,0,0],[956,440,47,47,21],[956,384,0,0,0],[956,360,0,0,0],[932,430,0,0,0]];
  for(const [W,H,L,R,Bin] of NOTE_SIZES){
    const tag=`${W}x${H}${L||R||Bin?' inset '+L+'/'+R+'/'+Bin:''}`;
    const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
    await c.route(/supabase\.co/,r=>r.abort());
    await c.addInitScript(()=>{localStorage.setItem('te_ui_theme','field');localStorage.setItem('pc_version_seen','v0');});
    const p=await c.newPage();
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.clock.install();
    await p.clock.pauseAt(Date.now());
    if(L||R||Bin){const cdp=await c.newCDPSession(p);await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,left:L,right:R,bottom:Bin}});}
    await p.goto(BASE);
    await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'12',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';__app.render();},GAME2);
    const hit=await p.evaluate(()=>{
      const boxOf=el=>{if(!el)return null;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')return null;const r=el.getBoundingClientRect();return r.width>2&&r.height>2?r:null;};
      const v=document.getElementById('verNote'),h=document.getElementById('cxHint');
      let node=null,r=null;
      if(v&&v.classList.contains('on')&&/Updated to v\d+/.test(v.textContent||'')){node=v;r=boxOf(v);}
      if(!r&&h&&/Updated to v\d+/.test(h.textContent||'')){node=h;r=boxOf(h);}
      if(!node||!r)return {ok:false,why:'note missing',on:!!(v&&v.classList.contains('on')),hint:(h&&h.textContent)||''};
      const sels=['#cBand','#cStatus .cs-top','#cStatus .cs-bat','#cStatus .cs-call','#cxMenu','#cRes','#cRes button','#types','#types button','#foulChips','#foulChips button','nav','nav button','#pitcher','#jerseyEdit','#addPQuick','#gameHead','#cZone','#resTog','#syncTag'];
      const bad=[];
      for(const sel of sels)for(const el of document.querySelectorAll(sel)){
        if(el===node||node.contains(el)||el.contains(node))continue;
        const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden')continue;
        const q=el.getBoundingClientRect();if(q.width<2||q.height<2)continue;
        const iw=Math.min(r.right,q.right)-Math.max(r.left,q.left),ih=Math.min(r.bottom,q.bottom)-Math.max(r.top,q.top);
        if(iw>1&&ih>1)bad.push(sel);}
      const onScreen=r.top>=-1&&r.left>=-1&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1;
      return {ok:!bad.length&&onScreen,bad:[...new Set(bad)],onScreen,text:node.textContent.trim(),id:node.id};
    });
    ok(hit.ok,`${tag}: update note misses the band, status, results, chips, nav and header ${JSON.stringify(hit)}`);
    ok(!errs.length,`${tag}: no page errors ${errs.join('|')}`);
    await c.close();
  }
  for(const [W,H] of [[956,440],[932,430]]){
    const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});
    await c.route(/supabase\.co/,r=>r.abort());
    const p=await c.newPage();
    await p.goto(BASE);
    await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'12',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';__app.render();},GAME2);
    await p.click('#cxMenu');
    await p.waitForFunction(()=>document.getElementById('cMenuDlg').open);
    const menu=await p.evaluate(()=>{
      const row=document.querySelector('#cMenuDlg .row.sp').getBoundingClientRect();
      const lbl=document.getElementById('cMenuT').getBoundingClientRect();
      const btn=document.querySelector('#cMenuDlg .cmenu-g button').getBoundingClientRect();
      const cancel=document.querySelector('#cMenuDlg .dlgfoot button[value="cancel"]').getBoundingClientRect();
      return {lblTop:lbl.top-row.top,rowH:row.height,lblH:lbl.height,gap:btn.top-lbl.bottom,cancelTop:cancel.top,cancelBot:cancel.bottom,cancelH:cancel.height,ih:innerHeight};
    });
    ok(Math.abs(menu.lblTop)<=1&&Math.abs(menu.rowH-menu.lblH)<=1&&Math.abs(menu.gap-8)<=1&&menu.cancelH>=44&&menu.cancelBot<=menu.ih+1&&menu.cancelTop>=-1,`${W}x${H}: game menu title keeps its row ${JSON.stringify(menu)}`);
    await c.close();
  }
  {const c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
    await c.route(/supabase\.co/,r=>r.abort());
    const p=await c.newPage();
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    await p.goto(BASE);
    await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:15000});
    await p.reload({waitUntil:'load'});
    await p.waitForFunction(()=>navigator.serviceWorker.controller);
    await p.evaluate(()=>{D.draft=Object.assign(blankDraft(),{type:'FB',called:[6]});D.type='FB';D.sheet=false;D.ip=false;D.foul=false;});
    let navs=0;p.on('framenavigated',()=>{navs++;});
    await p.evaluate(()=>navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));
    await p.waitForTimeout(2200);
    const mid=await p.evaluate(()=>({type:pullDraft().type,called:(pullDraft().called||[]).slice()}));
    ok(mid.type==='FB'&&mid.called[0]===6&&navs===0,`a controller change keeps the pitch ${JSON.stringify(mid)} navs=${navs}`);
    await p.evaluate(()=>{D.draft=blankDraft();D.type=null;$('batDlg').showModal();});
    await p.waitForTimeout(2200);
    ok(navs===0&&await p.evaluate(()=>$('batDlg').open),'an open sheet holds the reload');
    const gone=p.waitForNavigation({waitUntil:'load',timeout:8000}).then(()=>true,()=>false);
    await p.evaluate(()=>$('batDlg').close());
    ok(await gone,'the reload runs after the sheet closes');
    ok(!errs.length,`reload wait has no page errors ${errs.join('|')}`);
    await c.close();}
  {const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
    await c.route(/supabase\.co/,r=>r.abort());
    await c.addInitScript(()=>{localStorage.setItem('pc_version_seen','nope');});
    const p=await c.newPage();
    await p.goto(BASE);
    const garbage=await p.evaluate(()=>({on:document.getElementById('verNote').classList.contains('on'),text:document.getElementById('verNote').textContent,seen:localStorage.getItem('pc_version_seen'),ver:PC.APP_VERSION}));
    ok(!garbage.on&&garbage.text===''&&garbage.seen===garbage.ver,`a stored value that is not a version stays quiet ${JSON.stringify(garbage)}`);
    await c.close();}
  {const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'allow'});
    await c.route(/supabase\.co/,r=>r.abort());
    await c.addInitScript(()=>{localStorage.setItem('pc_version_seen','v0');const orig=localStorage.setItem.bind(localStorage);localStorage.setItem=function(k,v){if(k==='pc_version_seen')throw new Error('blocked');return orig(k,v);};});
    const p=await c.newPage();
    await p.goto(BASE);
    const blocked=await p.evaluate(()=>({on:document.getElementById('verNote').classList.contains('on'),text:document.getElementById('verNote').textContent,seen:localStorage.getItem('pc_version_seen')}));
    ok(!blocked.on&&blocked.text===''&&blocked.seen==='v0',`the notice waits until the version is saved ${JSON.stringify(blocked)}`);
    await c.close();}
  await b.close();
  console.log(fails?fails+' FAILED':'ALL PASS');
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
