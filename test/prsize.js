// BRIEF-5. Fail when the change is more than the cap.
// Tests, fixtures, lockfiles, and baseline images are not counted.
// PR_LINE_CAP overrides the default of 300.
const path=require('path');
const {numstat}=require('./prdiff.js');

const DEFAULT_CAP=300;
const LOCKS=/^(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|Gemfile\.lock|poetry\.lock|composer\.lock|packages\.lock\.json)$/;

function cap(){
  const raw=process.env.PR_LINE_CAP;
  if(raw==null||String(raw).trim()==='')return DEFAULT_CAP;
  if(!/^\d+$/.test(String(raw).trim()))return {error:'PR_LINE_CAP must be a whole number'};
  return Number(String(raw).trim());
}
function excluded(file){
  const n=String(file).replace(/\\/g,'/');
  const parts=n.split('/');
  const base=parts[parts.length-1];
  if(parts.includes('test')||parts.includes('tests')||parts.includes('__tests__'))return true;
  if(/\.(test|spec)\.[cm]?[jt]sx?$/.test(base))return true;
  if(parts.includes('fixture')||parts.includes('fixtures'))return true;
  if(/\.fixture\.[^/]+$/.test(base))return true;
  if(LOCKS.test(base)||/\.lock$/.test(base))return true;
  const image=/\.(png|jpe?g|gif|webp)$/i.test(base);
  if(image&&(parts.includes('baselines')||/baseline/i.test(base)))return true;
  return false;
}
function review(rows, limit){
  let total=0;
  const files=[];
  for(const row of rows){
    if(excluded(row.file))continue;
    if(row.add==='-'||row.del==='-')continue;
    const n=Number(row.add)+Number(row.del);
    if(!Number.isFinite(n))continue;
    total+=n;
    if(n)files.push({file:row.file, n});
  }
  files.sort((a,b)=>b.n-a.n);
  return {ok:total<=limit, total, files, limit};
}
function main(){
  const limit=cap();
  if(limit&&limit.error){console.log('FAIL '+limit.error);process.exit(1);}
  const root=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..');
  const diff=numstat(root);
  if(!diff.ok){console.log('FAIL pr size '+diff.error);process.exit(1);}
  const result=review(diff.rows, limit);
  if(!result.ok){
    console.log('FAIL pr size '+result.total+' lines exceeds '+result.limit);
    for(const f of result.files.slice(0,12))console.log(f.n+'\t'+f.file);
    process.exit(1);
  }
  console.log('pr size ok: '+result.total+' lines (cap '+result.limit+')');
}
if(require.main===module)main();
module.exports={DEFAULT_CAP, cap, excluded, review};
