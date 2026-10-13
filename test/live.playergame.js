// Live: player code pulls games she pitched in + only her own game pitches; read-only. Uses throwaway team zztest.
global.window={};require('../config.js');const CFG=global.window.PC_CONFIG;const PC=require('../logic.js');const {chromium}=require('playwright-core');const BASE=process.argv[2];
const COACH='ZZTEST-YZV4K-2S5KW-YEGGZ-AN9QH',U=CFG.url+'/rest/v1/';const H=c=>({apikey:CFG.key,Authorization:'Bearer '+CFG.key,'Content-Type':'application/json','x-team-code':c});
const post=(t,rows)=>fetch(U+t+'?on_conflict='+(t==='pitches'?'id':'team_id,id'),{method:'POST',headers:Object.assign(H(COACH),{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
(async()=>{const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};
  await post('pitchers',[{team_id:'zztest',id:'p_za',name:'ZA',throws:'R'},{team_id:'zztest',id:'p_zb',name:'ZB',throws:'L'}]);
  await post('games',[{team_id:'zztest',id:'g_pg1',date:'2026-10-17',opponent:'Outlaws',status:'final'},{team_id:'zztest',id:'g_pg2',date:'2026-10-18',opponent:'Finesse',status:'final'}]);
  const P=[];for(let i=0;i<6;i++)P.push({team_id:'zztest',id:PC.uuid(),mode:'game',game_id:'g_pg1',pitcher_id:i<4?'p_za':'p_zb',type:'FB',loc:[3,5,9,14,2,6][i],targets:[3],result:'called',ts:Date.now()+i});
  P.push({team_id:'zztest',id:PC.uuid(),mode:'game',game_id:'g_pg2',pitcher_id:'p_zb',type:'CH',loc:7,targets:[7],result:'ball',ts:Date.now()+9});{const rr=await post('pitches',P);ok(rr.ok,'coach seeded 2 games '+(rr.ok?'':await rr.text()));}
  const code=JSON.parse(await (await fetch(U+'rpc/coach_create_code',{method:'POST',headers:H(COACH),body:JSON.stringify({p_role:'player',p_pitcher_id:'p_za',p_label:'ZA'})})).text());
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
  await p.goto(BASE);await p.click('nav [data-t="setup"]');await p.fill('#teamCode',code);await p.click('#teamSave');await p.waitForTimeout(6000);
  const st=await p.evaluate(()=>{const s=__app.store.state;return{role:s.sync.role,games:s.games.map(g=>[g.id,g.pitches.map(x=>x.pitcherId)])};});
  ok(st.role==='player','app role = player');ok(st.games.length===1&&st.games[0][0]==='g_pg1','pulled only the game she pitched in ('+JSON.stringify(st.games)+')');
  ok(st.games[0]&&st.games[0][1].length===4&&st.games[0][1].every(x=>x==='p_za'),'only her own game pitches on the phone');
  await p.click('nav [data-t="stats"]');const opts=await p.$$eval('#sScope option',o=>o.map(x=>x.value));ok(opts.includes('g_pg1')&&!opts.includes('g_pg2'),'Stats lists her game');
  await p.selectOption('#sScope','g_pg1');const n=await p.$eval('#sGrid .stat b',e=>e.textContent);ok(n==='4','per-game summary shows her 4 pitches');
  const q=await p.evaluate(()=>{const s=__app.store.state.sync.queue;return Object.keys(s.games).length+Object.keys(s.pitches).length;});await p.waitForTimeout(500);ok(q===0,'nothing queued to push from game data');
  ok(errs.length===0,'no page errors '+errs);await b.close();
  await fetch(U+'rpc/coach_revoke_code',{method:'POST',headers:H(COACH),body:JSON.stringify({p_code:code})});})();
