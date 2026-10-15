// BRIEF-7. The new version must be numerically higher than the base's
// highest. Every base heading and body stays as it was. A cache-only
// line is not plain English.
const path=require('path');
const {range, gateDrift, readFileAt, baseRev, headRev}=require('./prdiff.js');

const REL='CHANGELOG.md';
const VERSION=/^##\s+(v\d+[a-z]?)(?:\s|$)/i;

function versionId(line){
  const m=String(line).match(VERSION);
  return m?m[1].toLowerCase():null;
}
function rank(id){
  const m=/^v(\d+)/.exec(id);
  return m?Number(m[1]):null;
}
function sections(text){
  const lines=String(text).split(/\r?\n/);
  const out=[];
  let cur=null;
  for(const line of lines){
    const id=versionId(line);
    if(id){cur={id, heading:line, body:[]};out.push(cur);continue;}
    if(cur)cur.body.push(line);
  }
  const preEnd=lines.findIndex(line=>versionId(line));
  return {preamble:(preEnd<0?lines:lines.slice(0,preEnd)).join('\n'), list:out};
}
function bodyText(s, isLast){
  const lines=s.body.slice();
  if(isLast)while(lines.length&&lines[lines.length-1]==='')lines.pop();
  return lines.join('\n');
}
function plainEnglish(line){
  const t=String(line).trim();
  if(!t||/^#{1,6}(\s|$)/.test(t)||/^<!--/.test(t))return false;
  const bare=t.replace(/^[-*]\s+/,'').replace(/[`*_]/g,'').trim();
  if(/^cache\b/i.test(bare))return false;
  return bare.split(/\s+/).filter(w=>/[A-Za-z]/.test(w)).length>=3;
}
function problems(baseText, headText){
  const base=sections(baseText);
  const head=sections(headText);
  const bad=[];
  if(base.preamble!==head.preamble)bad.push('heading changed preamble');
  base.list.forEach((b,i)=>{
    const same=head.list.filter(s=>s.heading===b.heading);
    if(same.length!==1){bad.push('heading changed '+b.id);return;}
    const hi=head.list.indexOf(same[0]);
    if(bodyText(b,i===base.list.length-1)!==bodyText(same[0],hi===head.list.length-1))bad.push('body changed '+b.id);
  });
  const baseCount=new Map();
  for(const s of base.list)baseCount.set(s.id,(baseCount.get(s.id)||0)+1);
  const headCount=new Map();
  for(const s of head.list)headCount.set(s.id,(headCount.get(s.id)||0)+1);
  const fresh=[];
  for(const [id,n] of headCount){
    const was=baseCount.get(id)||0;
    if(n>1&&n>was)bad.push('version heading '+id+' is duplicated');
    if(was===0)fresh.push(id);
    else if(n>was)bad.push('version heading '+id+' already exists');
  }
  if(!fresh.length)bad.push('no new changelog version heading');
  let top=null;
  for(const s of base.list){
    const n=rank(s.id);
    if(n==null)continue;
    if(!top||n>top.n)top={n,id:s.id};
  }
  for(const id of fresh){
    const n=rank(id);
    if(top&&(n==null||n<=top.n))bad.push('version '+id+' is not higher than '+top.id);
    const bodies=head.list.filter(s=>s.id===id);
    if(!bodies.some(s=>s.body.some(plainEnglish)))bad.push('version '+id+' has no plain-English line');
  }
  return bad;
}
function main(){
  const root=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..');
  const span=range(root);
  if(!span.ok){console.log('FAIL changelog '+span.error);process.exit(1);}
  const drift=gateDrift(root);
  if(!drift.ok&&drift.error){console.log('FAIL changelog '+drift.error);process.exit(1);}
  if(!drift.ok){console.log('FAIL changelog gate file changed: '+drift.changed.join(', '));process.exit(1);}
  const base=readFileAt(root, baseRev(), REL);
  const head=readFileAt(root, headRev(), REL);
  if(!base.ok){console.log('FAIL changelog '+base.error);process.exit(1);}
  if(!head.ok){console.log('FAIL changelog '+head.error);process.exit(1);}
  if(head.missing){console.log('FAIL changelog no new changelog version heading');process.exit(1);}
  const bad=problems(base.missing?'':base.text, head.text);
  if(bad.length){console.log('FAIL changelog '+bad.join('; '));process.exit(1);}
  const have=new Set(sections(base.missing?'':base.text).list.map(s=>s.id));
  const ids=[...new Set(sections(head.text).list.map(s=>s.id).filter(id=>!have.has(id)))];
  console.log('changelog ok: '+ids.join(', '));
}
if(require.main===module)main();
module.exports={versionId, sections, plainEnglish, problems};
