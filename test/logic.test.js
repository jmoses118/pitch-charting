const test=require('node:test'),assert=require('node:assert');const PC=require('../logic.js');
const mem=()=>{const m={};return{m,getItem:k=>k in m?m[k]:null,setItem:(k,v)=>{m[k]=String(v);},removeItem:k=>delete m[k]};};
test('grid: FB 3 vs RHB = up and in',()=>{const c=PC.parseCall('FB 3','R','R');assert.deepEqual(c.targets,[3]);assert.equal(PC.locInfo(3,'R').label,'up and in');});
test('grid: CH7 vs RHB = down and away',()=>{assert.equal(PC.locInfo(PC.parseCall('CH7','R').targets[0],'R').label,'down and away');});
test('grid: FB IN for LHB is opposite side from RHB',()=>{const r=PC.parseCall('FB IN','R').targets[0],l=PC.parseCall('FB IN','L').targets[0];
  assert.equal(r,6);assert.equal(l,4);assert.equal(PC.locInfo(l,'L').horiz,'in');assert.equal(PC.locInfo(l,'R').horiz,'away');});
test('grid: corners 11-14 pitcher view; waste calls',()=>{assert.equal(PC.locInfo(12,'R').label,'up and in (ball)');assert.equal(PC.locInfo(13,'R').label,'down and away (ball)');
  assert.deepEqual(PC.parseCall('FB A','R').targets,[16]);assert.deepEqual(PC.parseCall('FB A','L').targets,[17]);assert.equal(PC.locInfo(16,'R').label,'center away (ball)');assert.equal(PC.locInfo(17,'L').label,'center away (ball)');assert.deepEqual(PC.parseCall('H+','R').targets,[15]);assert.deepEqual(PC.parseCall('FB H+','L').targets,[15]);assert.equal(PC.locInfo(15,'R').label,'center up (ball)');assert.equal(PC.isZone(15),false);
  const rc=PC.parseCall('CB','R','R'),lc=PC.parseCall('CB','L','L');assert.deepEqual(rc.targets,[7]);assert.deepEqual(rc.alts,[4]);assert.deepEqual(lc.targets,[9]);assert.deepEqual(lc.alts,[6]);});
test('CH and CHG merge',()=>{const a=PC.parseCall('CHG 7','R'),b=PC.parseCall('CH7','R');assert.equal(a.norm,'CH7');assert.equal(a.norm,b.norm);assert.equal(a.type,'CH');
  const s=PC.summarize([{type:a.type,call:a.norm,targets:a.targets,loc:7,result:'called',b:0,s:0},{type:b.type,call:b.norm,targets:b.targets,loc:8,result:'ball',b:0,s:1}]);
  assert.equal(s.byType.CH.n,2);assert.equal(s.byCall.CH7.n,2);assert.equal(s.byCall.CH7.spotPct,50);});
test('ball four = walk',()=>{let c={b:0,s:0},o;for(let i=0;i<3;i++){o=PC.applyPitch(c,'ball');assert.equal(o.end,null);c=o;}o=PC.applyPitch(c,'ball');assert.equal(o.end,'BB');assert.equal(o.b,4);});
test('strike three = K (called or swinging)',()=>{let c=PC.applyPitch({b:0,s:0},'called');c=PC.applyPitch(c,'swinging');assert.equal(c.end,null);const o=PC.applyPitch(c,'called');assert.equal(o.end,'K');assert.equal(o.outs,1);});
test('foul with two strikes keeps count; foul with <2 adds strike',()=>{let c=PC.applyPitch({b:1,s:0},'foul');assert.equal(c.s,1);c=PC.applyPitch(c,'foul');assert.equal(c.s,2);
  for(let i=0;i<5;i++){c=PC.applyPitch(c,'foul');assert.equal(c.s,2);assert.equal(c.end,null);}assert.equal(PC.isStrike('foul'),true);});
test('pitch count matches GC (all pitches incl. fouls, in play, HBP; IBB no pitch)',()=>{const P=[];const add=(r,pid='A',x={})=>P.push(Object.assign({pitcherId:pid,result:r},x));
  ['ball','called','foul','foul','foul','inplay'].forEach(r=>add(r));add('hbp');add('ibb','A',{noPitch:true});add('ball','B');add('swinging','B');
  assert.equal(PC.pitchCount(P,'A'),7);assert.equal(PC.pitchCount(P,'B'),2);assert.equal(PC.pitchCount(P),9);
  const s=PC.summarize(P.filter(p=>p.pitcherId==='A'));assert.equal(s.n,7);assert.equal(s.strikes,5);});
test('in play results and HBP',()=>{assert.equal(PC.applyPitch({b:0,s:0},'inplay','2B').end,'2B');assert.equal(PC.applyPitch({b:0,s:0},'inplay','FC').outs,1);assert.equal(PC.applyPitch({b:3,s:2},'hbp').end,'HBP');});
test('first-pitch strike %',()=>{const s=PC.summarize([{result:'called',b:0,s:0},{result:'ball',b:1,s:0},{result:'ball',b:0,s:0}]);assert.equal(s.fpsPct,50);});
test('defaults: no surnames (empty roster, first-name pitchers)',()=>{const s=PC.defaultState();assert.equal(s.roster.length,0);const w=s.pitchers.find(p=>p.id==='p_woods');assert.equal(w.throws,'L');assert.equal(w.num,'45');assert.equal(w.note,undefined);assert.deepEqual(s.pitchers.map(p=>p.name),['Avery','Jules','Reese']);assert.deepEqual(s.pitchers.map(p=>p.id),['p_woods','p_crich','p_larbus']);});
test('add / edit / archive pitcher persists',()=>{const m=mem();const st=PC.makeStore(m);const p=st.addPitcher({name:'Kenzie',num:'7',throws:'L'});
  let saved=JSON.parse(m.getItem(PC.KEY));assert.ok(saved.pitchers.find(x=>x.name==='Kenzie'&&x.num==='7'&&x.throws==='L'));
  st.editPitcher(p.id,{num:'8',throws:'R'});st.archivePitcher(p.id);saved=JSON.parse(m.getItem(PC.KEY));const q=saved.pitchers.find(x=>x.id===p.id);assert.equal(q.num,'8');assert.equal(q.throws,'R');assert.equal(q.archived,true);
  assert.ok(!PC.makeStore(m).activePitchers().some(x=>x.id===p.id));assert.throws(()=>st.addPitcher({name:' '}));});
test('test mode does not persist and is cleared on exit',()=>{const m=mem();const st=PC.makeStore(m);st.state.games.push({id:'real',pitches:[]});st.save();const before=m.getItem(PC.KEY);
  st.enterTest();assert.equal(st.isTest,true);assert.equal(st.state.games.length,0);st.state.games.push({id:'tg',pitches:[{result:'ball'}]});st.addPitcher({name:'Temp',throws:'R'});assert.equal(st.save(),false);
  assert.equal(m.getItem(PC.KEY),before);st.exitTest();assert.equal(st.isTest,false);assert.deepEqual(st.state.games.map(g=>g.id),['real']);assert.ok(!st.state.pitchers.some(p=>p.name==='Temp'));
  st.enterTest();assert.equal(st.state.games.length,0);});
test('CSV round trip',()=>{const csv=PC.toCSV([{mode:'game',batter:'O"Neil, J',pitch_no:1}]);const r=PC.parseCSV(csv);assert.equal(r[0].batter,'O"Neil, J');});
test('dropped 3rd: K for pitcher, no out, batter reaches, counts as pitch',()=>{const o=PC.applyPitch({b:1,s:2},'kd3');assert.equal(o.end,'K-D3');assert.equal(o.outs,0);assert.equal(o.s,3);assert.ok(PC.isStrike('kd3'));assert.equal(PC.pitchCount([{result:'kd3'}]),1);});
test('FB IN stays mid inside edge: 6 RHB, 4 LHB',()=>{assert.deepEqual(PC.parseCall('FB IN','R').targets,[6]);assert.deepEqual(PC.parseCall('FBIN','L').targets,[4]);});
test('Avery stays left-handed',()=>{assert.equal(PC.defaultState().pitchers.find(p=>p.id==='p_woods').throws,'L');});
test('waste spots count as balls-zone and hit-the-spot',()=>{const c=PC.parseCall('FB A','R');const s=PC.summarize([{type:'FB',call:c.norm,targets:c.targets,loc:16,b:0,s:0},{type:'FB',call:'FB H+',targets:[15],loc:2,b:0,s:0}]);assert.equal(s.strikes,1);assert.equal(s.spotPct,50);});
test('DC drop curve is its own type',()=>{const c=PC.parseCall('DC 8','R');assert.equal(c.type,'DC');assert.ok(PC.BASE_TYPES.some(t=>t.code==='DC'));const s=PC.summarize([{type:'DC',loc:8},{type:'DR',loc:8},{type:'CB',loc:7}]);assert.equal(s.byType.DC.n,1);assert.equal(s.byType.DR.n,1);assert.equal(s.byType.CB.n,1);});
// ---------- sync ----------
function fakeFetch(){const calls=[];const db={pitchers:{},games:{},sessions:{},pitches:{},call_sheets:{},notes:{},team_settings:{}};
  const f=async(url,opt={})=>{const t=url.split('/rest/v1/')[1].split('?')[0];calls.push({t,method:opt.method||'GET',headers:opt.headers,body:opt.body?JSON.parse(opt.body):null});
    if(opt.method==='POST'){JSON.parse(opt.body).forEach(r=>db[t][r.id]=Object.assign(db[t][r.id]||{},r));return{ok:true,text:async()=>''};}
    const team=decodeURIComponent(url.match(/team_id=eq\.([^&]+)/)[1]);return{ok:true,json:async()=>Object.values(db[t]).filter(r=>r.team_id===team)};};
  return{f,calls,db};}
function setup(){const m=mem();const st=PC.makeStore(m);st.real.sync.teamCode='TEAMCODE-TEST-0000000000';st.real.sync.role='coach';st.real.sync.teamId='team-x';const ff=fakeFetch();const sy=PC.makeSync(st,{url:'https://x.supabase.co',key:'pk',fetch:ff.f});return{m,st,ff,sy};}
test('queue: new pitch is queued, pushed by upsert with team header, then cleared',async()=>{const{st,ff,sy}=setup();await sy.push();ff.calls.length=0;
  const s={id:'s_1',date:'2026-10-13',pitches:[]};st.state.sessions.push(s);st.markDirty('sessions','s_1');const p={id:PC.uuid(),pitcherId:'p_woods',type:'FB',loc:3,ts:1,b:0,s:0,targets:[]};s.pitches.push(p);st.markDirty('pitches',p.id);
  assert.equal(st.pendingCount(),2);const r=await sy.push();assert.equal(r.sent,2);assert.equal(st.pendingCount(),0);
  const call=ff.calls.find(c=>c.t==='pitches');assert.equal(call.headers['x-team-code'],'TEAMCODE-TEST-0000000000');assert.match(call.headers.Prefer,/merge-duplicates/);assert.equal(call.body[0].id,p.id);assert.equal(call.body[0].mode,'bullpen');
  await sy.push();assert.equal(Object.keys(ff.db.pitches).length,1,'idempotent upsert');});
test('queue: failed push keeps items pending',async()=>{const{st}=setup();const sy=PC.makeSync(st,{url:'u',key:'k',fetch:async()=>({ok:false,status:500,text:async()=>'boom'})});const n=st.pendingCount();assert.ok(n>0);const r=await sy.push();assert.ok(r.error);assert.equal(st.pendingCount(),n);});
test('queue: no team code = nothing sent',async()=>{const m=mem();const st=PC.makeStore(m);const ff=fakeFetch();const r=await PC.makeSync(st,{url:'u',key:'k',fetch:ff.f}).push();assert.equal(r.skipped,'no team code');assert.equal(ff.calls.length,0);});
test('undo = soft delete tombstone that syncs',async()=>{const{st,ff,sy}=setup();const s={id:'s_2',date:'d',pitches:[]};st.state.sessions.push(s);const p={id:PC.uuid(),type:'CH',loc:7,ts:2,targets:[]};s.pitches.push(p);st.markDirty('pitches',p.id);await sy.push();
  s.pitches.pop();st.tombstone(p,{mode:'bullpen',session_id:'s_2'});await sy.push();assert.equal(ff.db.pitches[p.id].deleted,true);assert.equal(st.pendingCount(),0);assert.ok(!st.real.sync.tomb[p.id]);});
test('test mode never queues or syncs',async()=>{const{st,ff,sy}=setup();await sy.push();ff.calls.length=0;st.enterTest();
  const s={id:'s_t',date:'d',pitches:[{id:PC.uuid(),type:'FB',loc:1}]};st.state.sessions.push(s);assert.equal(st.markDirty('sessions','s_t'),false);assert.equal(st.markDirty('pitches',s.pitches[0].id),false);assert.equal(st.tombstone(s.pitches[0],{}),false);
  assert.equal(st.pendingCount(),0);assert.equal((await sy.sync()).skipped,'test');assert.equal((await sy.pull()).skipped,'test');assert.equal(ff.calls.length,0);
  st.exitTest();assert.equal(st.pendingCount(),0);await sy.push();assert.equal(ff.calls.length,0,'nothing from test mode leaked into the queue');});
test('restore from cloud onto a new phone',async()=>{const{st,ff,sy}=setup();const g={id:'g_1',date:'2026-10-13',opponent:'Storm',event:'Fall Classic',homeAway:'away',lineup:[{slot:1,name:'A',num:'1',hand:'L'}],cur:{inning:2,outs:1,slot:0,b:0,s:0,abn:3},pitches:[]};
  st.state.games.push(g);st.markDirty('games','g_1');const p={id:PC.uuid(),pitcherId:'p_woods',type:'DC',loc:8,result:'called',ts:5,b:0,s:0,inning:1,outsBefore:0,slot:0,batter:'A',targets:[],firstPitch:true};g.pitches.push(p);st.markDirty('pitches',p.id);await sy.push();
  const st2=PC.makeStore(mem());st2.real.sync.teamCode='TEAMCODE-TEST-0000000000';st2.real.sync.role='coach';st2.real.sync.teamId='team-x';st2.real.sync.queue={pitchers:{},games:{},sessions:{},pitches:{}};const r=await PC.makeSync(st2,{url:'u',key:'k',fetch:ff.f}).pull();
  assert.equal(r.added,1);const g2=st2.state.games.find(x=>x.id==='g_1');assert.equal(g2.opponent,'Storm');assert.equal(g2.pitches[0].type,'DC');assert.equal(g2.pitches[0].result,'called');assert.equal(PC.pitchCount(g2.pitches,'p_woods'),1);});
