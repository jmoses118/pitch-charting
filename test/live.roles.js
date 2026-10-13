global.window={};require('../config.js');const CFG=global.window.PC_CONFIG;const PC=require('../logic.js');
const COACH='ZZTEST-YZV4K-2S5KW-YEGGZ-AN9QH',U=CFG.url+'/rest/v1/';
const H=c=>({apikey:CFG.key,Authorization:'Bearer '+CFG.key,'Content-Type':'application/json','x-team-code':c});
const rpc=async(c,n,a)=>{const r=await fetch(U+'rpc/'+n,{method:'POST',headers:H(c),body:JSON.stringify(a||{})});return{status:r.status,body:await r.text()};};
const post=(c,t,rows)=>fetch(U+t+'?on_conflict='+(t==='pitches'?'id':'team_id,id'),{method:'POST',headers:Object.assign(H(c),{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
const get=async(c,q)=>(await fetch(U+q,{headers:H(c)})).json();
(async()=>{const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};
  await post(COACH,'pitchers',[{team_id:'zztest',id:'p_za',name:'ZA',throws:'R'},{team_id:'zztest',id:'p_zb',name:'ZB',throws:'L'}]);
  const gid='g_zt';await post(COACH,'games',[{team_id:'zztest',id:gid,opponent:'T',status:'scheduled'}]);
  const pa=JSON.parse((await rpc(COACH,'coach_create_code',{p_role:'player',p_pitcher_id:'p_za',p_label:'ZA'})).body);
  const vw=JSON.parse((await rpc(COACH,'coach_create_code',{p_role:'viewer',p_label:'V'})).body);ok(/^TEP-/.test(pa)&&/^TEV-/.test(vw),'coach created player+viewer codes');
  ok((await rpc(pa,'coach_create_code',{p_role:'viewer'})).status>=400,'player cannot create codes');
  ok(JSON.parse((await rpc(pa,'whoami')).body).role==='player','whoami player');ok(JSON.parse((await rpc(vw,'whoami')).body).role==='viewer','whoami viewer');
  const coachPitchB={team_id:'zztest',id:PC.uuid(),mode:'bullpen',session_id:'s_zb',pitcher_id:'p_zb',type:'FB',loc:5};
  await post(COACH,'sessions',[{team_id:'zztest',id:'s_zb',pitcher_id:'p_zb'}]);let r=await post(COACH,'pitches',[coachPitchB]);ok(r.ok,'coach writes ZB pitch');
  // allowed: player writes own bullpen session + pitch
  const own={team_id:'zztest',id:PC.uuid(),mode:'bullpen',session_id:'s_za',pitcher_id:'p_za',type:'CH',loc:7,targets:[7]};
  r=await post(pa,'sessions',[{team_id:'zztest',id:'s_za',pitcher_id:'p_za'}]);ok(r.ok,'player: own session allowed ('+r.status+')');
  r=await post(pa,'pitches',[own]);ok(r.ok,'player: own bullpen pitch allowed ('+r.status+')');
  r=await post(pa,'pitches',[Object.assign({},own,{deleted:true})]);ok(r.ok,'player: soft-delete own pitch allowed');
  // forbidden
  r=await post(pa,'pitches',[{team_id:'zztest',id:PC.uuid(),mode:'bullpen',pitcher_id:'p_zb',type:'FB'}]);ok(!r.ok,'player: write other pitcher pitch DENIED ('+r.status+')');
  r=await post(pa,'pitches',[Object.assign({},coachPitchB,{pitcher_id:'p_za'})]);ok(!r.ok,"player: hijack other's pitch DENIED ("+r.status+')');
  r=await post(pa,'pitches',[{team_id:'zztest',id:PC.uuid(),mode:'game',game_id:gid,pitcher_id:'p_za',result:'ball'}]);ok(!r.ok,'player: game pitch DENIED ('+r.status+')');
  r=await post(pa,'games',[{team_id:'zztest',id:'g_hack',opponent:'x'}]);ok(!r.ok,'player: create game DENIED ('+r.status+')');
  r=await post(pa,'pitchers',[{team_id:'zztest',id:'p_new',name:'N',throws:'R'}]);ok(!r.ok,'player: add pitcher DENIED ('+r.status+')');
  r=await fetch(U+'pitches?id=eq.'+own.id,{method:'DELETE',headers:Object.assign(H(pa),{Prefer:'return=representation'})});ok(!r.ok||(await r.text())==='[]','player: hard delete DENIED ('+r.status+')');
  // game data: coach charts game g_zt (ZA + ZB pitched) and g_zt2 (only ZB)
  await post(COACH,'games',[{team_id:'zztest',id:'g_zt2',opponent:'T2',status:'final'}]);
  r=await post(COACH,'pitches',[{team_id:'zztest',id:PC.uuid(),mode:'game',game_id:gid,pitcher_id:'p_za',type:'FB',loc:3,result:'called'},{team_id:'zztest',id:PC.uuid(),mode:'game',game_id:gid,pitcher_id:'p_zb',type:'CH',loc:7,result:'ball'},{team_id:'zztest',id:PC.uuid(),mode:'game',game_id:'g_zt2',pitcher_id:'p_zb',type:'FB',loc:5,result:'inplay'}]);ok(r.ok,'coach writes game pitches');
  let gp=await get(pa,'pitches?select=pitcher_id,mode,game_id&mode=eq.game');ok(gp.length===1&&gp[0].pitcher_id==='p_za'&&gp[0].game_id===gid,'player reads own GAME pitches only ('+gp.length+')');
  let gg=await get(pa,'games?select=id');ok(gg.length===1&&gg[0].id===gid,'player reads only games she pitched in ('+gg.map(x=>x.id)+')');
  r=await post(pa,'games',[{team_id:'zztest',id:gid,opponent:'hacked'}]);ok(!r.ok,'player: update game DENIED ('+r.status+')');
  r=await fetch(U+'games?id=eq.'+gid,{method:'PATCH',headers:Object.assign(H(pa),{Prefer:'return=representation'}),body:JSON.stringify({opponent:'hacked'})});ok(!r.ok||(await r.text())==='[]','player: patch game DENIED ('+r.status+')');
  r=await fetch(U+'pitches?mode=eq.game&pitcher_id=eq.p_za',{method:'PATCH',headers:Object.assign(H(pa),{Prefer:'return=representation'}),body:JSON.stringify({loc:5})});ok(!r.ok||(await r.text())==='[]','player: edit own game pitch DENIED ('+r.status+')');
  // reads
  let leak=await get(vw,'pitches?select=*');ok(!JSON.stringify(leak).includes(COACH),'viewer never sees the coach code in data');
  let a=await get(pa,'pitches?select=pitcher_id');ok(a.length>0&&a.every(x=>x.pitcher_id==='p_za'),'player reads only own pitches ('+a.length+')');
  a=await get(pa,'pitchers?select=id');ok(a.length===1&&a[0].id==='p_za','player sees only own pitcher row');
  a=await get(pa,'sessions?select=id');ok(a.length===1&&a[0].id==='s_za','player sees only own session');
  a=await get(vw,'pitches?select=pitcher_id');ok(a.length>=2,'viewer reads whole team ('+a.length+')');a=await get(vw,'games?select=id');ok(a.length===2,'viewer reads all games');
  r=await post(vw,'pitches',[{team_id:'zztest',id:PC.uuid(),mode:'bullpen',pitcher_id:'p_za'}]);ok(!r.ok,'viewer write DENIED ('+r.status+')');
  ok((await rpc(COACH,'coach_revoke_code',{p_code:pa})).body==='true','coach revokes player code');
  ok((await rpc(pa,'whoami')).body==='null','revoked code no longer recognized');r=await post(pa,'pitches',[Object.assign({},own,{id:PC.uuid()})]);ok(!r.ok,'revoked code write DENIED ('+r.status+')');
  a=await get(pa,'pitches?select=id');ok(a.length===0,'revoked code reads nothing');
  console.log('VIEWER_CODE',vw);})();
