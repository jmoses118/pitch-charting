// BRIEF-5 and BRIEF-7. Planted diffs must fail the gates.
// An over-cap change fails and names the file. Excluded paths pass.
// A lower PR_LINE_CAP fails a diff the default cap allows.
// A missing, empty, or duplicate changelog heading fails.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync,execSync}=require('child_process');
const {DEFAULT_CAP}=require('./prsize.js');
const repo=path.join(__dirname,'..');
const sizeJs=path.join(__dirname,'prsize.js');
const logJs=path.join(__dirname,'changelog.js');
let fails=0;

function say(ok,name,out){
  console.log((ok?'PASS ':'FAIL ')+name);
  if(!ok){fails++;if(out)console.log(String(out).slice(0,600));}
}
function git(dir, cmd){execSync('git -c core.hooksPath=/dev/null '+cmd,{cwd:dir});}
function repoDir(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'prgate-'));
  git(dir,'init -q -b main');
  git(dir,'config user.email t@example.com');
  git(dir,'config user.name t');
  fs.writeFileSync(path.join(dir,'CHANGELOG.md'),'## v1 – Start\n- The chart opens.\n');
  fs.writeFileSync(path.join(dir,'app.js'),'var a=1;\n');
  git(dir,'add CHANGELOG.md app.js');
  git(dir,'commit -q -m base');
  return dir;
}
function commit(dir){git(dir,'add -A');git(dir,'commit -q -m head');}
function lines(n){return Array.from({length:n},(_,i)=>'line '+i).join('\n')+'\n';}
function run(script, dir, env){
  const r=spawnSync(process.execPath,[script,dir],{encoding:'utf8',env:Object.assign({},process.env,{
    GITHUB_EVENT_NAME:'',GITHUB_BASE_REF:'',ARCH_BASE_REF:'HEAD~1'
  },env||{})});
  return {code:r.status==null?1:r.status, out:(r.stdout||'')+(r.stderr||'')};
}
function withRepo(edit){const dir=repoDir();edit(dir);commit(dir);return dir;}
function done(dir){fs.rmSync(dir,{recursive:true,force:true});}

say(DEFAULT_CAP===300,'BRIEF-5 default cap is 300');

{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),lines(301)));
  const r=run(sizeJs,dir,{PR_LINE_CAP:'300'});
  say(r.code!==0&&r.out.includes('exceeds')&&r.out.includes('app.js'),'BRIEF-5 301 lines fails and names app.js',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),lines(300)));
  const r=run(sizeJs,dir,{PR_LINE_CAP:'300'});
  say(r.code===0&&/pr size ok: 300 lines/.test(r.out),'BRIEF-5 300 lines passes',r.out);
  done(dir);
}
function excludedPass(name, rel){
  const dir=withRepo(d=>{
    const p=path.join(d,rel);
    fs.mkdirSync(path.dirname(p),{recursive:true});
    fs.writeFileSync(p,lines(400));
  });
  const r=run(sizeJs,dir,{PR_LINE_CAP:'300'});
  say(r.code===0&&/pr size ok: 0 lines/.test(r.out),name,r.out);
  done(dir);
}
excludedPass('BRIEF-5 tests are not counted','test/big.test.js');
excludedPass('BRIEF-5 fixtures are not counted','fixtures/data.json');
excludedPass('BRIEF-5 lockfiles are not counted','package-lock.json');
excludedPass('BRIEF-5 baseline images are not counted','shots/home.baseline.png');
{
  const dir=withRepo(d=>{
    fs.appendFileSync(path.join(d,'app.js'),lines(10));
    fs.writeFileSync(path.join(d,'yarn.lock'),lines(400));
  });
  const r=run(sizeJs,dir,{PR_LINE_CAP:'300'});
  say(r.code===0&&/pr size ok: 10 lines/.test(r.out),'BRIEF-5 counted lines ignore the lockfile',r.out);
  done(dir);
}
{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),lines(20)));
  const low=run(sizeJs,dir,{PR_LINE_CAP:'10'});
  const high=run(sizeJs,dir,{PR_LINE_CAP:'100'});
  say(low.code!==0&&low.out.includes('exceeds'),'BRIEF-5 PR_LINE_CAP 10 fails a 20 line diff',low.out);
  say(high.code===0&&/pr size ok/.test(high.out),'BRIEF-5 PR_LINE_CAP 100 allows that diff',high.out);
  done(dir);
}
{
  const dir=withRepo(d=>fs.appendFileSync(path.join(d,'app.js'),lines(1)));
  const r=run(sizeJs,dir,{PR_LINE_CAP:'lots'});
  say(r.code!==0&&r.out.includes('PR_LINE_CAP'),'BRIEF-5 a non-numeric cap fails',r.out);
  done(dir);
}

function logCase(name, text, expectFail, why){
  const dir=withRepo(d=>fs.writeFileSync(path.join(d,'CHANGELOG.md'),text));
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
logCase('BRIEF-7 heading with no user-facing line fails',baseLog+'## v2 – A new note\n### Changed\n\n-\n',true,'no user-facing line');
logCase('BRIEF-7 duplicate version fails',baseLog+'## v1 – Again\n- The chart still opens.\n',true,'already exists');
logCase('BRIEF-7 a new heading and a line passes',baseLog+'## v2 – A new note\n- The chart shows the pitcher.\n',false);
logCase('BRIEF-7 a repeated new heading fails',baseLog+'## v2 – One\n- The chart shows the pitcher.\n## v2 – Two\n- Another line is here.\n',true,'duplicated');

{
  const agents=fs.readFileSync(path.join(repo,'AGENTS.md'),'utf8');
  const need=['## Standard builder brief','BRIEF-1','BRIEF-5','BRIEF-6','BRIEF-7','BRIEF-8','SPEC.md','LESSONS.md','before coding','rule IDs','One small task','PR size cap','staging DB only, never production','CHANGELOG','Never merge'];
  const missing=need.filter(s=>!agents.includes(s));
  say(missing.length===0,'brief section is in AGENTS.md',missing.join(', '));
}
{
  const yml=fs.readFileSync(path.join(repo,'.github/workflows/ci.yml'),'utf8');
  const wired=yml.includes('node test/prsize.js')&&yml.includes('node test/changelog.js')&&yml.includes('node test/prgate.negative.js')&&yml.includes('PR_LINE_CAP');
  say(wired,'CI runs the size gate, the changelog gate, and this negative test');
}

if(fails){console.log(fails+' failed');process.exit(1);}
console.log('pr gate negative ok');