test('legacy non-uuid pitch ids are migrated to uuids',()=>{const m=mem();const s0=PC.defaultState();s0.sessions.push({id:'s_x',date:'d',pitches:[{id:'abc123',type:'FB'}]});m.setItem(PC.KEY,JSON.stringify(s0));const st=PC.makeStore(m);assert.ok(PC.isUUID(st.state.sessions[0].pitches[0].id));});
test('pull merges cloud scheduled games by id without wiping local data',async()=>{const{st,ff,sy}=setup();
  const local={id:'g_local',date:'2026-10-10',opponent:'Storm',homeAway:'home',lineup:[],cur:{inning:3,outs:0,slot:0,b:0,s:0,abn:0},pitches:[{id:PC.uuid(),type:'FB',result:'ball',b:0,s:0,ts:1}]};st.state.games.push(local);st.markDirty('games','g_local');st.markDirty('pitches',local.pitches[0].id);
  st.state.sessions.push({id:'s_l',date:'d',pitches:[{id:PC.uuid(),type:'CH',loc:7}]});
  ff.db.games.g_sched={team_id:'team-x',id:'g_sched',date:'2026-10-17',opponent:'Finesse Colyer',event:"America's Premier Fall Showcase",home_away:'tbd',lineup:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0},status:'scheduled',link:'https://web.gc.com/x',game_time:'3:30 PM',field:'Field 21',game_no:'P31',location:'Berliner Sports Park, Columbus'};
  const r=await sy.sync();assert.ok(!r.error,r.error);
  const g=st.state.games.find(x=>x.id==='g_sched');assert.equal(g.status,'scheduled');assert.equal(g.link,'https://web.gc.com/x');assert.equal(g.time,'3:30 PM');assert.equal(g.gameNo,'P31');assert.equal(g.homeAway,'tbd');
  const l=st.state.games.find(x=>x.id==='g_local');assert.equal(l.pitches.length,1);assert.equal(l.cur.inning,3);assert.equal(st.state.sessions.find(x=>x.id==='s_l').pitches.length,1);
  await sy.pull();assert.equal(st.state.games.filter(x=>x.id==='g_sched').length,1,'no duplicates on re-pull');
  // starting it locally pushes status active back by the same id
  Object.assign(g,{status:'active',started:5});st.markDirty('games','g_sched');await sy.push();assert.equal(ff.db.games.g_sched.status,'active');assert.equal(ff.db.games.g_sched.link,'https://web.gc.com/x');});
test('pending queue retries after a team-code typo is corrected',async()=>{const m=mem();const st=PC.makeStore(m);const GOOD='TEST1-AAAAA-BBBBB-CCCCC-DDDDD';const sent=[];
  const f=async(url,opt)=>{const team=opt.headers['x-team-code'];if(team!==GOOD)return{ok:false,status:401,text:async()=>'new row violates row-level security policy'};
    if(opt.method==='POST'){JSON.parse(opt.body).forEach(r=>{assert.equal(r.team_id,'team-x');assert.ok(!('team_code' in r));sent.push(r.id);});return{ok:true,text:async()=>''};}return{ok:true,json:async()=>[]};};
  const sy=PC.makeSync(st,{url:'u',key:'k',fetch:f});st.real.sync.queue={pitchers:{},games:{},sessions:{},pitches:{}};
  const s={id:'s_q',date:'d',pitches:[]};st.state.sessions.push(s);st.markDirty('sessions','s_q');for(let i=0;i<2;i++){const p={id:PC.uuid(),type:'FB',loc:5};s.pitches.push(p);st.markDirty('pitches',p.id);}
  st.real.sync.teamCode='TEST1-AAAAA-BBBBB-CCCC-DDDDD';st.real.sync.teamId='team-x';st.real.sync.role='coach';let r=await sy.push();assert.ok(r.error);assert.equal(st.pendingCount(),3);r=await sy.push();assert.ok(r.error);assert.equal(st.pendingCount(),3,'still queued after repeated failures');
  // reload from storage (phone restarted) keeps the queue
  const st2=PC.makeStore(m);assert.equal(st2.pendingCount(),3);st2.real.sync.teamCode=GOOD;st2.real.sync.teamId='team-x';st2.real.sync.role='coach';const r2=await PC.makeSync(st2,{url:'u',key:'k',fetch:f}).push();assert.equal(r2.sent,3);assert.equal(st2.pendingCount(),0);assert.equal(sent.length,3);assert.equal(st2.real.sync.lastError,null);});
test('Avery ace tag removed: old phones migrated, cloud pull clears note',async()=>{const m=mem();const s0=PC.defaultState();s0.pitchers[0].note='ace';s0.pitchers[0].num='';m.setItem(PC.KEY,JSON.stringify(s0));
  const st=PC.makeStore(m);const w=st.state.pitchers.find(p=>p.id==='p_woods');assert.equal(w.note,undefined);assert.equal(w.num,'45');assert.equal(w.throws,'L');
  w.note='ace';st.real.sync.queue.pitchers={};PC.mergeRemote(st.real,{pitchers:[{id:'p_woods',name:'Avery',num:'45',throws:'L',archived:false,note:null}]});assert.equal(w.note,undefined);
  assert.ok(!JSON.stringify(PC.defaultState()).includes('ace'));});
test('bullpen flow: type -> intended -> actual -> log, then reset',()=>{let d={type:null,target:null,callTargets:[]};
  assert.equal(PC.bullpenStep(d),'type');assert.equal(PC.bullpenTap(d,5).action,'need_type');
  d.type='FB';assert.equal(PC.bullpenStep(d),'target');let r=PC.bullpenTap(d,3);assert.equal(r.action,'target');d=r.draft;assert.equal(d.target,3);
  assert.equal(PC.bullpenStep(d),'actual');r=PC.bullpenTap(d,6);assert.equal(r.action,'log');assert.deepEqual(r.targets,[3]);assert.equal(r.draft.loc,6);});
test('bullpen flow: call sheet spot counts as intended (skips step 2)',()=>{const c=PC.parseCall('CHG 7','R');const r=PC.bullpenTap({type:c.type,target:null,callTargets:c.targets},7);assert.equal(r.action,'log');assert.deepEqual(r.targets,[7]);
  const w=PC.parseCall('FB','R');assert.equal(PC.bullpenTap({type:'FB',callTargets:w.targets},2).action,'target');});
test('hit-spot counts tapped intended spots without a call; old called data still counts',()=>{const s=PC.summarize([{type:'FB',targets:[3],loc:3},{type:'FB',targets:[3],loc:6},{type:'CH',call:'CH7',targets:[7],loc:7},{type:'DR',targets:[],loc:8}]);
  assert.equal(s.spotN,3);assert.equal(s.spot,2);assert.equal(s.byType.FB.spotPct,50);assert.equal(s.byType.CH.spotPct,100);assert.equal(s.n,4);});
// ---------- roles ----------
function roleStore(role,pid){const st=PC.makeStore(mem());Object.assign(st.real.sync,{teamCode:'TEP-AAAAA-BBBBB-CCCCC-DDDDD',teamId:'team-x',role,pitcherId:pid||null,queue:{pitchers:{},games:{},sessions:{},pitches:{}}});
  const own={id:'s_own',date:'d',pitcherId:'p_woods',pitches:[{id:PC.uuid(),pitcherId:'p_woods',type:'FB',loc:3,targets:[3]},{id:PC.uuid(),pitcherId:'p_larbus',type:'CH',loc:7}]};
  const coachS={id:'s_coach',date:'d',pitches:[{id:PC.uuid(),pitcherId:'p_woods',type:'DR',loc:8}]};st.real.sessions.push(own,coachS);
  const g={id:'g1',date:'d',opponent:'X',homeAway:'home',lineup:[],cur:{},pitches:[{id:PC.uuid(),pitcherId:'p_woods',type:'FB',result:'ball',b:0,s:0}]};st.real.games.push(g);
  st.markAllDirty();return st;}
test('player code only sends own bullpen data; everything else stays queued (held), never dropped',()=>{const st=roleStore('player','p_woods');const before=st.pendingCount();const{rows,held}=PC.buildRows(st.real);
  assert.equal(rows.pitchers.length,0);assert.equal(rows.games.length,0);assert.deepEqual(rows.sessions.map(r=>r.id),['s_own']);
  assert.equal(rows.pitches.length,2);assert.ok(rows.pitches.every(r=>r.pitcher_id==='p_woods'&&r.mode==='bullpen'));assert.equal(st.pendingCount(),before);assert.equal(held,before-3);});
test('view-only code sends nothing',async()=>{const st=roleStore('viewer');const{rows}=PC.buildRows(st.real);assert.equal(Object.values(rows).flat().length,0);
  const calls=[];const sy=PC.makeSync(st,{url:'u',key:'k',fetch:async(u,o)=>{calls.push(o.method||'GET');return{ok:true,json:async()=>[],text:async()=>''};}});await sy.sync();assert.ok(!calls.includes('POST'));});
test('coach code sends everything',()=>{const st=roleStore('coach');const{rows}=PC.buildRows(st.real);assert.equal(rows.games.length,1);assert.equal(rows.sessions.length,2);assert.equal(rows.pitches.length,4);assert.equal(rows.pitchers.length,3);});
test('whoami sets role; unknown code blocks sync',async()=>{const st=PC.makeStore(mem());st.real.sync.teamCode='TEP-AAAAA-BBBBB-CCCCC-DDDDD';
  let who={role:'player',team_id:'team-x',pitcher_id:'p_reese',pitcher_name:'Reese'};const f=async(u,o)=>u.includes('/rpc/whoami')?{ok:true,text:async()=>JSON.stringify(who)}:{ok:true,json:async()=>[],text:async()=>''};
  const sy=PC.makeSync(st,{url:'u',key:'k',fetch:f});await sy.whoami();assert.equal(st.real.sync.role,'player');assert.equal(st.real.sync.teamId,'team-x');assert.equal(st.real.sync.pitcherId,'p_reese');assert.ok(st.real.pitchers.find(p=>p.id==='p_reese'&&p.name==='Reese'));
  who=null;await sy.whoami();assert.equal(st.real.sync.role,null);const r=await sy.sync();assert.match(r.error,/not recognized/);});
test('rows never carry the secret code, only the team id',()=>{const st=roleStore('coach');st.real.sync.teamId='thunder-elite-13u';const{rows}=PC.buildRows(st.real);const all=Object.values(rows).flat();
  assert.ok(all.length>0);assert.ok(all.every(r=>r.team_id==='thunder-elite-13u'&&!('team_code' in r)));assert.ok(!JSON.stringify(all).includes(st.real.sync.teamCode));});
test('no push until the team is identified by whoami',async()=>{const st=PC.makeStore(mem());st.real.sync.teamCode='TEST1-AAAAA-BBBBB-CCCCC-DDDDD';const calls=[];const r=await PC.makeSync(st,{url:'u',key:'k',fetch:async()=>{calls.push(1);return{ok:true}}}).push();assert.match(r.skipped,/not identified/);assert.equal(calls.length,0);});
test('privacy: stored surnames on default pitchers are trimmed to first name and queued for the cloud (same ids, data kept)',()=>{const m=mem();const s0=PC.defaultState();
  s0.pitchers[0].name='Avery Testname';s0.pitchers[1].name='Testname';s0.pitchers[2].name='Reese Q';delete s0.migNames2;delete s0.migNames1;
  s0.sessions.push({id:'s1',date:'d',pitches:[{id:PC.uuid(),pitcherId:'p_larbus',type:'FB',loc:5}]});m.setItem(PC.KEY,JSON.stringify(s0));
  const st=PC.makeStore(m);assert.deepEqual(st.state.pitchers.map(p=>p.name),['Avery','Jules','Reese']);assert.equal(st.state.sessions[0].pitches[0].pitcherId,'p_larbus');
  assert.ok(st.real.sync.queue.pitchers.p_woods&&st.real.sync.queue.pitchers.p_crich,'renames are pushed so the cloud copy is scrubbed');
  const s1=PC.defaultState();s1.migNames1=true;s1.pitchers[1].name='Jo';const m1=mem();m1.setItem(PC.KEY,JSON.stringify(s1));assert.equal(PC.makeStore(m1).state.pitchers[1].name,'Jo','a coach rename is kept');});
test('pitcherLabel: first name + jersey number only',()=>{assert.equal(PC.pitcherLabel({name:'Avery Testname',num:'45'}),'Avery #45');assert.equal(PC.pitcherLabel({name:'  Reese ',num:''}),'Reese');assert.equal(PC.pitcherLabel(null),'?');});
// ---------- heat map ----------
function heatState(){const st=PC.defaultState();st.games.push({id:'g1',date:'2026-10-17',opponent:'X',homeAway:'tbd',lineup:[],cur:{},pitches:[
  {id:'a',pitcherId:'p_woods',type:'FB',loc:3,hand:'R',batter:'Smith',result:'called',targets:[]},{id:'b',pitcherId:'p_woods',type:'CH',loc:15,hand:'L',batter:'Jones',result:'ball',targets:[]},
  {id:'c',pitcherId:'p_crich',type:'FB',loc:3,hand:'R',batter:'Smith',result:'foul',targets:[]},{id:'i',noPitch:true,pitcherId:'p_woods',result:'ibb'}]});
  st.sessions.push({id:'s1',date:'2026-10-16',pitches:[{id:'d',pitcherId:'p_larbus',type:'FB',loc:16,hand:'N',targets:[16]},{id:'e',pitcherId:'p_larbus',type:'DC',loc:8,hand:'N',targets:[7]},{id:'f',pitcherId:'p_woods',type:'FB',loc:null,hand:'N',targets:[3]}]});return st;}
test('heat map covers the whole grid incl. waste spots 11-18',()=>{assert.deepEqual([...PC.ALL_CELLS].sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,11,12,13,14,15,16,17,18]);
  const d=PC.heatData(PC.heatItems(heatState()),{},'actual');assert.equal(d.total,5);assert.equal(d.cells[3].n,2);assert.equal(d.cells[15].n,1);assert.equal(d.cells[16].n,1);assert.equal(d.max,2);});
test('heat filters: type, pitcher, hand, batter, side, source, game, session',()=>{const it=PC.heatItems(heatState());const n=f=>PC.heatData(it,f,'actual').total;
  assert.equal(n({type:'FB'}),3);assert.equal(n({pitcher:'p_woods'}),2);assert.equal(n({throws:'L'}),2);assert.equal(n({batter:'Smith'}),2);assert.equal(n({side:'L'}),1);assert.equal(n({side:'N'}),2);
  assert.equal(n({src:'bullpen'}),2);assert.equal(n({src:'game'}),3);assert.equal(n({game:'g1'}),3);assert.equal(n({session:'s1'}),2);assert.equal(n({type:'FB',src:'game',pitcher:'p_crich'}),1);assert.equal(n({type:'SC'}),0);});
