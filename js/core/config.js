/* The one database target. Production only when the page host is in PROD.hosts. */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const PROD={
  ref:'qeqijbrokrkzpcacpjyw',
  key:'sb_publishable_vwT3XEfeel6WAzDgtI4zRQ_5Zh-VhXy',
  hosts:['jmoses118.github.io'],
  local:'http://127.0.0.1:54321'
};
PROD.url='https://'+PROD.ref+'.supabase.co';
function dbHost(url){
  const raw=String(url||'').trim().toLowerCase();
  try{return new URL(raw).hostname;}catch(e){return raw;}
}
function namesProd(url){const host=dbHost(url),ref=PROD.ref.toLowerCase();return host.indexOf(ref)!==-1;}
function prodHost(host){const h=String(host||'').toLowerCase();return PROD.hosts.some(x=>String(x).toLowerCase()===h);}
function pcPickConfig(host,env){
  const flags={scorerColumn:true,shakeColumn:true,chartColumn:true};
  env=env||{};
  if(prodHost(host))return Object.assign({url:PROD.url,key:PROD.key,fallback:false,banner:''},flags);
  let url=env.PC_SUPABASE_URL||PROD.local,key=env.PC_SUPABASE_ANON_KEY||'',fallback=false;
  if(namesProd(url)||key===PROD.key){url=PROD.local;key='';fallback=true;}
  return Object.assign({url:url,key:key,fallback:fallback,banner:fallback?'Not the live database. This address was refused, so this copy is using the local database.':''},flags);
}
pcPickConfig.PROD=PROD;
Object.assign(PC,{pcPickConfig:pcPickConfig});
})(typeof window!=='undefined'?window:globalThis);
