// Shared base ref for the architecture and duplication gates.
// Pull requests compare with origin/<base>. Push runs, and a local run, use HEAD~1.
// A failed git show fails the scan. The only pass is a resolved ref whose file is
// absent, and then only when the working baseline still matches the tree.
const {spawnSync}=require('child_process');
const path=require('path');

function baseRef(){
  const arch=process.env.ARCH_BASE_REF;
  if(arch){
    if(arch==='HEAD~1'||arch.startsWith('origin/'))return arch;
    return 'origin/'+arch;
  }
  if(process.env.GITHUB_EVENT_NAME==='push'||!process.env.GITHUB_BASE_REF)return 'HEAD~1';
  return 'origin/'+process.env.GITHUB_BASE_REF;
}
function gitCwd(root){
  const r=spawnSync('git',['rev-parse','--show-toplevel'],{cwd:root,encoding:'utf8'});
  if(r.status===0&&r.stdout&&r.stdout.trim())return r.stdout.trim();
  return path.join(__dirname,'..');
}
function readFileAt(root,rev,rel){
  const cwd=gitCwd(root);
  const r=spawnSync('git',['show',rev+':'+rel],{cwd,encoding:'utf8'});
  if(r.status===0)return {ok:true,missing:false,text:r.stdout==null?'':r.stdout};
  const err=((r.stderr||'')+(r.stdout||'')).trim();
  if(/exists on disk, but not in|does not exist in/i.test(err))return {ok:true,missing:true,text:''};
  return {ok:false,missing:false,text:'',error:err.split('\n').find(Boolean)||'git show failed'};
}
function readBase(root,rel){
  const got=readFileAt(root,baseRef(),rel);
  if(!got.ok)return {ok:false,error:got.error};
  if(got.missing)return {ok:true,missing:true,json:null};
  try{return {ok:true,missing:false,json:JSON.parse(got.text)};}
  catch(e){return {ok:false,error:'not json'};}
}
module.exports={baseRef,readBase,readFileAt};
