// BRIEF-5 and BRIEF-7. Planted diffs must fail the gates.
// Merge-main counts only the pull request. Cap edits, nested test/fixture/lock
// paths, .gitattributes binary and -diff, a .wasm, ## v5, a renamed heading,
// and a cache-only line must fail.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync,execSync}=require('child_process');
const {DEFAULT_CAP}=require('./prsize.js');
const repo=path.join(__dirname,'..');
const sizeJs=path.join(__dirname,'prsize.js');
const logJs=path.join(__dirname,'changelog.js');
let fails=0;

function say(ok,name,out){
  console.log((ok?'PASS ':'FAIL ')+name);
  if(!ok){fails++;if(out)console.log(String(out).slice(0,700));}
}
function git(dir, cmd){execSync('git -c core.hooksPath=/dev/null '+cmd,{cwd:dir});}
function emptyRepo(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prgate-'));
  git(dir,'init -q -b main');
  git(dir,'config user.email t@example.com');
  git(dir,'config user.name t');
  return dir;
}
function seed(dir, log){
  fs.writeFileSync(path.join(dir,'CHANGELOG.md'), log||'## v1 – Start\n- The chart opens.\n');
  fs.writeFileSync(path.join(dir,'app.js'),'var a=1;\n');
}
function commit(dir, msg){git(dir,'add -A');git(dir,'commit -q -m '+(msg||'head'));}
function repoDir(){const dir=emptyRepo();seed(dir);commit(dir,'base');return dir;}
function lines(n){return Array.from({length:n},(_,i)=>'line '+i).join('\n')+'\n';}
function run(script, dir, env){
  const r=spawnSync(process.execPath,[script,dir],{encoding:'utf8',env:Object.assign({},process.env,{
    GITHUB_EVENT_NAME:'',GITHUB_BASE_REF:'',ARCH_BASE_REF:'HEAD~1',PR_BASE:'',PR_HEAD:''
  },env||{})});
  return {code:r.status==null?1:r.status, out:(r.stdout||'')+(r.stderr||'')};
}
function withRepo(edit){const dir=repoDir();edit(dir);commit(dir);return dir;}
function done(dir){fs.rmSync(dir,{recursive:true,force:true});}
function writeRel(dir, rel, text){
  const p=path.join(dir,rel);
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p, text);
}

say(DEFAULT_CAP===300,'BRIEF-5 default cap is 300');

