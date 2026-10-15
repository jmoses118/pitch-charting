// Shared diff against the base ref for the PR gates.
// Pull requests use origin/<base>. A local run, and a push, use HEAD~1.
const {spawnSync}=require('child_process');
const {baseRef}=require('./git-base.js');

function git(cwd, args){
  const r=spawnSync('git', args, {cwd, encoding:'utf8'});
  return {code:r.status==null?1:r.status, out:r.stdout||'', err:r.stderr||''};
}
function range(cwd){
  const base=baseRef();
  const mb=git(cwd, ['merge-base', base, 'HEAD']);
  if(mb.code!==0){
    const detail=(mb.err||mb.out).trim().split('\n').find(Boolean)||'merge-base failed';
    return {ok:false, base, error:detail};
  }
  return {ok:true, base, from:mb.out.trim()};
}
function destPath(file){
  const brace=file.match(/^(.*)\{.* => (.*)\}(.*)$/);
  if(brace)return (brace[1]+brace[2]+brace[3]).replace(/\/{2,}/g,'/');
  const arrow=file.split(' => ');
  if(arrow.length===2)return arrow[1];
  return file;
}
function numstat(cwd){
  const span=range(cwd);
  if(!span.ok)return span;
  const d=git(cwd, ['diff', '--numstat', '--no-ext-diff', span.from, 'HEAD']);
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
  return {ok:true, base:span.base, from:span.from, rows};
}
function fileAt(cwd, rev, rel){
  const r=git(cwd, ['show', rev+':'+rel]);
  if(r.code===0)return {ok:true, missing:false, text:r.out};
  const err=(r.err||'')+(r.out||'');
  if(/exists on disk, but not in|does not exist in/i.test(err))return {ok:true, missing:true, text:''};
  return {ok:false, error:err.trim().split('\n').find(Boolean)||'git show failed'};
}
module.exports={git, range, numstat, fileAt, destPath};
