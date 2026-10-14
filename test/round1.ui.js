// Round 1 features end to end in a throwaway browser profile with Supabase blocked (test data only). Saves demo shots.
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';const OUT='/workspace/pitch-charting-app/test/demo-round1/';const fs=require('fs');
fs.mkdirSync(OUT,{recursive:true});fs.readdirSync(OUT).forEach(f=>fs.unlinkSync(OUT+f));let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,colorScheme:'dark',isMobile:true,hasTouch:true});
let net=0;await c.route(/supabase\.co/,r=>{net++;r.abort();});await c.addInitScript(()=>{window.__vib=[];navigator.vibrate=p=>{window.__vib.push(p);return true;};});
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());let N=0;
const cap=async t=>p.evaluate(t=>{let d=document.getElementById('demoCap');if(!d){d=document.createElement('div');d.id='demoCap';d.style.cssText='position:fixed;left:10px;right:10px;bottom:84px;z-index:2147483647;background:#1E3FD0;color:#fff;font:700 15px -apple-system,system-ui,sans-serif;padding:9px 12px;border-radius:12px;box-shadow:0 4px 16px #000a;text-align:center';}
  const ds=document.querySelectorAll('dialog[open]');(ds[ds.length-1]||document.body).appendChild(d);d.textContent=t;},t);
const clean=()=>p.evaluate(()=>{const y=__app.store.real.sync;Object.keys(y.queue).forEach(k=>y.queue[k]={});y.tomb={};y.last=Date.now();y.lastError=null;__app.store.save();__app.render();});
const shot=async(name,t)=>{await clean();await p.evaluate(()=>{const i=document.getElementById('teamCode');if(i)i.value='';document.querySelectorAll('#codesList small').forEach(s=>s.textContent='••••');});await cap(t);await p.waitForTimeout(250);await p.screenshot({path:OUT+String(++N).padStart(2,'0')+'-'+name+'.png'});await p.evaluate(()=>{const d=document.getElementById('demoCap');if(d)d.remove();});};
const tap=async s=>{await p.$eval(s,e=>e.scrollIntoView({block:'center'}));await p.click(s,{force:true});await p.waitForTimeout(120);};
const asRole=(r,ids)=>p.evaluate(([r,ids])=>{const y=__app.store.real.sync;y.teamCode='TE-XXXXX-XXXXX-XXXXX-XXXXX';y.teamId='t';y.role=r;y.pitcherIds=r==='pcoach'?ids:[];y.pitcherId=r==='player'?ids[0]:null;y.pitcherName=r==='player'?'Reese':null;__app.store.save();__app.render();},[r,ids]);
await p.goto(BASE);
// seed: Avery + Reese season (games + bullpens), Jules game
await p.evaluate(()=>{const S=__app.store.real,PC=window.PC;let k=7;const rnd=()=>((k=k*16807%2147483647)/2147483647);const T=['FB','FB','CH','DC','CB'];const today=new Date();const day=n=>{const d=new Date(today);d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);};
  const mkGame=(id,dAgo,opp,pid,n,skill)=>{const g={id,date:day(dAgo),opponent:opp,homeAway:'away',status:'final',ended:1,lineup:Array.from({length:9},(_,i)=>({slot:i+1,name:'B'+(i+1),num:String(i+1),hand:i%3?'R':'L'})),pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0}};const cur=g.cur;
    for(let i=0;i<n;i++){const type=T[Math.floor(rnd()*T.length)];const t=[1,3,7,9,4,6][Math.floor(rnd()*6)];const r0=rnd();const res=cur.s===2&&r0<.25?'swinging':r0<skill*.55?'called':r0<skill*.75?'foul':r0<skill*.85?'inplay':'ball';
      const loc=res==='ball'?[11,12,13,14,16,17,18,15,22][Math.floor(rnd()*9)]:(rnd()<skill?t:[2,4,5,6,8][Math.floor(rnd()*5)]);const ip=res==='inplay'?(rnd()<.65?'out':'1B'):null;
      const r={id:crypto.randomUUID(),ts:Date.parse(g.date)+i*60000,pitcherId:pid,hand:g.lineup[cur.slot].hand,type,targets:[t],loc,inning:cur.inning,outsBefore:cur.outs,slot:cur.slot,batter:g.lineup[cur.slot].name,b:cur.b,s:cur.s,abn:cur.abn,result:res,ip,bb:ip?['GB','LD','FB','PU'][Math.floor(rnd()*4)]:undefined,firstPitch:cur.b===0&&cur.s===0};
      const o=PC.applyPitch(cur,res,ip);r.end=o.end;g.pitches.push(r);cur.b=o.b;cur.s=o.s;if(o.end){cur.outs+=o.outs;cur.b=0;cur.s=0;cur.abn++;cur.slot=(cur.slot+1)%9;if(cur.outs>=3){cur.outs=0;cur.inning++;}}}S.games.push(g);};
  const mkPen=(id,dAgo,pid,n,skill)=>{const s={id,date:day(dAgo),pitcherId:pid,started:1,pitches:[]};for(let i=0;i<n;i++){const type=T[Math.floor(rnd()*T.length)];const t=[1,3,7,9,8][Math.floor(rnd()*5)];const off=rnd();const loc=off<skill?t:off<skill+.15?[2,4,6,8,13,18,14][Math.floor(rnd()*7)]:off<.95?5:21;s.pitches.push({id:crypto.randomUUID(),ts:Date.parse(s.date)+i*30000,pitcherId:pid,type,targets:[t],loc,hand:'N',b:0,s:0});}S.sessions.push(s);};
  [[40,.5],[33,.55],[26,.6],[19,.62],[12,.68],[5,.72]].forEach(([d,sk],i)=>{mkGame('g_w'+i,d,['Storm','Lightning','Outlaws','Pride','Finesse','Bombers'][i],'p_woods',55+Math.floor(rnd()*30),sk);mkPen('s_w'+i,d-2,'p_woods',30,sk);});
  mkGame('g_last',1,'Thunder Bolts','p_woods',62,.7);
  [[38,.45],[30,.5],[22,.58],[14,.6],[7,.66],[3,.7]].forEach(([d,sk],i)=>mkPen('s_r'+i,d,'p_larbus',28,sk));mkGame('g_r',9,'Ice','p_larbus',41,.6);mkGame('g_c',9,'Ice','p_crich',30,.6);
  S.curPitcher='p_woods';__app.store.save();__app.render();});
