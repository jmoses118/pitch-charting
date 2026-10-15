// FLOW-13/14/15: Game opens a picker. Resume does not create a game. Discard and End ask first.
// Throwaway profile, Supabase blocked (offline).
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const SIZES=[[375,667],[390,844],[430,932],[667,375],[844,390],[932,430]];
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const ctx=o=>b.newContext(Object.assign({isMobile:true,hasTouch:true},o));
async function page(w,h){const c=await ctx({viewport:{width:w,height:h}});await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const native=[];p.on('dialog',d=>{native.push(d.message());d.dismiss();});
  const vis=s=>p.isVisible(s);const tab=async t=>{await p.click(`nav [data-t="${t}"]`);await p.waitForTimeout(120);};const clk=async s=>{await p.$eval(s,e=>e.scrollIntoView({block:'center'}));await p.click(s);await p.waitForTimeout(150);};
  const st=(f,a)=>p.evaluate(f,a);return {c,p,errs,native,vis,tab,clk,st};}
// mutual exclusion still holds, and the picker is the list
{const {c,p,errs,native,vis,tab,clk,st}=await page(390,844);
await p.goto(BASE);await st(()=>{window.confirm=()=>{throw new Error('confirm called');};__app.store.real.pitchers.push({id:'p_t',name:'Test Pitcher',num:'1',throws:'R'});__app.store.real.curPitcher='p_t';__app.store.save();__app.render();});
await tab('game');await clk('#pickNew');await p.fill('#gOpp','Storm');await clk('#gStart');ok(await vis('#inGame'),'FLOW-13 game started from the sheet');
await st(()=>{const g=__app.store.real.games.find(x=>x.id===__app.store.real.activeGame);g.pitches.push({id:crypto.randomUUID(),pitcherId:'p_t',ts:Date.now(),type:'FB',result:'ball',b:0,s:0,inning:1,abn:0,slot:0});g.cur.b=1;__app.store.save();__app.render();});
await tab('bullpen');ok(await vis('#lockBp'),'bullpen locked while game in progress');ok((await p.textContent('#lockBp .lockMsg'))==='Game in progress — end or pause the game to start a bullpen','lock message');
ok(!(await vis('#entry'))&&!(await vis('#bpCard')),'no bullpen entry while locked');
await clk('#lkGoG');ok(await vis('#inGame'),'back to the game');await tab('bullpen');
await clk('#lkPauseG');ok(!(await vis('#lockBp'))&&await vis('#entry'),'pause game unlocks bullpen');
const gid=await st(()=>__app.store.real.games.find(g=>g.opponent==='Storm').id);ok(await st(id=>__app.store.real.games.find(g=>g.id===id).pitches.length===1&&!__app.store.real.games.find(g=>g.id===id).ended,gid),'paused game keeps its pitches');
await st(()=>{const S=__app.store.real;const s={id:'s_m',date:'2026-10-13',pitcherId:'p_t',started:1,pitches:[{id:crypto.randomUUID(),pitcherId:'p_t',ts:Date.now(),type:'FB',targets:[1],loc:1,b:0,s:0}]};S.sessions.push(s);S.activeSession='s_m';__app.store.save();__app.render();});
await tab('game');ok(await vis('#lockGame'),'game tab locked while bullpen open');ok((await p.textContent('#lockGame .lockMsg'))==='Bullpen in progress — end or pause the bullpen to start a game','reverse lock message');
ok(!(await vis('#gamePick')),'no picker while bullpen open');
await clk('#lkPauseBp');ok(!(await vis('#lockGame')),'pause bullpen unlocks game');ok(await vis('#gamePick'),'paused game listed');
await tab('bullpen');ok(await vis('#bpResume'),'paused bullpen can be resumed');await clk('#bpResume');ok(await st(()=>__app.store.real.activeSession==='s_m'),'bullpen resumed');
await tab('game');await clk('#lkEndBp');ok(await vis('#rDlg'),'end bullpen opens the report');await st(()=>document.getElementById('rDlg').close());
ok(await st(()=>__app.store.real.sessions.find(s=>s.id==='s_m').pitches.length===1),'ended bullpen keeps its pitches');
await tab('game');ok(await vis('#gamePick'),'resume list shown');await clk(`[data-rg="${gid}"]`);ok(await vis('#inGame')&&(await p.textContent('#cnt'))==='1-0','game resumed with its count');
await tab('bullpen');await clk('#lkEndG');ok(await vis('#askDlg'),'FLOW-14 End asks before the game ends');await clk('#askOk');ok(!(await vis('#lockBp')),'ending the game unlocks bullpen');ok(await st(id=>__app.store.real.games.find(g=>g.id===id).status==='final',gid),'game final');
await st(()=>{const S=__app.store.real;S.games.push({id:'g_x',started:1,status:'active',opponent:'X',lineup:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0},pitches:[]});S.activeGame='g_x';const y=S.sync;y.teamCode='TE-XXXXX-XXXXX';y.teamId='t';y.role='player';y.pitcherId='p_t';__app.store.save();__app.render();});
ok(!(await vis('#lockBp'))&&await vis('#bpCard'),'player bullpen never locked');
ok(!native.length,'no confirm() '+native.join(' | '));ok(errs.length===0,'no page errors '+errs.join(' | '));await c.close();}
for(const [W,H] of SIZES){const tag=`${W}x${H}`;const {c,p,errs,native,vis,clk,st}=await page(W,H);await p.goto(BASE);
  await st(()=>{window.confirm=()=>{throw new Error('confirm called');};const S=__app.store.real;const dev=S.sync.deviceId;S.activeGame=null;S.activeSession=null;S.sessions=[];
    S.games=[
      {id:'draft1',started:10,status:'active',opponent:'Drafty',date:'2026-10-02',time:'15:00',homeAway:'home',scorer:dev,lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0,pitcherId:'p_woods'}},
      {id:'live1',started:20,status:'active',opponent:'Storm',date:'2026-10-03',time:'18:00',homeAway:'away',scorer:dev,lineup:[],pitches:[{id:'p1',pitcherId:'p_woods',ts:50,type:'FB',result:'ball',inning:4}],cur:{inning:4,outs:1,slot:0,b:1,s:0,abn:1,pitcherId:'p_woods'}},
      {id:'other1',started:5,status:'active',opponent:'Other',date:'2026-10-01',time:'12:00',homeAway:'home',scorer:'other-phone',lineup:[],pitches:[{id:'p2',pitcherId:'p_woods',ts:10,type:'FB'}],cur:{inning:2,outs:0,slot:0,b:0,s:0,abn:0,pitcherId:'p_woods'}}];
    __app.store.save();__app.render();});
  await p.waitForTimeout(150);
  const n=await p.$$eval('#pickList .resume',els=>els.length);const starts=await p.$$eval('#pickNew',els=>els.length);
  ok(n===3&&starts===1,'picker shows N Resume rows and one Start');
  ok(await st(()=>{const ids=[...document.querySelectorAll('#pickList [data-rg]')].map(b=>b.dataset.rg);return JSON.stringify(ids)===JSON.stringify(PC.pausedGames(__app.store.real).map(g=>g.id));}),`${tag} FLOW-13 rows follow pausedGames`);
  const row=await p.$eval('#pickList .grow',e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),list=document.getElementById('pickList').getBoundingClientRect();return {h:r.height,w:r.width,lw:list.width,left:r.left,right:r.right};});
  ok(row.h>=56&&row.w>=row.lw-1,`${tag} FLOW-13 row is full width and at least 56px (${Math.round(row.w)}x${Math.round(row.h)})`);
  const resume=await p.$eval('#pickList .resume',e=>{e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {w:r.width,h:r.height,bg:getComputedStyle(e).backgroundColor};});
  ok(resume.w>=48&&resume.h>=48&&resume.bg==='rgb(30, 63, 208)',`${tag} FLOW-13 Resume is royal and at least 48px`);
  const gap=await p.evaluate(()=>{const list=document.getElementById('pickList'),btn=document.getElementById('pickNew');btn.scrollIntoView({block:'center'});const rows=[...list.querySelectorAll('.grow')];const last=rows[rows.length-1].getBoundingClientRect();const b=btn.getBoundingClientRect();const listW=list.getBoundingClientRect().width;return {below:b.top-last.bottom,h:b.height,w:b.width,lw:listW};});
  ok(gap.h>=48&&gap.w>=gap.lw-1&&gap.below>=24,`${tag} FLOW-13 Start is full width, 48px, 24px below the list`);
  const draft=await p.$eval('[data-rg="draft1"]',e=>e.closest('.grow').textContent);
  ok(/Draft/.test(draft)&&!/\d+ pitches/.test(draft),`${tag} FLOW-15 draft badge and no pitch count`);
  const live=await p.$eval('[data-rg="live1"]',e=>e.closest('.grow').textContent);
  ok(/Storm/.test(live)&&/Avery #45/.test(live)&&/2026-10-03/.test(live)&&/18:00/.test(live)&&/1 pitches/.test(live)&&/inning 4/.test(live),`${tag} FLOW-13 live row shows opponent, pitcher, date, time, count, inning`);
  ok(await p.$$eval('#pickList .gdismiss',els=>els.length===1&&els[0].dataset.dd==='draft1'),`${tag} FLOW-15 Discard only on the draft this phone scores`);
  const dis=await p.evaluate(()=>{const d=document.querySelector('#pickList .gdismiss'),r=document.querySelector('[data-rg="draft1"]');d.scrollIntoView({block:'center'});const a=d.getBoundingClientRect(),b=r.getBoundingClientRect();return {h:a.height,w:a.width,gap:b.left-a.right};});
  ok(dis.h>=48&&dis.w>=48&&dis.gap>=16,`${tag} FLOW-15 Discard is 48px and 16px from Resume`);
  const cut=await p.evaluate(()=>{const bad=[];
    for(const sel of ['#pickList .grow','#pickList .resume','#pickList .gdismiss','#pickNew']){const e=document.querySelector(sel);e.scrollIntoView({block:'center'});
      const navTop=()=>document.querySelector('nav').getBoundingClientRect().top,hdrBot=()=>document.querySelector('header').getBoundingClientRect().bottom;
      let r=e.getBoundingClientRect();if(r.bottom>navTop()){scrollBy(0,r.bottom-navTop()+2);r=e.getBoundingClientRect();}if(r.top<hdrBot()){scrollBy(0,r.top-hdrBot()-2);r=e.getBoundingClientRect();}
      if(r.left<-1||r.right>innerWidth+1||r.top<hdrBot()-1||r.bottom>navTop()+1)bad.push(sel);}
    return {bad,wide:document.documentElement.scrollWidth<=innerWidth+1};});
  ok(!cut.bad.length&&cut.wide,`${tag} controls stay on screen ${cut.bad.join(',')}`);
  if(W===390){
    const css=await p.evaluate(()=>[...document.styleSheets].flatMap(s=>{try{return [...s.cssRules].map(r=>r.cssText);}catch(e){return [];}}).join('\n'));
    ok(/#gamePick\s*\{[^}]*safe-area-inset-left[^}]*safe-area-inset-right/.test(css),'FLOW-13 picker padding uses the safe area');
    ok(await p.$('img[alt="Thunder Elite"]')&&await st(()=>getComputedStyle(document.querySelector('header')).borderBottomColor==='rgb(30, 63, 208)'),'RULE-12 wordmark and royal header');
    const before=await st(()=>__app.store.real.games.length);
    await clk('#pickNew');ok(await p.isDisabled('#gStart'),'FLOW-13 Confirm disabled until opponent and pitcher');
    await p.fill('#gOpp','Nope');await p.evaluate(()=>{const s=document.getElementById('gPitcher');s.value='';s.dispatchEvent(new Event('change',{bubbles:true}));});
    ok(await p.isDisabled('#gStart'),'FLOW-13 blank pitcher keeps Confirm disabled');
    await p.selectOption('#gPitcher','p_woods');const gs=await p.$eval('#gStart',e=>e.getBoundingClientRect().height);
    ok(!(await p.isDisabled('#gStart'))&&gs>=48,'FLOW-13 Confirm is at least 48px once both are set');
    await clk('#setupCancel');ok(!(await vis('#setupDlg'))&&await st(n=>__app.store.real.games.length===n&&!__app.store.real.games.some(g=>g.opponent==='Nope'),before),'FLOW-13 Cancel changes nothing');
    await clk('#pickNew');await p.fill('#gOpp','Nope');await p.keyboard.press('Escape');
    ok(!(await vis('#setupDlg'))&&await st(n=>__app.store.real.games.length===n,before),'FLOW-13 Esc changes nothing');
    await clk('#pickList [data-dd="draft1"]');ok(await vis('#askDlg'),'FLOW-15 Discard asks');
    const ask=await st(()=>{const g=__app.store.real.games.find(x=>x.id==='draft1');return {title:document.getElementById('askT').textContent,want:PC.discardMsg(g),focus:document.activeElement.id};});
    ok(ask.title===ask.want&&/Drafty/.test(ask.title)&&ask.focus==='askCancel','FLOW-15 Discard names the game and Cancel is focused');
    await p.keyboard.press('Enter');await p.waitForTimeout(120);
    ok(await st(()=>!document.getElementById('askDlg').open&&!__app.store.real.games.find(x=>x.id==='draft1').deleted),'FLOW-15 Enter does not discard');
    await clk('#pickList [data-dd="draft1"]');await p.keyboard.press('Escape');await p.waitForTimeout(120);
    ok(await st(()=>!document.getElementById('askDlg').open&&!__app.store.real.games.find(x=>x.id==='draft1').deleted),'FLOW-15 Esc does not discard');
    await clk('#pickList [data-dd="draft1"]');await clk('#askOk');
    ok(await st(()=>{const g=__app.store.real.games.find(x=>x.id==='draft1');return g.deleted&&__app.store.real.games.length===3;}),'FLOW-15 confirmed Discard sets deleted and keeps the row');
    await st(()=>{window.__claims=0;const f=PC.claimScoring;PC.claimScoring=function(){window.__claims++;return f.apply(this,arguments);};});
    const scorer=await st(()=>__app.store.real.games.find(x=>x.id==='live1').scorer);
    await clk('#pickList [data-rg="live1"]');
    ok(await st(s=>window.__claims===0&&__app.store.real.games.find(x=>x.id==='live1').scorer===s,scorer),'FLOW-13 Resume does not call claimScoring');
    await clk('#gEnd');ok(await st(()=>document.getElementById('askDlg').open&&document.getElementById('askT').textContent===PC.END_MSG),'FLOW-14 portrait End opens the ask');
    const nEnd=await st(()=>__app.store.real.games.length);await clk('#askOk');
    ok(await st(n=>{const g=__app.store.real.games.find(x=>x.id==='live1');return g.status==='final'&&__app.store.real.games.length===n;},nEnd),'FLOW-14 confirmed End sets final and keeps the row');
    await clk('#pickList [data-rg="other1"]');
    ok(await vis('#roBar'),'FLOW-15 view-only resume uses the scoring bar');
    const pitches=await st(()=>__app.store.real.games.find(x=>x.id==='other1').pitches.length);
    await st(()=>{const b=document.querySelector('#types button');if(b)b.click();});
    ok(await st(n=>__app.store.real.games.find(x=>x.id==='other1').pitches.length===n,pitches),'FLOW-15 a type click adds no pitch on a view-only game');
    await st(()=>{localStorage.setItem('te_ui_theme','night');applyTheme();const S=__app.store.real;S.activeGame=null;const g=S.games.find(x=>x.id==='draft1');g.deleted=false;g.status='active';__app.render();});
    const night=await p.evaluate(()=>{function lin(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}function lum(rgb){const m=String(rgb).match(/[\d.]+/g).map(Number);return 0.2126*lin(m[0])+0.7152*lin(m[1])+0.0722*lin(m[2]);}function ratio(a,b){const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}function bg(el){let n=el;while(n){const c=getComputedStyle(n).backgroundColor,m=c.match(/[\d.]+/g);if(m&&(m.length<4||+m[3]>0.9))return c;n=n.parentElement;}return 'rgb(0, 0, 0)';}const el=document.querySelector('#pickList .gdismiss');const cs=getComputedStyle(el),surface=bg(el);return {color:cs.color,border:cs.borderTopColor,text:ratio(cs.color,surface),outline:ratio(cs.borderTopColor,surface)};});
    ok(night.text>=4.5&&night.outline>=3,`FLOW-15 night Discard contrast text ${night.text.toFixed(2)} outline ${night.outline.toFixed(2)}`);
    ok(night.color==='rgb(255, 163, 163)'&&night.border==='rgb(255, 163, 163)'&&night.color!=='rgb(180, 35, 35)',`FLOW-15 night Discard uses the danger text token (${night.color})`);
    await st(()=>{__app.store.real.games.forEach(g=>{if(PC.gameInProgress(g))g.deleted=true;});__app.store.real.activeGame=null;const day=PC.localDate(Date.now());__app.store.real.games.push({id:'g_today',date:day,opponent:'Today',homeAway:'home',status:'scheduled',time:'18:00',pitches:[]});__app.store.save();__app.render();});
    ok((await p.textContent('#pickEmpty'))==='No games in progress.'&&await vis('#pickNew'),'FLOW-13 empty state');
    await clk('#schedList [data-sg="g_today"]');ok(await st(()=>__app.store.real.activeGame==='g_today'),'VIEW-2 today Start is still one tap');
    await clk('#gPause');ok((await p.textContent('#gPause')).trim()==='Exit','FLOW-14 portrait Exit');
    await st(()=>{__app.store.real.activeGame='live1';const g=__app.store.real.games.find(x=>x.id==='live1');g.status='active';g.ended=null;g.deleted=false;__app.render();});
    const place=await p.evaluate(()=>{const pause=document.getElementById('gPause'),res=document.getElementById('resBtns');const far=[...document.querySelectorAll('[data-r]')].every(e=>{const a=pause.getBoundingClientRect(),b=e.getBoundingClientRect();if(b.width<1)return true;const dx=Math.max(0,Math.max(a.left,b.left)-Math.min(a.right,b.right)),dy=Math.max(0,Math.max(a.top,b.top)-Math.min(a.bottom,b.bottom));return Math.hypot(dx,dy)>=16;});return {inRes:res.contains(pause),far};});
    ok(place.inRes===false&&place.far,'FLOW-14 Exit stays on the game card, away from results');
  }
  if(H<=500&&W>H){
    await st(()=>{const S=__app.store.real;S.activeGame='live1';const g=S.games.find(x=>x.id==='live1');g.status='active';g.deleted=false;g.ended=null;g.scorer=S.sync.deviceId;__app.render();});
    await p.waitForTimeout(200);await clk('#cxMenu');await clk('#cmEnd');ok(await vis('#askDlg'),`${tag} FLOW-14 coach End opens the ask`);
    await p.keyboard.press('Escape');
    const menu=await p.evaluate(()=>{document.getElementById('cMenuDlg').showModal();const exit=document.getElementById('cmPause'),k=document.getElementById('cmKd3'),i=document.getElementById('cmIbb'),res=document.getElementById('cRes');
      const dist=(a,b)=>{const dx=Math.max(0,Math.max(a.left,b.left)-Math.min(a.right,b.right)),dy=Math.max(0,Math.max(a.top,b.top)-Math.min(a.bottom,b.bottom));return Math.hypot(dx,dy);};
      const er=exit.getBoundingClientRect();return {label:exit.textContent.trim(),inRes:res.contains(exit),kd:dist(er,k.getBoundingClientRect()),ib:dist(er,i.getBoundingClientRect())};});
    ok(menu.label==='Exit'&&!menu.inRes&&menu.kd>=16&&menu.ib>=16,`${tag} FLOW-14 coach Exit is out of the result grid (${Math.round(menu.kd)}/${Math.round(menu.ib)})`);
    await st(()=>document.getElementById('cMenuDlg').close('cancel'));
  }
  ok(!native.length,`${tag} no confirm()`);ok(!errs.length,`${tag} no page errors ${errs.join('|')}`);await c.close();}
console.log(fails?fails+' FAILED':'ALL PASS');await b.close();process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1);});
