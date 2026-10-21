// RULE-13. Contact chips are at least 48px. Coach columns do not move between idle and in play.
// The coach screen shows the code; the game screen keeps the full name. Both themes.
// usage: node test/contact.ui.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://127.0.0.1:8766/';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const GAME={id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]};
const CODES='GB,LD,FB,PU,BU',NAMES='Ground,Liner,Fly,Pop up,Bunt';
const chipSel=sel=>[...document.querySelectorAll(sel)].map(b=>{const r=b.getBoundingClientRect();return {t:b.textContent,aria:b.getAttribute('aria-label'),w:r.width,h:r.height,l:r.left,rt:r.right,fs:parseFloat(getComputedStyle(b).fontSize),clip:b.scrollWidth>b.clientWidth+1,off:r.left<-1||r.right>innerWidth+1||r.bottom>innerHeight+1};});
const cols=()=>{const b=document.querySelector('.cband').getBoundingClientRect(),r=document.querySelector('.cres').getBoundingClientRect(),z=document.getElementById('cZone').getBoundingClientRect();return {bL:b.left,bR:b.right,rL:r.left,rR:r.right,zL:z.left,zR:z.right,zW:z.width};};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const tapZ=async(p,z)=>{const xy=await p.$eval(`#zone [data-z="${z}"]`,e=>{const s=e.ownerSVGElement,pt=s.createSVGPoint(),bb=e.getBBox();pt.x=bb.x+bb.width/2;pt.y=bb.y+bb.height/2;const q=pt.matrixTransform(s.getScreenCTM());return [q.x,q.y];});await p.mouse.click(xy[0],xy[1]);};
for(const [W,H] of [[375,667],[390,844],[430,932]])for(const theme of ['field','night']){const tag=`${W}x${H} portrait ${theme}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});
  await c.route(/supabase\.co/,r=>r.abort());
  await c.addInitScript(t=>{localStorage.setItem('te_ui_portrait_ok','1');localStorage.setItem('te_ui_theme',t);},theme);
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(BASE);
  await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games=[g];S.activeGame='g1';S.sessions=[];__app.store.save();__app.render();},GAME);
  await p.click('nav [data-t="game"]').catch(()=>{});await p.waitForTimeout(150);
  await p.click('#types [data-c="FB"]');await tapZ(p,5);await tapZ(p,5);await p.click('#resBtns [data-r="inplay"]');await p.waitForTimeout(150);
  const chips=await p.evaluate(chipSel,'#ipContact [data-bb]');
  const fit=chips.length===5&&chips.every(x=>x.w>=47.5&&x.h>=47.5&&!x.clip&&!x.off);
  ok(chips.map(x=>x.t).join()===NAMES&&fit,`${tag}: full names, 48px, on screen ${chips.map(x=>x.t+' '+x.w.toFixed(0)+'×'+x.h.toFixed(0)+(x.clip?' clip':'')).join(' ')}`);
  ok(!errs.length,`${tag}: no page errors`);
  await c.close();}
const land=[[844,390,0],[667,375,0],[956,440,0],[956,440,62],[956,384,0],[956,360,0],[932,430,0]];
for(const [W,H,inset] of land)for(const theme of ['field','night']){const tag=`${W}x${H}${inset?' inset'+inset:''} ${theme}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});
  await c.route(/supabase\.co/,r=>r.abort());
  await c.addInitScript(t=>localStorage.setItem('te_ui_theme',t),theme);
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(BASE);
  await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games=[g];S.activeGame='g1';__app.store.save();__app.render();},GAME);
  if(inset)await p.evaluate(n=>{const st=document.createElement('style');st.textContent=`.coach{padding:4px ${n}px 21px ${n}px!important}`;document.head.appendChild(st);dispatchEvent(new Event('resize'));},inset);
  await p.waitForTimeout(120);
  const idle=await p.evaluate(cols);
  await p.click('#cBand button[data-r="2"][data-c="4"]');await p.click('#cZone button[data-z="4"]');await p.click('#cRes [data-r="inplay"]');await p.waitForTimeout(120);
  const ip=await p.evaluate(cols);
  const chips=await p.evaluate(chipSel,'#cContact [data-bb]');
  const still=Math.abs(idle.bL-ip.bL)<=1&&Math.abs(idle.bR-ip.bR)<=1&&Math.abs(idle.rL-ip.rL)<=1&&Math.abs(idle.rR-ip.rR)<=1;
  ok(still,`${tag}: band and results stay (band ${idle.bL.toFixed(0)}→${ip.bL.toFixed(0)}, results ${idle.rL.toFixed(0)}→${ip.rL.toFixed(0)})`);
  const inside=chips.length===5&&chips.every(x=>x.l>=ip.zL-1&&x.rt<=ip.zR+1&&ip.zL>=ip.bR-1&&ip.zR<=ip.rL+1);
  const wide=ip.zW>=239.5;
  const fit=chips.every(x=>x.h>=47.5&&x.fs>=11&&!x.clip&&!x.off&&(wide?x.w>=47.5:x.w>=ip.zW/5-1.5));
  ok(chips.map(x=>x.t).join()===CODES&&chips.map(x=>x.aria).join()===NAMES&&inside&&fit,`${tag}: codes, ${wide?'48px':'zone/5'}, inside the zone ${chips.map(x=>x.w.toFixed(1)).join(' ')} zone ${ip.zW.toFixed(0)}`);
  ok(!errs.length,`${tag}: no page errors`);
  await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