// ---------- 4) rest-day reminder + alert settings ----------
await asRole('coach');await p.click('nav [data-t="bullpen"]');await p.waitForTimeout(200);
ok(!(await p.isVisible('#restMsg')),'rest guide hidden by default');ok(/^Today: \d+ game \+ \d+ bullpen · (Last weekend|Weekend): \d+ game \+ \d+ bullpen$/.test(await p.textContent('#wlMsg')),'workload line on pitcher select');
await p.evaluate(()=>{__app.store.state.settings.showRest=true;__app.render();});await p.waitForTimeout(100);
const rm=await p.textContent('#restMsg');ok(/62 pitches/.test(rm)&&/3 days rest/.test(rm)&&/Rest until/.test(rm),'rest reminder for Avery: '+rm);
await p.evaluate(()=>scrollTo(0,0));await shot('rest-reminder','Pick a pitcher: last outing + rest days (youth guide, editable)');
await p.selectOption('#pitcher','p_larbus');await p.waitForTimeout(150);ok(/Ready to pitch/.test(await p.textContent('#restMsg')),'Reese ready to pitch');await p.selectOption('#pitcher','p_woods');
await p.click('nav [data-t="setup"]');await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));await p.waitForTimeout(150);ok(await p.isVisible('#alertCard'),'coach sees alert settings');await p.fill('#alTh','70, 85');await p.dispatchEvent('#alTh','change');
ok(await p.evaluate(()=>JSON.stringify(__app.store.state.settings.alerts))==='[70,85]','alert thresholds editable');await p.fill('#alTh','75, 90');await p.dispatchEvent('#alTh','change');
await p.$eval('#alertCard',e=>e.scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-130));await shot('alert-settings','Setup: pitch-count alerts (75 / 90) and the rest-day table');
// ---------- 2) one-hand game + 4) pitch count alert ----------
await p.evaluate(()=>{const S=__app.store.real;const PC=window.PC;const g={id:'g_now',date:new Date().toISOString().slice(0,10),opponent:'Demo Hawks',homeAway:'home',status:'active',started:Date.now(),lineup:Array.from({length:9},(_,i)=>({slot:i+1,name:'Hawk '+(i+1),num:String(10+i),hand:'R'})),pitches:[],cur:{inning:5,outs:1,slot:3,b:0,s:0,abn:20}};
  for(let i=0;i<73;i++)g.pitches.push({id:crypto.randomUUID(),ts:Date.now()-(80-i)*60000,pitcherId:'p_woods',type:'FB',loc:3,targets:[3],result:'foul',b:0,s:0,abn:i%20,inning:1,slot:0});S.games.push(g);S.activeGame='g_now';S.curPitcher='p_woods';S.oneHand=true;__app.store.save();__app.render();});
