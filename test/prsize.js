// BRIEF-5. The cap and these gate files are read from the base branch.
// A pull request that changes either one fails. Only the top-level test/
// folder and the named lockfiles at the repo root are excluded.
// A word-for-word rename is free only when the blobs match, the mode matches,
// and both paths are counted or both are excluded. Any other move counts in full.
const path=require('path');
const {numstat, blobAt, rawModes, textChange, gateDrift, readFileAt, baseRev, headRev, renames, sameBlob}=require('./prdiff.js');

const DEFAULT_CAP=300;
const ROOT_LOCKS=['package-lock.json','npm-shrinkwrap.json','yarn.lock','pnpm-lock.yaml','bun.lock','bun.lockb','Cargo.lock','Gemfile.lock','poetry.lock','composer.lock','packages.lock.json'];

function excluded(file){
  const n=String(file).replace(/\\/g,'/');
  if(n==='test'||n.startsWith('test/'))return true;
  return !n.includes('/')&&ROOT_LOCKS.includes(n);
}
function shellHits(text){
  const hits=[];
  if(/(?:^|[^A-Za-z0-9_])test\//.test(text))hits.push('test/');
  for(const name of ROOT_LOCKS){
    const re=new RegExp('(?:^|[^A-Za-z0-9_])'+name.replace(/\./g,'\\.')+'(?:[^A-Za-z0-9_]|$)');
    if(re.test(text))hits.push(name);
  }
  return hits;
}
function capIn(text){
  const found=[...String(text).matchAll(/^const DEFAULT_CAP=(\d+)\b/gm)].map(m=>Number(m[1]));
  return found.length?found[found.length-1]:null;
}
function workflowCap(text){
  const m=String(text).match(/^[\t ]*PR_LINE_CAP:\s*["']?(\d+)/m);
  return m?Number(m[1]):null;
}
function freshLong(oldText, newText){
  const have=new Set(String(oldText).split('\n'));
  return String(newText).split('\n').some(line=>line.length>500&&!have.has(line));
}
function limitFromBase(root){
  const b=readFileAt(root, baseRev(), 'test/prsize.js');
  if(!b.ok)return {error:b.error};
  if(b.missing)return {limit:DEFAULT_CAP};
  const n=capIn(b.text);
  if(n==null)return {error:'base cap missing'};
  return {limit:n};
}
function main(){
  const root=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..');
  const drift=gateDrift(root);
  if(!drift.ok&&drift.error){console.log('FAIL pr size '+drift.error);process.exit(1);}
  if(!drift.ok){console.log('FAIL pr size gate file changed: '+drift.changed.join(', ')+'; an owner override is required');process.exit(1);}
  const cap=limitFromBase(root);
  if(cap.error){console.log('FAIL pr size '+cap.error);process.exit(1);}
  const env=process.env.PR_LINE_CAP;
  if(env!=null&&String(env).trim()!==''){
    if(!/^\d+$/.test(String(env).trim())){console.log('FAIL pr size PR_LINE_CAP must be a whole number');process.exit(1);}
    if(Number(String(env).trim())!==cap.limit){console.log('FAIL pr size PR changes the cap');process.exit(1);}
  }
  const baseYml=readFileAt(root, baseRev(), '.github/workflows/ci.yml');
  const headYml=readFileAt(root, headRev(), '.github/workflows/ci.yml');
  if(!baseYml.ok){console.log('FAIL pr size '+baseYml.error);process.exit(1);}
  if(!headYml.ok){console.log('FAIL pr size '+headYml.error);process.exit(1);}
  if(workflowCap(baseYml.missing?'':baseYml.text)!==workflowCap(headYml.missing?'':headYml.text)){console.log('FAIL pr size PR changes the cap');process.exit(1);}
  const diff=numstat(root);
  if(!diff.ok){console.log('FAIL pr size '+diff.error);process.exit(1);}
  if(diff.rows.some(row=>row.file==='.gitattributes'||row.file.endsWith('/.gitattributes'))){console.log('FAIL pr size .gitattributes changed');process.exit(1);}
  for(const rel of ['sw.js','index.html']){
    const f=readFileAt(root, diff.head, rel);
    if(!f.ok){console.log('FAIL pr size '+f.error);process.exit(1);}
    if(f.missing)continue;
    const hits=shellHits(f.text);
    if(hits.length){console.log('FAIL pr size '+rel+' references excluded path '+hits[0]);process.exit(1);}
  }
  const modes=rawModes(root);
  if(!modes.ok){console.log('FAIL pr size '+modes.error);process.exit(1);}
  for(const row of modes.rows){
    if((row.oldMode==='120000'||row.newMode==='120000')&&!excluded(row.file)){console.log('FAIL pr size symlink '+row.file);process.exit(1);}
    if(row.oldMode==='160000'||row.newMode==='160000'){console.log('FAIL pr size submodule '+row.file);process.exit(1);}
    if(row.file==='.gitmodules'||row.file.endsWith('/.gitmodules')){console.log('FAIL pr size .gitmodules changed');process.exit(1);}
  }
  const named=renames(root);
  if(!named.ok){console.log('FAIL pr size '+(named.error||'git diff failed'));process.exit(1);}
  const pure=new Set(), edited=new Map();
  for(const mv of named.rows){
    const sameBucket=excluded(mv.oldPath)===excluded(mv.newPath);
    const sameMode=mv.oldMode===mv.newMode;
    let identical=false;
    if(sameBucket&&sameMode){
      const id=sameBlob(root, diff.from, mv.oldPath, diff.head, mv.newPath);
      if(!id.ok){console.log('FAIL pr size '+id.error);process.exit(1);}
      identical=id.same;
    }
    if(identical){pure.add(mv.oldPath);pure.add(mv.newPath);continue;}
    if(sameBucket)edited.set(mv.newPath, mv.oldPath);
  }
  const modeBy=new Map();
  for(const row of modes.rows)modeBy.set(row.file, row);
  let total=0;
  const files=[];
  for(const row of diff.rows){
    if(excluded(row.file)||pure.has(row.file))continue;
    const hb=blobAt(root, diff.head, row.file);
    const bb=blobAt(root, diff.from, row.file);
    if(!hb.ok){console.log('FAIL pr size '+hb.error);process.exit(1);}
    if(!bb.ok){console.log('FAIL pr size '+bb.error);process.exit(1);}
    let n;
    if(hb.binary||bb.binary||row.add==='-'||row.del==='-')n=(hb.size||0)+(bb.size||0);
    else{
      const text=textChange(root, diff.from, diff.head, row.file);
      if(!text.ok){console.log('FAIL pr size '+text.error);process.exit(1);}
      let long=text.long;
      if(edited.has(row.file)){
        const old=readFileAt(root, diff.from, edited.get(row.file));
        const neu=readFileAt(root, diff.head, row.file);
        if(!old.ok){console.log('FAIL pr size '+old.error);process.exit(1);}
        if(!neu.ok){console.log('FAIL pr size '+neu.error);process.exit(1);}
        long=freshLong(old.missing?'':old.text, neu.missing?'':neu.text);
      }
      if(long){console.log('FAIL pr size minified line in '+row.file);process.exit(1);}
      const linesN=Number(row.add)+Number(row.del);
      n=Math.max(linesN, Math.ceil(text.bytes/120));
      if(n===0){
        const mode=modeBy.get(row.file);
        if(mode&&mode.oldMode!=='000000'&&mode.newMode!=='000000'&&mode.oldMode!==mode.newMode)n=1;
      }
    }
    if(!Number.isFinite(n)){console.log('FAIL pr size bad numstat '+row.file);process.exit(1);}
    total+=n;
    if(n)files.push({file:row.file, n});
  }
  files.sort((a,b)=>b.n-a.n);
  if(total>cap.limit){
    console.log('FAIL pr size '+total+' lines exceeds '+cap.limit);
    for(const f of files.slice(0,12))console.log(f.n+'\t'+f.file);
    process.exit(1);
  }
  console.log('pr size ok: '+total+' lines (cap '+cap.limit+')');
}
if(require.main===module)main();
module.exports={DEFAULT_CAP, excluded, shellHits, ROOT_LOCKS};
