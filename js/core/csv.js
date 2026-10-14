/* Thunder Elite pitch charting – csv.js: CSV import / export.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
// ---------- CSV ----------
const CSV_COLS=['mode','game_id','date','opponent','event','home_away','session','pitcher','pitcher_num','throws','inning','outs_before','lineup_slot','batter','batter_num','bats','balls_before','strikes_before','pitch_no','pitcher_pitch_no','call','call_target','type','location','location_desc','result','in_play','strike','hit_spot','ab_end','ts','called_location','actual_location','foul_time','wp_pb','velocity'];
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
Object.assign(PC,{CSV_COLS,esc,toCSV,parseCSV,filterPitcherDate});
})(typeof window!=='undefined'?window:globalThis);
