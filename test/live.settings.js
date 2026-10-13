// Live: coach-only team_settings shared across coach phones. Needs PC_TEST_COACH (zztest coach code) in env or .test-env. Clean zztest rows after.
global.window={};require('../config.js');const CFG=global.window.PC_CONFIG;const PC=require('../logic.js');
const mem=()=>{const m={};return{getItem:k=>m[k]??null,setItem:(k,v)=>{m[k]=v;},removeItem:k=>{delete m[k];}};};
(async()=>{let f=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)f++;};
const a=PC.makeStore(mem());a.real.sync.teamCode=process.env.PC_TEST_COACH;const sa=PC.makeSync(a,{url:CFG.url,key:CFG.key});
ok((await sa.whoami()).role==='coach','coach code');Object.assign(a.state.settings,{alerts:[65,85],limits:{day:70,weekend:180},showRest:true});a.markDirty('team_settings','team');
const r=await sa.sync();ok(!r.error,'push+pull '+(r.error||''));ok(!Object.keys(a.real.sync.queue.team_settings).length,'queue drained');
const b=PC.makeStore(mem());b.real.sync.teamCode=process.env.PC_TEST_COACH;const sb=PC.makeSync(b,{url:CFG.url,key:CFG.key});const r2=await sb.sync();ok(!r2.error,'2nd coach phone sync');
ok(JSON.stringify(b.state.settings.limits)==='{"day":70,"weekend":180}'&&b.state.settings.alerts.join()==='65,85'&&b.state.settings.showRest===true,'2nd coach phone got shared settings');
ok(!Object.keys(b.real.sync.queue.team_settings||{}).length,'2nd phone did not push its defaults');
const anon=await fetch(CFG.url+'/rest/v1/team_settings?select=*',{headers:{apikey:CFG.key,Authorization:'Bearer '+CFG.key}});const aj=anon.ok?await anon.json():[];ok(aj.length===0,'no code -> no rows');
const bad=await fetch(CFG.url+'/rest/v1/team_settings',{method:'POST',headers:{apikey:CFG.key,Authorization:'Bearer '+CFG.key,'Content-Type':'application/json'},body:JSON.stringify({team_id:'thunder-elite-13u',id:'team',day_limit:1})});ok(!bad.ok,'no code -> cannot write ('+bad.status+')');
console.log(f?f+' FAILED':'ALL PASS');process.exit(f?1:0);})();