test('heat intended view: aimed counts + hit-the-spot',()=>{const d=PC.heatData(PC.heatItems(heatState()),{},'intended');assert.equal(d.total,2);assert.equal(d.cells[16].n,1);assert.equal(d.cells[16].hit,1);assert.equal(d.cells[7].n,1);assert.equal(d.cells[7].hit,0);});
test('heat colors: sequential viridis, empty cells uncolored, readable text',()=>{assert.equal(PC.heatColor(0,5),null);assert.equal(PC.heatColor(5,5).fill,'#fde725');assert.equal(PC.heatColor(5,5).text,'#000');assert.equal(PC.heatColor(1,10).text,'#fff');});
test('miss distance: Chebyshev squares on the 5x5 grid incl. outside spots',()=>{const d=PC.missDist;assert.equal(d(5,5),0);assert.equal(d(1,5),1);assert.equal(d(3,7),2);assert.equal(d(11,14),4);assert.equal(d(15,2),1);assert.equal(d(16,6),3);assert.equal(d(17,6),1);assert.equal(d(18,2),3);assert.equal(d(13,3),3);assert.equal(d(12,13),4);});
test('miss heat map: per intended cell avg miss + colors (green <=1, darker red to 4)',()=>{const st=PC.defaultState();st.sessions.push({id:'s',date:'d',pitches:[
  {id:'1',pitcherId:'p_woods',type:'FB',targets:[3],loc:3,hand:'N'},{id:'2',pitcherId:'p_woods',type:'FB',targets:[3],loc:6,hand:'N'},{id:'3',pitcherId:'p_woods',type:'FB',targets:[7],loc:14,hand:'N'},{id:'4',pitcherId:'p_woods',type:'CB',targets:[11],loc:14,hand:'N'},{id:'5',pitcherId:'p_woods',type:'FB',targets:[],loc:5}]});
  const d=PC.missData(PC.heatItems(st),{});assert.equal(d.total,4);assert.equal(d.cells[3].n,2);assert.equal(d.cells[3].avg,0.5);assert.equal(d.cells[3].hit,1);assert.equal(d.cells[7].avg,3);assert.equal(d.cells[11].avg,4);
  assert.equal(PC.missColor(0.5).fill,'#2ea043');assert.equal(PC.missColor(1).fill,'#2ea043');assert.equal(PC.missColor(1.5).fill,'#f47067');assert.equal(PC.missColor(3).fill,'#c93c37');assert.equal(PC.missColor(4).fill,'#7d1414');assert.equal(PC.missColor(null),null);
  assert.equal(PC.missData(PC.heatItems(st),{type:'FB'}).total,3);});
test("middle-middle rule: landing in 5 when aimed elsewhere = max severity, counted as MM",()=>{const st=PC.defaultState();st.sessions.push({id:'s',date:'d',pitches:[
  {id:'1',pitcherId:'p_woods',type:'FB',targets:[2],loc:5,hand:'N'},{id:'2',pitcherId:'p_woods',type:'FB',targets:[2],loc:2,hand:'N'},{id:'3',pitcherId:'p_woods',type:'CH',targets:[5],loc:5,hand:'N'},{id:'4',pitcherId:'p_woods',type:'CH',targets:[9],loc:6,hand:'N'}]});
  const d=PC.missData(PC.heatItems(st),{});assert.equal(d.mm,1);assert.equal(d.cells[2].mm,1);assert.equal(d.cells[2].avg,2);assert.equal(d.cells[5].avg,2);assert.equal(d.cells[5].mm,0);assert.equal(d.cells[9].avg,2); // CH up in the zone = miss (change-up rule)
  const only=PC.missData(PC.heatItems({pitchers:st.pitchers,games:[],sessions:[{id:'x',pitches:[{type:'FB',targets:[6],loc:5}]}]}),{});assert.equal(only.cells[6].avg,4);assert.equal(PC.missColor(only.cells[6].avg).fill,'#7d1414');});
test("session report: good = on target/1 off, MM severe, feedback + best/weakest + trend",()=>{const P=[];const add=(type,t,l)=>P.push({type,targets:[t],loc:l,hand:'R'});
  [[7,4],[7,1],[7,4],[7,7],[7,4],[7,4]].forEach(([t,l])=>add('DR',t,l));[[6,6],[6,6],[6,3],[6,6],[6,5]].forEach(([t,l])=>add('FB',t,l));
  const r=PC.sessionReport(P);assert.equal(r.n,11);assert.equal(r.mm,1);assert.equal(r.called,11);
  // DR: 7->4 is 1 square (good), 7->1 is 2 (bad); FB 6->5 is MM (bad)
  assert.equal(r.byType.DR.good,5);assert.equal(r.byType.FB.good,4);assert.equal(r.good,9);assert.equal(r.byType.FB.mm,1);
  assert.equal(r.byType.DR.up,5);assert.ok(r.feedback.length>=2&&r.feedback.length<=4);assert.ok(r.feedback.some(t=>/souvenir/.test(t)));
  assert.ok(r.feedback.some(t=>/Drop missed up 5 of 6/.test(t)),r.feedback.join('|'));
  assert.ok(r.best&&r.weakest&&r.best.avgMiss<=r.weakest.avgMiss);assert.ok(r.trend&&r.trend.first.n+r.trend.second.n===11);
  const m=PC.pitchMiss({targets:[6],loc:5,hand:'R'});assert.equal(m.sev,4);assert.equal(m.horiz,'away');
  assert.equal(PC.pitchMiss({targets:[6],loc:5,hand:'L'}).horiz,'in');assert.equal(PC.pitchMiss({type:'FB',targets:[],loc:5}),null);
  const e=PC.sessionReport([{type:'FB',targets:[],loc:5}]);assert.equal(e.goodPct,null);assert.equal(e.feedback.length,2);});
test("no batter: glove/arm side wording by pitcher hand; in/away kept with a batter",()=>{
  // RHP glove side = pitcher's left (col 0); LHP (Avery) glove side = pitcher's right (col 2)
  assert.equal(PC.locInfo(7,'N','R').label,'down glove side');assert.equal(PC.locInfo(9,'N','R').label,'down arm side');
  assert.equal(PC.locInfo(9,'N','L').label,'down glove side');assert.equal(PC.locInfo(4,'N','L').label,'middle arm side');
  assert.equal(PC.locInfo(16,'N','L').label,'center arm side (ball)');assert.equal(PC.locInfo(12,'N','R').label,'up arm side (ball)');assert.equal(PC.locInfo(2,'N','L').label,'up and middle');
  assert.equal(PC.locInfo(7,'R','L').label,'down and away');assert.equal(PC.locInfo(9,'L','R').label,'down and away');assert.equal(PC.locInfo(7,'N').label,'down and away');
  assert.equal(PC.parseCall('DC 9','N','L').desc,'down glove side');
  assert.equal(PC.pitchMiss({targets:[5],loc:6,hand:'N'},'L').horiz,'glove side');assert.equal(PC.pitchMiss({targets:[5],loc:6,hand:'N'},'R').horiz,'arm side');assert.equal(PC.pitchMiss({targets:[5],loc:6,hand:'R'},'L').horiz,'in');
  const P=[];for(let i=0;i<6;i++)P.push({pitcherId:'p_woods',type:'CH',targets:[8],hand:'N',loc:i<4?9:8});P.push({pitcherId:'p_woods',type:'DC',targets:[9],hand:'N',loc:9},{pitcherId:'p_woods',type:'DC',targets:[9],hand:'N',loc:9});
  const r=PC.sessionReport(P,{p_woods:'L'});const txt=r.feedback.join(' | ')+' '+r.best.label+' '+(r.weakest&&r.weakest.label);
  assert.ok(/Change-up missed glove side 4 of 6/.test(txt),txt);assert.ok(/glove side/.test(r.best.label),r.best.label);assert.ok(!/(missed|and) (in|away)\b/.test(txt),txt);
  const rb=PC.sessionReport(P.map(p=>Object.assign({},p,{hand:'R'})),{p_woods:'L'});assert.ok(rb.feedback.some(t=>/missed in 4 of 6/.test(t)),rb.feedback.join('|'));});
test('dropped 3rd only at 2 strikes; SO total incl. K-D3',()=>{assert.throws(()=>PC.applyPitch({b:0,s:0},'kd3'));assert.throws(()=>PC.applyPitch({b:3,s:1},'kd3'));
  const o=PC.applyPitch({b:1,s:2},'kd3');assert.equal(o.end,'K-D3');assert.equal(o.outs,0);
  const s=PC.summarize([{result:'swinging',b:0,s:2,end:'K'},{result:'kd3',b:2,s:2,end:'K-D3'},{result:'ball',b:3,s:0,end:'BB'},{result:'called',b:0,s:0}]);assert.equal(s.k,2);assert.equal(s.kd3,1);});
// ---- review fixes ----
test('one rejected row does not block sync: retried singly, quarantined, rest sent, pull still runs',async()=>{const st=PC.makeStore(mem());const sy0=st.real.sync;sy0.teamCode='TE-AAAAA-BBBBB-CCCCC-DDDDD';sy0.teamId='team-x';sy0.role='coach';sy0.queue={pitchers:{},games:{},sessions:{},pitches:{}};
  const s={id:'s_r',date:'d',pitches:[]};st.state.sessions.push(s);st.markDirty('sessions','s_r');const bad=PC.uuid();[PC.uuid(),bad,PC.uuid()].forEach(id=>{s.pitches.push({id,type:'FB',loc:5});st.markDirty('pitches',id);});
  const sent=[],gets=[];const f=async(u,o)=>{if(o&&o.method==='POST'){const rows=JSON.parse(o.body);if(rows.some(r=>r.id===bad))return{ok:false,status:400,text:async()=>'violates check constraint'};rows.forEach(r=>sent.push(r.id));return{ok:true,text:async()=>''};}gets.push(u);return{ok:true,json:async()=>[]};};
  const r=await PC.makeSync(st,{url:'u',key:'k',fetch:f}).sync();assert.equal(r.rejected,1);assert.equal(sent.filter(x=>x!=='s_r').length,2);assert.equal(st.pendingCount(),0);
  assert.ok(st.real.sync.rejected['pitches:'+bad]);assert.ok(gets.length>=4,'pulled all tables');assert.match(st.real.sync.lastError,/rejected/);});
test('auth failure (bad code) keeps everything queued; pull still attempted',async()=>{const st=PC.makeStore(mem());const y=st.real.sync;y.teamCode='TE-AAAAA-BBBBB-CCCCC-DDDDD';y.teamId='team-x';y.role='coach';y.queue={pitchers:{},games:{},sessions:{},pitches:{}};st.markDirty('pitchers','p_woods');
  let gets=0;const f=async(u,o)=>o&&o.method==='POST'?{ok:false,status:401,text:async()=>'rls'}:(gets++,{ok:true,json:async()=>[]});const r=await PC.makeSync(st,{url:'u',key:'k',fetch:f}).sync();assert.ok(r.error);assert.equal(st.pendingCount(),1);assert.ok(gets>0);});
test('unrecognized / unverified code never pushes',()=>{for(const role of [null,undefined,'bogus']){const st=PC.makeStore(mem());st.real.sync.role=role;st.real.sync.teamId='t';st.markAllDirty();const n=st.pendingCount();const{rows,held}=PC.buildRows(st.real);assert.equal(Object.values(rows).flat().length,0);assert.equal(held,n);assert.equal(st.pendingCount(),n);}});
test('coach code coming back re-queues everything',async()=>{const st=PC.makeStore(mem());st.real.sync.teamCode='TE-AAAAA-BBBBB-CCCCC-DDDDD';st.real.sync.role='player';st.real.sync.queue={pitchers:{},games:{},sessions:{},pitches:{}};
  const f=async u=>({ok:true,text:async()=>JSON.stringify({role:'coach',team_id:'t'})});await PC.makeSync(st,{url:'u',key:'k',fetch:f}).whoami();assert.equal(st.real.sync.role,'coach');assert.ok(st.pendingCount()>=3);});
test('server-function calls no-op in test mode',async()=>{const st=PC.makeStore(mem());st.real.sync.teamCode='TE-AAAAA-BBBBB-CCCCC-DDDDD';st.enterTest();let called=0;const sy=PC.makeSync(st,{url:'u',key:'k',fetch:async()=>{called++;return{ok:true,text:async()=>'[]'};}});
  assert.equal(await sy.rpc('coach_list_codes'),null);assert.equal(called,0);});
test('mergeRemote: older cloud rows never overwrite newer local copies; newer ones do',()=>{const st=PC.defaultState();PC.makeStore(mem());st.sync={queue:{pitchers:{},games:{},sessions:{},pitches:{}},tomb:{}};
  PC.mergeRemote(st,{pitchers:[{id:'p_woods',name:'Avery',throws:'L',updated_at:'2026-10-13T10:00:00Z'}]});PC.mergeRemote(st,{pitchers:[{id:'p_woods',name:'OLD',throws:'R',updated_at:'2026-10-12T10:00:00Z'}]});assert.equal(st.pitchers.find(p=>p.id==='p_woods').name,'Avery');
  const id=PC.uuid();st.sessions.push({id:'s1',pitches:[]});PC.mergeRemote(st,{pitches:[{id,mode:'bullpen',session_id:'s1',loc:3,updated_at:'2026-10-13T10:00:00Z'}]});PC.mergeRemote(st,{pitches:[{id,mode:'bullpen',session_id:'s1',loc:9,updated_at:'2026-10-13T11:00:00Z'}]});assert.equal(st.sessions[0].pitches[0].loc,9);
  PC.mergeRemote(st,{pitches:[{id,mode:'bullpen',session_id:'s1',loc:1,updated_at:'2026-10-13T09:00:00Z'}]});assert.equal(st.sessions[0].pitches[0].loc,9);});
test('cloud rows are sanitized (loc/targets must be grid numbers)',()=>{const st=PC.defaultState();st.sync={queue:{pitchers:{},games:{},sessions:{},pitches:{}},tomb:{}};st.sessions.push({id:'s1',pitches:[]});
  PC.mergeRemote(st,{pitches:[{id:PC.uuid(),mode:'bullpen',session_id:'s1',loc:'"]<img src=x onerror=alert(1)>',targets:['3','x<',99]}]});const p=st.sessions[0].pitches[0];assert.equal(p.loc,null);assert.deepEqual(p.targets,[3]);});
test('game logic: no pitch after the at-bat ends; K-D3 thrown out; foul tip; double play',()=>{assert.throws(()=>PC.applyPitch({b:4,s:0},'ball'));assert.throws(()=>PC.applyPitch({b:0,s:3},'foul'));
  let o=PC.applyPitch({b:1,s:2},'kd3out');assert.equal(o.end,'K');assert.equal(o.outs,1);assert.throws(()=>PC.applyPitch({b:0,s:1},'kd3out'));
  o=PC.applyPitch({b:0,s:1},'foultip');assert.equal(o.s,2);assert.equal(o.end,null);o=PC.applyPitch({b:2,s:2},'foultip');assert.equal(o.end,'K');assert.equal(o.outs,1);assert.ok(PC.isStrike('foultip'));
  o=PC.applyPitch({b:0,s:0},'inplay','DP');assert.equal(o.outs,2);assert.equal(o.end,'DP');
  const s=PC.summarize([{result:'kd3out',end:'K'},{result:'foultip',end:'K'},{result:'kd3',end:'K-D3'}]);assert.equal(s.k,3);assert.equal(s.strikes,3);});
