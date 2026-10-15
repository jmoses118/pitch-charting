// Shared diff against the base ref for the PR gates.
// Pull requests use origin/<base>. A local run, and a push, use HEAD~1.
// PR_BASE and PR_HEAD let a base-branch job judge a fetched pull request.
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const {baseRef,readFileAt,missingRev}=require('./git-base.js');

const GATE_FILES=['test/prsize.js','test/changelog.js','test/prdiff.js','test/prgate.negative.js','test/git-base.js','.github/workflows/pr-gate.yml'];

function git(cwd, args){
  const r=spawnSync('git', args, {cwd, encoding:'utf8'});
  return {code:r.status==null?1:r.status, out:r.stdout||'', err:r.stderr||''};
}
function baseRev(){
  const p=process.env.PR_BASE;
  if(p&&p.trim())return p.trim();
  return baseRef();
}
function headRev(){
  const h=process.env.PR_HEAD;
  if(h&&h.trim())return h.trim();
  return 'HEAD';
}
function range(cwd){
  const base=baseRev();
  const head=headRev();
  const mb=git(cwd, ['merge-base', base, head]);
  if(mb.code!==0){
    const detail=(mb.err||mb.out).trim().split('\n').find(Boolean)||'merge-base failed';
    return {ok:false, base, head, error:detail};
  }
  return {ok:true, base, head, from:mb.out.trim()};
}
function destPath(file){
  const brace=file.match(/^(.*)\{.* => (.*)\}(.*)$/);
  if(brace)return (brace[1]+brace[2]+brace[3]).replace(/\/{2,}/g,'/');
  const arrow=file.split(' => ');
  if(arrow.length===2)return arrow[1];
  return file;
}
function gitDir(cwd){
  const r=git(cwd, ['rev-parse','--git-dir']);
  if(r.code!==0)return path.join(cwd,'.git');
  const p=r.out.trim();
  return path.isAbsolute(p)?p:path.join(cwd,p);
}
function withTextDiff(cwd, fn){
  const info=path.join(gitDir(cwd),'info','attributes');
  const had=fs.existsSync(info);
  const prev=had?fs.readFileSync(info):null;
  fs.mkdirSync(path.dirname(info),{recursive:true});
  fs.writeFileSync(info,'* diff\n');
  try{return fn();}
  finally{
    if(had)fs.writeFileSync(info, prev);
    else fs.rmSync(info,{force:true});
  }
}
function numstat(cwd){
  const span=range(cwd);
  if(!span.ok)return span;
  const d=withTextDiff(cwd, ()=>git(cwd, ['diff','-M','--numstat','--text','--no-ext-diff', span.from, span.head]));
  if(d.code!==0){
    const detail=(d.err||d.out).trim().split('\n').find(Boolean)||'git diff failed';
    return {ok:false, base:span.base, error:detail};
  }
  const rows=[];
  for(const line of d.out.split('\n')){
    if(!line)continue;
    const parts=line.split('\t');
    if(parts.length<3)continue;
    rows.push({add:parts[0], del:parts[1], file:destPath(parts.slice(2).join('\t'))});
  }
  return {ok:true, base:span.base, from:span.from, head:span.head, rows};
}
function blobAt(cwd, rev, rel){
  let r;
  try{r=spawnSync('git',['cat-file','blob',rev+':'+rel],{cwd,maxBuffer:8*1024*1024});}
  catch(e){return {ok:false,error:String(e&&e.message||e)};}
  if(r.error)return {ok:true,missing:false,binary:true,size:8*1024*1024+1};
  if(r.status!==0){
    const err=(r.stderr?r.stderr.toString():'');
    if(missingRev(err))return {ok:true,missing:true,binary:false,size:0};
    return {ok:false,error:err.trim().split('\n').find(Boolean)||'git cat-file failed'};
  }
  const buf=r.stdout||Buffer.alloc(0);
  return {ok:true,missing:false,binary:buf.includes(0),size:buf.length};
}
function rawModes(cwd){
  const span=range(cwd);
  if(!span.ok)return span;
  const d=git(cwd, ['diff','--raw','--no-renames', span.from, span.head]);
  if(d.code!==0){
    const detail=(d.err||d.out).trim().split('\n').find(Boolean)||'git diff --raw failed';
    return {ok:false,error:detail};
  }
  const rows=[];
  for(const line of d.out.split('\n')){
    const m=line.match(/^:(\d+) (\d+) \S+ \S+ [A-Z][0-9]*\t(.+)$/);
    if(m)rows.push({oldMode:m[1], newMode:m[2], file:m[3]});
  }
  return {ok:true, rows};
}
function renames(cwd){
  const span=range(cwd);
  if(!span.ok)return span;
  const d=git(cwd, ['diff','-M','--name-status', span.from, span.head]);
  if(d.code!==0){
    const detail=(d.err||d.out).trim().split('\n').find(Boolean)||'git diff failed';
    return {ok:false,error:detail};
  }
  const rows=[];
  for(const line of d.out.split('\n')){
    const m=line.match(/^R(\d+)\t(.*)\t(.*)$/);
    if(m)rows.push({score:m[1], oldPath:m[2], newPath:m[3]});
  }
  return {ok:true, rows};
}
function textChange(cwd, from, head, file, oldFile){
  const args=['diff','-U0'];
  if(oldFile)args.push('-M');
  args.push('--text','--no-ext-diff', from, head, '--');
  if(oldFile)args.push(oldFile);
  args.push(file);
  const d=withTextDiff(cwd, ()=>git(cwd, args));
  if(d.code!==0){
    const detail=(d.err||d.out).trim().split('\n').find(Boolean)||'git diff failed';
    return {ok:false,error:detail};
  }
  let bytes=0, long=false, added=0;
  for(const line of d.out.split('\n')){
    if(line.startsWith('+++')||line.startsWith('---')||line.startsWith('@@'))continue;
    if(!line.startsWith('+')&&!line.startsWith('-'))continue;
    const body=line.slice(1);
    bytes+=Buffer.byteLength(body);
    if(line.startsWith('+')){added++;if(body.length>500)long=true;}
  }
  return {ok:true, bytes, long, added};
}
function ownerOverride(){
  // A push to main is the owner landing the edit. A pull request overrides
  // only when its author is the repository owner.
  if(process.env.GITHUB_EVENT_NAME==='push')return true;
  const ev=process.env.GITHUB_EVENT_PATH;
  if(!ev)return false;
  let payload;
  try{payload=JSON.parse(fs.readFileSync(ev,'utf8'));}
  catch(e){return false;}
  const author=payload.pull_request&&payload.pull_request.user&&payload.pull_request.user.login;
  const owner=payload.repository&&payload.repository.owner&&payload.repository.owner.login;
  return !!author&&author===owner;
}
function gateDrift(cwd){
  const changed=[];
  for(const rel of GATE_FILES){
    const b=readFileAt(cwd, baseRev(), rel);
    const h=readFileAt(cwd, headRev(), rel);
    if(!b.ok)return {ok:false,error:b.error};
    if(!h.ok)return {ok:false,error:h.error};
    if(b.missing)continue;
    if(h.missing||b.text!==h.text)changed.push(rel);
  }
  if(!changed.length)return {ok:true,changed};
  if(ownerOverride())return {ok:true,changed,override:true};
  return {ok:false,changed};
}
module.exports={git, baseRev, headRev, range, numstat, blobAt, rawModes, renames, textChange, gateDrift, destPath, GATE_FILES, readFileAt};
