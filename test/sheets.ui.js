// Regression (PR F): every segmented-control option is fully visible inside the viewport (390x844 and 375x667), and every
// dialog/sheet has a working Cancel, Escape and backdrop dismissal that leaves the data unchanged. Throwaway profile, Supabase blocked.
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for(const [W,H] of [[390,844],[375,667]]){const tag=`${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a);const wait=ms=>p.waitForTimeout(ms||200);
  await p.goto(BASE);await ev(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'},{id:'p_r',name:'Reese',num:'7',throws:'L'}];S.curPitcher='p_a';
    const s={id:'s1',date:'2026-10-12',pitcherId:'p_a',started:1,ended:2,pitches:[]};[[3,3],[3,2],[7,5],[9,14],[1,1],[7,8]].forEach(([t,l],i)=>s.pitches.push({id:'x'+i,pitcherId:'p_a',type:'FB',targets:[t],loc:l,b:0,s:0}));S.sessions.push(s);__app.store.save();__app.render();});
  const snap=()=>ev(()=>JSON.stringify(__app.store.real)+'|'+JSON.stringify(Object.assign({},localStorage)));
  // every option of a segmented control: inside the viewport, not covered, text not clipped
  const segOK=async(sel,label,n)=>{const r=await ev(s=>[...document.querySelectorAll(s)].filter(e=>e.offsetParent!==null).map(e=>{const r=e.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
      return{t:e.textContent.trim(),in:r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5&&r.width>=24,top:!!hit&&(hit===e||e.contains(hit)),clip:e.scrollWidth>e.clientWidth+1};}),sel);
    ok(r.length===n&&r.every(x=>x.in&&x.top&&!x.clip),`${tag} ${label}: all ${n} options visible ${JSON.stringify(r.map(x=>x.t+(x.in&&x.top&&!x.clip?'':'✗')))}`);};
  const dismiss=async(open,cancelSel,label,mutate)=>{for(const how of ['Cancel','Escape','backdrop']){const before=await snap();await open();await wait(300);if(mutate)await mutate();
      if(how==='Cancel')await p.click(cancelSel);else if(how==='Escape')await p.keyboard.press('Escape');else await p.mouse.click(4,4);await wait(250);
      ok(await ev(()=>!document.querySelector('dialog[open]'))&&(await snap())===before,`${tag} ${label}: ${how} closes, data unchanged`);}};
  // bullpen: batter chip -> sheet with None / LHB / RHB
  await p.click('nav [data-t="bullpen"]');await wait();ok(/none/.test(await p.textContent('#batTog')),`${tag} bullpen defaults to no batter`);
  await p.click('#batTog');await wait(300);await segOK('#batDlg .seg3 button','bullpen batter sheet hides LHB/RHB',1);
  await p.click('#batDlg button[value=cancel]');await wait();
  await p.click('#bpHands');await p.evaluate(()=>scrollTo(0,0));await wait();await p.click('#batTog');await wait(300);await segOK('#batDlg .seg3 button','bullpen batter sheet',3);
  await p.click('#hR');await wait();ok(/RHB/.test(await p.textContent('#batTog'))&&await ev(()=>!document.getElementById('batDlg').open),`${tag} picking RHB applies and closes`);
  await p.click('#batTog');await p.click('#hN');await wait();
  await dismiss(()=>p.click('#batTog'),'#batDlg button[value=cancel]','batter sheet');
  // header: pitcher name not clipped, no handedness
  ok(await ev(()=>{const s=document.getElementById('pitcher');const t=s.options[s.selectedIndex].text;const cx=document.createElement('canvas').getContext('2d');cx.font=getComputedStyle(s).font;return !/\(/.test(t)&&cx.measureText(t).width<=s.clientWidth-24;}),`${tag} header pitcher name fits ("${await ev(()=>{const s=document.getElementById('pitcher');return s.options[s.selectedIndex].text;})}")`);
  // toast never covers the zone
  await ev(()=>{const t=document.getElementById('toast');t.textContent='Test toast';t.classList.add('on');});await wait(250);
  ok(await ev(()=>{const t=document.getElementById('toast').getBoundingClientRect(),z=document.getElementById('zone').getBoundingClientRect();return t.bottom<=z.top||t.top>=z.bottom;}),`${tag} toast clear of the zone`);
  // add pitcher (+): fill it in, then cancel three ways -> nothing saved
  await dismiss(()=>p.click('#addPQuick'),'#pDlg button[value=cancel]','add-pitcher',async()=>{await p.fill('#pdName','Zoe');await p.fill('#pdNum','9');});
  // stats: heat view toggle, filters, drill-down, session report
  await p.click('nav [data-t="stats"]');await wait(300);await segOK('#heatCard [role=group] button','heat-map view toggle',2);
  await dismiss(()=>p.click('#hfOpen'),'#hfDlg button[value=cancel]','heat filters',async()=>{const s=await p.$('#hfForm select');if(s){const v=await s.$$eval('option',o=>o.map(x=>x.value).filter(Boolean));if(v[0])await s.selectOption(v[0]);}});
  await dismiss(async()=>{await p.evaluate(()=>scrollTo(0,0));await p.click('#hMap [role="button"]');},'#ddClose','heat drill-down');
  await p.selectOption('#sScope','s1');await wait();await dismiss(()=>p.click('#sReport'),'#rClose','session report');
  // setup: edit pitcher cancel keeps the old values
  await p.click('nav [data-t="setup"]');await wait();await dismiss(()=>p.click('#pList [data-e="p_a"]'),'#pDlg button[value=cancel]','edit-pitcher',()=>p.fill('#pdName','Changed'));
  // game: batter sheet (L/R only), outs/innings segment, result + wristband sheets
  await ev(()=>{const S=__app.store.real;S.games.push({id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'away',status:'active',started:1,lineup:[{slot:1,name:'B1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]});S.activeGame='g1';S.callSheets=[{id:'cs1',name:'Band A',cols:['1'],rows:[['FB 3']]}];__app.store.save();__app.render();});
  await p.click('nav [data-t="game"]');await wait(300);await p.click('#batTog');await wait(300);await segOK('#batDlg .seg3 button','game batter sheet',2);
  await p.click('#hL');await wait();ok(/LHB/.test(await p.textContent('#batTog')),`${tag} game batter set to LHB`);
  await dismiss(()=>p.click('#batTog'),'#batDlg button[value=cancel]','game batter sheet');
  await p.$eval('#inGame details.disc',d=>{d.open=true;d.scrollIntoView({block:'center'});});await wait();await segOK('#inGame .seg button','outs/innings segment',3);await p.evaluate(()=>scrollTo(0,0));await wait();
  await ev(()=>{D.type='FB';pushCalled([3]);D.loc=5;D.sheet=false;render();});
  for(const how of ['close','Escape']){const before=await snap();await p.click('#resTog');await wait(300);if(how==='close')await p.click('#resClose');else await p.keyboard.press('Escape');await wait(250);
    ok(await ev(()=>document.getElementById('resSheet').classList.contains('hide'))&&(await snap())===before,`${tag} result sheet: ${how} closes, nothing logged`);}
  for(const how of ['Band','Escape']){const before=await snap();await p.click('#wbTog');await wait(250);if(how==='Band')await p.click('#wbTog');else await p.keyboard.press('Escape');await wait(250);
    ok(await ev(()=>!document.body.classList.contains('wbopen'))&&(await snap())===before,`${tag} wristband sheet: ${how} closes, data unchanged`);}
  ok(!errs.length,`${tag}: no page errors `+errs.join('|'));await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