test('new pitcher requires a throwing hand',()=>{const st=PC.makeStore(mem());assert.throws(()=>st.addPitcher({name:'X'}));assert.throws(()=>st.addPitcher({name:'X',throws:''}));assert.equal(st.addPitcher({name:'X',throws:'L'}).throws,'L');});
test('missData per-cell on-target count never exceeds pitches aimed there',()=>{const P=[[3,3],[3,2],[3,9],[3,5],[7,7]].map(([t,l])=>({p:{targets:[t],loc:l}}));const d=PC.missData(P,{});assert.equal(d.cells[3].n,4);assert.equal(d.cells[3].good,2);assert.equal(d.cells[7].good,1);for(const z in d.cells)assert.ok((d.cells[z].good||0)<=d.cells[z].n);});
test('change-up rule: CH landing in top/middle row is a miss even on target; bottom row normal',()=>{
  assert.equal(PC.pitchMiss({type:'CH',targets:[7],loc:4}).good,false);assert.equal(PC.pitchMiss({type:'CH',targets:[4],loc:4}).good,false);assert.equal(PC.pitchMiss({type:'CH',targets:[4],loc:4}).sev,2);
  assert.equal(PC.pitchMiss({type:'CH',targets:[2],loc:15}).chUp,true);assert.equal(PC.pitchMiss({type:'CH',targets:[7],loc:8}).good,true);assert.equal(PC.pitchMiss({type:'CH',targets:[8],loc:18}).good,true);
  assert.equal(PC.pitchMiss({type:'CH',targets:[7],loc:16}).good,false);assert.equal(PC.pitchMiss({type:'FB',targets:[7],loc:4}).good,true);assert.equal(PC.pitchMiss({type:'CH',targets:[6],loc:5}).sev,4);
  const P=[[7,4],[7,1],[8,8],[8,5],[9,9],[9,6]].map(([t,l])=>({type:'CH',targets:[t],loc:l,hand:'R'}));const r=PC.sessionReport(P);assert.equal(r.byType.CH.chUp,4);assert.equal(r.byType.CH.good,2);
  assert.ok(r.feedback.some(x=>/Change-up up in the zone 4 times – keep it at the knees/.test(x)),r.feedback.join('|'));assert.ok(r.types.CH.feedback.some(x=>/knees/.test(x)));
  const d=PC.missData(P.map(p=>({p})),{});assert.equal(d.chUp,4);assert.equal(d.cells[7].good||0,0);assert.equal(d.cells[8].land[5].mm,1);assert.equal(d.cells[8].land[8].n,1);});
test('per-type sections: own stats, best/work-on, 1-2 feedback lines; landing map per aimed cell',()=>{const P=[];const add=(type,t,l)=>P.push({type,targets:[t],loc:l,hand:'N',pitcherId:'p'});
  [[3,3],[3,3],[3,2],[9,9],[9,9],[9,14]].forEach(([t,l])=>add('FB',t,l));[[7,7],[7,13],[7,8],[7,7]].forEach(([t,l])=>add('CB',t,l));[[8,8],[8,5],[8,2]].forEach(([t,l])=>add('CH',t,l));
  const r=PC.sessionReport(P,{p:'R'});assert.deepEqual(Object.keys(r.types),['FB','CB','CH']);for(const k in r.types){const x=r.types[k];assert.ok(x.feedback.length>=1&&x.feedback.length<=2);assert.equal(x.stats.n,r.byType[k].n);}
  assert.equal(r.types.FB.stats.good,6);assert.ok(r.types.FB.best);assert.equal(r.types.CH.stats.mm,1);assert.ok(r.types.CH.feedback.some(x=>/souvenir|knees/.test(x)));
  const d=PC.missData(P.filter(p=>p.type==='FB').map(p=>({p})),{});assert.deepEqual(Object.keys(d.cells[3].land).map(Number).sort(),[2,3]);assert.equal(d.cells[3].land[3].n,2);});
test('wristband: every cell of Wristband 1 maps, CALL_SUFFIX table drives suffixes',()=>{const s=PC.defaultCallSheet();assert.equal(s.name,'Wristband 1');assert.equal(s.rows.length,7);assert.deepEqual(s.cols,['01','02','03','04','05','06','07','08']);
  s.rows.flat().forEach(c=>['R','L'].forEach(h=>['R','L'].forEach(t=>assert.ok(PC.parseCall(c,h,t),c))));
  const t=(c,h,th)=>PC.parseCall(c,h,th||'R');
  assert.deepEqual(t('Fb O','R').targets,[4]);assert.deepEqual(t('Fb O','L').targets,[6]);assert.deepEqual(t('Fb A','R').targets,[16]);assert.deepEqual(t('Fb A','L').targets,[17]);
  assert.deepEqual(t('Fb H').targets,[2]);assert.deepEqual(t('Fb H+').targets,[15]);assert.deepEqual(t('Fb L').targets,[8]);assert.equal(t('SRWI','R').type,'SC');assert.deepEqual(t('SRWI','R').targets,[6]);assert.deepEqual(t('SRWO','R').targets,[4]);
  assert.equal(t('DB').type,'DR');assert.deepEqual(t('Fb').targets,[]);assert.deepEqual(t('CRV','R','R').targets,[7]);assert.deepEqual(t('CRV','R','L').targets,[9]);
  assert.equal(PC.BASE_TYPES.find(x=>x.code==='SC').name,'Screwball');});
test('wristband: R-C cell refs',()=>{const s=PC.defaultCallSheet();assert.equal(PC.parseCellRef('3-05',s).text,'Fb In');assert.equal(PC.parseCellRef('7 8',s).text,'FB In');assert.equal(PC.parseCellRef('12',s).text,'SRWI');assert.equal(PC.parseCellRef('8-01',s),null);assert.equal(PC.parseCellRef('1-09',s),null);assert.equal(PC.parseCellRef('x',s),null);});
test('call sheets sync for coach only and round-trip',async()=>{const{st,ff,sy}=setup();const cs=st.state.callSheets[0];cs.rows[0][0]='CH 9';st.markDirty('call_sheets',cs.id);await sy.push();assert.equal(ff.db.call_sheets.cs_wristband1.rows[0][0],'CH 9');
  const st2=PC.makeStore(mem());Object.assign(st2.real.sync,{teamCode:'TEAMCODE-TEST-0000000000',role:'coach',teamId:'team-x'});st2.real.callSheets=[];await PC.makeSync(st2,{url:'u',key:'k',fetch:ff.f}).pull();assert.equal(st2.state.callSheets[0].rows[0][0],'CH 9');
  const{rows,held}=PC.buildRows(Object.assign(PC.defaultState(),{callSheets:[PC.defaultCallSheet()],sync:{role:'player',teamId:'t',pitcherId:'p_woods',queue:{call_sheets:{cs_wristband1:1}}}}));assert.equal((rows.call_sheets||[]).length,0,'players never push call sheets');});
test('mid-game pitching change: each pitch keeps its own pitcher; count/state untouched; rows carry pitcher_id; switching back resumes',()=>{
  const g={id:'g_pc',lineup:Array.from({length:9},(_,i)=>({slot:i+1,name:'B'+i,hand:'R'})),pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0}};const c=g.cur;
  const throwP=(pid,res,loc)=>{const before=JSON.stringify(c);const o=PC.applyPitch(c,res);const r={id:PC.uuid(),pitcherId:pid,type:'FB',loc,result:res,b:c.b,s:c.s,end:o.end,targets:[]};g.pitches.push(r);c.b=o.b;c.s=o.s;if(o.end){c.outs+=o.outs;c.b=0;c.s=0;c.abn++;c.slot++;}return before;};
  ['called','swinging','swinging'].forEach(r=>throwP('p_woods',r,5));throwP('p_woods','ball',16);
  const snap=JSON.stringify(c);// switch mid at-bat (1-0): nothing in game state changes
  assert.equal(PC.pitchCount(g.pitches,'p_crich'),0);assert.equal(JSON.stringify(c),snap);
  ['called','swinging','swinging'].forEach(r=>throwP('p_crich',r,5));
  assert.equal(PC.pitchCount(g.pitches,'p_woods'),4);throwP('p_woods','called',2);assert.equal(PC.pitchCount(g.pitches,'p_woods'),5,'back to Avery resumes at 5');
  const W=PC.summarize(g.pitches.filter(p=>p.pitcherId==='p_woods')),C=PC.summarize(g.pitches.filter(p=>p.pitcherId==='p_crich'));
  assert.equal(W.k,1);assert.equal(W.strikes,4);assert.equal(C.k,1,'K finished by Jules goes to Jules');assert.equal(C.n,3);
  g.pitches.forEach(p=>assert.equal(PC.pitchRow(p,{mode:'game',game_id:g.id}).pitcher_id,p.pitcherId));});

test('official K rule: replaced with 2 strikes -> K to the original pitcher; pitches stay with thrower; walks unchanged',()=>{
  const ab=(rows)=>{const c={inning:1,outs:0,slot:0,b:0,s:0,abn:0};return rows.map(([pid,res])=>{const r={id:PC.uuid(),pitcherId:pid,result:res,b:c.b,s:c.s,abn:c.abn,inning:c.inning,slot:c.slot,type:'FB',loc:5};const o=PC.applyPitch(c,res);r.end=o.end;c.b=o.b;c.s=o.s;if(o.end){c.abn++;c.slot++;c.b=0;c.s=0;}return r;});};
  const sum=(all,id)=>PC.summarize(all.filter(p=>p.pitcherId===id),{all,pid:id});
  for(const fin of ['swinging','called','kd3','kd3out','foultip']){const all=ab([['A','called'],['A','swinging'],['A','foul'],['B','ball'],['B',fin]]);
    assert.equal(sum(all,'A').k,1,fin+' credited to A');assert.equal(sum(all,'B').k,0,fin);assert.equal(sum(all,'A').n,3);assert.equal(sum(all,'B').n,2);assert.equal(sum(all,'A').kd3,fin==='kd3'?1:0);}
  // relieved at 1 strike: reliever throws strike 2 and 3 -> reliever's K
  let all=ab([['A','called'],['B','swinging'],['B','swinging']]);assert.equal(sum(all,'A').k,0);assert.equal(sum(all,'B').k,1);
  // A threw strike 1, B strike 2, C strike 3 -> B (left with 2 strikes)
  all=ab([['A','called'],['B','called'],['C','swinging']]);assert.equal(sum(all,'B').k,1);assert.equal(sum(all,'C').k,0);
  // same pitcher whole AB
  all=ab([['A','called'],['A','called'],['A','called']]);assert.equal(sum(all,'A').k,1);
  // walk after change unchanged: goes to whoever threw ball 4
  all=ab([['A','ball'],['A','ball'],['A','called'],['A','called'],['B','ball'],['B','ball']]);assert.equal(sum(all,'A').k+sum(all,'B').k,0);assert.equal(all[5].end,'BB');assert.equal(all[5].pitcherId,'B');
  // without context summarize still counts raw (bullpen/legacy callers)
  all=ab([['A','called'],['A','swinging'],['B','swinging']]);assert.equal(PC.summarize(all.filter(p=>p.pitcherId==='B')).k,1);assert.equal(sum(all,'B').k,0);});
test('ring is competitive, way off is a miss, CH/drop low ring is good; raw strike % kept; game unchanged',()=>{
  const bp=(type,t,loc)=>({id:PC.uuid(),pitcherId:'p_larbus',type,targets:t==null?[]:[t],loc,hand:'N'});const M=(p)=>PC.pitchMiss(p,'R');
  // ring scored by normal distance
  assert.ok(M(bp('FB',3,12)).good,'aim 3, land 12 (1 off, ring) = on target');assert.ok(M(bp('FB',16,16)).good);assert.ok(M(bp('FB',16,4)).good,'aim 16, land 4 = 1 off');assert.ok(!M(bp('FB',16,11)).good,'16->11 is 2 boxes');
  // way off: miss at max-1, not a souvenir, regardless of target
  for(const w of [21,22,23,24]){const m=M(bp('FB',15,w));assert.equal(m.sev,PC.WAY_SEV);assert.equal(PC.WAY_SEV,3);assert.ok(!m.good&&!m.mm&&m.way);}
  assert.equal(M(bp('FB',2,21)).vert,'up');assert.equal(M(bp('FB',2,22)).vert,'down');
  // CH / drop / drop curve in the bottom ring = good even when aimed elsewhere; FB not; CH up still a miss
  for(const ty of ['CH','DR','DC'])for(const z of [13,18,14])assert.ok(M(bp(ty,1,z)).good,ty+' '+z);
  assert.ok(!M(bp('FB',1,14)).good);assert.ok(M(bp('CH',2,2)).chUp&&!M(bp('CH',2,2)).good,'CH-up rule kept');
  // report: competitive % = strikes + ring / all; raw strike % visible; way-off count
  const L=[bp('FB',3,3),bp('FB',3,12),bp('FB',9,17),bp('CH',8,18),bp('FB',16,16),bp('FB',3,21),bp('FB',9,22),bp('FB',5,5),bp('FB',1,1),bp('FB',2,2)];
  const r=PC.sessionReport(L,{p_larbus:'R'});assert.equal(r.n,10);assert.equal(r.strikes,4);assert.equal(r.strikePct,40);assert.equal(r.compPct,80);assert.equal(r.wayOff,2);
  assert.ok(r.feedback.some(x=>/2 pitches way off/.test(x)),JSON.stringify(r.feedback));assert.ok(!r.feedback.some(x=>/Only \d+% (strikes|competitive)/.test(x)),'40% strikes but 80% competitive -> no ding');
  assert.deepEqual(r.waste,{n:1,good:1});
  const md=PC.missData(L.map(p=>({p})));assert.equal(md.cells[3].land[21].n,1);assert.equal(md.cells[3].land[21].sev,3);assert.equal(md.cells[8].good,1,'CH low ring good on heat map');
  // drill-down landing data and actual heat data tolerate way-off spots
  assert.equal(PC.heatData(L.map(p=>({p})),{},'actual').total,8);assert.equal(PC.locInfo(21,'R').label,'way high (not competitive)');
  // bullpen summarize: raw strike %, competitive %, way off
  const s=PC.summarize(L);assert.equal(s.strikePct,40);assert.equal(s.compPct,80);assert.equal(s.wayOff,2);
  // game: strike % unchanged (GameChanger), low ring not auto-good, way off can be recorded and synced
  const g=L.map((p,i)=>Object.assign({},p,{abn:i,inning:1,result:PC.isZone(p.loc)?'called':'ball'}));assert.equal(PC.summarize(g).strikePct,40);assert.ok(!PC.pitchMiss(Object.assign({},bp('CH',1,14),{abn:1,inning:1}),'R').good);
  const st=PC.defaultState();st.sync={queue:{pitchers:{},games:{},sessions:{},pitches:{},call_sheets:{}},tomb:{}};PC.mergeRemote(st,{pitches:[{id:PC.uuid(),mode:'bullpen',session_id:'s1',pitcher_id:'p_woods',loc:22,targets:[8],type:'FB',ts:1}],sessions:[{id:'s1',date:'d'}]});
  assert.equal(st.sessions.find(x=>x.id==='s1').pitches[0].loc,22,'way-off loc survives a pull');});
