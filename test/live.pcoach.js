const __E=(()=>{const fs=require('fs'),p=require('path').join(__dirname,'..','.test-env');const o={};try{fs.readFileSync(p,'utf8').split('\n').forEach(l=>{const m=l.match(/^(\w+)=(.*)$/);if(m)o[m[1]]=m[2].trim();});}catch(e){}return o;})();const TEST_COACH=process.env.PC_TEST_COACH||__E.PC_TEST_COACH;if(!TEST_COACH){console.error('Set PC_TEST_COACH (throwaway zztest coach code) or create .test-env');process.exit(2);}
global.window={};require('../config.js');const CFG=global.window.PC_CONFIG;const PC=require('../logic.js');
const COACH=TEST_COACH,U=CFG.url+'/rest/v1/';
const H=c=>({apikey:CFG.key,Authorization:'Bearer '+CFG.key,'Content-Type':'application/json','x-team-code':c});
const rpc=async(c,n,a)=>{const r=await fetch(U+'rpc/'+n,{method:'POST',headers:H(c),body:JSON.stringify(a||{})});return{status:r.status,body:await r.text()};};
const post=(c,t,rows)=>fetch(U+t+'?on_conflict='+(t==='pitches'?'id':'team_id,id'),{method:'POST',headers:Object.assign(H(c),{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
const get=async(c,q)=>(await fetch(U+q,{headers:H(c)})).json();

const ins=(c,t,rows)=>fetch(U+t,{method:'POST',headers:Object.assign(H(c),{Prefer:'return=minimal'}),body:JSON.stringify(rows)});
const patch=(c,q,obj)=>fetch(U+q,{method:'PATCH',headers:Object.assign(H(c),{Prefer:'return=representation'}),body:JSON.stringify(obj)}).then(async r=>({status:r.status,rows:r.ok?await r.json():[]}));
(async()=>{const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)process.exitCode=1;};const T='zztest',X=Date.now().toString(36);
  const pa='p_pa'+X,pb='p_pb'+X,pc='p_pc'+X;
  let r=await post(COACH,'pitchers',[{team_id:T,id:pa,name:'PA',throws:'R'},{team_id:T,id:pb,name:'PB',throws:'R'},{team_id:T,id:pc,name:'PC',throws:'L'}]);ok(r.ok,'coach adds 3 pitchers');
  // coach data: game with pa + pc pitches, bullpen for pc, call sheet
  const g='g_pc'+X;await post(COACH,'games',[{team_id:T,id:g,opponent:'Opp',status:'active'}]);
  await post(COACH,'pitches',[{team_id:T,id:PC.uuid(),mode:'game',game_id:g,pitcher_id:pa,type:'FB',loc:5},{team_id:T,id:PC.uuid(),mode:'game',game_id:g,pitcher_id:pc,type:'FB',loc:2}]);
  await post(COACH,'sessions',[{team_id:T,id:'s_c'+X,pitcher_id:pc}]);await post(COACH,'pitches',[{team_id:T,id:PC.uuid(),mode:'bullpen',session_id:'s_c'+X,pitcher_id:pc,type:'CH',loc:8}]);
  await post(COACH,'call_sheets',[{team_id:T,id:'cs_'+X,name:'W',cols:[],rows:[]}]);
  // create pitching-coach code for pa + pb
  const cc=await rpc(COACH,'coach_create_code',{p_role:'pcoach',p_pitcher_ids:[pa,pb],p_label:'PCoach'});const code=JSON.parse(cc.body);ok(/^TEC-/.test(code),'coach creates pitching-coach code');
  ok((await rpc(COACH,'coach_create_code',{p_role:'pcoach',p_pitcher_ids:[]})).status>=400,'pcoach code needs at least one pitcher');
  ok((await rpc(COACH,'coach_create_code',{p_role:'pcoach',p_pitcher_ids:['p_nope']})).status>=400,'pcoach code rejects unknown pitcher');
  const w=JSON.parse((await rpc(code,'whoami')).body);ok(w.role==='pcoach'&&w.pitcher_ids.sort().join()===[pa,pb].sort().join(),'whoami pcoach with her pitchers');
  const L=JSON.parse((await rpc(COACH,'coach_list_codes')).body).find(x=>x.code===code);ok(L&&L.pitcher_ids.length===2,'coach_list_codes shows pitcher_ids');
  // reads
  const pit=await get(code,`pitchers?team_id=eq.${T}&select=id`);ok(pit.map(x=>x.id).sort().join()===[pa,pb].sort().join(),'sees only her 2 pitchers');
  const gp=await get(code,`pitches?team_id=eq.${T}&game_id=eq.${g}&select=pitcher_id`);ok(gp.length===1&&gp[0].pitcher_id===pa,'sees her pitcher\'s game pitches only');
  const gs=await get(code,`games?team_id=eq.${T}&id=eq.${g}&select=id`);ok(gs.length===1,'sees the game her pitcher threw in');
  ok((await get(code,`sessions?team_id=eq.${T}&id=eq.s_c${X}`)).length===0,'cannot see other pitcher\'s bullpen session');
  ok((await get(code,`pitches?team_id=eq.${T}&pitcher_id=eq.${pc}`)).length===0,'cannot see other pitcher\'s pitches');
  ok((await get(code,`call_sheets?team_id=eq.${T}`)).length===0,'cannot see call sheets');
  ok((await rpc(code,'coach_list_codes')).status>=400,'cannot list codes');ok((await rpc(code,'coach_create_code',{p_role:'viewer'})).status>=400,'cannot create codes');
  ok((await rpc(code,'coach_revoke_code',{p_code:code})).status>=400||JSON.parse((await rpc(code,'coach_revoke_code',{p_code:code})).body||'false')===false,'cannot revoke codes');
  // writes allowed: bullpen session + pitches + notes for pa/pb
  const s='s_p'+X;r=await ins(code,'sessions',[{team_id:T,id:s,pitcher_id:pb,date:'2026-10-13'}]);ok(r.ok,'scores a bullpen session for PB');
  const pid=PC.uuid();r=await ins(code,'pitches',[{team_id:T,id:pid,mode:'bullpen',session_id:s,pitcher_id:pb,type:'FB',loc:3,targets:[3]}]);ok(r.ok,'charts a bullpen pitch for PB');
  const cb=await get(COACH,`pitches?id=eq.${pid}&select=charted_by`);ok(cb[0]&&cb[0].charted_by==='pcoach','charted_by = pcoach');
  r=await patch(code,`pitches?id=eq.${pid}`,{loc:6});ok(r.rows.length===1,'edits her own bullpen pitch');
  r=await ins(code,'notes',[{team_id:T,id:'n_'+s,pitcher_id:pb,session_id:s,body:'Great pen – keep the CH low.'}]);ok(r.ok,'adds session note for PB');
  r=await ins(code,'notes',[{team_id:T,id:'n_'+g+'_'+pa,pitcher_id:pa,game_id:g,body:'Good tempo.'}]);ok(r.ok,'adds game note for PA');
  const nb=await get(COACH,`notes?id=eq.n_${s}&select=author,body`);ok(nb[0]&&nb[0].author==='pcoach','coach sees the note, author pcoach');
  // denied writes
  ok(!(await ins(code,'pitches',[{team_id:T,id:PC.uuid(),mode:'bullpen',session_id:s,pitcher_id:pc,type:'FB',loc:3}])).ok,'DENIED: pitch for another pitcher');
  ok(!(await ins(code,'pitches',[{team_id:T,id:PC.uuid(),mode:'game',game_id:g,pitcher_id:pa,type:'FB',loc:3}])).ok,'DENIED: game pitch');
  ok(!(await ins(code,'sessions',[{team_id:T,id:'s_x'+X,pitcher_id:pc}])).ok,'DENIED: session for another pitcher');
  ok(!(await ins(code,'notes',[{team_id:T,id:'n_x'+X,pitcher_id:pc,session_id:'s_c'+X,body:'x'}])).ok,'DENIED: note for another pitcher');
  ok(!(await ins(code,'pitchers',[{team_id:T,id:'p_x'+X,name:'X',throws:'R'}])).ok,'DENIED: add pitcher');
  ok(!(await ins(code,'games',[{team_id:T,id:'g_x'+X,opponent:'X'}])).ok,'DENIED: create game');
  ok(!(await ins(code,'call_sheets',[{team_id:T,id:'cs_x'+X,name:'X',cols:[],rows:[]}])).ok,'DENIED: call sheet');
  r=await patch(code,`pitchers?team_id=eq.${T}&id=eq.${pa}`,{name:'hacked'});ok(r.rows.length===0,'DENIED: edit pitcher');
  r=await patch(code,`games?team_id=eq.${T}&id=eq.${g}`,{opponent:'hacked'});ok(r.rows.length===0,'DENIED: edit game');
  const cbp=(await get(COACH,`pitches?session_id=eq.s_c${X}&select=id`))[0];
  // coach-charted bullpen pitch for PB: pcoach cannot edit
  const cp=PC.uuid();await post(COACH,'pitches',[{team_id:T,id:cp,mode:'bullpen',session_id:s,pitcher_id:pb,type:'FB',loc:1}]);r=await patch(code,`pitches?id=eq.${cp}`,{loc:9});ok(r.rows.length===0,'DENIED: edit coach-charted pitch');
  // player reads the note on her report
  const pl=JSON.parse((await rpc(COACH,'coach_create_code',{p_role:'player',p_pitcher_id:pb,p_label:'PB'})).body);const pn=await get(pl,`notes?team_id=eq.${T}&select=body,pitcher_id`);
  ok(pn.length===1&&pn[0].pitcher_id===pb,'player PB reads only her own note');ok(!(await ins(pl,'notes',[{team_id:T,id:'n_y'+X,pitcher_id:pb,session_id:s,body:'x'}])).ok,'DENIED: player writes notes');
  // viewer can read notes, cannot write
  const vw=JSON.parse((await rpc(COACH,'coach_create_code',{p_role:'viewer',p_label:'V'})).body);ok((await get(vw,`notes?team_id=eq.${T}&select=id`)).length>=2,'viewer reads notes');
  // revoke: pcoach loses everything
  await rpc(COACH,'coach_revoke_code',{p_code:code});ok((await get(code,`pitchers?team_id=eq.${T}`)).length===0,'revoked pcoach reads nothing');
  ok(!(await ins(code,'sessions',[{team_id:T,id:'s_z'+X,pitcher_id:pa}])).ok,'revoked pcoach writes nothing');
  for(const c of [pl,vw])await rpc(COACH,'coach_revoke_code',{p_code:c});
  console.log(process.exitCode?'SOME FAILED':'ALL PASS');})().catch(e=>{console.error(e);process.exit(1)});