await p.click('nav [data-t="game"]');await p.waitForTimeout(250);ok(await p.evaluate(()=>document.body.classList.contains('onehand')),'one-hand mode on by default');
await p.click('#resTog');await p.waitForTimeout(250);const rb=await p.$eval('#resBtns [data-r="ball"]',e=>e.getBoundingClientRect().height);ok(rb>=60,'big result buttons ('+Math.round(rb)+'px)');await p.click('#resClose');
await p.evaluate(()=>scrollTo(0,0));await tap('#types [data-c="FB"]');await p.waitForTimeout(450);
const zt=await p.$eval('#zone',e=>Math.round(e.getBoundingClientRect().top));ok(zt<300,'auto-advance: grid scrolled up after the pitch type ('+zt+')');
await p.click('#zone [data-z="3"]',{force:true});await p.waitForTimeout(450);const rbt=await p.$eval('#resBtns',e=>{const r=e.getBoundingClientRect();return r.bottom<=innerHeight+2&&r.top>0;});ok(rbt,'auto-advance: result buttons in the thumb zone after the location');
await shot('one-hand-result','One-hand mode: big result buttons at your thumb');
await p.click('#resBtns [data-r="called"]',{force:true});await p.waitForTimeout(120);ok(await p.evaluate(()=>document.getElementById('flash').classList.contains('on')),'visual confirm flash');ok(await p.evaluate(()=>window.__vib.length>=1),'vibrate called on save');
await p.screenshot({path:OUT+String(++N).padStart(2,'0')+'-saved-confirm.png'});
await p.waitForTimeout(500);await tap('#types [data-c="CH"]');await p.waitForTimeout(500);await p.click('#zone [data-z="8"]',{force:true});await p.waitForTimeout(500);await p.click('#resBtns [data-r="inplay"]',{force:true});await p.waitForTimeout(300);
await p.click('#ipBtns [data-bb="GB"]',{force:true});await shot('in-play-subtypes','In play: tap GB / LD / FB / PU, then the result');await p.click('#ipBtns [data-ip="out"]',{force:true});await p.waitForTimeout(150);
const lastP=await p.evaluate(()=>{const g=__app.store.real.games.find(x=>x.id==='g_now');return g.pitches.at(-1);});ok(lastP.bb==='GB'&&lastP.ip==='out'&&lastP.result==='inplay','in-play subtype GB saved with the out');
const v0=await p.evaluate(()=>window.__vib.length);await p.waitForTimeout(500);await tap('#types [data-c="FB"]');await p.waitForTimeout(500);await p.click('#zone [data-z="1"]',{force:true});await p.waitForTimeout(500);await p.click('#resBtns [data-r="ball"]',{force:true});await p.waitForTimeout(300);
const al=await p.textContent('#pcAlert');ok(/76 pitches/.test(al)&&/75 alert/.test(al),'banner past 75: '+al);ok(await p.evaluate(()=>window.__vib.filter(x=>Array.isArray(x)).length===1),'alert vibration pattern once at 75');
const cur=await p.evaluate(()=>__app.store.real.games.find(x=>x.id==='g_now').cur);ok(cur.b===1&&cur.s===0&&cur.slot===4&&cur.outs===2,'GameChanger count right (in-play out -> 2 outs, next batter 1-0): '+JSON.stringify(cur));
await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(800);await shot('pitch-count-alert','Pitch-count alert: banner + buzz at 75 and 90');
// ---------- 3) count charts ----------
await p.click('nav [data-t="stats"]');await p.waitForTimeout(200);await p.selectOption('#sScope','games');await p.selectOption('#sPitcher','p_woods');await p.waitForTimeout(250);
ok(await p.isVisible('#sCountCard'),'count chart visible');const ct=await p.textContent('#sCountCard');ok(/0-0/.test(ct)&&/3-2|2-2/.test(ct)&&/1st-pitch strike/.test(ct)&&/After 0-2/.test(ct),'count table + FPS + 0-2 outcomes');
await p.$eval('#sCountCard',e=>e.scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-120));await shot('count-charts','By count: pitch mix, strike % and on target from 0-0 to 3-2');
// ---------- 5) trends (coach) ----------
await p.selectOption('#sScope','all');await p.waitForTimeout(200);const pts=await p.$$eval('#tChart circle',e=>e.length);ok(pts>=20,'trend chart has points ('+pts+')');
await p.selectOption('#tMode','game');await p.waitForTimeout(200);const ptsG=await p.$$eval('#tChart circle',e=>e.length);ok(ptsG<pts&&ptsG>0,'game-only filter ('+ptsG+')');
await p.click('#tMetrics [data-tm="n"]');await p.waitForTimeout(150);await p.$eval('#sTrendCard',e=>e.scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-120));await shot('trends-coach','Season trends: competitive, on target, strike % and pitch count per game');
await p.click('#tMetrics [data-tm="n"]');await p.selectOption('#tMode','all');
// ---------- 1) pitching coach ----------
await asRole('pcoach',['p_woods','p_larbus']);await p.waitForTimeout(150);
const tabs=await p.$$eval('nav button:not(.hide)',e=>e.map(x=>x.dataset.t));ok(JSON.stringify(tabs)==='["bullpen","stats","setup"]','pcoach tabs '+JSON.stringify(tabs));
const popts=await p.$$eval('#pitcher option',e=>e.map(x=>x.value));ok(JSON.stringify(popts.sort())==='["p_larbus","p_woods"]','pcoach pitcher list = her 2 pitchers');
await p.click('nav [data-t="stats"]');await p.waitForTimeout(150);const sp=await p.$$eval('#sPitcher option',e=>e.map(x=>x.value));ok(!sp.includes('p_crich')&&sp.includes('p_woods'),'Stats: no other pitchers');
const scopes=await p.$$eval('#sScope option',e=>e.map(x=>x.value));ok(!scopes.includes('g_c')&&scopes.includes('g_r'),'Stats: no games of other pitchers');
await p.selectOption('#sScope','g_last');await p.selectOption('#sPitcher','p_woods');await p.waitForTimeout(200);ok(await p.isVisible('#sNote textarea'),'game note box for pitching coach');
await p.fill('#sNote textarea','Good tempo today. Finish the change-up down.');await p.dispatchEvent('#sNote textarea','change');
await p.$eval('#sNote',e=>e.scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-160));await shot('pcoach-game-note','Pitching coach: notes for each pitcher, per game');
await p.click('nav [data-t="setup"]');await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));await p.waitForTimeout(150);ok(!(await p.isVisible('#codesCard'))&&!(await p.isVisible('#csCard'))&&!(await p.isVisible('#pCard'))&&!(await p.isVisible('#alertCard')),'pcoach: no codes / call sheets / pitchers / settings');
ok(/Pitching-coach code/.test(await p.textContent('#roleMsg')),'pcoach role message');ok(await p.isHidden('#addPQuick'),'pcoach cannot add pitchers');
// score a bullpen for Reese
await p.click('nav [data-t="bullpen"]');await p.selectOption('#pitcher','p_larbus');await p.waitForTimeout(150);await p.click('#bpNew');
for(const [t,a,l] of [['FB',3,3],['FB',9,6],['CH',8,18],['CB',7,7],['FB',1,21]]){await tap(`#types [data-c="${t}"]`);await tap(`#zone [data-z="${a}"]`);await tap(l>20?`#wayBtns [data-z="${l}"]`:`#zone [data-z="${l}"]`);}
const ss=await p.evaluate(()=>{const s=__app.store.real.sessions.at(-1);return{pid:s.pitcherId,n:s.pitches.length,q:Object.keys(__app.store.real.sync.queue.pitches).length};});ok(ss.pid==='p_larbus'&&ss.n===5,'pcoach scored a 5-pitch pen for Reese');
await p.click('#bpEnd');await p.waitForTimeout(300);ok(await p.isVisible('#rDlg textarea.noteTa'),'note box on the report');await p.fill('#rDlg textarea.noteTa','Nice pen, Reese! Your change-up was right at the knees. Next time: stay tall on the fastball.');await p.dispatchEvent('#rDlg textarea.noteTa','change');
const q=await p.evaluate(()=>{const y=__app.store.real.sync;return{notes:Object.keys(y.queue.notes||{}).length,rows:window.PC.buildRows(__app.store.real)};});ok(q.notes>=1&&q.rows.rows.notes.length>=1&&q.rows.rows.sessions.every(r=>['p_woods','p_larbus'].includes(r.pitcher_id)),'notes + session queued and allowed for pcoach');
await p.$eval('#rDlg textarea.noteTa',e=>e.scrollIntoView({block:'center'}));await shot('pcoach-bullpen-note','Pitching coach scores Reese\'s pen and adds a note for her report');
const sid=await p.evaluate(()=>__app.store.real.sessions.at(-1).id);await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
// ---------- player sees the note + her own trends ----------
await asRole('player',['p_larbus']);await p.click('nav [data-t="stats"]');await p.waitForTimeout(150);await p.selectOption('#sScope',sid);await p.waitForTimeout(150);await p.click('#sReport');await p.waitForTimeout(300);
const rt=await p.textContent('#rDlg');ok(/Note from your coach/.test(rt)&&/right at the knees/.test(rt),'player sees the coach note on her report');ok(!(await p.isVisible('#rDlg textarea.noteTa')),'player cannot edit the note');
await p.$eval('#rDlg .card',e=>e.scrollIntoView({block:'center'}));await shot('player-sees-note','Reese sees her coach\'s note on her bullpen report');await p.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
await p.selectOption('#sScope','all');await p.waitForTimeout(200);const tl=await p.textContent('#tMetrics');ok(/In the zone or close/.test(tl)&&/On target/.test(tl),'kid-friendly trend labels');ok(/Reese/.test(await p.textContent('#tNote')),'player trend for herself');
await p.$eval('#sTrendCard',e=>e.scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-120));await shot('trends-player','Reese\'s own trends: getting sharper every week');
// ---------- coach: create pitching-coach code UI ----------
await asRole('coach');await p.click('nav [data-t="setup"]');await p.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));await p.waitForTimeout(400);ok(await p.isVisible('#ncPcoach'),'coach sees New pitching-coach code');const boxes=await p.$$eval('#ncPcList input',e=>e.length);ok(boxes>=3,'pick pitchers ('+boxes+')');
await p.check('#ncPcList input[value="p_woods"]');await p.check('#ncPcList input[value="p_larbus"]');await p.fill('#ncPcName','Coach Dana');await p.$eval('#codesCard',e=>e.scrollIntoView({block:'start'}));await p.evaluate(()=>scrollBy(0,-120));
await shot('coach-create-pcoach-code','Setup → Access codes: pick pitchers, create a pitching-coach code');
ok(errs.length===0,'no page errors '+errs.join('|'));console.log('supabase requests (all blocked):',net);console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1)});