test('round1: pitching-coach roleAllows + notes rows + bb column',()=>{const sy={role:'pcoach',pitcherIds:['p_a','p_b']};
  assert.ok(PC.roleAllows(sy,'sessions',{pitcher_id:'p_a'}));assert.ok(!PC.roleAllows(sy,'sessions',{pitcher_id:'p_c'}));
  assert.ok(PC.roleAllows(sy,'pitches',{mode:'bullpen',pitcher_id:'p_b'}));assert.ok(!PC.roleAllows(sy,'pitches',{mode:'game',pitcher_id:'p_b'}));assert.ok(!PC.roleAllows(sy,'pitches',{mode:'bullpen',pitcher_id:'p_c'}));
  assert.ok(PC.roleAllows(sy,'notes',{pitcher_id:'p_a'}));assert.ok(!PC.roleAllows(sy,'notes',{pitcher_id:'p_c'}));
  for(const t of ['pitchers','games','call_sheets'])assert.ok(!PC.roleAllows(sy,t,{id:'x'}),t);
  assert.ok(!PC.roleAllows({role:'player',pitcherId:'p_a'},'notes',{pitcher_id:'p_a'}),'players never write notes');
  const st=PC.defaultState();st.sync={role:'pcoach',pitcherIds:['p_woods'],teamId:'t',queue:{notes:{},pitches:{}},tomb:{}};st.notes.push({id:'n_s1_p_woods',pitcherId:'p_woods',sessionId:'s1',body:'Keep it low'},{id:'n_g1_p_crich',pitcherId:'p_crich',gameId:'g1',body:'x'});
  st.sync.queue.notes={n_s1_p_woods:1,n_g1_p_crich:1};const b=PC.buildRows(st);assert.equal(b.rows.notes.length,1);assert.equal(b.rows.notes[0].body,'Keep it low');assert.equal(b.held,1);
  const s2=PC.defaultState();s2.sync={queue:{pitchers:{},games:{},sessions:{},pitches:{},call_sheets:{},notes:{}},tomb:{}};PC.mergeRemote(s2,{notes:[{id:'n_s1_p_woods',pitcher_id:'p_woods',session_id:'s1',body:'Keep it low',author:'pcoach',updated_at:'2026-10-13'}]});
  assert.equal(PC.findNote(s2,{sessionId:'s1',pitcherId:'p_woods'}).body,'Keep it low');assert.equal(PC.noteId({gameId:'g1',pitcherId:'p_a'}),'n_g1_p_a');
  assert.equal(PC.pitchRow({id:'x',bb:'LD'},{mode:'game'}).bb,'LD');assert.equal(PC.pitchRow({id:'x',bb:'ZZ'},{mode:'game'}).bb,null);});
test('round1: count stats, first-pitch strike, 0-2 outcomes',()=>{const c={inning:1,outs:0,slot:0,b:0,s:0,abn:0};const P=[];
  const pt=(res,type,loc,ip)=>{const r={id:PC.uuid(),pitcherId:'p',type,loc,targets:[loc],result:res,ip:ip||null,b:c.b,s:c.s,abn:c.abn,inning:c.inning,slot:c.slot};const o=PC.applyPitch(c,res,ip);r.end=o.end;c.b=o.b;c.s=o.s;if(o.end){c.abn++;c.slot++;c.b=0;c.s=0;}P.push(r);};
  pt('called','FB',3);pt('swinging','CH',7);pt('swinging','FB',2);// K from 0-2
  pt('ball','FB',16);pt('called','FB',5);pt('inplay','CB',9,'1B');
  pt('called','FB',1);pt('foul','FB',3);pt('ball','DR',18);pt('inplay','DR',8,'out');// 0-2 -> 1-2 -> out
  const s=PC.countStats(P);assert.equal(s.by['0-0'].n,3);assert.equal(s.fps,2);assert.equal(s.fpsN,3);assert.equal(Math.round(s.fpsPct),67);
  assert.equal(s.by['0-2'].n,2);assert.deepEqual(s.by['0-1'].types,{CH:1,FB:1});assert.equal(s.o2.n,2);assert.equal(s.o2.K,1);assert.equal(s.o2.out,1);assert.equal(s.o2.hit,0);
  assert.equal(s.by['1-1'].n,1);assert.equal(s.by['1-1'].strikePct,100,'in play counts as a strike (GameChanger)');});
test('round1: trends, rest days, alerts',()=>{const st=PC.defaultState();
  st.games.push({id:'g1',date:'2026-10-01',opponent:'A',lineup:[],cur:{},pitches:Array.from({length:62},(_,i)=>({id:'a'+i,pitcherId:'p_woods',type:'FB',loc:i%5?3:12,targets:[3],result:i%3?'called':'ball',abn:i,inning:1,b:0,s:0,ts:1000+i}))});
  st.sessions.push({id:'s1',date:'2026-10-05',pitcherId:'p_woods',pitches:Array.from({length:10},(_,i)=>({id:'b'+i,pitcherId:'p_woods',type:'FB',loc:i<8?3:5,targets:[3],ts:5000+i}))});
  const t=PC.trendPoints(st,'p_woods','all');assert.equal(t.length,2);assert.equal(t[0].kind,'game');assert.equal(t[0].n,62);assert.equal(t[1].kind,'bullpen');assert.equal(t[1].goodPct,80);assert.equal(t[1].compPct,100);
  assert.equal(PC.trendPoints(st,'p_woods','game').length,1);assert.equal(PC.trendPoints(st,'p_woods','bullpen').length,1);
  assert.equal(PC.restDays(20),0);assert.equal(PC.restDays(21),1);assert.equal(PC.restDays(62),3);assert.equal(PC.restDays(90),4);assert.equal(PC.restDays(30,[{max:40,days:2},{max:9999,days:5}]),2);
  const ri=PC.restInfo(st,'p_woods','2026-10-03');assert.equal(ri.n,62);assert.equal(ri.days,3);assert.equal(ri.ready,'2026-10-05');assert.equal(ri.ok,false);assert.equal(PC.restInfo(st,'p_woods','2026-10-05').ok,true);
  assert.equal(PC.restInfo(st,'p_crich','2026-10-05'),null);
  assert.deepEqual(PC.alertLevel(74),{lvl:-1,at:null,next:75});assert.equal(PC.alertLevel(75).lvl,0);assert.equal(PC.alertLevel(91).at,90);assert.equal(PC.alertLevel(50,[40,60]).at,40);});
// ---------- workload: today / tournament weekend pitch counts, soft limits, team settings sync ----------
test('weekendRange: Fri-Sun is the tournament weekend; Mon-Thu looks back at the last one',()=>{
  assert.deepEqual(PC.weekendRange('2026-10-16'),{from:'2026-10-16',to:'2026-10-18',current:true}); // Fri
  assert.deepEqual(PC.weekendRange('2026-10-18'),{from:'2026-10-16',to:'2026-10-18',current:true}); // Sun
  assert.deepEqual(PC.weekendRange('2026-10-13'),{from:'2026-10-09',to:'2026-10-11',current:false}); // Tue
  assert.deepEqual(PC.weekendRange('2026-10-15'),{from:'2026-10-09',to:'2026-10-11',current:false});}); // Thu
test('workload counts game and bullpen pitches separately for today and the weekend',()=>{
  const at=(d,h)=>new Date(d+'T'+String(h).padStart(2,'0')+':00:00').getTime();
  const gp=(pid,ts,x)=>Object.assign({id:PC.uuid(),pitcherId:pid,ts,type:'FB',result:'ball'},x||{});
  const st=PC.defaultState();
  st.games.push({id:'g1',date:'2026-10-16',pitches:[gp('p_a',at('2026-10-16',9)),gp('p_a',at('2026-10-16',9)),gp('p_b',at('2026-10-16',9)),gp('p_a',at('2026-10-16',9),{noPitch:true}),gp('p_a',at('2026-10-16',9),{deleted:true})]});
  st.games.push({id:'g2',date:'2026-10-17',pitches:[gp('p_a',at('2026-10-17',10)),gp('p_a',at('2026-10-17',14)),gp('p_a',at('2026-10-17',15))]});
  st.games.push({id:'g0',date:'2026-10-11',pitches:[gp('p_a',at('2026-10-11',10))]}); // previous weekend
  st.sessions.push({id:'s1',date:'2026-10-17',pitches:[gp('p_a',at('2026-10-17',8)),gp('p_a',at('2026-10-17',8))]});
  st.sessions.push({id:'s2',date:'2026-10-17',pitcherId:'p_a',pitches:[{id:PC.uuid(),ts:at('2026-10-17',13),type:'CH'}]}); // pitcher on the session only
  const w=PC.workload(st,'p_a','2026-10-17');
  assert.deepEqual(w.today,{game:3,bullpen:3});assert.deepEqual(w.weekend,{game:5,bullpen:3});
  assert.equal(PC.workloadText(w),'Today: 3 game + 3 bullpen · Weekend: 5 game + 3 bullpen');
  assert.equal(PC.workloadShort(w),'Today 6 · Wknd 8'); // slim header form
  const tue=PC.workload(st,'p_a','2026-10-20');assert.deepEqual(tue.today,{game:0,bullpen:0});assert.deepEqual(tue.weekend,{game:5,bullpen:3});
  assert.match(PC.workloadText(tue),/Last weekend: 5 game \+ 3 bullpen$/);
  assert.deepEqual(PC.workload(st,'p_a','2026-10-11').today,{game:1,bullpen:0});});
test('soft day/weekend limits: off by default, warn near, alert at/over; weekend limit only during the weekend',()=>{
  const w=(tg,tb,wg,wb,cur)=>({today:{game:tg,bullpen:tb},weekend:{game:wg,bullpen:wb},wk:{current:cur!==false}});
  assert.equal(PC.workloadAlert(w(100,50,300,100),PC.DEFAULT_LIMITS).lvl,-1);
  assert.equal(PC.workloadAlert(w(50,20,70,20),{day:80}).lvl,0); // 70 >= 68
  const a=PC.workloadAlert(w(70,10,90,10),{day:80,weekend:150});assert.equal(a.lvl,1);assert.equal(a.day.lvl,1);assert.equal(a.day.n,80);assert.equal(a.weekend.lvl,-1);
  assert.equal(PC.workloadAlert(w(0,0,160,0),{weekend:150}).lvl,1);assert.equal(PC.workloadAlert(w(0,0,160,0,false),{weekend:150}).lvl,-1);
  assert.equal(PC.cleanLimit('90'),90);assert.equal(PC.cleanLimit(''),null);assert.equal(PC.cleanLimit('-3'),null);});
test('defaults: rest guide is off, limits off; old saved state gets them',()=>{const d=PC.defaultState();assert.equal(d.settings.showRest,false);assert.deepEqual(d.settings.limits,{day:null,weekend:null});
  const m=mem();const s0=PC.defaultState();delete s0.settings.limits;delete s0.settings.showRest;m.setItem(PC.KEY,JSON.stringify(s0));const st=PC.makeStore(m);assert.equal(st.state.settings.showRest,false);assert.deepEqual(st.state.settings.limits,{day:null,weekend:null});});
test('team settings sync: coach only, round-trips alerts/limits/rest guide, never pushed by markAllDirty',async()=>{const{st,ff,sy}=setup();
  Object.assign(st.state.settings,{alerts:[60,80],limits:{day:85,weekend:200},showRest:true});st.markDirty('team_settings','team');await sy.push();
  const row=ff.db.team_settings.team;assert.deepEqual(row.alerts,[60,80]);assert.equal(row.day_limit,85);assert.equal(row.weekend_limit,200);assert.equal(row.show_rest,true);
  for(const role of ['player','pcoach','viewer'])assert.ok(!PC.roleAllows({role,pitcherIds:['p_a'],pitcherId:'p_a'},'team_settings',row),role);
  const s2=PC.defaultState();s2.sync={queue:{team_settings:{}},tomb:{}};PC.mergeRemote(s2,{team_settings:[{id:'team',alerts:[70],day_limit:90,weekend_limit:null,show_rest:false,rest:[],updated_at:'2026-10-13'}]});
  assert.deepEqual(s2.settings.alerts,[70]);assert.deepEqual(s2.settings.limits,{day:90,weekend:null});assert.equal(s2.settings.showRest,false);assert.equal(s2.settings.rest.length,PC.DEFAULT_REST.length);
  const s3=PC.makeStore(mem());s3.real.sync.teamCode='X';s3.markAllDirty();assert.ok(!Object.keys(s3.real.sync.queue.team_settings||{}).length,'a new coach phone must not overwrite team settings with its defaults');});
// ---------- game / bullpen mutually exclusive ----------
test('modeLock: a game in progress blocks the bullpen; an open bullpen blocks starting a game',()=>{const st=PC.defaultState();
  const g={id:'g1',started:1,status:'active',opponent:'Storm',cur:{inning:1},pitches:[]};st.games.push(g);st.activeGame='g1';
  assert.equal(PC.modeLock(st,'bullpen',true).by,'game');assert.equal(PC.modeLock(st,'game',true),null);
  assert.equal(PC.modeLock(st,'bullpen',false),null,'roles without game mode are never locked');
  g.ended=2;g.status='final';assert.equal(PC.modeLock(st,'bullpen',true),null,'ended game does not block');
  st.activeGame=null;const s={id:'s1',pitches:[]};st.sessions.push(s);st.activeSession='s1';assert.equal(PC.modeLock(st,'game',true),null,'empty session blocks nothing');
  s.pitches.push({id:'x',type:'FB'});assert.equal(PC.modeLock(st,'game',true).by,'bullpen');assert.match(PC.LOCK_MSG.bullpen,/end or pause the bullpen/);
  s.pitches[0].deleted=true;assert.equal(PC.modeLock(st,'game',true),null);});
test('paused games and sessions are listed for resume',()=>{const st=PC.defaultState();
  st.games.push({id:'a',started:1,status:'active',pitches:[]},{id:'b',started:2,ended:3,status:'final',pitches:[]},{id:'c',status:'scheduled',pitches:[]},{id:'d',started:5,status:'active',pitches:[]});st.activeGame='d';
  assert.deepEqual(PC.pausedGames(st).map(g=>g.id),['a']);
  st.sessions.push({id:'s1',paused:5,pitches:[{id:'p'}]},{id:'s2',paused:6,pitches:[]},{id:'s3',pitches:[{id:'q'}]});assert.deepEqual(PC.pausedSessions(st).map(s=>s.id),['s1']);});
// ---------- Gameday-style markers ----------
test('pitchMark: good / miss / souvenir, and competitive when nothing was aimed',()=>{
  assert.equal(PC.pitchMark({type:'FB',targets:[1],loc:1}),'good');assert.equal(PC.pitchMark({type:'FB',targets:[1],loc:2}),'good');
  assert.equal(PC.pitchMark({type:'FB',targets:[1],loc:9}),'miss');assert.equal(PC.pitchMark({type:'FB',targets:[1],loc:5}),'souvenir');
  assert.equal(PC.pitchMark({type:'FB',targets:[5],loc:5}),'good','aimed middle is not a souvenir');
  assert.equal(PC.pitchMark({type:'FB',targets:[],loc:13}),'good');assert.equal(PC.pitchMark({type:'FB',targets:[],loc:22}),'miss');
  assert.equal(PC.pitchMark({type:'FB',targets:[1],loc:null}),null);});
