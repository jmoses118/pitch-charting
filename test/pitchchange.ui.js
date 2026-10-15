// Mid-game pitching change, in test mode with Supabase blocked: nothing reaches real data.
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
let net=0;await c.route(/supabase\.co/,r=>{net++;r.abort();});const p=await c.newPage();await p.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const tap=async s=>{await p.$eval(s,e=>e.scrollIntoView({block:'center'}));await p.click(s,{force:true});await p.waitForTimeout(80);};
const pitch=async(t,z,r)=>{await p.evaluate(()=>{if(typeof clearFoulChips==='function')clearFoulChips();});await tap(`#types [data-c="${t}"]`);await tap(`#zone [data-z="${z}"]`);await tap(`#zone [data-z="${z}"]`);await tap(`#resBtns [data-r="${r}"]`);};
const st=()=>p.evaluate(()=>{const g=__app.store.state.games.find(x=>x.id==='g_t');return{cur:Object.assign({},g.cur),cp:__app.store.state.curPitcher,hdr:document.querySelector('header,#hdr')?.innerText||document.body.innerText.slice(0,200)};});
await p.goto(BASE);
await p.evaluate(()=>{const y=__app.store.real.sync;y.teamCode='TE-XXXXX-XXXXX-XXXXX-XXXXX';y.role='coach';y.teamId='t';__app.store.save();window.__q0=__app.store.pendingCount();window.__realBefore=JSON.stringify(__app.store.real.games.length)+JSON.stringify(__app.store.real.pitchers.length);__app.render();});
await p.click('nav [data-t="setup"]');await p.click('#testBtn');ok(await p.isVisible('#testbar'),'test mode on');const net0=net;
await p.evaluate(()=>{const S=__app.store.state;S.games.push({id:'g_t',date:'2026-10-13',opponent:'Test Opp',homeAway:'away',status:'active',started:Date.now(),lineup:Array.from({length:9},(_,i)=>({slot:i+1,name:'B'+(i+1),num:String(i+1),hand:'R'})),pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0}});S.activeGame='g_t';S.curPitcher='p_woods';__app.render();});
await p.click('nav [data-t="game"]');await p.waitForTimeout(200);
// Avery: K, then 1-1 on batter 2
await pitch('FB',3,'called');await pitch('FB',9,'swinging');await pitch('CH',7,'swinging');await pitch('FB',16,'ball');await pitch('FB',1,'called');
let a=await st();ok(a.cur.slot===1&&a.cur.b===1&&a.cur.s===1&&a.cur.outs===1,'Avery: K then 1-1 to batter 2');
// switch mid at-bat
await p.selectOption('#pitcher','p_crich');await p.waitForTimeout(150);let bb=await st();ok(bb.cp==='p_crich','switched to Jules');ok(JSON.stringify(bb.cur)===JSON.stringify(a.cur),'mid at-bat switch leaves inning/count/outs/batter unchanged');
const pcShown=async()=>p.evaluate(()=>{const e=[...document.querySelectorAll('*')].find(x=>x.children.length===0&&/^PITCHES$/i.test(x.textContent.trim()));return e?e.parentElement.innerText.replace(/\D+/g,' ').trim():null;});
ok(/\b0\b/.test(await pcShown()||''),'Jules shows 0 pitches (header: '+await pcShown()+')');
await pitch('FB',3,'swinging');await pitch('DC',8,'swinging');// K by Jules, 2 outs
await pitch('FB',18,'ball');await pitch('FB',13,'ball');await pitch('FB',14,'ball');await pitch('FB',11,'ball');// walk
a=await st();ok(a.cur.outs===2&&a.cur.slot===3&&a.cur.b===0,'Jules: K + walk, 2 outs, batter 4 up');
// switch between at-bats back to Avery
await p.selectOption('#pitcher','p_woods');await p.waitForTimeout(150);bb=await st();ok(JSON.stringify(bb.cur)===JSON.stringify(a.cur),'between at-bats switch leaves state unchanged');ok(/\b5\b/.test(await pcShown()||''),'back to Avery resumes at 5 (header: '+await pcShown()+')');
await pitch('FB',2,'called');ok(/\b6\b/.test(await pcShown()||''),'Avery next pitch is #6');
// +P mid-game (0-1 count)
a=await st();await p.click('#addPQuick');await p.fill('#pdName','Newbie');await p.fill('#pdNum','99');await p.selectOption('#pdThrows','R');await p.click('#pdOk');await p.waitForTimeout(200);
bb=await st();const nid=bb.cp;ok(nid&&!['p_woods','p_crich'].includes(nid),'+P mid-game selects the new pitcher');ok(JSON.stringify(bb.cur)===JSON.stringify(a.cur),'+P leaves game state unchanged');ok(/\b0\b/.test(await pcShown()||''),'new pitcher starts at 0');
await pitch('FB',5,'foul');
const R=await p.evaluate(nid=>{const PC=window.PC,g=__app.store.state.games.find(x=>x.id==='g_t');const by=id=>g.pitches.filter(x=>x.pitcherId===id);const s=id=>PC.summarize(by(id));
  const rows=g.pitches.map(x=>PC.pitchRow?PC.pitchRow(x,{mode:'game',game_id:g.id}):{id:x.id,pitcher_id:x.pitcherId});
  return{n:g.pitches.length,W:{pc:PC.pitchCount(g.pitches,'p_woods'),...s('p_woods')},C:{pc:PC.pitchCount(g.pitches,'p_crich'),...s('p_crich')},N:{pc:PC.pitchCount(g.pitches,nid),...s(nid)},
   rowsOk:rows.every((r,i)=>r.pitcher_id===g.pitches[i].pitcherId),order:g.pitches.map(x=>x.pitcherId==='p_woods'?'W':x.pitcherId==='p_crich'?'C':'N').join(''),
   heatW:PC.heatData(g.pitches.map(p=>({p,gameId:g.id})),{pitcher:'p_woods',game:g.id},'actual').total,heatC:PC.heatData(g.pitches.map(p=>({p,gameId:g.id})),{pitcher:'p_crich',game:g.id},'actual').total,cur:g.cur};},nid);
