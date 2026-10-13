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
const uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4);
function defaultState(){return{v:1,roster:ROSTER.map(n=>({name:n,num:''})),
  pitchers:[{id:'p_woods',name:'Woods',num:'',throws:'L',archived:false,note:'ace'},{id:'p_crich',name:'Crichfield',num:'',throws:'R',archived:false},{id:'p_larbus',name:'Larbus',num:'',throws:'R',archived:false}],
  customTypes:[],games:[],sessions:[],activeGame:null,activeSession:null};}
function makeStore(storage){
  let real=null,test=null;
  try{const raw=storage&&storage.getItem(KEY);if(raw)real=JSON.parse(raw);}catch(e){}
  if(!real)real=defaultState();
  let saveOk=true;
  const api={
    get state(){return test||real;},
    get isTest(){return !!test;},
    save(){if(test)return false;try{storage&&storage.setItem(KEY,JSON.stringify(real));return true;}catch(e){saveOk=false;return false;}},
    get saveOk(){return saveOk;},
    // Test mode: work on a throwaway copy (same roster/pitchers/types), nothing written to storage.
    enterTest(){if(test)return;test=JSON.parse(JSON.stringify(real));test.games=[];test.sessions=[];test.activeGame=null;test.activeSession=null;test.isTest=true;},
    exitTest(){test=null;},
    replace(s){if(test)return false;real=s;return api.save();},
    addPitcher(o){const s=api.state;const name=String(o.name||'').trim();if(!name)throw new Error('name required');
      const p={id:'p_'+uid(),name,num:String(o.num==null?'':o.num).trim(),throws:o.throws==='L'?'L':'R',archived:false};s.pitchers.push(p);api.save();return p;},
    editPitcher(id,o){const p=api.state.pitchers.find(x=>x.id===id);if(!p)return null;
      if(o.name!=null&&String(o.name).trim())p.name=String(o.name).trim();if(o.num!=null)p.num=String(o.num).trim();if(o.throws)p.throws=o.throws==='L'?'L':'R';api.save();return p;},
    archivePitcher(id,on=true){const p=api.state.pitchers.find(x=>x.id===id);if(p){p.archived=!!on;api.save();}return p;},
    activePitchers(){return api.state.pitchers.filter(p=>!p.archived);},
  };return api;}
const PC={insideCol,awayCol,cz,isZone,isCorner,isOut,locInfo,BASE_TYPES,normType,parseCall,RESULTS,IP_RESULTS,isStrike,applyPitch,countsAsPitch,pitchCount,summarize,hitSpot,toCSV,parseCSV,CSV_COLS,KEY,ROSTER,defaultState,makeStore,uid,pct};
if(typeof module!=='undefined'&&module.exports)module.exports=PC;else root.PC=PC;
})(typeof window!=='undefined'?window:globalThis);