test('recentPitches numbers the at-bat / session in sequence and keeps the last n',()=>{const L=[{id:1},{id:2,noPitch:true},{id:3},{id:4,deleted:true},{id:5}];
  assert.deepEqual(PC.recentPitches(L).map(x=>[x.p.id,x.no]),[[1,1],[3,2],[5,3]]);assert.deepEqual(PC.recentPitches(L,2).map(x=>x.no),[2,3]);});
test('band setup: cell codes, unmapped cells grouped by call, chosen aims', () => {
  const sh = PC.defaultCallSheet();
  assert.equal(PC.cellCode(sh, 2, 4), '3-05');
  const u = PC.unmappedCells(sh, []);
  const cells = u.reduce((n, g) => n + g.cells.length, 0);
  assert.equal(cells, 9); // 47 of 56 map from the text; 9 have a type but no spot
  const chg = u.find(g => g.norm === 'CH');
  assert.deepEqual(chg.cells.sort(), ['2-08', '3-04', '7-06'].sort());
  assert.equal(PC.bandSetupDone(sh, []), false);
  sh.aims = {}; u.forEach(g => sh.aims[g.norm] = 0); sh.aims.CH = 8;
  assert.equal(PC.bandSetupDone(sh, []), true);
  assert.equal(PC.bandAim(sh, PC.parseCall('CHG', 'R', 'R')), 8);
  assert.equal(PC.bandAim(sh, PC.parseCall('SRW', 'R', 'R')), null); // "no spot"
  assert.equal(PC.bandAim(sh, PC.parseCall('Fb In', 'R', 'R')), null); // already mapped: text wins
});

test('report strikes follow the umpire result in games, the zone in the bullpen (Oct 14 bug)', () => {
  const g = [ { type: 'FB', loc: 11, result: 'called', abn: 1, inning: 1, targets: [] },  // called strike off the plate
              { type: 'FB', loc: 5, result: 'ball', abn: 1, inning: 1, targets: [] },     // ball in the zone (umpire said ball)
              { type: 'FB', loc: 12, result: 'foul', abn: 1, inning: 1, targets: [3] },
              { type: 'FB', loc: null, noPitch: true, result: null, abn: 2, inning: 1 } ]; // IBB: not a pitch
  const r = PC.sessionReport(g, {});
  assert.equal(r.types.FB.stats.n, 3);
  assert.equal(r.types.FB.stats.strikes, 2);
  assert.equal(r.types.FB.stats.called, 1);
  assert.equal(PC.summarize(g).strikes, r.types.FB.stats.strikes); // Stats and report agree
  const bp = [ { type: 'FB', loc: 5, targets: [5] }, { type: 'FB', loc: 11, targets: [5] } ];
  assert.equal(PC.sessionReport(bp, {}).types.FB.stats.strikes, 1); // bullpen: no result → zone decides
});

// ---------------- v39 (Code Reviewer fixes) ----------------
const memStore=()=>{const m={};return{getItem:k=>m[k]??null,setItem:(k,v)=>m[k]=v,removeItem:k=>delete m[k]};};
const coachStore=()=>{const st=PC.makeStore(memStore());const s=st.real;s.sync.teamCode='X';s.sync.teamId='t';s.sync.role='coach';return st;};
const mockFetch=(rule,log)=>async(url,o)=>{o=o||{};if(/\/rpc\/whoami/.test(url))return rule.whoami?rule.whoami():{ok:true,text:async()=>JSON.stringify({role:'coach',team_id:'t'})};
  if(o.method==='POST'){const rows=JSON.parse(o.body);const bad=rows.find(r=>rule.reject&&rule.reject(r));if(bad)return{ok:false,status:rule.status||403,text:async()=>'row-level security'};rows.forEach(r=>log.push(url.split('/').pop().split('?')[0]+':'+r.id));return{ok:true,text:async()=>''};}
  log.push('GET '+decodeURIComponent(url));return{ok:true,json:async()=>(rule.pages?rule.pages(url):[])};};
test('push: a 403 row is retried row by row; good rows and later tables still go, the reject is quarantined',async()=>{const st=coachStore(),s=st.real;
  s.sessions.push({id:'s1',date:'2026-10-14',pitches:[{id:PC.uuid(),pitcherId:'p_woods',ts:1,type:'FB',loc:5},{id:'BAD',pitcherId:'p_woods',ts:2,type:'FB',loc:5}]});st.markAllDirty();const log=[];
  const r=await PC.makeSync(st,{url:'u',key:'k',fetch:mockFetch({reject:r=>r.id==='BAD'},log)}).push();
  assert.equal(r.rejected,1);assert.ok(log.some(x=>/^pitches:/.test(x)&&!/BAD/.test(x)));assert.ok(log.some(x=>/^sessions:/.test(x)));assert.ok(s.sync.rejected['pitches:BAD']);assert.equal(s.sync.rejected['pitches:BAD'].status,403);});
test('push: every row 401 and whoami says the code is gone -> halt, nothing quarantined, all still queued',async()=>{const st=coachStore(),s=st.real;st.markAllDirty();const n0=st.pendingCount();
  const r=await PC.makeSync(st,{url:'u',key:'k',fetch:mockFetch({reject:()=>true,status:401,whoami:()=>({ok:true,text:async()=>''})},[])}).push();
  assert.ok(r.error&&/not recognized/.test(r.error));assert.equal(Object.keys(s.sync.rejected||{}).length,0);assert.equal(st.pendingCount(),n0);});
test('push: every row 403 but whoami says the coach code is fine -> rows quarantined, other tables continue',async()=>{const st=coachStore(),s=st.real;st.markAllDirty();const log=[];
  const r=await PC.makeSync(st,{url:'u',key:'k',fetch:mockFetch({reject:r=>r.throws!=null,status:403},log)}).push(); // only pitcher rows refused
  assert.ok(!r.error);assert.ok(r.rejected>=1);assert.ok(log.some(x=>/^call_sheets:/.test(x)));});
test('rejected rows: list, retry (re-queued) and discard',()=>{const st=coachStore(),s=st.real;PC.quarantine(s,'pitches','a',403,'rls');PC.quarantine(s,'games','g',400,'bad');
  assert.equal(PC.rejectedList(s).length,2);assert.ok(PC.retryRejected(s,'pitches:a'));assert.ok(s.sync.queue.pitches.a);assert.ok(PC.discardRejected(s,'games:g'));assert.equal(PC.rejectedList(s).length,0);});
test('pull: incremental since last updated_at (2-min overlap) with keyset paging, never offset',async()=>{const st=coachStore(),s=st.real;const log=[];
  const big=Array.from({length:1000},(_,i)=>({id:'p'+String(i).padStart(4,'0'),updated_at:'2026-10-14T12:00:00.000Z',name:'A',throws:'R'}));
  const pages=url=>/\/pitchers\?/.test(url)&&!/id\.gt/.test(url)?big:[];
  const sy=PC.makeSync(st,{url:'u',key:'k',fetch:mockFetch({pages},log)});await sy.pull();
  assert.ok(!log.some(x=>/offset=/.test(x)));assert.ok(log.some(x=>/pitchers\?.*or=\(updated_at\.gt\.2026-10-14T12:00:00\.000Z,and\(updated_at\.eq\.2026-10-14T12:00:00\.000Z,id\.gt\.p0999\)\)/.test(x)));
  assert.equal(s.sync.seen.pitchers,'2026-10-14T12:00:00.000Z');log.length=0;await sy.pull();
  assert.ok(log.some(x=>/pitchers\?.*updated_at=gte\.2026-10-14T11:58:00\.000Z/.test(x)),'second pull is incremental');});
test('sessions: last writer wins by updated_at for every field',()=>{const st=coachStore(),s=st.real;s.sessions.push({id:'s1',date:'2026-10-13',pitcherId:'p_woods',pitches:[],_u:'2026-10-14T10:00:00Z'});
  PC.mergeRemote(s,{sessions:[{id:'s1',date:'2026-10-14',pitcher_id:'p_crich',updated_at:'2026-10-14T11:00:00Z'}]});assert.equal(s.sessions[0].date,'2026-10-14');assert.equal(s.sessions[0].pitcherId,'p_crich');
  PC.mergeRemote(s,{sessions:[{id:'s1',date:'2026-10-01',pitcher_id:'p_woods',updated_at:'2026-10-14T09:00:00Z'}]});assert.equal(s.sessions[0].date,'2026-10-14');});
test('scoring lock: only the starting phone scores; others view; take over moves the lock',()=>{
  assert.ok(PC.canScore(null,'A'));assert.ok(PC.canScore({},'A'),'legacy box with no owner stays open');
  const g={id:'g',scorer:'A'};assert.ok(PC.canScore(g,'A'));assert.ok(!PC.canScore(g,'B'));assert.ok(PC.lockedBox(g,'B'));assert.ok(!PC.lockedBox(g,'A'));
  assert.equal(PC.claimScoring(g,'B'),true);assert.equal(g.scorer,'B');assert.ok(PC.lockedBox(g,'A'));assert.equal(PC.claimScoring(g,'B'),false);assert.equal(PC.claimScoring(g,''),false);
  g.ended=1;assert.ok(PC.canEditBox(g,'B','coach'),'the scorer can still edit after the game');assert.ok(!PC.canEditBox(g,'A','coach'));
  assert.ok(!PC.canEditBox(g,'B','viewer'));assert.ok(!PC.canEditBox(g,'B','unknown'));assert.ok(PC.canEditBox({id:'legacy'},'A','coach'));});
test('scoring lock syncs: games carry cur.scorer (no schema change), the count is plain last-writer, no pn field',()=>{const st=coachStore(),s=st.real;
  s.games.push({id:'g',date:'d',opponent:'o',homeAway:'home',lineup:[],pitches:[],cur:{inning:2,outs:1,slot:3,b:2,s:1,abn:7},scorer:'A'});s.sync.queue.games.g=1;
  const row=PC.buildRows(s).rows.games[0];assert.equal(row.cur.scorer,'A');assert.equal(row.cur.pn,undefined);delete s.sync.queue.games.g;
  PC.mergeRemote(s,{games:[{id:'g',date:'d',opponent:'o',home_away:'home',cur:{inning:3,outs:0,slot:0,b:0,s:0,abn:9,scorer:'B'},updated_at:'2026-10-14T12:00:00Z'}]});
  assert.equal(s.games[0].scorer,'B','takeover on another phone arrives');assert.equal(s.games[0].cur.abn,9);});
test('scoring lock for sessions: device_id until the scorer column migration is applied, then the scorer column',()=>{const st=coachStore(),s=st.real;
  s.sessions.push({id:'s1',date:'2026-10-13',pitches:[],scorer:'A'});s.sync.queue.sessions.s1=1;
  assert.equal('scorer' in PC.buildRows(s).rows.sessions[0],false,'column not sent while the migration is unapplied');
  s.sync.scorerCol=true;assert.equal(PC.buildRows(s).rows.sessions[0].scorer,'A');delete s.sync.queue.sessions.s1;
  PC.mergeRemote(s,{sessions:[{id:'s1',date:'2026-10-13',device_id:'C',updated_at:'2026-10-14T11:00:00Z'}]});assert.equal(s.sessions[0].scorer,'C');
  PC.mergeRemote(s,{sessions:[{id:'s1',date:'2026-10-13',device_id:'C',scorer:'D',updated_at:'2026-10-14T12:00:00Z'}]});assert.equal(s.sessions[0].scorer,'D');});
test('rowPitch keeps every valid spot (zone, ring, way off 21-24) and drops junk',()=>{const p=PC.rowPitch({id:'a',mode:'bullpen',targets:[3,11,21,24,10,19,25,0,'x'],loc:22});assert.deepEqual(p.targets,[3,11,21,24]);assert.equal(p.loc,22);assert.equal(PC.rowPitch({id:'b',mode:'bullpen',loc:19}).loc,null);});
test('game zone tap: a call with no spot aims first; the cell above box 3 is zone 12',()=>{
  const ch={aimEdit:false,shook:false,called:true,type:'CH',targets:[]};
  assert.equal(PC.gameZoneAction(ch,12).action,'bad_target');assert.equal(PC.gameZoneAction(ch,3).action,'bad_target');
  assert.deepEqual(PC.gameZoneAction(ch,8),{action:'aim',z:8});assert.deepEqual(PC.gameZoneAction(ch,31),{action:'aim',z:31});assert.deepEqual(PC.gameZoneAction(ch,21),{action:'aim',z:21});
  assert.deepEqual(PC.gameZoneAction(Object.assign({},ch,{targets:[8]}),12),{action:'loc',z:12});
  assert.deepEqual(PC.gameZoneAction({aimEdit:false,shook:false,called:true,type:'FB',targets:[6]},12),{action:'loc',z:12});
  assert.deepEqual(PC.gameZoneAction({aimEdit:true,shook:false,called:true,type:'FB',targets:[6]},12),{action:'aim',z:12});
  assert.deepEqual(PC.gameZoneAction({aimEdit:false,shook:true,called:true,type:'CH',targets:[]},8),{action:'aim',z:8});
  const bare={type:null,targets:[],loc:5};const rep=PC.sessionReport([bare,{type:'CH',targets:[8],loc:31,result:'ball'}]);
  assert.ok(rep.types['?']);assert.equal(rep.types.CH.stats.called,1);assert.ok(!rep.types.CH.feedback.join(' ').includes('no spot'));});
test("change-up targets: only 4, 7, 8, 9, 13, 14, 18; high CH calls (CH H+, CH H, CH 2) get no spot and are flagged",()=>{assert.deepEqual(PC.CH_TARGETS,[4,7,8,9,13,14,18]);assert.deepEqual(PC.aimOpts('CH'),[4,7,8,9,13,14,18]);assert.equal(PC.aimOpts('FB').length,17);
  for(const c of ['CH H+','CH H','CH 2','CH15']){const p=PC.parseCall(c,'R','R');assert.equal(p.type,'CH');assert.deepEqual(p.targets,[]);assert.ok(p.chHigh,c);}
  for(const [c,z] of [['CH7',7],['CHG 9',9],['CH L',8],['CH13',13]]){const p=PC.parseCall(c,'R','R');assert.deepEqual(p.targets,[z]);assert.ok(!p.chHigh);}
  assert.equal(PC.bullpenTap({type:'CH'},2).action,'bad_target');assert.equal(PC.bullpenTap({type:'CH'},8).action,'target');assert.equal(PC.bullpenTap({type:'FB'},2).action,'target');
  assert.ok(PC.pitchMiss({type:'CH',targets:[2],loc:2}).badAim);assert.ok(!PC.pitchMiss({type:'CH',targets:[8],loc:8}).badAim);
  const sh={rows:[['CH H+']],aims:{'CH H+':2}};assert.equal(PC.bandAim(sh,PC.parseCall('CH H+','R','R')),null);sh.aims['CH H+']=8;assert.equal(PC.bandAim(sh,PC.parseCall('CH H+','R','R')),8);
  assert.equal(PC.pitchMiss({type:'CH',targets:[8],loc:2}).chUp,true);}); // the CH-up miss rule still applies
