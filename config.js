// Browser wiring only. pcPickConfig in js/core/config.js chooses the database.
(function(){
  var root=typeof window!=='undefined'?window:globalThis;
  function picker(){
    if(root.PC&&root.PC.pcPickConfig)return root.PC.pcPickConfig;
    if(typeof globalThis!=='undefined'&&globalThis.PC&&globalThis.PC.pcPickConfig)return globalThis.PC.pcPickConfig;
    if(typeof require==='function'){require('./js/core/config.js');return (root.PC&&root.PC.pcPickConfig)||(globalThis.PC&&globalThis.PC.pcPickConfig);}
  }
  var host='',env={};
  try{host=(typeof location!=='undefined'&&location.hostname)||'';}catch(e){}
  try{var saved=localStorage.getItem('pc_supabase');if(saved){var j=JSON.parse(saved);if(j&&j.url)env.PC_SUPABASE_URL=String(j.url);if(j&&j.key)env.PC_SUPABASE_ANON_KEY=String(j.key);}}catch(e){}
  // Node only. A browser has no process.env; localStorage above is the override there.
  if(typeof process!=='undefined'&&process.env){if(process.env.PC_SUPABASE_URL)env.PC_SUPABASE_URL=process.env.PC_SUPABASE_URL;if(process.env.PC_SUPABASE_ANON_KEY)env.PC_SUPABASE_ANON_KEY=process.env.PC_SUPABASE_ANON_KEY;}
  root.PC_CONFIG=picker()(host,env);
})();
