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
    await c.addInitScript(()=>{localStorage.setItem('te_ui_theme','field');localStorage.setItem('pc_version_seen','v0');});
    const p=await c.newPage();
    await p.clock.install();
    await p.clock.pauseAt(Date.now());
    await p.goto(BASE);
    await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'12',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';__app.render();},GAME);
    const note=await p.evaluate(()=>{
      const el=document.getElementById('verNote'),z=document.getElementById('cZone').getBoundingClientRect(),r=el.getBoundingClientRect();
      const miss=r.right<=z.left+1||r.left>=z.right-1||r.bottom<=z.top+1||r.top>=z.bottom-1;
      return {on:el.classList.contains('on'),text:el.textContent,pe:getComputedStyle(el).pointerEvents,seen:localStorage.getItem(PC.VERSION_SEEN_KEY),ver:PC.APP_VERSION,miss,coach:document.body.classList.contains('coachmode')};
    });
    ok(note.on&&note.text==='Updated to '+note.ver&&note.seen===note.ver&&note.pe==='none'&&note.miss&&note.coach,`update note once, off the zone ${JSON.stringify(note)}`);
    await p.evaluate(()=>render());
    ok(await p.evaluate(()=>document.getElementById('verNote').classList.contains('on')&&document.getElementById('verNote').textContent==='Updated to '+PC.APP_VERSION),'a redraw does not clear the note or show it twice');
    if(SHOT)await p.screenshot({path:SHOT+'version-notice-844x390-field.png'});
    const ms=await p.evaluate(()=>PC.VERSION_NOTE_MS);
    await p.clock.fastForward(ms+50);
    await p.waitForFunction(()=>!document.getElementById('verNote').classList.contains('on'));
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
  await b.close();
  console.log(fails?fails+' FAILED':'ALL PASS');
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