test('hitSpot uses pitchMiss: Stats Spot% and the report agree, a CH up never counts as a hit',()=>{assert.equal(PC.hitSpot({type:'CH',targets:[2],loc:2}),false);assert.equal(PC.hitSpot({type:'FB',targets:[11],loc:11}),true);assert.equal(PC.hitSpot({type:'FB',targets:[],loc:5}),false);
  const P=[{type:'CH',targets:[2],loc:2},{type:'FB',targets:[4],loc:4},{type:'CH',targets:[8],loc:8}];assert.equal(PC.summarize(P).spot,PC.sessionReport(P).hits);});
test('localDate: 9:30 PM ET stays on the same day (UTC would roll to tomorrow)',()=>{const old=process.env.TZ;process.env.TZ='America/New_York';try{const ts=Date.parse('2026-10-16T21:30:00-04:00');assert.equal(PC.localDate(ts),'2026-10-16');assert.notEqual(new Date(ts).toISOString().slice(0,10),'2026-10-16');}finally{process.env.TZ=old;}});
test('no UI code builds a date from UTC (toISOString().slice(0,10))',()=>{const fs=require('fs'),path=require('path');const dir=path.join(__dirname,'..','js','ui');for(const f of fs.readdirSync(dir))assert.ok(!/toISOString\(\)\.slice\(0,\s*10\)/.test(fs.readFileSync(path.join(dir,f),'utf8')),f);});
test('heatSummary (Miss / Landed) accounts for every pitch: no-aim and souvenir counts',()=>{const items=[{p:{type:'FB',targets:[2],loc:5}},{p:{type:'FB',targets:[4],loc:4}},{p:{type:'FB',targets:[],loc:6}},{p:{type:'FB',targets:[],loc:null}}];
  const m=PC.missData(items,{});assert.equal(PC.heatSummary(m,true),"Showing 2 of 4 pitches (the ones with an aim). Box = where she aimed · color = how far off. 🎁 1 souvenir. 2 with no aim aren't shown – see Landed.");
  const l=PC.heatData(items,{},'actual');assert.equal(PC.heatSummary(l,false),'3 pitches · where they landed · 1 pitch with no location left out');
  assert.equal(PC.heatSummary(PC.missData([{p:{type:'FB',targets:[4],loc:4}}],{}),true),'Showing 1 of 1 pitch (the ones with an aim). Box = where she aimed · color = how far off.');});
test('miss directions: one list, topDir, bestWeak',()=>{assert.deepEqual(PC.MISS_DIRS,['up','down','in','away','glove side','arm side']);assert.deepEqual(PC.topDir({up:1,away:3}),['away',3]);
  const r=PC.bestWeak([{goodPct:90,avgMiss:.5},{goodPct:40,avgMiss:2}]);assert.equal(r.best.goodPct,90);assert.equal(r.weakest.goodPct,40);assert.equal(PC.bestWeak([{goodPct:90,avgMiss:.5}]).weakest,null);
  assert.equal(PC.isMiddleMiss,undefined);});
test('syncWhy: plain-words reason per status (raw text never needed)',()=>{assert.equal(PC.syncWhy({status:401,error:'JWT expired'}),'Your sign-in ran out. Tap Retry – it will send after you sign in again.');
  assert.equal(PC.syncWhy({status:403,error:'new row violates row-level security'}),"This phone isn't allowed to save that. Ask your coach to check your team code.");
  assert.equal(PC.syncWhy({status:409}),'This was already saved from another phone. Usually safe to Discard.');assert.equal(PC.syncWhy({status:400,error:'duplicate key value violates unique constraint "games_pkey"'}),PC.SYNC_WHY.dup);
  for(const s of [400,404,422])assert.equal(PC.syncWhy({status:s,error:'x'}),"The server couldn't read this change. Try Retry; if it fails again, Discard.");});

test('shake-off: summary per pitcher – shook vs followed, hard contact, K, prev pitch in the at-bat',()=>{
  const P=[{id:'a',ts:1,abn:1,b:0,s:1,type:'CH',call:'CH8',loc:8,result:'foul'},
    {id:'b',ts:2,abn:1,b:0,s:2,type:'FB',call:'CH8',shook:true,loc:5,result:'inplay',ip:'2B',bb:'LD'},
    {id:'c',ts:3,abn:2,b:0,s:0,type:'FB',call:'FB3',loc:3,result:'called'},
    {id:'d',ts:4,abn:2,b:0,s:1,type:'DR',call:'FB3',shook:true,loc:7,result:'swinging',end:'K'}];
  const r=PC.shakeoffs(P);assert.equal(r.n,2);assert.equal(r.shook.hits,1);assert.equal(r.shook.hard,1);assert.equal(r.shook.k,1);assert.equal(r.followed.n,2);assert.equal(r.followed.hits,0);
  assert.deepEqual(r.list[0],{id:'b',called:'CH8',thrown:'FB 5',count:'0-2',prev:'CH · Foul',outcome:'2B (LD)',inning:undefined,batter:''});
  assert.equal(r.list[1].prev,'FB · Called strike');assert.match(r.list[1].outcome,/Swinging strike · K/);});
test('shake-off scoring: hit spot uses her own aim only; unknown aim = no aim (never the coach call)',()=>{
  assert.equal(PC.hitSpot({type:'FB',call:'CH8',shook:true,targets:[],loc:8}),false);assert.equal(PC.summarize([{type:'FB',call:'CH8',shook:true,targets:[],loc:8,result:'called'}]).spotN,0,'no aim = left out of hit-spot %');
  assert.equal(PC.pitchMiss({type:'FB',call:'CH8',shook:true,targets:[],loc:8}),null);
  assert.ok(PC.pitchMiss({type:'FB',call:'CH8',shook:true,targets:[5],loc:5}));});
test('shake-off syncs on today\'s schema (call_raw tag) and via the shook column once enabled',()=>{const st=coachStore(),s=st.real;
  s.sessions.push({id:'s1',date:'d',pitches:[]});s.games.push({id:'g',date:'d',opponent:'o',homeAway:'home',lineup:[],cur:{},pitches:[{id:'p1',ts:1,type:'FB',call:'CH8',callRaw:'CH 8',shook:true,targets:[],loc:5,result:'foul'}]});s.sync.queue.pitches.p1=1;
  let row=PC.buildRows(s).rows.pitches[0];assert.equal(row.call_raw,PC.SHOOK_TAG+'CH 8');assert.equal('shook' in row,false);assert.equal(row.call,'CH8');
  const back=PC.rowPitch(row);assert.equal(back.shook,true);assert.equal(back.callRaw,'CH 8');
  s.sync.shakeCol=true;row=PC.buildRows(s).rows.pitches[0];assert.equal(row.shook,true);
  assert.equal(PC.rowPitch({id:'x',call_raw:'FB 3',shook:false}).shook,undefined);});

