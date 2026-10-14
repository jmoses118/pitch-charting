/* Thunder Elite pitch charting – workload.js: pitch counts today / this tournament weekend, soft limits, in-game alerts, optional rest guide.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const {countsAsPitch}=PC;
// ---------- pitch count alerts + rest days ----------
const DEFAULT_ALERTS=[75,90];
// sensible youth (12U-14U fastpitch) rest guide; coach can edit. up to `max` pitches in an outing -> `days` of rest
const DEFAULT_REST=[{max:20,days:0},{max:35,days:1},{max:50,days:2},{max:65,days:3},{max:9999,days:4}];
function restDays(n,table){const t=(table&&table.length?table:DEFAULT_REST).slice().sort((a,b)=>a.max-b.max);const r=t.find(x=>n<=x.max)||t[t.length-1];return r?r.days:0;}
function lastOuting(st,pid){let best=null;(st.games||[]).forEach(g=>{const P=g.pitches.filter(p=>p.pitcherId===pid&&countsAsPitch(p)&&!p.deleted);if(!P.length)return;const ts=Math.max(...P.map(p=>p.ts||0));const date=g.date||new Date(ts).toISOString().slice(0,10);
    if(!best||date>best.date||(date===best.date&&ts>best.ts))best={gameId:g.id,date,ts,n:P.length,opponent:g.opponent};});return best;}
function addDays(d,n){const x=new Date(d+'T12:00:00');x.setDate(x.getDate()+n);return x.toISOString().slice(0,10);}
function restInfo(st,pid,today,table){const lo=lastOuting(st,pid);if(!lo)return null;const days=restDays(lo.n,table);const ready=addDays(lo.date,days+1);// days of full rest after the outing
  return Object.assign({},lo,{days,ready,ok:today>=ready});}
function alertLevel(n,th){const t=(th&&th.length?th:DEFAULT_ALERTS).slice().sort((a,b)=>a-b);let lvl=-1;t.forEach((x,i)=>{if(n>=x)lvl=i;});return{lvl,at:lvl>=0?t[lvl]:null,next:t.find(x=>n<x)||null};}
// ---------- today / tournament weekend workload ----------
// local calendar date (YYYY-MM-DD) of a timestamp, in the phone's time zone
const localDate=ts=>{const d=new Date(ts);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
// tournament weekend = Fri-Sun. Fri/Sat/Sun -> this weekend (current); Mon-Thu -> the weekend just played
function weekendRange(today){const dow=new Date(today+'T12:00:00').getDay();const back=dow===0?2:dow===6?1:dow===5?0:dow+2;const from=addDays(today,-back);return{from,to:addDays(from,2),current:dow===0||dow>=5};}
const pitchDay=(p,box)=>p.ts?localDate(p.ts):(box&&box.date)||null;
// game and bullpen/warm-up pitches thrown by pid today and this weekend (separate lines, never mixed)
function workload(st,pid,today){const wk=weekendRange(today);const z=()=>({game:0,bullpen:0});const r={today:z(),weekend:z(),wk};
  const add=(kind,p,box)=>{const d=pitchDay(p,box);if(!d)return;if(d===today)r.today[kind]++;if(d>=wk.from&&d<=wk.to)r.weekend[kind]++;};
  (st.games||[]).forEach(g=>(g.pitches||[]).forEach(p=>{if(p.pitcherId===pid&&!p.deleted&&countsAsPitch(p))add('game',p,g);}));
  (st.sessions||[]).forEach(s=>(s.pitches||[]).forEach(p=>{if((p.pitcherId||s.pitcherId)===pid&&!p.deleted&&countsAsPitch(p))add('bullpen',p,s);}));
  return r;}
const workloadText=w=>`Today: ${w.today.game} game + ${w.today.bullpen} bullpen · ${w.wk.current?'Weekend':'Last weekend'}: ${w.weekend.game} game + ${w.weekend.bullpen} bullpen`;
// compact header form, e.g. "Today 0 · Wknd 12" (game + bullpen pitches)
const workloadShort=w=>`Today ${w.today.game+w.today.bullpen} · Wknd ${w.weekend.game+w.weekend.bullpen}`;
// optional coach-set soft limits (game + bullpen combined). null = off
const DEFAULT_LIMITS={day:null,weekend:null};
const LIMIT_WARN=0.85; // "approaching" from 85% of a limit
function limitLevel(n,limit){if(!limit)return -1;if(n>=limit)return 1;if(n>=Math.ceil(limit*LIMIT_WARN))return 0;return -1;}
function workloadAlert(w,limits){const L=limits||{};const d=w.today.game+w.today.bullpen,k=w.weekend.game+w.weekend.bullpen;
  const day={n:d,limit:L.day||null,lvl:limitLevel(d,L.day)},weekend={n:k,limit:L.weekend||null,lvl:w.wk.current?limitLevel(k,L.weekend):-1};
  return{lvl:Math.max(day.lvl,weekend.lvl),day,weekend};}
const cleanLimit=v=>{const n=parseInt(v,10);return Number.isInteger(n)&&n>0&&n<1000?n:null;};
Object.assign(PC,{DEFAULT_ALERTS,DEFAULT_REST,restDays,lastOuting,addDays,restInfo,alertLevel,localDate,weekendRange,pitchDay,workload,workloadText,workloadShort,DEFAULT_LIMITS,LIMIT_WARN,limitLevel,workloadAlert,cleanLimit});
})(typeof window!=='undefined'?window:globalThis);
