/* Thunder Elite pitch charting – csv.js: CSV import / export.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const CSV_COLS=['mode','game_id','date','opponent','event','home_away','session','pitcher','pitcher_num','throws','inning','outs_before','lineup_slot','batter','batter_num','bats','balls_before','strikes_before','pitch_no','pitcher_pitch_no','call','call_target','type','location','location_desc','result','in_play','contact','strike','hit_spot','ab_end','ts','called_location','actual_location','foul_time','wp_pb','velocity','called_type','shook','from_video'].concat(['actual_x','actual_y']);
const esc=v=>{v=v==null?'':String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
function toCSV(rows){return[CSV_COLS.join(',')].concat(rows.map(r=>CSV_COLS.map(c=>esc(r[c])).join(','))).join('\n');}
function filterPitcherDate(rows,opt){opt=opt||{};const name=opt.pitcher!=null&&opt.pitcher!==''?String(opt.pitcher):null;const num=opt.num!=null&&opt.num!==''?String(opt.num):null;const date=opt.date!=null&&opt.date!==''?String(opt.date):null;
  return (rows||[]).filter(r=>(name==null||r.pitcher===name)&&(num==null||String(r.pitcher_num||'')===num)&&(date==null||r.date===date));}
function parseCSV(txt){const rows=[];let row=[],f='',q=false;for(let i=0;i<txt.length;i++){const ch=txt[i];
  if(q){if(ch==='"'){if(txt[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}
  else if(ch==='"')q=true;else if(ch===','){row.push(f);f='';}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f='';}else f+=ch;}
  if(f!==''||row.length){row.push(f);rows.push(row);}
  const h=rows.shift()||[];return rows.filter(r=>r.length>1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
// RULE-3: after a shake-off the called type is the pitch she threw. Callers map a CSV column onto calledType first.
function csvFlag(v){return /^(1|true|yes)$/i.test(String(v==null?'':v).trim());}
function shookPitch(p){return !!(p&&csvFlag(p.shook));}
function calledTypeOf(p){if(!p)return '';if(shookPitch(p))return String(p.type||'');
  const named=p.calledType!=null&&String(p.calledType).trim()!==''?String(p.calledType).trim():'';
  if(named)return named;
  if(p.call&&typeof PC.parseCall==='function'){const parsed=PC.parseCall(p.call,p.hand||'R','R',[]);if(parsed&&parsed.type)return parsed.type;}
  if(p.type)return String(p.type);return '';}
function csvRow(p,box){p=p||{};box=box||{};const pm=box.pitcher||{};const game=box.mode==='game';
  const called=PC.calledOf(p),actual=PC.actualOf(p);
  const desc=actual!=null&&typeof PC.locInfo==='function'?PC.locInfo(actual,p.hand,pm.throws).label:'';
  const hit=PC.calledBoxes(p).length&&actual!=null?(PC.hitSpot(p)?1:0):'';
  const aim=PC.calledBoxes(p).join('/');
  const chart=Object.assign(xyCols(p),{called_location:called==null?'':called,actual_location:actual==null?'':actual,foul_time:p.foulTime||'',wp_pb:p.wpPb||'',velocity:p.velo!=null&&p.velo!==''?p.velo:'',called_type:calledTypeOf(p),shook:p.shook?1:'',from_video:p.edited?1:'',contact:p.bb||''});
  if(!game)return Object.assign({mode:'bullpen',session:box.session||'',date:box.date||'',pitcher:pm.name||'',pitcher_num:pm.num!=null?pm.num:'',throws:pm.throws||'',bats:p.hand||'',pitch_no:box.pitch_no!=null?box.pitch_no:'',call:p.call||'',call_target:aim,type:p.type||'',location:actual==null?'':actual,location_desc:desc,result:'',strike:'',hit_spot:hit,ts:p.ts?new Date(p.ts).toISOString():''},chart);
  return Object.assign({mode:'game',game_id:box.game_id||'',date:box.date||'',opponent:box.opponent||'',event:box.event||'',home_away:box.home_away||'',session:'',pitcher:pm.name||'',pitcher_num:pm.num!=null?pm.num:'',throws:pm.throws||'',inning:p.inning!=null?p.inning:'',outs_before:p.outsBefore!=null?p.outsBefore:'',lineup_slot:p.slot!=null?p.slot+1:'',batter:p.batter||'',batter_num:p.batterNum!=null?p.batterNum:'',bats:p.hand||'',balls_before:p.b!=null?p.b:'',strikes_before:p.s!=null?p.s:'',pitch_no:box.pitch_no!=null?box.pitch_no:'',pitcher_pitch_no:box.pitcher_pitch_no!=null?box.pitcher_pitch_no:'',call:p.call||'',call_target:aim,type:p.type||'',location:actual==null?'':actual,location_desc:desc,result:p.noPitch?'ibb':(p.result||''),in_play:p.ip||'',strike:p.noPitch?'':(typeof PC.isStrike==='function'&&PC.isStrike(p.result)?1:0),hit_spot:hit,ab_end:p.end||'',ts:p.ts?new Date(p.ts).toISOString():''},chart);}
// D-5. The two CSV columns: 3 decimals, empty unless the point is current.
function xyCols(p){const xy=PC.xyOf(p),fixed=v=>v==null?'':v.toFixed(3);return {actual_x:fixed(xy.actual_x),actual_y:fixed(xy.actual_y)};}
function csvChart(p){const r=csvRow(p,{mode:'game'});return{called_location:r.called_location,actual_location:r.actual_location,foul_time:r.foul_time,wp_pb:r.wp_pb,velocity:r.velocity,called_type:r.called_type,shook:r.shook,from_video:r.from_video};}
// Import and sync keep a grid aim that fails validCalled and flag the row. Non-grid junk is dropped. Scoring writes still reject it.
function importSpots(r){r=r||{};const named=r.called_type!=null&&String(r.called_type).trim()!==''?String(r.called_type).trim():'';const type=PC.calledTypeOf({type:r.type||'',calledType:named,shook:csvFlag(r.shook),call:r.call||'',hand:r.bats||r.hand||'R'});const keep=z=>Number.isInteger(z)&&typeof PC.validActual==='function'&&PC.validActual(z);
  const targets=String(r.call_target||'').split(/[^\d]+/).map(z=>+z).filter(keep);
  let calledLoc=null;if(r.called_location!=null&&String(r.called_location).trim()!==''){const z=+r.called_location;if(keep(z))calledLoc=z;}
  const calledFlag=PC.aimFlag(type,calledLoc!=null?targets.concat(calledLoc):targets);
  let loc=null;if(r.location!=null&&String(r.location).trim()!==''){const z=+r.location;if(keep(z))loc=z;}
  let actualLoc=null;if(r.actual_location!=null&&String(r.actual_location).trim()!==''){const z=+r.actual_location;if(keep(z))actualLoc=z;}else if(loc!=null)actualLoc=loc;
  return{targets,calledLoc,loc,actualLoc,calledFlag};}
function importFlagCount(rows){return (rows||[]).reduce((n,r)=>n+(importSpots(r).calledFlag?1:0),0);}
// Re-import: called_type sets calledType; 1 / true / yes sets shook. from_video does the same for a corrected pitch. An older file's edited column still counts. Empty or 0 leaves them unset.
function csvApply(base,r){base=base||{};if(r&&r.called_type)base.calledType=String(r.called_type).trim();if(r&&csvFlag(r.shook))base.shook=true;if(r&&(csvFlag(r.from_video)||csvFlag(r.edited)))base.edited=true;const c=String(r&&r.contact||'').trim().toUpperCase();if(PC.BB_TYPES.includes(c))base.bb=c;
  const xy=csvXY(r);if(xy.x!=null)Object.assign(base,{actual_x:xy.x,actual_y:xy.y,xy_loc:xy.xy_loc});return base;}
// D-5. One row's tap point, captured on actual_location. Both blank is no point.
// Half a pair, a value outside 0 to 1, or a frame point off actual_location is a row error, not clamped.
function csvXY(r){r=r||{};const blank=v=>v==null||String(v).trim()==='';if(blank(r.actual_x)&&blank(r.actual_y))return {x:null,y:null,xy_loc:null};
  if(blank(r.actual_x)||blank(r.actual_y))return {error:'actual_x and actual_y go together'};
  const x=+r.actual_x,y=+r.actual_y;if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)return {error:'actual_x and actual_y are 0 to 1'};
  const at=importSpots(r).actualLoc,ax=PC.roundXY(x),ay=PC.roundXY(y);if(at==null)return {error:'a tap point needs actual_location'};
  if(!PC.isWay(at)&&!PC.isActualOnly(at)&&PC.cellOfXY(ax,ay)!==at)return {error:'the tap point is not in actual_location'};
  return {x:ax,y:ay,xy_loc:at};}
function csvToken(s){return String(s||'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
// File name: first name and jersey only. The rest of the roster text never lands in the name.
function csvPitcherFile(pitcher,date){const raw=pitcher&&pitcher.name;const first=typeof PC.firstName==='function'?PC.firstName(raw):String(raw||'').trim().split(/\s+/)[0];
  const num=String(pitcher&&pitcher.num!=null?pitcher.num:'').replace(/\D/g,'');const parts=['pitches',csvToken(first)||'pitcher'];if(num)parts.push(num);const d=csvToken(date);if(d)parts.push(d);return parts.join('-')+'.csv';}
function csvGameFile(g){return 'game-'+(csvToken(g&&g.date)||'game')+'-'+(csvToken(g&&g.opponent)||'game')+'.csv';}
function csvScopeFile(scope){return 'pitches-'+(csvToken(scope)||'export')+'.csv';}
Object.assign(PC,{CSV_COLS,esc,toCSV,parseCSV,filterPitcherDate,calledTypeOf,csvRow,csvChart,importSpots,importFlagCount,csvApply,csvXY,csvPitcherFile,csvGameFile,csvScopeFile});
})(typeof window!=='undefined'?window:globalThis);