// ---------------- v40 (scoring chart) ----------------
test('actual location: dirt and backstop can be the called spot; band setup still cannot aim there',()=>{
  assert.equal(PC.locInfo(31,'R','R').label,'in dirt');assert.equal(PC.locInfo(32,'R','R').label,'over catcher/backstop');
  assert.equal(PC.isCompetitive(31),false);assert.equal(PC.isCompetitive(32),false);assert.equal(PC.isActualOnly(31),true);
  assert.equal(PC.canAim('CH',2),false);assert.equal(PC.canAim('CH',8),true);assert.equal(PC.canAim('FB',31),false);assert.equal(PC.canAim('CH',18),true);
  assert.equal(PC.validCalled('CH',31),true);assert.equal(PC.validCalled('FB',21),true);assert.equal(PC.validCalled('CH',12),false);
  assert.equal(PC.bullpenTap({type:'CH'},31).action,'target');assert.equal(PC.bullpenTap({type:'FB'},32).action,'target');
  assert.equal(PC.bullpenTap({type:'CH'},21).action,'target');
  const aimed=PC.bullpenTap({type:'CH'},8);assert.equal(aimed.action,'target');
  assert.equal(PC.bullpenTap(aimed.draft,1).action,'log');assert.equal(PC.bullpenTap(aimed.draft,31).action,'log');
  assert.equal(PC.bullpenTap(aimed.draft,31).draft.loc,31);
  assert.equal(PC.chUp?PC.chUp({type:'CH',loc:32}):false,false);
});
test('scoring flow: game requires a result, bullpen saves on the actual spot',()=>{
  assert.deepEqual(PC.flowSteps('game'),['type','called','actual','result']);assert.deepEqual(PC.flowSteps('bullpen'),['type','called','actual']);
  const src={mode:'game',type:'FB',called:[6],actual:null};const before=JSON.stringify(src);PC.scoreApply(src,{op:'actual',z:4});assert.equal(JSON.stringify(src),before);
  assert.equal(PC.scoreStep({mode:'game'}),'type');
  assert.equal(PC.scoreApply({mode:'game'},{op:'called',z:6}).reason,'need_type');
  assert.equal(PC.scoreApply({mode:'game'},{op:'actual',z:6}).reason,'need_type');
  assert.equal(PC.scoreApply({mode:'game'},{op:'result',result:'ball'}).reason,'need_type');
  const call=PC.scoreApply({mode:'game'},{op:'call',type:'FB',called:[6]});assert.equal(call.step,'actual');assert.deepEqual(call.draft.called,[6]);
  let ch=PC.scoreApply({mode:'game'},{op:'call',type:'CH',called:[12,8]});assert.deepEqual(ch.draft.called,[8]);assert.equal(ch.step,'actual');
  ch=PC.scoreApply({mode:'game'},{op:'call',type:'CH',called:[]});assert.equal(ch.step,'called');
  assert.equal(PC.scoreTap(ch.draft,12).reason,'bad_target');
  const aimed=PC.scoreTap(ch.draft,8);assert.equal(aimed.step,'actual');assert.deepEqual(aimed.draft.called,[8]);
  assert.equal(PC.scoreApply(aimed.draft,{op:'result',result:'ball'}).reason,'need_actual');
  const land=PC.scoreTap(aimed.draft,12);assert.equal(land.step,'result');assert.equal(land.draft.actual,12);
  assert.equal(PC.scoreTap(aimed.draft,31).draft.actual,31);
  const saved=PC.scoreApply(land.draft,{op:'result',result:'ball'});assert.equal(saved.step,'done');
  const row=PC.scoreCommit(saved.draft);assert.deepEqual(row.targets,[8]);assert.equal(row.loc,12);assert.equal(row.calledLoc,8);assert.equal(row.result,'ball');
  assert.equal(PC.scoreCommit(aimed.draft),null);
  const over=PC.scoreApply({mode:'game',type:'FB',called:[6],actual:4},{op:'called',z:5});assert.deepEqual(over.draft.called,[5]);assert.equal(over.draft.actual,4);assert.equal(over.step,'result');
  const ip=PC.scoreApply({mode:'game',type:'FB',called:[5],actual:5},{op:'result',result:'inplay'});assert.equal(ip.step,'done');assert.equal(ip.draft.ip,null);
  assert.equal(PC.scoreApply(ip.draft,{op:'ip',ip:'GB'}).draft.ip,'GB');
  assert.equal(PC.scoreApply({mode:'game',type:'FB',called:[5],actual:5,result:'ball'},{op:'ip',ip:'GB'}).reason,'need_result');
  let b=PC.scoreApply({mode:'bullpen'},{op:'call',type:'CH',called:[31]});assert.equal(b.step,'actual');
  assert.equal(PC.scoreApply(b.draft,{op:'result',result:'called'}).reason,'no_result');
  const hit=PC.scoreCommit(PC.scoreTap(b.draft,31).draft);assert.equal(hit.result,null);assert.deepEqual(hit.targets,[31]);assert.equal(hit.loc,31);
  assert.equal(PC.hitSpot(hit),true);assert.equal(PC.pitchMiss(hit).sev,0);
  const miss=PC.scoreCommit(PC.scoreTap(PC.scoreApply({mode:'bullpen'},{op:'call',type:'CH',called:[8]}).draft,31).draft);
  assert.equal(PC.hitSpot(miss),false);assert.equal(PC.pitchMiss(miss).sev,PC.MAX_MISS-1);
  const sh=PC.scoreApply({mode:'game',type:'CH',called:[7]},{op:'shake',norm:'CH7',raw:'CH 7'});assert.equal(sh.step,'type');assert.deepEqual(sh.draft.shook.called,[7]);
  const threw=PC.scoreApply(sh.draft,{op:'call',type:'FB',called:[]});assert.equal(threw.step,'called');
  const fin=PC.scoreCommit(PC.scoreApply(PC.scoreTap(PC.scoreTap(threw.draft,5).draft,6).draft,{op:'result',result:'foul'}).draft);
  assert.deepEqual(fin.targets,[5]);assert.equal(fin.loc,6);assert.equal(fin.calledLoc,7);assert.equal(fin.shook,true);assert.equal(fin.result,'foul');
  const multi=PC.scoreCommit(PC.scoreApply(PC.scoreTap(PC.scoreApply({mode:'game'},{op:'call',type:'FB',called:[7,9]}).draft,8).draft,{op:'result',result:'ball'}).draft);
  assert.equal(multi.calledLoc,PC.nearestTarget([7,9],8));
});
test('in dirt and over the catcher score as way off and still count as landed',()=>{
  const m=PC.pitchMiss({type:'FB',targets:[8],loc:31});assert.equal(m.sev,PC.MAX_MISS-1);assert.equal(PC.chUp({type:'CH',loc:32}),false);
  const items=[{p:{type:'FB',targets:[8],loc:31}},{p:{type:'FB',targets:[8],loc:5}}];
  const l=PC.heatData(items,{},'actual');assert.equal(l.total,2);assert.equal(l.cells[5].n,1);assert.equal(l.cells[31],undefined);
});
test('redo stack keeps the newest 10 and a new item drops the oldest',()=>{
  let s=[];for(let i=0;i<12;i++)s=PC.redoPush(s,{i});
  assert.equal(s.length,10);assert.equal(s[0].i,2);assert.equal(s[9].i,11);assert.equal(PC.REDO_MAX,10);
  const popped=PC.redoPop(s);assert.equal(popped.item.i,11);assert.equal(popped.stack.length,9);
  assert.equal(PC.redoPop([]).item,null);
});
test('foul timing, wild pitch and velocity are cleaned; bullpen result defaults only to ball or called strike',()=>{
  assert.equal(PC.cleanFoul('early'),'early');assert.equal(PC.cleanFoul('skip'),null);assert.equal(PC.cleanFoul('late'),'late');
  assert.equal(PC.cleanFlag('wp'),'wp');assert.equal(PC.cleanFlag('pb'),'pb');assert.equal(PC.cleanFlag('ball'),null);
  assert.equal(PC.cleanVelo('72.24'),72.2);assert.equal(PC.cleanVelo(19),null);assert.equal(PC.cleanVelo(''),null);assert.equal(PC.cleanVelo(110),110);
  assert.equal(PC.bullpenResult('ball'),'ball');assert.equal(PC.bullpenResult('called'),'called');assert.equal(PC.bullpenResult(''),null);assert.equal(PC.bullpenResult('swinging'),null);
});
test('CSV export per pitcher per date, with called and actual location columns',()=>{
  const rows=[{pitcher:'Avery',pitcher_num:'45',date:'2026-10-14',called_location:8,actual_location:31,mode:'game'},
    {pitcher:'Avery',pitcher_num:'12',date:'2026-10-14',mode:'bullpen'},
    {pitcher:'Jules',pitcher_num:'45',date:'2026-10-14',mode:'game'},
    {pitcher:'Avery',pitcher_num:'45',date:'2026-10-13',mode:'game'}];
  const hit=PC.filterPitcherDate(rows,{pitcher:'Avery',num:'45',date:'2026-10-14'});
  assert.equal(hit.length,1);assert.equal(hit[0].actual_location,31);
  assert.equal(PC.filterPitcherDate(rows,{}).length,4);
  assert.ok(PC.toCSV(hit).includes('called_location'));assert.ok(PC.toCSV(hit).split('\n')[0].endsWith('from_video'));
  assert.ok(PC.toCSV(hit).split('\n')[0].includes('shook'));assert.ok(PC.toCSV(hit).split('\n')[0].includes('called_type'));
});
test('called location is the target nearest the actual spot',()=>{
  assert.equal(PC.nearestTarget([11,14],null),11);
  assert.equal(PC.nearestTarget([11,14],9),14);
  assert.equal(PC.nearestTarget([8],1),8);
  assert.equal(PC.nearestTarget([],5),null);
  assert.equal(PC.nearestTarget([11,12],2),11);
  assert.equal(PC.nearestTarget([2,18],31),18);
});
test('CSV called_type and shook round-trip, and the file name is a first name only',()=>{
  const pitch={type:'FB',call:'CH8',shook:true,hand:'R',calledLoc:8,actualLoc:14,loc:14,velo:64};
  const chart=PC.csvChart(pitch);
  assert.equal(chart.called_type,'CH');assert.equal(chart.shook,1);assert.equal(chart.actual_location,14);
  assert.equal(PC.calledTypeOf({type:'FB',call:'FB5'}),'FB');
  assert.equal(PC.calledTypeOf({shook:true,type:'FB',call:'CH8'}),'CH');
  assert.equal(PC.calledTypeOf({calledType:'CH',type:'FB',shook:true}),'CH');
  const csv=PC.toCSV([Object.assign({mode:'game',type:'FB',call:'CH8',pitcher:'Avery'},chart)]);
  const back=PC.parseCSV(csv)[0];
  assert.equal(back.called_type,'CH');assert.equal(back.shook,'1');
  const applied=PC.csvApply({},back);assert.equal(applied.calledType,'CH');assert.equal(applied.shook,true);
  assert.equal(PC.csvApply({},{shook:'0'}).shook,undefined);
  assert.equal(PC.csvApply({},{shook:''}).shook,undefined);
  assert.equal(PC.csvApply({},{shook:'yes'}).shook,true);
  const old=PC.parseCSV('mode,type,call\ngame,FB,FB5\n')[0];
  assert.equal(old.called_type,undefined);assert.equal(PC.csvApply({type:'FB'},old).shook,undefined);assert.equal(PC.csvApply({type:'FB'},old).edited,undefined);
  const file=PC.csvPitcherFile({name:'Avery 99!',num:'45'},'2026-10-14');
  assert.equal(file,'pitches-Avery-45-2026-10-14.csv');assert.equal(file.includes('99'),false);
  const ugly=PC.csvPitcherFile({name:'O"Neil, J',num:'7/'},'2026/10/14');
  assert.equal(ugly,'pitches-O-Neil-7-2026-10-14.csv');
  assert.equal(/["',\s/]/.test(ugly),false);assert.equal(ugly.includes('J'),false);
  assert.equal(PC.csvGameFile({date:'2026-10-14',opponent:'East Side!'}),'game-2026-10-14-East-Side.csv');
  assert.equal(PC.csvScopeFile('bullpen'),'pitches-bullpen.csv');
});
test('redo list persists on this phone, stays capped at 10, and is not synced',()=>{
  const bag={};const storage={getItem:k=>bag[k]??null,setItem:(k,v)=>{bag[k]=v;},removeItem:k=>{delete bag[k];}};
  const st=PC.makeStore(storage);let s=[];
  for(let i=0;i<12;i++)s=PC.redoPush(s,{kind:'loc',loc:i});
  st.real.redo=s;st.save();
  const st2=PC.makeStore(storage);
  assert.equal(st2.real.redo.length,10);assert.equal(st2.real.redo[0].loc,2);assert.equal(st2.real.redo[9].loc,11);
  st2.real.redo=[{kind:'nope'},{kind:'pitch',mode:'game'}];st2.save();
  const st3=PC.makeStore(storage);assert.equal(st3.real.redo.length,1);assert.equal(st3.real.redo[0].kind,'pitch');
  st3.enterTest();const before=st3.real.redo.map(x=>x.kind);
  st3.state.redo.push({kind:'loc',loc:98});assert.equal(st3.save(),false);st3.exitTest();
  assert.deepEqual(st3.real.redo.map(x=>x.kind),before);
  st3.real.redo=[];st3.save();assert.deepEqual(PC.makeStore(storage).real.redo,[]);
  const built=PC.buildRows(st3.real);assert.equal(built.rows.redo,undefined);
});
test('chart fields: sync coerces velocity, CSV keeps the raw value, and actual falls back to loc',()=>{
  const p={id:'p',calledLoc:8,loc:31,foulTime:'late',wpPb:'pb',velo:'64'};
  const row=PC.pitchRow(p,{mode:'game',chartCol:true});
  assert.equal(row.called_loc,8);assert.equal(row.actual_loc,31);assert.equal(row.foul_time,'late');assert.equal(row.wp_pb,'pb');
  assert.equal(row.velo,64);assert.equal(typeof row.velo,'number');
  const csv=PC.csvChart(p);
  assert.equal(csv.called_location,8);assert.equal(csv.actual_location,31);assert.equal(csv.foul_time,'late');assert.equal(csv.wp_pb,'pb');
  assert.equal(csv.velocity,'64');assert.equal(typeof csv.velocity,'string');
  const blank=PC.pitchRow({id:'b',velo:''},{mode:'bullpen',chartCol:true});
  assert.equal(blank.called_loc,null);assert.equal(blank.actual_loc,null);assert.equal(blank.foul_time,null);assert.equal(blank.wp_pb,null);assert.equal(blank.velo,null);
  const blankCsv=PC.csvChart({velo:'',loc:5});
  assert.equal(blankCsv.called_location,'');assert.equal(blankCsv.actual_location,5);assert.equal(blankCsv.foul_time,'');assert.equal(blankCsv.wp_pb,'');assert.equal(blankCsv.velocity,'');
  const zero=PC.csvChart({velo:0,calledLoc:0,actualLoc:0});
  assert.equal(zero.velocity,0);assert.equal(zero.called_location,0);assert.equal(zero.actual_location,0);
  const zeroRow=PC.pitchRow({id:'z',velo:0,calledLoc:0,actualLoc:0},{mode:'game',chartCol:true});
  assert.equal(zeroRow.velo,0);assert.equal(zeroRow.called_loc,0);assert.equal(zeroRow.actual_loc,0);
  assert.equal(PC.csvChart({velo:'fast'}).velocity,'fast');
  assert.ok(Number.isNaN(PC.pitchRow({id:'j',velo:'fast'},{mode:'game',chartCol:true}).velo));
  assert.equal(PC.csvChart({calledLoc:11,actualLoc:14,loc:31}).actual_location,14);
  assert.equal(PC.pitchRow({id:'q',calledLoc:11,actualLoc:14,loc:31},{mode:'game',chartCol:true}).actual_loc,14);
  assert.equal('called_loc' in PC.pitchRow({id:'n',calledLoc:8},{mode:'game'}),false);
});
test('chart columns stay off the wire until chartCol is set, then round-trip including in dirt',()=>{const st=coachStore(),s=st.real;
  s.sessions.push({id:'s1',date:'d',pitches:[]});
  s.games.push({id:'g',date:'d',opponent:'o',homeAway:'home',lineup:[],cur:{},pitches:[{id:'p1',ts:1,type:'CH',call:'CH8',targets:[8],loc:31,calledLoc:8,actualLoc:31,result:'foul',foulTime:'early',wpPb:'wp',velo:61.5,mode:'game'}]});
  s.sync.queue.pitches.p1=1;
  let row=PC.buildRows(s).rows.pitches[0];assert.equal('called_loc' in row,false);assert.equal('actual_loc' in row,false);assert.equal('foul_time' in row,false);assert.equal('called_type' in row,false);assert.equal(row.loc,31);
  s.sync.chartCol=true;row=PC.buildRows(s).rows.pitches[0];
  assert.equal(row.called_loc,8);assert.equal(row.actual_loc,31);assert.equal(row.foul_time,'early');assert.equal(row.wp_pb,'wp');assert.equal(row.velo,61.5);
  const back=PC.rowPitch(row);assert.equal(back.calledLoc,8);assert.equal(back.actualLoc,31);assert.equal(back.loc,31);assert.equal(back.foulTime,'early');assert.equal(back.wpPb,'wp');assert.equal(back.velo,61.5);
});
test('edit actual location keeps later pitches, the call, and the count, and marks the pitch edited',()=>{
  const later={id:'b',loc:8,actualLoc:8,calledLoc:8,result:'called',b:1,s:0};
  const pitches=[{id:'a',loc:5,actualLoc:5,calledLoc:7,result:'ball',b:0,s:0},{...later}];
  assert.equal(PC.editActual(pitches[0],31),true);
  assert.equal(pitches.length,2);assert.equal(pitches[1].id,'b');assert.equal(pitches[1].loc,8);assert.equal(pitches[1].result,'called');
  assert.equal(pitches[0].loc,31);assert.equal(pitches[0].actualLoc,31);assert.equal(pitches[0].calledLoc,7);assert.equal(pitches[0].result,'ball');assert.equal(pitches[0].b,0);assert.equal(pitches[0].edited,true);
  assert.equal(PC.editActual(pitches[0],32),true);assert.equal(pitches[0].loc,32);assert.equal(pitches[0].actualLoc,32);
  assert.equal(PC.editActual(pitches[0],14),true);assert.equal(pitches[0].loc,14);
  assert.equal(PC.editActual(pitches[0],21),true);assert.equal(pitches[0].loc,21);
  assert.equal(PC.editActual(pitches[0],99),false);assert.equal(pitches[0].loc,21);
  assert.equal(PC.editActual(pitches[0],21),true);assert.equal(pitches[0].edited,true);
  const plain={id:'c',loc:5,actualLoc:5,result:'foul'};assert.equal(PC.editActual(plain,5),true);assert.equal(plain.edited,undefined);
});
test('editing the actual location recomputes calledLoc when the call had more than one target',()=>{
  const p={id:'m',loc:9,actualLoc:9,calledLoc:14,targets:[11,14],result:'ball',call:'FB'};
  assert.equal(PC.nearestTarget(p.targets,9),14);
  assert.equal(PC.editActual(p,1),true);
  assert.equal(p.loc,1);assert.equal(p.actualLoc,1);assert.equal(p.calledLoc,11);assert.equal(p.result,'ball');assert.equal(p.edited,true);
  const chart=PC.csvChart(p);assert.equal(chart.called_location,11);assert.equal(chart.actual_location,1);
  const one={id:'o',loc:5,actualLoc:5,calledLoc:7,targets:[7],result:'ball'};
  assert.equal(PC.editActual(one,31),true);assert.equal(one.calledLoc,7);assert.equal(PC.csvChart(one).called_location,7);
  const tie={id:'t',loc:9,actualLoc:9,calledLoc:14,targets:[11,12],result:'ball'};
  assert.equal(PC.editActual(tie,2),true);assert.equal(tie.calledLoc,11);
  const stay={id:'s',loc:1,actualLoc:1,calledLoc:11,targets:[11,14],result:'ball'};
  assert.equal(PC.editActual(stay,1),true);assert.equal(stay.calledLoc,11);assert.equal(stay.edited,undefined);
});
test('edited flag syncs on the pitch row and round-trips in CSV without a new column',()=>{const st=coachStore(),s=st.real;
  s.games.push({id:'g',date:'d',opponent:'o',homeAway:'home',lineup:[],cur:{},pitches:[
    {id:'p1',ts:1,type:'FB',call:'CH8',callRaw:'CH 8',shook:true,targets:[8],loc:31,actualLoc:31,calledLoc:8,result:'ball',edited:true},
    {id:'p2',ts:2,type:'FB',call:'FB5',loc:5,result:'called'}]});
  s.sync.queue.pitches.p1=1;
  const row=PC.buildRows(s).rows.pitches[0];
  assert.equal(row.loc,31);assert.equal('edited' in row,false);assert.ok(row.call_raw.startsWith(PC.SHOOK_TAG));assert.ok(row.call_raw.endsWith(PC.EDITED_TAG));
  const back=PC.rowPitch(row);assert.equal(back.edited,true);assert.equal(back.shook,true);assert.equal(back.callRaw,'CH 8');assert.equal(back.loc,31);
  assert.equal(PC.rowPitch({id:'x',call_raw:'FB 3',shook:false}).edited,false);
  const chart=PC.csvChart({type:'FB',call:'CH8',shook:true,edited:true,loc:31,actualLoc:31,calledLoc:8,hand:'R'});
  assert.equal(chart.from_video,1);assert.equal(chart.edited,undefined);assert.equal(chart.shook,1);assert.equal(chart.actual_location,31);
  const csv=PC.toCSV([Object.assign({mode:'game',pitcher:'Avery',location:31},chart)]);
  assert.ok(csv.split('\n')[0].endsWith('from_video'));assert.equal(csv.split('\n')[0].includes(',edited'),false);
  const applied=PC.csvApply({},PC.parseCSV(csv)[0]);assert.equal(applied.edited,true);assert.equal(applied.shook,true);
  assert.equal(PC.csvApply({},{from_video:'0'}).edited,undefined);assert.equal(PC.csvApply({},{from_video:'yes'}).edited,true);
  assert.equal(PC.csvApply({},{edited:'yes'}).edited,true);assert.equal(PC.csvApply({},{edited:'1',from_video:'0'}).edited,true);
});
test('undo of a location edit restores the spot and leaves later pitches',()=>{
  const later={id:'b',loc:8,actualLoc:8,calledLoc:8,result:'called'};
  const p={id:'a',loc:5,actualLoc:5,calledLoc:14,targets:[11,14],result:'ball'};
  const snap={loc:p.loc,actualLoc:p.actualLoc,calledLoc:p.calledLoc,edited:!!p.edited};
  assert.equal(PC.editActual(p,1),true);assert.equal(p.loc,1);assert.equal(p.calledLoc,11);assert.equal(p.edited,true);
  assert.equal(PC.revertEdit(p,snap),true);
  assert.equal(p.loc,5);assert.equal(p.actualLoc,5);assert.equal(p.calledLoc,14);assert.equal(p.edited,undefined);
  assert.equal(later.loc,8);assert.equal(PC.revertEdit(p,snap),false);
});
