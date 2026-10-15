/* Thunder Elite pitch charting – sync.js: Cloud sync: Supabase REST rows, role write rules, merge, push/pull.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const {BB_TYPES,DEFAULT_ALERTS,DEFAULT_REST,DEFAULT_LIMITS,cleanLimit}=PC;
// a valid spot on the grid: zone 1-9, ring 11-18, way off 21-24, in dirt 31, over catcher/backstop 32 (anything else from the cloud is dropped)
const validSpot=z=>PC.validActual(z);
// ---------- Cloud sync (Supabase REST, team code header checked by RLS) ----------
const TABLES=['pitchers','games','sessions','pitches','call_sheets','notes','team_settings'];
const keyOf={pitchers:'team_id,id',games:'team_id,id',sessions:'team_id,id',pitches:'id',call_sheets:'team_id,id',notes:'team_id,id',team_settings:'team_id,id'};
// coach-only team settings (alerts, soft limits, rest guide): one row per team, id 'team'. Shared by every coach phone.
const TEAM_SETTINGS_ID='team';
const settingsRow=st=>({id:TEAM_SETTINGS_ID,alerts:st.alerts||[],day_limit:(st.limits||{}).day||null,weekend_limit:(st.limits||{}).weekend||null,show_rest:!!st.showRest,rest:st.rest||[]});
function rowSettings(r){const a=(Array.isArray(r.alerts)?r.alerts:[]).map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<400).sort((x,y)=>x-y);
  const rest=(Array.isArray(r.rest)?r.rest:[]).filter(x=>x&&Number.isFinite(+x.max)&&Number.isFinite(+x.days)).map(x=>({max:+x.max,days:+x.days}));
  return{alerts:a.length?a:DEFAULT_ALERTS.slice(),rest:rest.length?rest:DEFAULT_REST.map(x=>Object.assign({},x)),limits:Object.assign({},DEFAULT_LIMITS,{day:cleanLimit(r.day_limit),weekend:cleanLimit(r.weekend_limit)}),showRest:!!r.show_rest};}
// shake-off flag: travels as a "⤺ " prefix on call_raw (works on today's schema); also as the shook column once
// supabase/migrations/*_shake_off.sql is applied and sync.shakeCol is on
const SHOOK_TAG='⤺ ';
// Edited flag rides on the same pitch row as loc (today's schema, no new column). A word joiner sits at the
// end of call_raw so the shook prefix stays at the front and an older phone still sees the shake-off.
const EDITED_TAG='\u2060';
function pitchRow(p,ctx){const row=pitchRow0(p,ctx);if(p.shook){row.call_raw=SHOOK_TAG+(p.callRaw||p.call||'');if(ctx.shakeCol)row.shook=true;}else if(ctx.shakeCol)row.shook=false;
  if(p.edited)row.call_raw=(row.call_raw||'')+EDITED_TAG;
  // New chart columns exist only after 20261014180000_scoring_chart.sql. Until chartColumn is set, they stay on the phone.
  if(ctx.chartCol){row.called_loc=p.calledLoc==null?null:+p.calledLoc;row.actual_loc=p.actualLoc==null?(p.loc==null?null:+p.loc):+p.actualLoc;row.foul_time=p.foulTime||null;row.wp_pb=p.wpPb||null;row.velo=p.velo==null||p.velo===''?null:+p.velo;}
  return row;}
function pitchRow0(p,ctx){return{id:p.id,mode:ctx.mode,game_id:ctx.game_id||null,session_id:ctx.session_id||null,pitcher_id:p.pitcherId||null,ts:p.ts||null,hand:p.hand||null,type:p.type||null,call:p.call||null,call_raw:p.callRaw||null,
  targets:p.targets||[],loc:p.loc==null?null:p.loc,result:p.result||null,ip:p.ip||null,end_event:p.end||null,inning:p.inning==null?null:p.inning,outs_before:p.outsBefore==null?null:p.outsBefore,slot:p.slot==null?null:p.slot,
  batter:p.batter==null?null:p.batter,batter_num:p.batterNum==null?null:String(p.batterNum),b:p.b==null?null:p.b,s:p.s==null?null:p.s,abn:p.abn==null?null:p.abn,first_pitch:p.firstPitch==null?null:!!p.firstPitch,no_pitch:!!p.noPitch,prev_hand:p.prevHand||null,bb:BB_TYPES.includes(p.bb)?p.bb:null,deleted:!!p.deleted};}
function rowPitch(r){let raw=r.call_raw,edited=false;if(typeof raw==='string'&&raw.endsWith(EDITED_TAG)){edited=true;raw=raw.slice(0,-EDITED_TAG.length);}
  // Read keeps a grid aim that fails validCalled and flags the row. Junk off the grid is dropped. Writes still use validCalled.
  const calledType=r.type||'';const onGrid=z=>Number.isInteger(z)&&PC.validActual(z);
  const spots=(Array.isArray(r.targets)?r.targets:[]).map(z=>+z).filter(onGrid);let calledFlag=spots.some(z=>!PC.validCalled(calledType,z));
  let calledLoc=null;if(r.called_loc!=null&&r.called_loc!==''){const z=+r.called_loc;if(onGrid(z)){calledLoc=z;if(!PC.validCalled(calledType,z))calledFlag=true;}}
  const loc=r.loc!=null&&r.loc!==''&&onGrid(+r.loc)?+r.loc:null;
  const p={id:r.id,ts:+r.ts||0,pitcherId:r.pitcher_id,hand:r.hand,type:r.type,call:r.call,callRaw:raw||null,targets:spots,loc,result:r.result,ip:r.ip,end:r.end_event,edited:edited};if(calledLoc!=null)p.calledLoc=calledLoc;if(calledFlag)p.calledFlag=true;if(BB_TYPES.includes(r.bb))p.bb=r.bb;if(r.shook===true||(typeof raw==='string'&&raw.startsWith(SHOOK_TAG))){p.shook=true;p.callRaw=typeof raw==='string'&&raw.startsWith(SHOOK_TAG)?raw.slice(SHOOK_TAG.length)||null:raw||null;}
  if(r.mode==='game')Object.assign(p,{inning:r.inning,outsBefore:r.outs_before,slot:r.slot,batter:r.batter,batterNum:r.batter_num,b:r.b,s:r.s,abn:r.abn,firstPitch:r.first_pitch,prevHand:r.prev_hand});else{p.b=0;p.s=0;delete p.result;delete p.ip;delete p.end;delete p.bpResult;}
  if(r.no_pitch)p.noPitch=true;p.mode=r.mode==='bullpen'?'bullpen':'game';
  if(r.actual_loc!=null&&r.actual_loc!==''&&onGrid(+r.actual_loc))p.actualLoc=+r.actual_loc;else if(p.loc!=null)p.actualLoc=p.loc;
  if(r.foul_time==='early'||r.foul_time==='ontime'||r.foul_time==='late')p.foulTime=r.foul_time;if(r.wp_pb==='wp'||r.wp_pb==='pb')p.wpPb=r.wp_pb;if(r.velo!=null&&r.velo!==''&&Number.isFinite(+r.velo))p.velo=+r.velo;
  return p;}
// role rules (mirrors server RLS): coach = everything; player = writes own bullpen sessions/pitches only, reads own game+bullpen pitches and games she pitched in; viewer = read only
function roleAllows(sync,table,row){const role=sync.role;if(role==='coach')return true;
  if(role==='pcoach'){const ids=sync.pitcherIds||[];if(table==='sessions'||table==='notes')return ids.includes(row.pitcher_id);if(table==='pitches')return row.mode==='bullpen'&&ids.includes(row.pitcher_id);return false;}
  if(role!=='player')return false; // unknown/unverified codes never push
  if(table==='sessions')return row.pitcher_id===sync.pitcherId;if(table==='pitches')return row.mode==='bullpen'&&row.pitcher_id===sync.pitcherId;return false;}
function buildRows(st){let held=0;const q=st.sync.queue,team=st.sync.teamId,dev=st.sync.deviceId,out={},ver={};
  const idx={};st.games.forEach(g=>g.pitches.forEach(p=>idx[p.id]=[p,{mode:'game',game_id:g.id}]));st.sessions.forEach(x=>x.pitches.forEach(p=>idx[p.id]=[p,{mode:'bullpen',session_id:x.id}]));
  for(const t of TABLES){q[t]=q[t]||{};out[t]=[];ver[t]={};for(const id in q[t]){ver[t][id]=q[t][id];let row=null;
    if(t==='pitchers'){const p=st.pitchers.find(x=>x.id===id);if(p)row={id:p.id,name:p.name,num:p.num||null,throws:p.throws,archived:!!p.archived,note:p.note||null};}
    else if(t==='games'){const g=st.games.find(x=>x.id===id);if(g)row={id:g.id,date:g.date,opponent:g.opponent,event:g.event||null,home_away:g.homeAway,lineup:g.lineup,cur:Object.assign({},g.cur,{scorer:g.scorer||null}),started:g.started||null,ended:g.ended||null,imported:!!g.imported,status:gameStatus(g),link:g.link||null,notes:g.notes||null,game_time:g.time||null,field:g.field||null,game_no:g.gameNo||null,location:g.location||null};}
    else if(t==='call_sheets'){const x=(st.callSheets||[]).find(y=>y.id===id);if(x)row={id:x.id,name:x.name||null,pitcher_id:x.pitcherId||null,cols:x.cols||[],rows:x.rows||[],sort:(st.callSheets||[]).indexOf(x),deleted:!!x.deleted};}
    else if(t==='notes'){const x=(st.notes||[]).find(y=>y.id===id);if(x)row={id:x.id,pitcher_id:x.pitcherId,session_id:x.sessionId||null,game_id:x.gameId||null,body:String(x.body||'').slice(0,2000),deleted:!!x.deleted};}
    else if(t==='team_settings'){if(id===TEAM_SETTINGS_ID&&st.settings)row=settingsRow(st.settings);}
    else if(t==='sessions'){const x=st.sessions.find(y=>y.id===id);if(x){row={id:x.id,date:x.date,started:x.started||null,imported:!!x.imported,pitcher_id:x.pitcherId||null};if(st.sync.scorerCol)row.scorer=x.scorer||null;}}
    else{const hit=idx[id];if(hit)row=pitchRow(hit[0],Object.assign({},hit[1],{shakeCol:!!st.sync.shakeCol,chartCol:!!st.sync.chartCol}));else if(st.sync.tomb[id]){const tb=st.sync.tomb[id];row=pitchRow(tb,{mode:tb.mode,game_id:tb.game_id,session_id:tb.session_id,shakeCol:!!st.sync.shakeCol,chartCol:!!st.sync.chartCol});row.deleted=true;}}
    if(row&&!roleAllows(st.sync,t,row)){held++;continue;} // never send what this code can't write, but KEEP it queued for a code that can
    if(row){row.team_id=team;row.device_id=dev;out[t].push(row);}else delete q[t][id];}}
  return{rows:out,ver,held};}
const gameStatus=g=>g.status||(g.ended?'final':'active');
// last-write-wins by server updated_at: never let an older cloud row overwrite a newer local copy
const newerThan=(loc,r)=>!loc||!loc._u||!r.updated_at||r.updated_at>=loc._u;
// scoring lock owner travels with the row: games keep it in cur.scorer (jsonb, no schema change);
// sessions use the scorer column when the migration is applied (sync.scorerCol), else the row's device_id
const scorerOfRow=(t,r)=>t==='games'?(r.cur&&r.cur.scorer)||null:(r.scorer||r.device_id||null);
function mergeRemote(st,data){const q=st.sync.queue;let added=0,removed=0;
  (data.pitchers||[]).forEach(r=>{if(q.pitchers[r.id]||r.deleted)return;const p=st.pitchers.find(x=>x.id===r.id);if(!newerThan(p,r))return;const v={id:r.id,name:r.name,num:r.num||'',throws:r.throws||'R',archived:!!r.archived,note:r.note||undefined,_u:r.updated_at||undefined};if(p)delete p._ph;if(p){Object.assign(p,v);if(!r.note)delete p.note;}else st.pitchers.push(v);});
  (data.games||[]).forEach(r=>{if(q.games[r.id]||r.deleted)return;let g=st.games.find(x=>x.id===r.id);if(!newerThan(g,r))return;const v={id:r.id,date:r.date,opponent:r.opponent,event:r.event||'',homeAway:r.home_away,lineup:r.lineup||[],cur:r.cur||{inning:1,outs:0,slot:0,b:0,s:0,abn:0},started:r.started,ended:r.ended,imported:r.imported,scorer:scorerOfRow('games',r),status:r.status||(r.ended?'final':'active'),link:r.link||'',notes:r.notes||'',time:r.game_time||'',field:r.field||'',gameNo:r.game_no||'',location:r.location||'',_u:r.updated_at||undefined};
    if(g){if(g.pitches.length&&v.status==='scheduled')v.status=g.status||'active';Object.assign(g,v);}else st.games.push(Object.assign(v,{pitches:[]}));});
  (data.call_sheets||[]).forEach(r=>{const qq=q.call_sheets||{};if(qq[r.id])return;st.callSheets=st.callSheets||[];const x=st.callSheets.find(y=>y.id===r.id);if(!newerThan(x,r))return;
    const v={id:r.id,name:r.name||'Sheet',pitcherId:r.pitcher_id||null,cols:Array.isArray(r.cols)?r.cols.map(String):[],rows:Array.isArray(r.rows)?r.rows.map(a=>Array.isArray(a)?a.map(c=>String(c==null?'':c).slice(0,16)):[]):[],deleted:!!r.deleted,_u:r.updated_at||undefined};if(x)Object.assign(x,v);else st.callSheets.push(v);});
  (data.notes||[]).forEach(r=>{const qq=q.notes||{};if(qq[r.id])return;st.notes=st.notes||[];const x=st.notes.find(y=>y.id===r.id);if(!newerThan(x,r))return;
    const v={id:r.id,pitcherId:r.pitcher_id,sessionId:r.session_id||null,gameId:r.game_id||null,body:String(r.body||''),author:r.author||null,deleted:!!r.deleted,_u:r.updated_at||undefined};if(x)Object.assign(x,v);else st.notes.push(v);});
  (data.team_settings||[]).forEach(r=>{if(r.id!==TEAM_SETTINGS_ID||(q.team_settings||{})[r.id])return;st.settings=st.settings||{};if(!newerThan(st.settings,r))return;Object.assign(st.settings,rowSettings(r),{_u:r.updated_at||undefined});});
  // sessions: last writer wins by updated_at for every field (date, pitcher, ...), same as the other tables
  (data.sessions||[]).forEach(r=>{if(q.sessions[r.id]||r.deleted)return;const x=st.sessions.find(y=>y.id===r.id);if(!newerThan(x,r))return;
    const v={id:r.id,date:r.date,started:r.started,imported:!!r.imported,pitcherId:r.pitcher_id||undefined,scorer:scorerOfRow('sessions',r),_u:r.updated_at||undefined};if(x)Object.assign(x,v);else st.sessions.push(Object.assign(v,{pitches:[]}));});
  const where={};st.games.forEach(g=>g.pitches.forEach(p=>where[p.id]=g));st.sessions.forEach(x=>x.pitches.forEach(p=>where[p.id]=x));const touched=new Set();
  (data.pitches||[]).forEach(r=>{if(q.pitches[r.id])return;const c=where[r.id];
    if(r.deleted){if(c){c.pitches=c.pitches.filter(p=>p.id!==r.id);removed++;}return;}
    if(c){const old=c.pitches.find(p=>p.id===r.id);if(old&&r.updated_at&&old._u&&r.updated_at>old._u){const next=rowPitch(r);if(!next.calledFlag)delete old.calledFlag;Object.assign(old,next,{_u:r.updated_at});}else if(old&&!old._u&&r.updated_at)old._u=r.updated_at;return;}let box=r.mode==='game'?st.games.find(g=>g.id===r.game_id):st.sessions.find(x=>x.id===r.session_id);
    if(!box){if(r.mode==='game'){box={id:r.game_id,date:'',opponent:'?',event:'',homeAway:'home',lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0}};st.games.push(box);}else{box={id:r.session_id,date:'',pitches:[]};st.sessions.push(box);}}
    box.pitches.push(Object.assign(rowPitch(r),r.updated_at?{_u:r.updated_at}:{}));touched.add(box);added++;});
  touched.forEach(b=>b.pitches.sort((a,b2)=>a.ts-b2.ts));return{added,removed};}
// rejected rows (server said no): kept out of the queue, listed in Setup → Sync problems, where the coach retries or discards them
function quarantine(st,t,id,status,error){st.sync.rejected=st.sync.rejected||{};st.sync.rejected[t+':'+id]={table:t,id,status,error,at:Date.now()};delete st.sync.queue[t][id];}
function retryRejected(st,key){const r=(st.sync.rejected||{})[key];if(!r)return false;const q=st.sync.queue[r.table]=st.sync.queue[r.table]||{};q[r.id]=(q[r.id]||0)+1;delete st.sync.rejected[key];return true;}
function discardRejected(st,key){if(!(st.sync.rejected||{})[key])return false;delete st.sync.rejected[key];return true;}
// plain-words reason for a refused change (Setup → Sync problems); the raw server text stays behind "Details"
const SYNC_WHY={auth:'Your sign-in ran out. Tap Retry – it will send after you sign in again.',denied:"This phone isn't allowed to save that. Ask your coach to check your team code.",
  dup:'This was already saved from another phone. Usually safe to Discard.',bad:"The server couldn't read this change. Try Retry; if it fails again, Discard."};
const syncWhy=r=>r.status===409||/duplicate/i.test(r.error||'')?SYNC_WHY.dup:r.status===401?SYNC_WHY.auth:r.status===403?SYNC_WHY.denied:SYNC_WHY.bad;
const rejectedList=st=>Object.entries((st.sync&&st.sync.rejected)||{}).map(([key,r])=>Object.assign({key},r)).sort((a,b)=>b.at-a.at);
// incremental pull: rows changed since the last pull (minus a 2-minute overlap for slow commits; merging is idempotent),
// keyset-paged by (updated_at, id) so paging never skips or repeats rows while the table changes
const PAGE=1000,OVERLAP_MS=120000;
const sinceOf=iso=>iso?new Date(Date.parse(iso)-OVERLAP_MS).toISOString():null;
function pullUrl(base,t,teamId,since,after){const enc=encodeURIComponent;let u=`${base}/rest/v1/${t}?select=*&team_id=eq.${enc(teamId)}&order=updated_at.asc,id.asc&limit=${PAGE}`;
  if(after)u+=`&or=(updated_at.gt.${enc(after.u)},and(updated_at.eq.${enc(after.u)},id.gt.${enc(after.id)}))`;else if(since)u+=`&updated_at=gte.${enc(since)}`;return u;}
function makeSync(store,cfg){const f=cfg.fetch||(typeof fetch!=='undefined'?fetch.bind(globalThis):null);let busy=false;
  const hdr=team=>({apikey:cfg.key,Authorization:'Bearer '+cfg.key,'x-team-code':team,'Content-Type':'application/json'});
  const api={
    async push(){if(store.isTest)return{skipped:'test'};const st=store.real;const team=st.sync.teamCode;if(!team)return{skipped:'no team code'};if(!st.sync.teamId)return{skipped:'team not identified yet'};if(busy)return{skipped:'busy'};busy=true;
      try{const{rows,ver,held}=buildRows(st);let sent=0,rejected=0;
        for(const t of TABLES){if(!rows[t].length)continue;for(let i=0;i<rows[t].length;i+=500){const chunk=rows[t].slice(i,i+500);
          const send=rows=>f(`${cfg.url}/rest/v1/${t}?on_conflict=${keyOf[t]}`,{method:'POST',headers:Object.assign(hdr(team),{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(rows)});
          const done=row=>{const q=st.sync.queue[t];if(q[row.id]===ver[t][row.id]){delete q[row.id];if(t==='pitches'&&row.deleted)delete st.sync.tomb[row.id];}};
          const r=await send(chunk);
          if(r.ok){sent+=chunk.length;chunk.forEach(done);continue;}
          const tx=await r.text();if(r.status<400||r.status>=500)throw new Error(t+' '+r.status+' '+tx.slice(0,200));
          // any 4xx (incl. 401/403 from row-level security): one bad row must not block the rest -> retry one by one
          const bad=[];for(const row of chunk){const r1=await send([row]);if(r1.ok){sent++;done(row);}else if(r1.status>=500)throw new Error(t+' '+r1.status);else bad.push({row,status:r1.status,error:(await r1.text()).slice(0,200)});}
          // every row refused for auth: is the code itself still valid? halt (keep everything queued) only if it is not
          if(bad.length===chunk.length&&bad.every(b=>b.status===401||b.status===403)){const role0=st.sync.role,w=await api.whoami();
            if(w.error||w.role==null||w.role!==role0)throw new Error(w.role==null&&!w.error?'Code not recognized (typo or revoked) – nothing sent':t+' '+bad[0].status+' '+bad[0].error);}
          bad.forEach(b=>{quarantine(st,t,b.row.id,b.status,b.error);rejected++;});}}
        st.sync.last=Date.now();st.sync.lastError=rejected?`${rejected} change${rejected===1?'':'s'} rejected by the server (see Setup)`:null;store.save();return{sent,rejected,held};}
      catch(e){st.sync.lastError=String(e.message||e);store.save();return{error:st.sync.lastError};}finally{busy=false;}},
    async pull(){if(store.isTest)return{skipped:'test'};const st=store.real;const team=st.sync.teamCode;if(!team)return{skipped:'no team code'};
      try{const data={},seen=st.sync.seen=st.sync.seen||{},hi={};for(const t of TABLES){data[t]=[];let after=null;const since=sinceOf(seen[t]);
          for(;;){const r=await f(pullUrl(cfg.url,t,st.sync.teamId,since,after),{headers:hdr(team)});
          if(!r.ok)throw new Error(t+' '+r.status+' '+(await r.text()).slice(0,200));const a=await r.json();data[t]=data[t].concat(a);
          if(a.length){const last=a[a.length-1];after={u:last.updated_at,id:last.id};if(last.updated_at&&(!hi[t]||last.updated_at>hi[t]))hi[t]=last.updated_at;}if(a.length<PAGE)break;}}
        const res=mergeRemote(st,data);Object.assign(seen,hi);st.sync.last=Date.now();st.sync.lastError=null;store.save();return res;}
      catch(e){st.sync.lastError=String(e.message||e);store.save();return{error:st.sync.lastError};}},
    async rpc(name,args){if(store.isTest)return null;const st=store.real;const r=await f(`${cfg.url}/rest/v1/rpc/${name}`,{method:'POST',headers:hdr(st.sync.teamCode),body:JSON.stringify(args||{})});
      if(!r.ok)throw new Error(name+' '+r.status+' '+(await r.text()).slice(0,200));const t=await r.text();return t?JSON.parse(t):null;},
    // detect role from the code; null = code not recognized
    async whoami(){if(store.isTest)return{skipped:'test'};const st=store.real;if(!st.sync.teamCode)return{skipped:'no team code'};
      try{const w=await api.rpc('whoami');if(!w){st.sync.role=null;st.sync.lastError='Code not recognized (typo or revoked)';store.save();return{role:null};}
        const prevRole=st.sync.role;if((w.team_id||null)!==st.sync.teamId||w.role!==prevRole)st.sync.seen={};st.sync.role=w.role;st.sync.teamId=w.team_id||null;if(w.role==='coach'&&prevRole!=='coach'&&store.markAllDirty)store.markAllDirty();st.sync.pitcherId=w.pitcher_id||null;st.sync.pitcherIds=Array.isArray(w.pitcher_ids)?w.pitcher_ids:[];st.sync.pitcherName=w.pitcher_name||null;
        if(w.role==='pcoach')(w.pitcher_ids||[]).forEach(id=>{if(!st.pitchers.find(p=>p.id===id))st.pitchers.push({id,name:'Pitcher',num:'',throws:'R',archived:false,_ph:true});});if(w.role==='player'&&w.pitcher_id&&!st.pitchers.find(p=>p.id===w.pitcher_id))st.pitchers.push({id:w.pitcher_id,name:w.pitcher_name||'Me',num:'',throws:'R',archived:false,_ph:true});
        store.save();return{role:w.role};}catch(e){return{error:String(e.message||e)};}},
    async sync(){if(store.isTest)return{skipped:'test'};const st0=store.real;if(st0.sync.teamCode&&(st0.sync.role===undefined||!st0.sync.teamId)){const w=await api.whoami();if(w.error)return w;}
      if(st0.sync.role===null)return{error:'Code not recognized (typo or revoked)'};
      const a=st0.sync.role==='viewer'?{sent:0}:await api.push();const pe=st0.sync.lastError;const b=await api.pull(); // always pull, even if the push failed
      if((a.error||a.rejected)&&!b.error){st0.sync.lastError=pe;store.save();}return Object.assign({},b,a);}};
  return api;}
Object.assign(PC,{SHOOK_TAG,EDITED_TAG,SYNC_WHY,syncWhy,validSpot,scorerOfRow,quarantine,retryRejected,discardRejected,rejectedList,sinceOf,pullUrl,PAGE,TABLES,keyOf,TEAM_SETTINGS_ID,settingsRow,rowSettings,pitchRow,rowPitch,roleAllows,buildRows,gameStatus,newerThan,mergeRemote,makeSync});
})(typeof window!=='undefined'?window:globalThis);