{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),lines(301)));
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('exceeds')&&r.out.includes('app.js'),'BRIEF-5 301 lines fails and names app.js',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),lines(300)));
  const r=run(sizeJs,dir);
  say(r.code===0&&/pr size ok: 300 lines/.test(r.out),'BRIEF-5 300 lines passes',r.out);
  done(dir);
}
function excludedPass(name, rel){
  const dir=withRepo(d=>writeRel(d, rel, lines(400)));
  const r=run(sizeJs,dir);
  say(r.code===0&&/pr size ok: 0 lines/.test(r.out),name,r.out);
  done(dir);
}
excludedPass('BRIEF-5 top-level test/ is not counted','test/big.test.js');
excludedPass('BRIEF-5 a root lockfile is not counted','package-lock.json');
excludedPass('BRIEF-5 a root yarn.lock is not counted','yarn.lock');
function counted(name, rel){
  const dir=withRepo(d=>writeRel(d, rel, lines(301)));
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('exceeds')&&r.out.includes(rel),name,r.out);
  done(dir);
}
counted('BRIEF-5 nested test/ is counted','src/test/big.js');
counted('BRIEF-5 nested fixtures/ is counted','fixtures/data.json');
counted('BRIEF-5 nested lockfile is counted','pkg/yarn.lock');
counted('BRIEF-5 a baseline image is counted','shots/home.baseline.png');
{
  const dir=withRepo(d=>{
    fs.appendFileSync(path.join(d,'app.js'),lines(10));
    writeRel(d,'yarn.lock',lines(400));
  });
  const r=run(sizeJs,dir);
  say(r.code===0&&/pr size ok: 10 lines/.test(r.out),'BRIEF-5 counted lines ignore the root lockfile',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),lines(301)));
  const r=run(sizeJs,dir,{PR_LINE_CAP:'99999'});
  say(r.code!==0&&r.out.includes('PR changes the cap'),'BRIEF-5 PR_LINE_CAP cannot raise the cap',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),lines(1)));
  const r=run(sizeJs,dir,{PR_LINE_CAP:'lots'});
  say(r.code!==0&&r.out.includes('PR_LINE_CAP'),'BRIEF-5 a non-numeric cap fails',r.out);
  done(dir);
}
{
  const dir=emptyRepo();
  seed(dir);
  writeRel(dir,'test/prsize.js','const DEFAULT_CAP=300\n');
  commit(dir,'base');
  writeRel(dir,'test/prsize.js','const DEFAULT_CAP=99999\n');
  commit(dir,'head');
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('gate file changed'),'BRIEF-5 cap edit fails',r.out);
  done(dir);
}
{
  const dir=emptyRepo();
  seed(dir);
  writeRel(dir,'.github/workflows/ci.yml','name: CI\n');
  commit(dir,'base');
  writeRel(dir,'.github/workflows/ci.yml','name: CI\nPR_LINE_CAP: "99999"\n');
  commit(dir,'head');
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('PR changes the cap'),'BRIEF-5 workflow cap edit fails',r.out);
  done(dir);
}
{
  const dir=emptyRepo();
  seed(dir);
  writeRel(dir,'test/prsize.js','const DEFAULT_CAP=10\n');
  commit(dir,'base');
  fs.appendFileSync(path.join(dir,'app.js'),lines(20));
  commit(dir,'head');
  const low=run(sizeJs,dir);
  say(low.code!==0&&/exceeds 10\b/.test(low.out),'BRIEF-5 cap is read from the base gate',low.out);
  done(dir);
}
{
  const dir=withRepo(d=>{
    writeRel(d,'.gitattributes','*.js binary\n');
    fs.appendFileSync(path.join(d,'app.js'),lines(301));
  });
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('.gitattributes'),'BRIEF-5 .gitattributes binary fails',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>{
    writeRel(d,'.gitattributes','app.js -diff\n');
    fs.appendFileSync(path.join(d,'app.js'),lines(301));
  });
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('.gitattributes'),'BRIEF-5 .gitattributes -diff fails',r.out);
  done(dir);
}
{
  const dir=emptyRepo();
  seed(dir);
  writeRel(dir,'.gitattributes','*.js -diff\n');
  commit(dir,'base');
  fs.appendFileSync(path.join(dir,'app.js'),lines(301));
  commit(dir,'head');
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('exceeds')&&r.out.includes('app.js'),'BRIEF-5 an existing -diff attribute still counts lines',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>fs.writeFileSync(path.join(d,'mod.wasm'),Buffer.alloc(500,0)));
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('exceeds')&&r.out.includes('mod.wasm'),'BRIEF-5 a .wasm is counted by size',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>{
    writeRel(d,'test/hidden.js','var x=1;\n');
    writeRel(d,'index.html','<script src="test/hidden.js"></script>\n');
  });
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('index.html')&&r.out.includes('excluded'),'BRIEF-5 index.html cannot reference test/',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>writeRel(d,'sw.js',"const F=['package-lock.json'];\n"));
  const r=run(sizeJs,dir);
  say(r.code!==0&&r.out.includes('sw.js')&&r.out.includes('excluded'),'BRIEF-5 sw.js cannot reference a root lockfile',r.out);
  done(dir);
}
{
  const dir=emptyRepo();
  seed(dir);
  commit(dir,'base');
  git(dir,'branch pr');
  writeRel(dir,'main-only.js',lines(400));
  commit(dir,'mainadv');
  git(dir,'checkout -q pr');
  fs.appendFileSync(path.join(dir,'app.js'),lines(5));
  fs.writeFileSync(path.join(dir,'CHANGELOG.md'),'## v2 – A new note\n- The chart shows the pitcher.\n## v1 – Start\n- The chart opens.\n');
  commit(dir,'pr');
  git(dir,'update-ref refs/remotes/origin/main main');
  const env={ARCH_BASE_REF:'origin/main',GITHUB_BASE_REF:'main',GITHUB_EVENT_NAME:'pull_request'};
  const before=run(sizeJs,dir,env);
  const noted=run(logJs,dir,env);
  const sizeOk=before.code===0&&/pr size ok: (\d+) lines/.test(before.out)&&Number(before.out.match(/pr size ok: (\d+)/)[1])<30&&!before.out.includes('main-only.js');
  say(sizeOk,'BRIEF-5 merge-main counts only the pull request',before.out);
  say(noted.code===0&&/changelog ok: v2/.test(noted.out),'BRIEF-7 merge-main keeps the base note',noted.out);
  git(dir,'merge -q -m merge main');
  const after=run(sizeJs,dir,env);
  const afterOk=after.code===0&&/pr size ok: (\d+) lines/.test(after.out)&&Number(after.out.match(/pr size ok: (\d+)/)[1])<30&&!after.out.includes('main-only.js');
  say(afterOk,'BRIEF-5 merge-main still counts only the pull request after the merge',after.out);
  done(dir);
}

