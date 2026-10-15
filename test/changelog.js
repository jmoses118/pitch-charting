// BRIEF-7. A change must add a CHANGELOG version heading that the base
// does not already have, and at least one non-empty user-facing line under it.
const path=require('path');
const {range, fileAt}=require('./prdiff.js');

const REL='CHANGELOG.md';
const VERSION=/^##\s+(v\d+[a-z]?)(?:\s|$)/i;

function versionId(line){
  const m=String(line).match(VERSION);
  return m?m[1].toLowerCase():null;
}
function sections(text){
  const out=[];
  let cur=null;
  for(const line of String(text).split(/\r?\n/)){
    const id=versionId(line);
    if(id){cur={id, heading:line, body:[]};out.push(cur);continue;}
    if(cur)cur.body.push(line);
  }
  return out;
}
function userFacing(line){
  const t=String(line).trim();
  if(!t)return false;
  if(/^#{1,6}(\s|$)/.test(t))return false;
  if(/^<!--/.test(t))return false;
  return /[A-Za-z]/.test(t);
}
function problems(baseText, headText){
  const base=sections(baseText);
  const head=sections(headText);
  const baseCount=new Map();
  for(const s of base)baseCount.set(s.id,(baseCount.get(s.id)||0)+1);
  const headCount=new Map();
  for(const s of head)headCount.set(s.id,(headCount.get(s.id)||0)+1);
  const bad=[];
  const fresh=[];
  for(const [id,n] of headCount){
    const was=baseCount.get(id)||0;
    if(n>1&&n>was)bad.push('version heading '+id+' is duplicated');
    if(was===0)fresh.push(id);
    else if(n>was)bad.push('version heading '+id+' already exists');
  }
  if(!fresh.length)bad.push('no new changelog version heading');
  for(const id of fresh){
    if(!head.filter(s=>s.id===id).some(s=>s.body.some(userFacing)))bad.push('version '+id+' has no user-facing line');
  }
  return bad;
}
function main(){
  const root=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..');
  const span=range(root);
  if(!span.ok){console.log('FAIL changelog '+span.error);process.exit(1);}
  const base=fileAt(root, span.from, REL);
  const head=fileAt(root, 'HEAD', REL);
  if(!base.ok){console.log('FAIL changelog '+base.error);process.exit(1);}
  if(!head.ok){console.log('FAIL changelog '+head.error);process.exit(1);}
  if(head.missing){console.log('FAIL changelog no new changelog version heading');process.exit(1);}
  const bad=problems(base.missing?'':base.text, head.text);
  if(bad.length){console.log('FAIL changelog '+bad.join('; '));process.exit(1);}
  const have=new Set(sections(base.missing?'':base.text).map(s=>s.id));
  const ids=[...new Set(sections(head.text).map(s=>s.id).filter(id=>!have.has(id)))];
  console.log('changelog ok: '+ids.join(', '));
}
if(require.main===module)main();
module.exports={versionId, sections, userFacing, problems};
