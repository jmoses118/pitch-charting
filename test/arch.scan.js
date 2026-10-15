// ARCH-1: these files are IIFEs, so an import linter cannot see a cross-file call.
// Core never mentions the UI. The UI does not define valid*, calc*, or *Of rule functions.
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const js=dir=>fs.readdirSync(path.join(root,dir)).filter(f=>f.endsWith('.js')).map(f=>path.join(dir,f));
const rule=/(?:function\s+|const\s+|let\s+|var\s+)((?:valid|calc)\w*|\w+Of)\b/g;
let fail=0;
for(const f of js('js/core')){
  const t=fs.readFileSync(path.join(root,f),'utf8');
  if(t.includes('js/ui')){console.log('FAIL '+f+' references js/ui');fail++;}
}
for(const f of js('js/ui')){
  const t=fs.readFileSync(path.join(root,f),'utf8');
  let m;rule.lastIndex=0;
  while((m=rule.exec(t))){console.log('FAIL '+f+' defines '+m[1]);fail++;}
}
if(fail){console.log(fail+' architecture boundary failure'+(fail===1?'':'s'));process.exit(1);}
console.log('arch scan ok');