function logCase(name, baseText, headText, expectFail, why){
  const dir=emptyRepo();
  seed(dir, baseText);
  commit(dir,'base');
  fs.writeFileSync(path.join(dir,'CHANGELOG.md'), headText);
  commit(dir,'head');
  const r=run(logJs,dir);
  const ok=expectFail?r.code!==0&&r.out.includes(why):r.code===0&&/changelog ok/.test(r.out);
  say(ok,name,r.out);
  done(dir);
}
{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),'var b=2;\n'));
  const r=run(logJs,dir);
  say(r.code!==0&&r.out.includes('no new changelog version heading'),'BRIEF-7 no changelog entry fails',r.out);
  done(dir);
}
const baseLog='## v1 – Start\n- The chart opens.\n';
logCase('BRIEF-7 heading with no plain-English line fails',baseLog,baseLog+'## v2 – A new note\n### Changed\n\n-\n',true,'no plain-English line');
logCase('BRIEF-7 duplicate version fails',baseLog,baseLog+'## v1 – Again\n- The chart still opens.\n',true,'already exists');
logCase('BRIEF-7 a new heading and a line passes',baseLog,'## v2 – A new note\n- The chart shows the pitcher.\n'+baseLog,false);
logCase('BRIEF-7 a repeated new heading fails',baseLog,baseLog+'## v2 – One\n- The chart shows the pitcher.\n## v2 – Two\n- Another line is here.\n',true,'duplicated');
logCase('BRIEF-7 ## v5 is not higher than the base', '## v10 – Start\n- The chart opens.\n','## v10 – Start\n- The chart opens.\n## v5 – Old\n- The chart shows the pitcher.\n',true,'not higher');
logCase('BRIEF-7 heading rename fails',baseLog,'## v1 – Renamed\n- The chart opens.\n## v2 – A new note\n- The chart shows the pitcher.\n',true,'heading changed');
logCase('BRIEF-7 a cache-only line is not plain English',baseLog,baseLog+'## v2 – Cache bump\n- Cache: te-pitch-v2.\n',true,'no plain-English line');

{
  const agents=fs.readFileSync(path.join(repo,'AGENTS.md'),'utf8');
  const spec=fs.readFileSync(path.join(repo,'docs/SPEC.md'),'utf8');
  const ids=['BRIEF-1','BRIEF-2','BRIEF-3','BRIEF-4','BRIEF-5','BRIEF-6','BRIEF-7','BRIEF-8'];
  const missing=ids.filter(s=>!agents.includes(s)||!spec.includes(s));
  say(missing.length===0&&spec.includes('BRIEF-6 is not enforced'),'SPEC links BRIEF-1 through BRIEF-8',missing.join(', '));
}
{
  const yml=fs.readFileSync(path.join(repo,'.github/workflows/ci.yml'),'utf8');
  const gate=fs.readFileSync(path.join(repo,'.github/workflows/pr-gate.yml'),'utf8');
  const wired=yml.includes('node test/prsize.js')&&yml.includes('node test/changelog.js')&&yml.includes('node test/prgate.negative.js')&&!yml.includes('PR_LINE_CAP');
  const baseJob=gate.includes('pull_request_target')&&gate.includes('PR_BASE')&&gate.includes('PR_HEAD')&&gate.includes('node test/prsize.js')&&!gate.includes('pull_request.head.sha');
  say(wired&&baseJob,'CI runs the base gate and does not let the PR set the cap');
}

if(fails){console.log(fails+' failed');process.exit(1);}
console.log('pr gate negative ok');
