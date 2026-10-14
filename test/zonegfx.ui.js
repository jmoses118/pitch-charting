// Gameday-style zone graphics: softball markers, plate, batter silhouette, recent list, drill-down. Throwaway profile, Supabase blocked.
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());const ev=f=>p.evaluate(f);
await p.goto(BASE);await ev(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';__app.store.save();__app.render();});
// bullpen: tap through two pitches with the real UI
await p.click('nav [data-t="bullpen"]');await p.click('#batTog');await p.click('#hN');
const tapZone=async z=>{const box=await p.$eval(`#zone [data-z="${z}"]`,e=>{e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height};});await p.mouse.click(box.x,box.y);await p.waitForTimeout(120);return box;};
for(const [t,aim,land] of [['FB',1,1],['CH',7,5]]){await p.click(`#types [data-c="${t}"]`);await tapZone(aim);await tapZone(land);}
ok(await ev(()=>__app.store.real.sessions.at(-1).pitches.length)===2,'taps still log bullpen pitches');
const marks=await ev(()=>[...document.querySelectorAll('#zone .ball')].map(g=>[g.querySelector('.num').textContent,g.getAttribute('class')]));
ok(marks.length===2&&marks[0][0]==='1'&&marks[1][0]==='2','numbered softball markers: '+JSON.stringify(marks));
ok(/mk-good/.test(marks[0][1])&&/mk-souvenir/.test(marks[1][1]),'ring by result: on target = good, middle-middle = souvenir');
ok(await ev(()=>!!document.querySelector('#zone .ball.mk-souvenir .souv')),'souvenir star badge');
ok(await ev(()=>getComputedStyle(document.querySelector('#zone .ball')).pointerEvents==='none'&&getComputedStyle(document.querySelector('#zone .orient')).pointerEvents==='none'),'graphics never take taps');
ok(await ev(()=>!!document.querySelector('#zone .plate')),'home plate drawn');ok(await ev(()=>!document.querySelector('#zone .batter')),'no batter -> no silhouette');
ok(/GLOVE/.test(await ev(()=>document.getElementById('zone').textContent)),'no batter -> glove/arm side labels');
const sz=await p.$eval('#zone [data-z="5"]',e=>{const r=e.getBoundingClientRect();return Math.min(r.width,r.height);});ok(sz>=48,'zone box tap target >= 48px ('+Math.round(sz)+')');
const rows=await ev(()=>[...document.querySelectorAll('#recent li')].map(li=>li.textContent));ok(rows.length===2&&/Souvenir/.test(rows[0])&&/Change-up/.test(rows[0])&&/aim 7 → @5/.test(rows[0])&&/On target/.test(rows[1]),'recent list newest first: '+JSON.stringify(rows));
await ev(()=>{S().settings.showBatterHand=true;__app.render();});
await p.click('#batTog');await p.click('#hR');ok(await ev(()=>{const g=document.querySelector('#zone .batter');return !!g&&!g.getAttribute('transform');}),'RHB silhouette on the pitcher\'s right');
await p.click('#batTog');await p.click('#hL');ok(await ev(()=>/scale\(-1 1\)/.test(document.querySelector('#zone .batter').getAttribute('transform')||'')),'LHB silhouette mirrored to the left');
// game: current at-bat only
await ev(()=>{const S=__app.store.real;S.activeSession=null;S.games.push({id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'away',status:'active',started:1,lineup:[{slot:1,name:'B1',num:'1',hand:'L'},{slot:2,name:'B2',num:'2',hand:'R'}],cur:{inning:1,outs:0,slot:1,b:1,s:0,abn:1},
  pitches:[{id:crypto.randomUUID(),pitcherId:'p_a',type:'FB',targets:[3],loc:3,result:'inplay',ip:'out',abn:0,end:'out'},{id:crypto.randomUUID(),pitcherId:'p_a',type:'DC',targets:[9],loc:14,result:'ball',abn:1,hand:'R'}]});S.activeGame='g1';__app.store.save();__app.render();});
await p.click('nav [data-t="game"]');await p.waitForTimeout(150);
ok(await ev(()=>document.querySelectorAll('#zone .ball').length)===1&&(await p.textContent('#recentTitle'))==='This at-bat','game shows the current at-bat only');
ok(/Ball/.test(await p.textContent('#recent'))&&/Drop curve/.test(await p.textContent('#recent')),'game list: result + pitch type');
ok(await ev(()=>!!document.querySelector('#zone .batter')),'game batter silhouette from the lineup');
// drill-down uses the same softballs
await ev(()=>{__app.store.real.activeGame=null;__app.store.save();__app.render();});await p.click('nav [data-t="stats"]');await p.waitForTimeout(250);
const cell=await p.$('#hMap [role="button"]');if(cell)await cell.click();await p.waitForTimeout(250);
ok(await ev(()=>document.getElementById('ddDlg').open&&document.querySelectorAll('#ddMap .ball').length>0&&!!document.querySelector('#ddMap .plate')&&!document.querySelector('#ddMap .batter')),'drill-down: softballs + plate, no batter');
ok(errs.length===0,'no page errors '+errs.join(' | '));console.log(fails?fails+' FAILED':'ALL PASS');await b.close();process.exit(fails?1:0);})();
