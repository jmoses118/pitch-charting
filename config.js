// Public client config. The publishable key is safe in the client; RLS enforces access.
// The public site is the only build that uses production. Every other host uses local
// Supabase, or PC_SUPABASE_URL and PC_SUPABASE_ANON_KEY. A non-production host drops
// any value that names the production project. Never put a secret key here.
window.pcPickConfig=function(host,env){
  var flags={scorerColumn:true,shakeColumn:true,chartColumn:true};
  var local='http://127.0.0.1:54321';
  var ref='qeqijbrokrkzpcacpjyw';
  env=env||{};
  if(host==='jmoses118.github.io')return Object.assign({url:'https://'+ref+'.supabase.co',key:'sb_publishable_vwT3XEfeel6WAzDgtI4zRQ_5Zh-VhXy'},flags);
  var url=env.PC_SUPABASE_URL||local,key=env.PC_SUPABASE_ANON_KEY||'';
  if(String(url).indexOf(ref)!==-1||key==='sb_publishable_vwT3XEfeel6WAzDgtI4zRQ_5Zh-VhXy'){url=local;key='';}
  return Object.assign({url:url,key:key},flags);
};
(function(){
  var host='',env={};
  try{host=(typeof location!=='undefined'&&location.hostname)||'';}catch(e){}
  try{var saved=localStorage.getItem('pc_supabase');if(saved){var j=JSON.parse(saved);if(j&&j.url)env.PC_SUPABASE_URL=String(j.url);if(j&&j.key)env.PC_SUPABASE_ANON_KEY=String(j.key);}}catch(e){}
  if(typeof process!=='undefined'&&process.env){if(process.env.PC_SUPABASE_URL)env.PC_SUPABASE_URL=process.env.PC_SUPABASE_URL;if(process.env.PC_SUPABASE_ANON_KEY)env.PC_SUPABASE_ANON_KEY=process.env.PC_SUPABASE_ANON_KEY;}
  window.PC_CONFIG=window.pcPickConfig(host,env);
})();