console.log(JSON.stringify(R));
ok(R.order==='WWWWWCCCCCCWN','attribution order '+R.order);ok(R.W.pc===6&&R.W.k===1&&R.W.strikes===5,'Avery line: 6 pitches, 5 strikes, 1 K');
ok(R.C.pc===6&&R.C.k===1&&R.C.strikes===2,'Jules line: 6 pitches, 2 strikes, 1 K');ok(R.N.pc===1&&R.N.k===0,'new pitcher: 1 pitch');ok(R.rowsOk,'sync rows carry each pitch\'s own pitcher_id');
ok(R.heatW===6&&R.heatC===6,'heat map: Avery 6, Jules 6 (each only her own)');ok(R.cur.inning===1&&R.cur.outs===2&&R.cur.s===2,'final game state 1st inn, 2 outs, 0-2');
// Official K rule: Newbie leaves at 0-2 (she threw strike 2), Jules finishes the K -> K credited to Newbie, pitch to Jules
await p.selectOption('#pitcher','p_crich');await p.waitForTimeout(150);await pitch('FB',5,'swinging');
const K=await p.evaluate(nid=>{const PC=window.PC,g=__app.store.state.games.find(x=>x.id==='g_t');const s=id=>PC.summarize(g.pitches.filter(x=>x.pitcherId===id),{all:g.pitches,pid:id});
  return{Wk:s('p_woods').k,Ck:s('p_crich').k,Cn:s('p_crich').n,Nk:s(nid).k,Nn:s(nid).n,last:g.pitches[g.pitches.length-1].pitcherId,cur:g.cur};},nid);console.log(JSON.stringify(K));
ok(K.last==='p_crich'&&K.Cn===7&&K.Nn===1,'strike-3 pitch counts for Jules (7 pitches), Newbie stays at 1');ok(K.Nk===1&&K.Ck===1&&K.Wk===1,'K credited to Newbie (left with 2 strikes); Jules still 1 K, Avery 1 K');
ok(K.cur.outs===0&&K.cur.inning===2,'K ends the inning normally');
// Stats UI per pitcher per game
await p.click('nav [data-t="stats"]');await p.waitForTimeout(200);const scope=await p.$$eval('#sScope option',o=>o.map(x=>x.value));const gv=scope.find(v=>/g_t/.test(v));
if(gv)await p.selectOption('#sScope',gv);for(const [id,n] of [['p_woods',6],['p_crich',7]]){if(await p.$(`#sPitcher option[value="${id}"]`)){await p.selectOption('#sPitcher',id);await p.waitForTimeout(200);}
  const t=await p.textContent('#sGrid');ok(new RegExp('^\\s*'+n+'\\s*Pitches').test(t),`Stats tab ${id} in this game shows ${n} (${t.replace(/\s+/g,' ').slice(0,80)})`);}
const netT=net;
if(await p.$('#sPitcher option[value=""]')){await p.selectOption('#sPitcher','');await p.waitForTimeout(200);}
const so=await p.$$eval('#sPit tr',rs=>rs.slice(1).map(r=>[...r.cells].map(c=>c.textContent.trim())));console.log('SO table',JSON.stringify(so));
const soOf=nm=>{const r=so.find(x=>x[0].includes(nm));return r?r[r.length-1]:null;};ok(soOf('Avery')==='1'&&soOf('Jules')==='1'&&soOf('Newbie')==='1','SO column: Avery 1, Jules 1, Newbie 1');
// exit test mode: nothing kept
await p.click('nav [data-t="setup"]');await p.click('#testBtn');await p.click('#askOk');await p.waitForTimeout(200);
const after=await p.evaluate(()=>({g:__app.store.real.games.some(x=>x.id==='g_t'),np:__app.store.real.pitchers.some(x=>x.name==='Newbie'),q:__app.store.pendingCount()-window.__q0,same:window.__realBefore===JSON.stringify(__app.store.real.games.length)+JSON.stringify(__app.store.real.pitchers.length)}));
console.log(JSON.stringify(after));ok(!after.g&&!after.np&&after.q===0&&after.same,'after exit: no test game, no test pitcher, nothing queued');ok(netT===net0,'no Supabase requests during test mode ('+(netT-net0)+')');
ok(errs.length===0,'no page errors '+errs.join('|'));console.log(fails?`${fails} FAILED`:'ALL PASS');await b.close();process.exit(fails?1:0);})().catch(e=>{console.error(e);process.exit(1)});
