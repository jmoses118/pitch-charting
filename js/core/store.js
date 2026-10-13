/* Thunder Elite pitch charting – store.js: Local state, storage, migrations, notes.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const {defaultCallSheet,TABLES,DEFAULT_ALERTS,DEFAULT_REST,DEFAULT_LIMITS}=PC;
// ---------- State / store ----------
const KEY='te_pitchchart_v1';
const ROSTER=['Crego','Nagy','Woods','Moses','Stuckey','Larbus','Jabour','Barrett','Elliott','Martin','Crichfield','Henn','Rennie'];
const uuid=()=>{if(typeof crypto!=='undefined'&&crypto.randomUUID)return crypto.randomUUID();const h=[...Array(32)].map(()=>(Math.random()*16|0).toString(16));h[12]='4';h[16]=(8+(Math.random()*4|0)).toString(16);const x=h.join('');return`${x.slice(0,8)}-${x.slice(8,12)}-${x.slice(12,16)}-${x.slice(16,20)}-${x.slice(20)}`;};
const isUUID=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v||'');
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
function defaultState(){return{v:1,roster:ROSTER.map(n=>({name:n,num:''})),
  pitchers:[{id:'p_woods',name:'Avery Woods',num:'45',throws:'L',archived:false},{id:'p_crich',name:'Jules Critchfield',num:'',throws:'R',archived:false},{id:'p_larbus',name:'Reese Larbus',num:'',throws:'R',archived:false}],
  customTypes:[],notes:[],settings:{alerts:DEFAULT_ALERTS.slice(),rest:DEFAULT_REST.map(x=>Object.assign({},x)),limits:Object.assign({},DEFAULT_LIMITS),showRest:false},callSheets:[defaultCallSheet()],activeSheet:'cs_wristband1',games:[],sessions:[],activeGame:null,activeSession:null};}
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
    markDirty(kind,id){if(test||id==null)return false;real.sync.queue[kind]=real.sync.queue[kind]||{};real.sync.queue[kind][id]=(real.sync.queue[kind][id]||0)+1;return true;},
    tombstone(p,ctx){if(test)return false;real.sync.tomb[p.id]=Object.assign({},p,ctx,{deleted:true});real.sync.queue.pitches[p.id]=(real.sync.queue.pitches[p.id]||0)+1;return true;},
    pendingCount(){if(test)return 0;const q=real.sync.queue;return Object.keys(q).reduce((a,k)=>a+Object.keys(q[k]).length,0);},
    markAllDirty(){if(test)return;real.pitchers.forEach(p=>api.markDirty('pitchers',p.id));(real.callSheets||[]).forEach(c=>api.markDirty('call_sheets',c.id));real.games.forEach(g=>{api.markDirty('games',g.id);g.pitches.forEach(p=>api.markDirty('pitches',p.id));});real.sessions.forEach(x=>{api.markDirty('sessions',x.id);x.pitches.forEach(p=>api.markDirty('pitches',p.id));});},
    save(){if(test)return false;try{storage&&storage.setItem(KEY,JSON.stringify(real));return true;}catch(e){saveOk=false;return false;}},
    get saveOk(){return saveOk;},
    // Test mode: work on a throwaway copy (same roster/pitchers/types), nothing written to storage.
    enterTest(){if(test)return;test=JSON.parse(JSON.stringify(real));test.games=[];test.sessions=[];test.activeGame=null;test.activeSession=null;test.isTest=true;},
    exitTest(){test=null;},
    replace(s){if(test)return false;const keep=real.sync;real=s;real.sync=null;ensureSync(real);real.sync.teamCode=keep.teamCode;real.sync.deviceId=keep.deviceId;api.markAllDirty();return api.save();},
    get real(){return real;},
    addPitcher(o){const s=api.state;const name=String(o.name||'').trim();if(!name)throw new Error('name required');
      const p={id:'p_'+uid(),name,num:String(o.num==null?'':o.num).trim(),throws:o.throws,archived:false};if(p.throws!=='L'&&p.throws!=='R')throw new Error('throwing hand required (L or R)');s.pitchers.push(p);api.markDirty('pitchers',p.id);api.save();return p;},
    editPitcher(id,o){const p=api.state.pitchers.find(x=>x.id===id);if(!p)return null;
      if(o.name!=null&&String(o.name).trim())p.name=String(o.name).trim();if(o.num!=null)p.num=String(o.num).trim();if(o.throws)p.throws=o.throws==='L'?'L':'R';api.markDirty('pitchers',id);api.save();return p;},
    archivePitcher(id,on=true){const p=api.state.pitchers.find(x=>x.id===id);if(p){p.archived=!!on;api.markDirty('pitchers',id);api.save();}return p;},
    activePitchers(){return api.state.pitchers.filter(p=>!p.archived);},
  };return api;}
const FULL_NAMES={p_woods:['Woods','Avery Woods'],p_crich:['Crichfield','Jules Critchfield'],p_larbus:['Larbus','Reese Larbus']};
function ensureSync(st){
  // one-time: full pitcher names (same ids, so access codes and history stay attached); only renames untouched defaults
  if(!st.migNames1){(st.pitchers||[]).forEach(p=>{const f=FULL_NAMES[p.id];if(f&&p.name===f[0]){p.name=f[1];if(st.sync)st.sync.queue.pitchers[p.id]=(st.sync.queue.pitchers[p.id]||0)+1;}});st.migNames1=true;}
  // one-time: Woods has no 'ace' tag, is #45 and throws L (queued so the cloud stays consistent)
  if(!st.migWoods1){const w=(st.pitchers||[]).find(p=>p.id==='p_woods');if(w){delete w.note;if(!w.num)w.num='45';w.throws='L';if(st.sync)st.sync.queue.pitchers[w.id]=(st.sync.queue.pitchers[w.id]||0)+1;}st.migWoods1=true;}if(!st.sync)st.sync={queue:{pitchers:{},games:{},sessions:{},pitches:{}},tomb:{},last:null,lastError:null,teamCode:'',deviceId:'d_'+uid()};
  TABLES.forEach(t=>{st.sync.queue[t]=st.sync.queue[t]||{};});st.notes=st.notes||[];st.settings=st.settings||{};if(!Array.isArray(st.settings.alerts))st.settings.alerts=DEFAULT_ALERTS.slice();if(!Array.isArray(st.settings.rest))st.settings.rest=DEFAULT_REST.map(x=>Object.assign({},x));st.settings.limits=Object.assign({},DEFAULT_LIMITS,st.settings.limits);if(typeof st.settings.showRest!=='boolean')st.settings.showRest=false;
  // one-time: preload Jim's wristband (pushed only once edited, so a stale default never overwrites the cloud copy)
  if(!st.migSheets1){if(!Array.isArray(st.callSheets)||!st.callSheets.length){st.callSheets=[defaultCallSheet()];}if(!st.activeSheet)st.activeSheet=st.callSheets[0].id;st.migSheets1=true;}
  // first run with sync: give every pitch a uuid and queue everything once
  if(!st.sync.migrated){const q=st.sync.queue;st.pitchers.forEach(p=>q.pitchers[p.id]=1);
    [].concat(st.games||[],st.sessions||[]).forEach(c=>{q[c.pitches&&c.lineup?'games':'sessions'][c.id]=1;c.pitches.forEach(p=>{if(!isUUID(p.id))p.id=uuid();q.pitches[p.id]=1;});});st.sync.migrated=true;}
  return st;}
// ---------- notes (pitching coach / coach -> player's report) ----------
const noteId=(o)=>o.sessionId?'n_'+o.sessionId+(o.pitcherId?'_'+o.pitcherId:''):'n_'+o.gameId+'_'+o.pitcherId;
function findNote(st,o){return (st.notes||[]).find(n=>!n.deleted&&n.pitcherId===o.pitcherId&&(o.sessionId?n.sessionId===o.sessionId:n.gameId===o.gameId))||null;}
Object.assign(PC,{KEY,ROSTER,uuid,isUUID,uid,defaultState,makeStore,FULL_NAMES,ensureSync,noteId,findNote});
})(typeof window!=='undefined'?window:globalThis);
