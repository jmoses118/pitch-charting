const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),path=require('path'),cp=require('child_process');
const PC=require('../logic.js');
const PROD=PC.pcPickConfig.PROD;
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
  assert.equal(new URL(cfg.url).hostname.toLowerCase().includes(PROD.ref),false,where+' url');
  assert.notEqual(cfg.key,PROD.key,where+' key');
  assert.equal(cfg.scorerColumn,true);assert.equal(cfg.shakeColumn,true);assert.equal(cfg.chartColumn,true);
}
// Join adjacent quoted pieces before a case-insensitive search.
function sourceNamesProd(src){
  let s=String(src);
  const re=/(['"])([^'"\\]*)\1\s*\+\s*(['"])([^'"\\]*)\3/g;
  let prev;do{prev=s;s=s.replace(re,(_,q,a,_q,b)=>q+a+b+q);}while(s!==prev);
  return s.toLowerCase().includes(PROD.ref.toLowerCase());
}
test('INFRA-3: non-production builds do not point at the production project',()=>{
  for(const host of ['','localhost','127.0.0.1','preview.example']){
    const cfg=load(host);offProd(cfg,'host '+host);assert.equal(cfg.fallback,false);assert.match(cfg.banner,/does not use production/);
  }
  const refused=load('localhost',{PC_SUPABASE_URL:PROD.url,PC_SUPABASE_ANON_KEY:PROD.key});
  offProd(refused,'env');assert.ok(refused.banner);assert.equal(refused.fallback,true);assert.equal(new URL(refused.url).hostname,'127.0.0.1');
  offProd(load('',null,{getItem(){return JSON.stringify({url:PROD.url,key:PROD.key});}}),'localStorage');
  const staging=load('localhost',{PC_SUPABASE_URL:'https://staging-example.supabase.co',PC_SUPABASE_ANON_KEY:'sb_publishable_staging'});
  assert.equal(staging.url,'https://staging-example.supabase.co');assert.equal(staging.key,'sb_publishable_staging');assert.equal(staging.fallback,false);assert.match(staging.banner,/does not use production/);
  const prod=load(PROD.hosts[0],{PC_SUPABASE_URL:PROD.local,PC_SUPABASE_ANON_KEY:'other'});
  assert.equal(prod.url,PROD.url);assert.equal(prod.key,PROD.key);assert.equal(prod.banner,'');
  PROD.hosts.push('preview.example');
  try{assert.equal(load('preview.example').url,PROD.url);}finally{PROD.hosts.pop();}
});
test('INFRA-3: an uppercase production URL and a split project ref are refused',()=>{
  const up=PROD.url.replace(PROD.ref,PROD.ref.toUpperCase());
  const cfg=load('localhost',{PC_SUPABASE_URL:up,PC_SUPABASE_ANON_KEY:PROD.key});
  offProd(cfg,'uppercase');assert.ok(cfg.banner);assert.equal(new URL(cfg.url).hostname,'127.0.0.1');
  const userinfo='https://coach:secret@'+PROD.ref.toUpperCase()+'.supabase.co/rest';
  offProd(load('localhost',{PC_SUPABASE_URL:userinfo}),'userinfo');
  const split="'"+PROD.ref.slice(0,5)+"'+'"+PROD.ref.slice(5)+"'";
  assert.equal(split.toLowerCase().includes(PROD.ref),false);
  assert.equal(sourceNamesProd(split),true);
  assert.equal(sourceNamesProd(up),true);
  assert.equal(sourceNamesProd('https://staging-example.supabase.co'),false);
});
// A migration version is the 14-digit prefix. The scan does not exempt by that number.
function migrationVersion(rel){
  const norm=String(rel).split(path.sep).join('/');
  const m=norm.match(/(?:^|\/)supabase\/migrations\/(\d{14})_[^/]*\.sql$/);
  return m?m[1]:'';
}
const {readBaseText}=require('./git-base');
function unchangedOnBase(root,rel,text){
  const got=readBaseText(root,rel);
  if(!got.ok)throw new Error(got.error||'git show failed');
  return !got.missing&&got.text===text;
}
function prodHit(root,rel,text){
  if(rel===path.join('js','core','config.js'))return false;
  if(!sourceNamesProd(text))return false;
  return !(migrationVersion(rel)&&unchangedOnBase(root,rel,text));
}
test('INFRA-3: a migration already on the base branch is exempt from the project-ref scan',()=>{
  const root=path.join(__dirname,'..');
  const old='supabase/migrations/20261014120000_scoring_lock.sql';
  const sql=fs.readFileSync(path.join(root,old),'utf8');
  assert.equal(sourceNamesProd(sql),true);
  assert.equal(unchangedOnBase(root,old,sql),true);
  assert.equal(prodHit(root,old,sql),false);
  assert.equal(unchangedOnBase(root,old,sql+'-- changed\n'),false);
  assert.equal(prodHit(root,old,sql+'-- changed\n'),true);
  assert.equal(unchangedOnBase(root,'supabase/pending/20261014120000_scoring_lock.sql',sql),false);
});
test('INFRA-3: a backdated migration that is not on the base branch is not exempt',()=>{
  const root=path.join(__dirname,'..');
  const back='supabase/migrations/20261014120000_backdated.sql';
  const text='-- '+PROD.ref+'\n';
  assert.ok(migrationVersion(back)<='20261015130000');
  assert.equal(sourceNamesProd(text),true);
  const got=readBaseText(root,back);
  assert.equal(got.ok,true);assert.equal(got.missing,true);
  assert.equal(unchangedOnBase(root,back,text),false);
  assert.equal(prodHit(root,back,text),true);
});
test('INFRA-3: CI, app, and SQL files do not name the production project',()=>{
  const root=path.join(__dirname,'..'),hits=[];
  const walk=rel=>{
    const abs=path.join(root,rel);
    if(!fs.existsSync(abs))return;
    const st=fs.statSync(abs);
    if(st.isDirectory()){for(const n of fs.readdirSync(abs)){if(n==='node_modules')continue;walk(path.join(rel,n));}return;}
    if(!/\.(js|sh|yml|html|sql)$/.test(abs))return;
    if(prodHit(root,rel,fs.readFileSync(abs,'utf8')))hits.push(rel);
  };
  for(const rel of ['js','test','.github','supabase','index.html','sw.js','config.js'])walk(rel);
  assert.deepEqual(hits,[]);
  const sh=fs.readFileSync(path.join(root,'test','pg-migrate.sh'),'utf8');
  assert.match(sh,/localhost\|127\.0\.0\.1/);
  const bad=cp.spawnSync('bash',['test/pg-migrate.sh'],{cwd:root,env:Object.assign({},process.env,{PGHOST:'db.example.com'}),encoding:'utf8'});
  assert.notEqual(bad.status,0);
  assert.match(bad.stderr,/localhost or 127\.0\.0\.1/);
});
