/* Thunder Elite pitch charting – csv.js: CSV import / export.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
// ---------- CSV ----------
const CSV_COLS=['mode','game_id','date','opponent','event','home_away','session','pitcher','pitcher_num','throws','inning','outs_before','lineup_slot','batter','batter_num','bats','balls_before','strikes_before','pitch_no','pitcher_pitch_no','call','call_target','type','location','location_desc','result','in_play','strike','hit_spot','ab_end','ts','called_location','actual_location','foul_time','wp_pb','velocity','called_type','shook','from_video'];
const esc=v=>{v=v==null?'':String(v);return/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
function toCSV(rows){return[CSV_COLS.join(',')].concat(rows.map(r=>CSV_COLS.map(c=>esc(r[c])).join(','))).join('\n');}
// One pitcher's pitches on one date. Name is the first name stored on the pitcher; number breaks a shared first name.
function filterPitcherDate(rows,opt){opt=opt||{};const name=opt.pitcher!=null&&opt.pitcher!==''?String(opt.pitcher):null;const num=opt.num!=null&&opt.num!==''?String(opt.num):null;const date=opt.date!=null&&opt.date!==''?String(opt.date):null;
  return (rows||[]).filter(r=>(name==null||r.pitcher===name)&&(num==null||String(r.pitcher_num||'')===num)&&(date==null||r.date===date));}
function parseCSV(txt){const rows=[];let row=[],f='',q=false;for(let i=0;i<txt.length;i++){const ch=txt[i];
  if(q){if(ch==='"'){if(txt[i+1]==='"'){f+='"';i++;}else q=false;}else f+=ch;}
  else if(ch==='"')q=true;else if(ch===','){row.push(f);f='';}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&txt[i+1]==='\n')i++;row.push(f);rows.push(row);row=[];f='';}else f+=ch;}
  if(f!==''||row.length){row.push(f);rows.push(row);}
  const h=rows.shift()||[];return rows.filter(r=>r.length>1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));}
// Pitch type of the call. Old pitches with no calledType fall back to the call text, then the thrown type when it was not a shake-off.
function calledTypeOf(p){if(!p)return '';if(p.calledType)return String(p.calledType);
  if(p.call&&typeof PC.parseCall==='function'){const parsed=PC.parseCall(p.call,p.hand||'R','R',[]);if(parsed&&parsed.type)return parsed.type;}
  if(!p.shook&&p.type)return String(p.type);return '';}
function csvChart(p){p=p||{};return{called_location:p.calledLoc!=null?p.calledLoc:'',actual_location:p.actualLoc!=null?p.actualLoc:(p.loc!=null?p.loc:''),foul_time:p.foulTime||'',wp_pb:p.wpPb||'',velocity:p.velo!=null&&p.velo!==''?p.velo:'',called_type:calledTypeOf(p),shook:p.shook?1:'',from_video:p.edited?1:''};}
// Strike column. Game uses the umpire result (an intentional walk is blank). Bullpen with no result uses the zone, the same rule as strikeOf.
function csvStrike(p,mode){if(!p||p.noPitch)return '';if(mode==='bullpen')return p.result?(PC.isStrike(p.result)?1:0):(PC.isZone(p.loc)?1:0);return PC.isStrike(p.result)?1:0;}
function csvHit(p){return p&&p.targets&&p.targets.length&&p.loc!=null?(PC.hitSpot(p)?1:0):'';}
// One CSV row for a game pitch and a bullpen pitch. The chart columns come from csvChart so export and the chart helper cannot drift.
function csvRow(p,box){p=p||{};box=box||{};const mode=box.mode==='bullpen'?'bullpen':'game';const pm=box.pitcher||{};
  const desc=p.loc!=null&&typeof PC.locInfo==='function'?PC.locInfo(p.loc,p.hand,pm.throws).label:'';
  const row={mode,date:box.date!=null?box.date:'',pitcher:pm.name,pitcher_num:pm.num,throws:pm.throws,bats:p.hand,pitch_no:box.pitchNo,call:p.call,call_target:(p.targets||[]).join('/'),type:p.type,location:p.loc,location_desc:desc,strike:csvStrike(p,mode),hit_spot:csvHit(p),ts:new Date(p.ts).toISOString()};
  if(mode==='bullpen')Object.assign(row,{session:box.sessionId,result:p.result||''});
  else Object.assign(row,{game_id:box.gameId,opponent:box.opponent,event:box.event,home_away:box.homeAway,session:'',inning:p.inning,outs_before:p.outsBefore,lineup_slot:p.slot+1,batter:p.batter,batter_num:p.batterNum,balls_before:p.b,strikes_before:p.s,pitcher_pitch_no:box.pitcherPitchNo,result:p.noPitch?'ibb':p.result,in_play:p.ip,ab_end:p.end});
  return Object.assign(row,csvChart(p));}
// Re-import: called_type sets calledType; 1 / true / yes sets shook. from_video does the same for a corrected pitch. An older file's edited column still counts. Empty or 0 leaves them unset.
function csvFlag(v){return /^(1|true|yes)$/i.test(String(v==null?'':v).trim());}
function csvApply(base,r){base=base||{};if(r&&r.called_type)base.calledType=String(r.called_type).trim();if(r&&csvFlag(r.shook))base.shook=true;if(r&&(csvFlag(r.from_video)||csvFlag(r.edited)))base.edited=true;return base;}
function csvToken(s){return String(s||'').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
// File name: first name and jersey only. The rest of the roster text never lands in the name.
function csvPitcherFile(pitcher,date){const raw=pitcher&&pitcher.name;const first=typeof PC.firstName==='function'?PC.firstName(raw):String(raw||'').trim().split(/\s+/)[0];
  const num=String(pitcher&&pitcher.num!=null?pitcher.num:'').replace(/\D/g,'');const parts=['pitches',csvToken(first)||'pitcher'];if(num)parts.push(num);const d=csvToken(date);if(d)parts.push(d);return parts.join('-')+'.csv';}
function csvGameFile(g){return 'game-'+(csvToken(g&&g.date)||'game')+'-'+(csvToken(g&&g.opponent)||'game')+'.csv';}
function csvScopeFile(scope){return 'pitches-'+(csvToken(scope)||'export')+'.csv';}
Object.assign(PC,{CSV_COLS,esc,toCSV,parseCSV,filterPitcherDate,calledTypeOf,csvChart,csvStrike,csvHit,csvRow,csvApply,csvPitcherFile,csvGameFile,csvScopeFile});
})(typeof window!=='undefined'?window:globalThis);
