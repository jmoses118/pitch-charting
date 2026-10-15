const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path');
const REF='qeqijbrokrkzpcacpjyw';
const PROD_KEY='sb_publishable_vwT3XEfeel6WAzDgtI4zRQ_5Zh-VhXy';
function load(host,env,storage){
  const prevU=process.env.PC_SUPABASE_URL,prevK=process.env.PC_SUPABASE_ANON_KEY;
  if(env&&env.PC_SUPABASE_URL)process.env.PC_SUPABASE_URL=env.PC_SUPABASE_URL;else delete process.env.PC_SUPABASE_URL;
  if(env&&env.PC_SUPABASE_ANON_KEY)process.env.PC_SUPABASE_ANON_KEY=env.PC_SUPABASE_ANON_KEY;else delete process.env.PC_SUPABASE_ANON_KEY;
  global.window={};
  global.location={hostname:host||''};
  global.localStorage=storage||{getItem(){return null;}};
  const file=require.resolve('../config.js');
  delete require.cache[file];
  require('../config.js');
  const cfg=global.window.PC_CONFIG;
  if(prevU===undefined)delete process.env.PC_SUPABASE_URL;else process.env.PC_SUPABASE_URL=prevU;
  if(prevK===undefined)delete process.env.PC_SUPABASE_ANON_KEY;else process.env.PC_SUPABASE_ANON_KEY=prevK;
  return cfg;
}
function offProd(cfg,where){
  assert.equal(String(cfg.url).includes(REF),false,where+' url');
  assert.equal(cfg.key===PROD_KEY,false,where+' key');
  assert.equal(cfg.scorerColumn,true);assert.equal(cfg.shakeColumn,true);assert.equal(cfg.chartColumn,true);
}
test('non-production builds do not point at the production project',()=>{
  for(const host of ['','localhost','127.0.0.1','preview.example'])offProd(load(host),'host '+host);
  offProd(load('localhost',{PC_SUPABASE_URL:'https://'+REF+'.supabase.co',PC_SUPABASE_ANON_KEY:PROD_KEY}),'env');
  offProd(load('',null,{getItem(){return JSON.stringify({url:'https://'+REF+'.supabase.co',key:PROD_KEY});}}),'localStorage');
  const staging=load('localhost',{PC_SUPABASE_URL:'https://staging-example.supabase.co',PC_SUPABASE_ANON_KEY:'sb_publishable_staging'});
  assert.equal(staging.url,'https://staging-example.supabase.co');
  assert.equal(staging.key,'sb_publishable_staging');
  const prod=load('jmoses118.github.io',{PC_SUPABASE_URL:'http://127.0.0.1:54321',PC_SUPABASE_ANON_KEY:'other'});
  assert.equal(prod.url,'https://'+REF+'.supabase.co');
  assert.equal(prod.key,PROD_KEY);
});
test('CI and app files other than config.js do not name the production project',()=>{
  const root=path.join(__dirname,'..'),hits=[];
  const walk=rel=>{
    const abs=path.join(root,rel);
    if(!fs.existsSync(abs))return;
    const st=fs.statSync(abs);
    if(st.isDirectory()){for(const n of fs.readdirSync(abs)){if(n==='node_modules')continue;walk(path.join(rel,n));}return;}
    if(!/\.(js|sh|yml|html)$/.test(abs))return;
    if(rel.endsWith('config.js')||rel.endsWith(path.join('test','prodref.test.js')))return;
    if(fs.readFileSync(abs,'utf8').includes(REF))hits.push(rel);
  };
  for(const rel of ['js','test','.github','index.html','sw.js'])walk(rel);
  assert.deepEqual(hits,[]);
});
