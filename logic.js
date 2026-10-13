/* Thunder Elite pitch charting – pure logic (no DOM). Works in browser (window.PC) and node (require). */
(function(root){
'use strict';
// ---------- Location grid: PITCHER'S VIEW ----------
// 1-2-3 top row left->right as the pitcher sees it, 4-5-6 middle, 7-8-9 bottom.
// 11 top-left, 12 top-right, 13 bottom-left, 14 bottom-right (balls, pitcher's view).
// RHB stands on the pitcher's RIGHT (3B side) => inside column for RHB is col 2 (3/6/9); LHB inside is col 0 (1/4/7).
const insideCol=hand=>hand==='L'?0:2;
const awayCol=hand=>2-insideCol(hand);
const cz=(col,row)=>row*3+col+1;
const isZone=z=>z>=1&&z<=9, isCorner=z=>z>=11&&z<=14, isOut=z=>z>=11&&z<=18;
// 15 = center up (above 2), 16 = middle, pitcher's left (beside 4), 17 = middle, pitcher's right (beside 6), 18 = center down (below 8). All balls.
function locInfo(z,hand){hand=hand==='L'?'L':'R';
  if(isZone(z)){const r=(z-1)/3|0,c=(z-1)%3;
    const v=['up','middle','down'][r];const h=c===1?'middle':(c===insideCol(hand)?'in':'away');
    return{z,strikeZone:true,vert:v,horiz:h,label:(v==='middle'&&h==='middle')?'middle-middle':`${v} and ${h}`};}
  if(isCorner(z)){const top=z<=12,left=(z===11||z===13);const col=left?0:2;
    const h=col===insideCol(hand)?'in':'away';const v=top?'up':'down';
    return{z,strikeZone:false,vert:v,horiz:h,label:`${v} and ${h} (ball)`};}
  if(z===15||z===18)return{z,strikeZone:false,vert:z===15?'up':'down',horiz:'middle',label:(z===15?'center up':'center down')+' (ball)'};
  if(z===16||z===17){const h=(z===16?0:2)===insideCol(hand)?'in':'away';return{z,strikeZone:false,vert:'middle',horiz:h,label:`center ${h} (ball)`};}
  return null;}
// ---------- Pitch types & call codes ----------
const BASE_TYPES=[{code:'FB',name:'Fastball'},{code:'CH',name:'Change-up'},{code:'CB',name:'Curveball'},{code:'DR',name:'Drop'},{code:'DC',name:'Drop curve'},{code:'RS',name:'Rise'},{code:'SC',name:'Screw'}];
const ALIAS={FB:'FB',FAST:'FB',FASTBALL:'FB',CH:'CH',CHG:'CH',CHANGE:'CH',CU:'CB',CB:'CB',CRV:'CB',CURVE:'CB',DR:'DR',DB:'DR',DROP:'DR',DC:'DC',DROPCURVE:'DC',RS:'RS',RISE:'RS',SC:'SC',SRW:'SC',SCREW:'SC'};
function normType(t,custom){if(!t)return null;const u=String(t).toUpperCase().replace(/\s+/g,'');
  if(ALIAS[u])return ALIAS[u];
  for(const c of custom||[]){if(c.code.toUpperCase()===u||c.name.toUpperCase().replace(/\s+/g,'')===u)return c.code.toUpperCase();}
  return u||null;}
// parseCall("CHG 7"|"FB IN"|"FB A"|"H+"|"CB"...,batterHand,pitcherThrows,customTypes)
// returns {type, suffix, targets:[zones], waste:bool, desc, norm} or null
function parseCall(code,hand,throws,custom){if(code==null)return null;hand=hand==='L'?'L':'R';throws=throws==='L'?'L':'R';
  let s=String(code).toUpperCase().trim().replace(/\s+/g,' ');if(!s)return null;
  if(s==='H+'||s==='A'||s==='IN')s='FB '+s;              // bare waste/in calls are fastballs
  let m=s.match(/^([A-Z]+?)\s*(\d{1,2}|IN|I|A|O|H\+|H|L)?$/);
  // allow e.g. "FBIN","CHG7"
  if(!m)return null;
  let rawT=m[1],suf=m[2]||'';
  if(!suf){const m2=rawT.match(/^(FB|CHG|CH|CB|CRV|DR|DB|DC|RS|SRW|SC)(IN|A|O|H|L|I)$/);if(m2){rawT=m2[1];suf=m2[2];}}
  const type=normType(rawT,custom);if(!type)return null;
  const inC=insideCol(hand),awC=awayCol(hand);
  let targets=[],alts=[],waste=false,desc='';
  if(/^\d+$/.test(suf)){const z=+suf;if(!(isZone(z)||isOut(z)))return null;targets=[z];desc=locInfo(z,hand).label;}
  else if(suf==='IN'||suf==='I'){targets=[cz(inC,1)];desc=`inside to ${hand}HB`;}
  else if(suf==='O'){targets=[cz(awC,1)];desc=`away edge vs ${hand}HB`;}
  else if(suf==='A'){waste=true;targets=[awC===0?16:17];desc=`center away waste vs ${hand}HB`;}
  else if(suf==='H+'){waste=true;targets=[15];desc='center up waste';}
  else if(suf==='H'){targets=[2];desc='up in zone';}
  else if(suf==='L'){targets=[8];desc='down in zone';}
  else if(type==='CB'){targets=throws==='L'?[9]:[7];alts=throws==='L'?[6]:[4];desc=`glove side of ${throws}HP (alt ${alts[0]})`;} // RHP glove side = pitcher's left: 7 (alt 4); LHP: 9 (alt 6)
  else desc='no location';
  const norm=type+(suf?(/^\d+$/.test(suf)?suf:' '+(suf==='I'?'IN':suf)):'');
  return{type,suffix:suf==='I'?'IN':suf,targets,alts,waste,desc,norm};}
// ---------- Count logic (GameChanger style) ----------
const RESULTS={kd3:'K – reached (dropped 3rd)',ball:'Ball',called:'Called strike',swinging:'Swinging strike',foul:'Foul',inplay:'In play',hbp:'HBP'};
const IP_RESULTS={out:'Out','1B':'1B','2B':'2B','3B':'3B',HR:'HR',E:'Error',FC:'FC'};
// GC: strikes = called, swinging, foul, in play. Balls = ball, HBP.
const isStrike=r=>r==='kd3'||r==='called'||r==='swinging'||r==='foul'||r==='inplay';
// apply one pitch to a count. returns {b,s,end,outs} end: null|'BB'|'K'|'HBP'|ip result
function applyPitch(cnt,result,ip){let b=cnt.b,s=cnt.s,end=null,outs=0;
  if(result==='ball'){b++;if(b>=4)end='BB';}
  else if(result==='called'||result==='swinging'){s++;if(s>=3){end='K';outs=1;}}
  else if(result==='kd3'){s++;end='K-D3';} // strikeout for pitcher, batter reaches, no out
  else if(result==='foul'){if(s<2)s++;}
  else if(result==='hbp'){end='HBP';}
  else if(result==='inplay'){end=ip||'out';if(end==='out'||end==='FC')outs=1;}
  else throw new Error('bad result '+result);
  return{b,s,end,outs};}
// GC pitch count = every pitch thrown (balls, strikes, fouls, balls in play, HBP). Intentional walks
// awarded without pitches (records with noPitch) are not pitches.
const countsAsPitch=p=>!p.noPitch;
const pitchCount=(pitches,pid)=>pitches.filter(p=>countsAsPitch(p)&&(pid==null||p.pitcherId===pid)).length;
// ---------- Stats ----------
const hitSpot=p=>p.loc!=null&&p.targets&&p.targets.length&&p.targets.includes(p.loc);
function pct(a,b){return b?Math.round(1000*a/b)/10:null;}
function summarize(pitches){const P=pitches.filter(countsAsPitch);const strikeOf=p=>p.result?isStrike(p.result):isZone(p.loc);
  const fp=P.filter(p=>p.firstPitch!==undefined?p.firstPitch:(p.b===0&&p.s===0));
  const called=P.filter(p=>p.call&&p.targets&&p.targets.length&&p.loc!=null);
  const group=(keyf)=>{const o={};P.forEach(p=>{const k=keyf(p);if(k==null)return;(o[k]=o[k]||[]).push(p);});
    const out={};for(const k in o){const q=o[k];const c=q.filter(x=>x.call&&x.targets&&x.targets.length&&x.loc!=null);
      out[k]={n:q.length,strikes:q.filter(strikeOf).length,strikePct:pct(q.filter(strikeOf).length,q.length),spotPct:pct(c.filter(hitSpot).length,c.length),
        whiff:q.filter(x=>x.result==='swinging').length,inPlay:q.filter(x=>x.result==='inplay').length};}return out;};
  return{n:P.length,strikes:P.filter(strikeOf).length,strikePct:pct(P.filter(strikeOf).length,P.length),
    fps:fp.filter(strikeOf).length,fpsN:fp.length,fpsPct:pct(fp.filter(strikeOf).length,fp.length),
    spotN:called.length,spot:called.filter(hitSpot).length,spotPct:pct(called.filter(hitSpot).length,called.length),
    byType:group(p=>p.type),byLoc:group(p=>p.loc!=null?String(p.loc):null),byCall:group(p=>p.call||null),
    callVsThrown:group(p=>p.call?(p.call+' → '+p.type+(p.loc!=null?p.loc:'')):null),
    byResult:group(p=>p.result?(p.result==='inplay'?'inplay:'+(p.ip||'out'):p.result):null)};}
// ---------- CSV ----------
const CSV_COLS=['mode','game_id','date','opponent','event','home_away','session','pitcher','pitcher_num','throws','inning','outs_before','lineup_slot','batter','batter_num','bats','balls_before','strikes_before','pitch_no','pitcher_pitch_no','call','call_target','type','location','location_desc','result','in_play','strike','hit_spot','ab_end','ts'];
const esc=v=>{v=v==null?'':String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
function toCSV(rows){return[CSV_COLS.join(',')].concat(rows.map(r=>CSV_COLS.map(c=>esc(r[c])).join(','))).join('\n');}
function parseCSV(txt){const rows=[];let row=[],f='',q=false;for(let i=0;i<txt.length;i++){const ch=txt[i];
  if(q){if(ch==='"'){if(txt[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}
  else if(ch==='"')q=true;else if(ch===','){row.push(f);f='';}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f='';}else f+=ch;}
  if(f!==''||row.length){row.push(f);rows.push(row);}
  const h=rows.shift()||[];return rows.filter(r=>r.length>1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
// ---------- State / store ----------
const KEY='te_pitchchart_v1';
const ROSTER=['Crego','Nagy','Woods','Moses','Stuckey','Larbus','Jabour','Barrett','Elliott','Martin','Crichfield','Henn','Rennie'];
const uuid=()=>{if(typeof crypto!=='undefined'&&crypto.randomUUID)return crypto.randomUUID();const h=[...Array(32)].map(()=>(Math.random()*16|0).toString(16));h[12]='4';h[16]=(8+(Math.random()*4|0)).toString(16);const x=h.join('');return`${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;};
const isUUID=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v||'');
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
function defaultState(){return{v:1,roster:ROSTER.map(n=>({name:n,num:''})),
  pitchers:[{id:'p_woods',name:'Woods',num:'',throws:'L',archived:false,note:'ace'},{id:'p_crich',name:'Crichfield',num:'',throws:'R',archived:false},{id:'p_larbus',name:'Larbus',num:'',throws:'R',archived:false}],
  customTypes:[],games:[],sessions:[],activeGame:null,activeSession:null};}
function makeStore(storage){
  let real=null,test=null;
  try{const raw=storage&&storage.getItem(KEY);if(raw)real=JSON.parse(raw);}catch(e){}
  if(!real)real=defaultState();
  ensureSync(real);
  let saveOk=true;
  const api={
    get state(){return test||real;},
    get isTest(){return !!test;},
    // sync queue: only the real state is ever queued; test mode is a no-op
    markDirty(kind,id){if(test||id==null)return false;real.sync.queue[kind][id]=(real.sync.queue[kind][id]||0)+1;return true;},
    tombstone(p,ctx){if(test)return false;real.sync.tomb[p.id]=Object.assign({},p,ctx,{deleted:true});real.sync.queue.pitches[p.id]=(real.sync.queue.pitches[p.id]||0)+1;return true;},
    pendingCount(){if(test)return 0;const q=real.sync.queue;return Object.keys(q).reduce((a,k)=>a+Object.keys(q[k]).length,0);},
    markAllDirty(){if(test)return;real.pitchers.forEach(p=>api.markDirty('pitchers',p.id));real.games.forEach(g=>{api.markDirty('games',g.id);g.pitches.forEach(p=>api.markDirty('pitches',p.id));});real.sessions.forEach(x=>{api.markDirty('sessions',x.id);x.pitches.forEach(p=>api.markDirty('pitches',p.id));});},
    save(){if(test)return false;try{storage&&storage.setItem(KEY,JSON.stringify(real));return true;}catch(e){saveOk=false;return false;}},
    get saveOk(){return saveOk;},
    // Test mode: work on a throwaway copy (same roster/pitchers/types), nothing written to storage.
    enterTest(){if(test)return;test=JSON.parse(JSON.stringify(real));test.games=[];test.sessions=[];test.activeGame=null;test.activeSession=null;test.isTest=true;},
    exitTest(){test=null;},
    replace(s){if(test)return false;const keep=real.sync;real=s;real.sync=null;ensureSync(real);real.sync.teamCode=keep.teamCode;real.sync.deviceId=keep.deviceId;api.markAllDirty();return api.save();},
    get real(){return real;},
    addPitcher(o){const s=api.state;const name=String(o.name||'').trim();if(!name)throw new Error('name required');
      const p={id:'p_'+uid(),name,num:String(o.num==null?'':o.num).trim(),throws:o.throws==='L'?'L':'R',archived:false};s.pitchers.push(p);api.markDirty('pitchers',p.id);api.save();return p;},
    editPitcher(id,o){const p=api.state.pitchers.find(x=>x.id===id);if(!p)return null;
      if(o.name!=null&&String(o.name).trim())p.name=String(o.name).trim();if(o.num!=null)p.num=String(o.num).trim();if(o.throws)p.throws=o.throws==='L'?'L':'R';api.markDirty('pitchers',id);api.save();return p;},
    archivePitcher(id,on=true){const p=api.state.pitchers.find(x=>x.id===id);if(p){p.archived=!!on;api.markDirty('pitchers',id);api.save();}return p;},
    activePitchers(){return api.state.pitchers.filter(p=>!p.archived);},
  };return api;}
function ensureSync(st){if(!st.sync)st.sync={queue:{pitchers:{},games:{},sessions:{},pitches:{}},tomb:{},last:null,lastError:null,teamCode:'',deviceId:'d_'+uid()};
  // first run with sync: give every pitch a uuid and queue everything once
  if(!st.sync.migrated){const q=st.sync.queue;st.pitchers.forEach(p=>q.pitchers[p.id]=1);
    [].concat(st.games||[],st.sessions||[]).forEach(c=>{q[c.pitches&&c.lineup?'games':'sessions'][c.id]=1;c.pitches.forEach(p=>{if(!isUUID(p.id))p.id=uuid();q.pitches[p.id]=1;});});st.sync.migrated=true;}
  return st;}
// ---------- Cloud sync (Supabase REST, team code header checked by RLS) ----------
const TABLES=['pitchers','games','sessions','pitches'];
const keyOf={pitchers:'team_code,id',games:'team_code,id',sessions:'team_code,id',pitches:'id'};
function pitchRow(p,ctx){return{id:p.id,mode:ctx.mode,game_id:ctx.game_id||null,session_id:ctx.session_id||null,pitcher_id:p.pitcherId||null,ts:p.ts||null,hand:p.hand||null,type:p.type||null,call:p.call||null,call_raw:p.callRaw||null,
  targets:p.targets||[],loc:p.loc==null?null:p.loc,result:p.result||null,ip:p.ip||null,end_event:p.end||null,inning:p.inning==null?null:p.inning,outs_before:p.outsBefore==null?null:p.outsBefore,slot:p.slot==null?null:p.slot,
  batter:p.batter==null?null:p.batter,batter_num:p.batterNum==null?null:String(p.batterNum),b:p.b==null?null:p.b,s:p.s==null?null:p.s,abn:p.abn==null?null:p.abn,first_pitch:p.firstPitch==null?null:!!p.firstPitch,no_pitch:!!p.noPitch,prev_hand:p.prevHand||null,deleted:!!p.deleted};}
function rowPitch(r){const p={id:r.id,ts:+r.ts||0,pitcherId:r.pitcher_id,hand:r.hand,type:r.type,call:r.call,callRaw:r.call_raw,targets:r.targets||[],loc:r.loc,result:r.result,ip:r.ip,end:r.end_event};
  if(r.mode==='game')Object.assign(p,{inning:r.inning,outsBefore:r.outs_before,slot:r.slot,batter:r.batter,batterNum:r.batter_num,b:r.b,s:r.s,abn:r.abn,firstPitch:r.first_pitch,prevHand:r.prev_hand});else{p.b=0;p.s=0;}
  if(r.no_pitch)p.noPitch=true;return p;}
function buildRows(st){const q=st.sync.queue,team=st.sync.teamCode,dev=st.sync.deviceId,out={},ver={};
  const idx={};st.games.forEach(g=>g.pitches.forEach(p=>idx[p.id]=[p,{mode:'game',game_id:g.id}]));st.sessions.forEach(x=>x.pitches.forEach(p=>idx[p.id]=[p,{mode:'bullpen',session_id:x.id}]));
  for(const t of TABLES){out[t]=[];ver[t]={};for(const id in q[t]){ver[t][id]=q[t][id];let row=null;
    if(t==='pitchers'){const p=st.pitchers.find(x=>x.id===id);if(p)row={id:p.id,name:p.name,num:p.num||null,throws:p.throws,archived:!!p.archived,note:p.note||null};}
    else if(t==='games'){const g=st.games.find(x=>x.id===id);if(g)row={id:g.id,date:g.date,opponent:g.opponent,event:g.event||null,home_away:g.homeAway,lineup:g.lineup,cur:g.cur,started:g.started||null,ended:g.ended||null,imported:!!g.imported};}
    else if(t==='sessions'){const x=st.sessions.find(y=>y.id===id);if(x)row={id:x.id,date:x.date,started:x.started||null,imported:!!x.imported};}
    else{const hit=idx[id];if(hit)row=pitchRow(hit[0],hit[1]);else if(st.sync.tomb[id]){const tb=st.sync.tomb[id];row=pitchRow(tb,{mode:tb.mode,game_id:tb.game_id,session_id:tb.session_id});row.deleted=true;}}
    if(row){row.team_code=team;row.device_id=dev;out[t].push(row);}else delete q[t][id];}}
  return{rows:out,ver};}
function mergeRemote(st,data){const q=st.sync.queue;let added=0,removed=0;
  (data.pitchers||[]).forEach(r=>{if(q.pitchers[r.id]||r.deleted)return;const p=st.pitchers.find(x=>x.id===r.id),v={id:r.id,name:r.name,num:r.num||'',throws:r.throws||'R',archived:!!r.archived,note:r.note||undefined};if(p)Object.assign(p,v);else st.pitchers.push(v);});
  (data.games||[]).forEach(r=>{if(q.games[r.id]||r.deleted)return;let g=st.games.find(x=>x.id===r.id);const v={id:r.id,date:r.date,opponent:r.opponent,event:r.event||'',homeAway:r.home_away,lineup:r.lineup||[],cur:r.cur||{inning:1,outs:0,slot:0,b:0,s:0,abn:0},started:r.started,ended:r.ended,imported:r.imported};
    if(g)Object.assign(g,v);else st.games.push(Object.assign(v,{pitches:[]}));});
  (data.sessions||[]).forEach(r=>{if(q.sessions[r.id]||r.deleted)return;if(!st.sessions.find(x=>x.id===r.id))st.sessions.push({id:r.id,date:r.date,started:r.started,imported:r.imported,pitches:[]});});
  const where={};st.games.forEach(g=>g.pitches.forEach(p=>where[p.id]=g));st.sessions.forEach(x=>x.pitches.forEach(p=>where[p.id]=x));const touched=new Set();
  (data.pitches||[]).forEach(r=>{if(q.pitches[r.id])return;const c=where[r.id];
    if(r.deleted){if(c){c.pitches=c.pitches.filter(p=>p.id!==r.id);removed++;}return;}
    if(c)return;let box=r.mode==='game'?st.games.find(g=>g.id===r.game_id):st.sessions.find(x=>x.id===r.session_id);
    if(!box){if(r.mode==='game'){box={id:r.game_id,date:'',opponent:'?',event:'',homeAway:'home',lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0}};st.games.push(box);}else{box={id:r.session_id,date:'',pitches:[]};st.sessions.push(box);}}
    box.pitches.push(rowPitch(r));touched.add(box);added++;});
  touched.forEach(b=>b.pitches.sort((a,b2)=>a.ts-b2.ts));return{added,removed};}
function makeSync(store,cfg){const f=cfg.fetch||(typeof fetch!=='undefined'?fetch.bind(globalThis):null);let busy=false;
  const hdr=team=>({apikey:cfg.key,Authorization:'Bearer '+cfg.key,'x-team-code':team,'Content-Type':'application/json'});
  const api={
    async push(){if(store.isTest)return{skipped:'test'};const st=store.real;const team=st.sync.teamCode;if(!team)return{skipped:'no team code'};if(busy)return{skipped:'busy'};busy=true;
      try{const{rows,ver}=buildRows(st);let sent=0;
        for(const t of TABLES){if(!rows[t].length)continue;for(let i=0;i<rows[t].length;i+=500){const chunk=rows[t].slice(i,i+500);
          const r=await f(`${cfg.url}/rest/v1/${t}?on_conflict=${keyOf[t]}`,{method:'POST',headers:Object.assign(hdr(team),{Prefer:'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(chunk)});
          if(!r.ok){const tx=await r.text();throw new Error(t+' '+r.status+' '+tx.slice(0,200));}sent+=chunk.length;
          chunk.forEach(row=>{const q=st.sync.queue[t];if(q[row.id]===ver[t][row.id]){delete q[row.id];if(t==='pitches'&&row.deleted)delete st.sync.tomb[row.id];}});}}
        st.sync.last=Date.now();st.sync.lastError=null;store.save();return{sent};}
      catch(e){st.sync.lastError=String(e.message||e);store.save();return{error:st.sync.lastError};}finally{busy=false;}},
    async pull(){if(store.isTest)return{skipped:'test'};const st=store.real;const team=st.sync.teamCode;if(!team)return{skipped:'no team code'};
      try{const data={};for(const t of TABLES){data[t]=[];for(let off=0;;off+=1000){const r=await f(`${cfg.url}/rest/v1/${t}?select=*&team_code=eq.${encodeURIComponent(team)}&order=${t==='pitches'?'ts':'created_at'}.asc&limit=1000&offset=${off}`,{headers:hdr(team)});
          if(!r.ok)throw new Error(t+' '+r.status+' '+(await r.text()).slice(0,200));const a=await r.json();data[t]=data[t].concat(a);if(a.length<1000)break;}}
        const res=mergeRemote(st,data);st.sync.last=Date.now();st.sync.lastError=null;store.save();return res;}
      catch(e){st.sync.lastError=String(e.message||e);store.save();return{error:st.sync.lastError};}},
    async sync(){if(store.isTest)return{skipped:'test'};const a=await api.push();if(a.error||a.skipped)return a;const b=await api.pull();return Object.assign({},a,b);}};
  return api;}
const PC={insideCol,awayCol,cz,isZone,isCorner,isOut,locInfo,BASE_TYPES,normType,parseCall,RESULTS,IP_RESULTS,isStrike,applyPitch,countsAsPitch,pitchCount,summarize,hitSpot,toCSV,parseCSV,CSV_COLS,KEY,ROSTER,defaultState,makeStore,uid,uuid,isUUID,pct,makeSync,buildRows,mergeRemote,pitchRow,TABLES};
if(typeof module!=='undefined'&&module.exports)module.exports=PC;else root.PC=PC;
})(typeof window!=='undefined'?window:globalThis);
