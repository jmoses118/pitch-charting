// ARCH-1: these files are IIFEs, so an import linter cannot see a cross-file call.
// Core never mentions the UI. The UI does not define rule functions, bind PC,
// copy a banned list, or read a pitch spot except through the baseline below.
const fs=require('fs'),path=require('path');
const {readBase}=require('./git-base.js');
const BANNED_MEMBERS=['isZone','isStrike','GRID_XY','CH_TARGETS','nearestTarget'];
const ALLOW_FN={scoreCommit:'js/core/flow.js',rowPitch:'js/core/sync.js',importSpots:'js/core/csv.js',editActual:'js/core/game.js',revertEdit:'js/core/game.js',editSnap:'js/core/game.js',applyChart:'js/core/game.js',csvXY:'js/core/csv.js',xyOf:'js/core/location.js'};
const FIELDS=['loc','targets','calledLoc','actualLoc'];
const AIM_MSG_OK={'js/ui/coach.js:coachZoneAct':1,'js/ui/coach.js:pointerdown':1,'js/ui/shared.js:tapLoc':1};
const GRID_FN={file:'js/ui/report.js',name:'reportPNG'};
const PC_REF='(?:window\\s*\\[\\s*([\'"])PC\\1\\s*\\]|globalThis\\s*\\[\\s*([\'"])PC\\2\\s*\\]|globalThis\\s*\\.\\s*PC\\b|window\\s*\\.\\s*PC\\b|PC\\b)';

function maskComments(src){let out='',i=0;while(i<src.length){if(src[i]==='/'&&src[i+1]==='/'){let j=i;while(j<src.length&&src[j]!=='\n')j++;out+=' '.repeat(j-i);i=j;}
  else if(src[i]==='/'&&src[i+1]==='*'){const end=src.indexOf('*/',i+2);const j=end<0?src.length:end+2;out+=src.slice(i,j).replace(/[^\n]/g,' ');i=j;}
  else{out+=src[i];i++;}}return out;}
function jsFiles(root,dir){const abs=path.join(root,dir);if(!fs.existsSync(abs))return [];return fs.readdirSync(abs).filter(f=>f.endsWith('.js')).sort().map(f=>path.join(dir,f));}
function read(root,rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function braceSpan(src,brace){let depth=0;for(let i=brace;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'){depth--;if(depth===0)return [brace,i];}}return null;}
function skipParens(src,open){let depth=0,q='';for(let i=open;i<src.length;i++){const c=src[i];if(q){if(c==='\\'){i++;continue;}if(c===q)q='';continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='(')depth++;else if(c===')'){depth--;if(depth===0)return i;}}return -1;}
function fnBodyFromKw(src,kw){const paren=src.indexOf('(',kw);if(paren<0||paren-kw>80)return null;const close=skipParens(src,paren);if(close<0)return null;let i=close+1;while(i<src.length&&/\s/.test(src[i]))i++;if(src[i]!=='{')return null;return braceSpan(src,i);}
function listenerBody(src,after){const slice=src.slice(after,after+160);const relFn=slice.search(/function\b/);const relArrow=slice.indexOf('=>');
  if(relFn>=0&&(relArrow<0||relFn<relArrow))return fnBodyFromKw(src,after+relFn);
  if(relArrow<0)return null;let i=after+relArrow+2;while(i<src.length&&/\s/.test(src[i]))i++;if(src[i]!=='{')return null;return braceSpan(src,i);}
function declFunctions(src){const out=[],re=/function\s+([A-Za-z_$][\w$]*)\s*\(/g;let m;while((m=re.exec(src))){const body=fnBodyFromKw(src,m.index);if(body)out.push({name:m[1],start:body[0],end:body[1]});}return out;}
function namedSpans(src){const spans=declFunctions(src).map(d=>({name:d.name,start:d.start,end:d.end}));const ev=/addEventListener\s*\(\s*(['"])([^'"]+)\1\s*,/g;let m;while((m=ev.exec(src))){const body=listenerBody(src,m.index+m[0].length);if(body)spans.push({name:m[2],start:body[0],end:body[1]});}return spans;}
function owner(spans,index){let best=null;for(const s of spans)if(index>=s.start&&index<=s.end&&(!best||s.end-s.start<best.end-best.start))best=s;return best?best.name:'<top>';}
function inRange(ranges,index){return ranges.some(([a,b])=>index>=a&&index<=b);}
function topSplit(part,ch){let brace=0,paren=0,bracket=0,q='';for(let i=0;i<part.length;i++){const c=part[i];if(q){if(c==='\\'){i++;continue;}if(c===q)q='';continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='{')brace++;else if(c==='}')brace--;else if(c==='(')paren++;else if(c===')')paren--;else if(c==='[')bracket++;else if(c===']')bracket--;else if(c===ch&&brace===0&&paren===0&&bracket===0)return i;}return -1;}
function countPattern(pat){pat=String(pat||'').trim();if(!pat)return 0;if(pat[0]==='{'){let n=0;for(const part of splitTop(pat.slice(1,-1))){let t=part.trim();if(!t)continue;if(t.startsWith('...')){const rest=t.slice(3).trim();if(rest[0]==='{'||rest[0]==='[')n+=countPattern(rest);continue;}const colon=topSplit(t,':');if(colon<0){const name=t.split('=')[0].trim();if(FIELDS.includes(name))n++;}else{let key=t.slice(0,colon).trim();if((key[0]==="'"||key[0]==='"')&&key[key.length-1]===key[0])key=key.slice(1,-1);if(FIELDS.includes(key))n++;let rest=t.slice(colon+1).trim();const eq=topSplit(rest,'=');const val=(eq<0?rest:rest.slice(0,eq)).trim();if(val[0]==='{'||val[0]==='[')n+=countPattern(val);}}return n;}if(pat[0]==='['){let n=0;for(const part of splitTop(pat.slice(1,-1))){const t=part.trim();if(t[0]==='{'||t[0]==='[')n+=countPattern(t);}return n;}return 0;}
function addPatterns(src,from,to,add){let q='';for(let i=from;i<to;i++){const c=src[i];if(q){if(c==='\\'){i++;continue;}if(c===q)q='';continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='{'||c==='['){const close=matchClose(src,i,c,c==='{'?'}':']');if(close<0||close>to)return;add(i,countPattern(src.slice(i,close+1)));i=close;}}}
function fieldReads(src,ranges){let n=0;const add=(index,k)=>{if(k&&!inRange(ranges,index))n+=k;};let m;
  const dot=new RegExp('\\.(?:'+FIELDS.join('|')+')\\b','g');while((m=dot.exec(src)))add(m.index,1);
  const br=new RegExp('\\[\\s*([\'"])(?:'+FIELDS.join('|')+')\\1\\s*\\]','g');while((m=br.exec(src)))add(m.index,1);
  const decl=/(?:const|let|var)\s*(?=[\[{])/g;while((m=decl.exec(src))){const open=m.index+m[0].length;const close=matchClose(src,open,src[open],src[open]==='{'?'}':']');if(close<0)continue;add(m.index,countPattern(src.slice(open,close+1)));}
  const fn=/function\s+[A-Za-z_$][\w$]*\s*\(/g;while((m=fn.exec(src))){const open=src.indexOf('(',m.index);const close=skipParens(src,open);if(close<0)continue;addPatterns(src,open+1,close,add);}
  return n;}
function listFrom(src,name){const m=src.match(new RegExp('\\b'+name+'\\s*=\\s*\\[([^\\]]*)\\]'));if(!m)return null;return m[1].split(',').map(s=>+s.trim()).filter(n=>Number.isFinite(n));}
function sameMulti(a,b){if(!a||a.length!==b.length)return false;const s=[...a].map(Number).sort((x,y)=>x-y),t=[...b].map(Number).sort((x,y)=>x-y);return s.every((n,i)=>n===t[i]);}
function stringList(body){const parts=body.split(/[\s,]+/).filter(Boolean);if(!parts.length||parts.some(p=>!/^\d+$/.test(p)))return null;return parts.map(Number);}
function whichList(nums,lists){if(!nums)return null;for(const [name,list] of lists)if(sameMulti(nums,list))return name;return null;}
function matchClose(src,open,oCh,cCh){let depth=0,q='';for(let i=open;i<src.length;i++){const c=src[i];if(q){if(c==='\\'){i++;continue;}if(c===q)q='';continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c===oCh)depth++;else if(c===cCh){depth--;if(depth===0)return i;}}return -1;}
function splitTop(body){const parts=[];let start=0,depth=0,paren=0,brace=0,q='';for(let i=0;i<body.length;i++){const c=body[i];if(q){if(c==='\\'){i++;continue;}if(c===q)q='';continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='[')depth++;else if(c===']')depth--;else if(c==='(')paren++;else if(c===')')paren--;else if(c==='{')brace++;else if(c==='}')brace--;else if(c===','&&depth===0&&paren===0&&brace===0){parts.push(body.slice(start,i));start=i+1;}}parts.push(body.slice(start));return parts;}
function flattenParts(parts,env){const nums=[];for(const raw of parts){const p=raw.trim();if(!p)continue;const core=p.startsWith('...')?p.slice(3).trim():p;if(/^\d+$/.test(core)){nums.push(+core);continue;}const qn=core.match(/^(['"])(\d+)\1$/);if(qn){nums.push(+qn[2]);continue;}if(core.startsWith('[')&&core.endsWith(']')){const inner=flattenParts(splitTop(core.slice(1,-1)),env);if(!inner)return null;nums.push(...inner);continue;}if(/^[A-Za-z_$][\w$]*$/.test(core)&&env&&env.has(core)){nums.push(...env.get(core));continue;}return null;}return nums;}
function listHits(src,lists){const hits=[],env=new Map();const note=(nums,kind)=>{const hit=whichList(nums,lists);if(hit)hits.push(kind+' '+hit);};
  for(let i=0;i<src.length;i++){const c=src[i];if(c==="'"||c==='"'||c==='`'){const q0=c;let j=i+1,body='',interp=false;while(j<src.length){if(src[j]==='\\'){body+=src[j+1]||'';j+=2;continue;}if(src[j]===q0)break;if(q0==='`'&&src[j]==='$'&&src[j+1]==='{')interp=true;body+=src[j];j++;}if(!interp){const hit=whichList(stringList(body),lists);if(hit)hits.push('string '+hit);}if(j<src.length)i=j;continue;}
    if(c==='['){const end=matchClose(src,i,'[',']');if(end<0)continue;const nums=flattenParts(splitTop(src.slice(i+1,end)),env);const pre=src.slice(Math.max(0,i-60),i);const named=pre.match(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*$/);if(nums){if(named)env.set(named[1],nums);note(nums,'literal');}i=end;continue;}
    if((src.startsWith('Array.of',i)||src.startsWith('Array.from',i))&&(i===0||/\W/.test(src[i-1]))){const name=src.startsWith('Array.of',i)?'Array.of':'Array.from';const open=src.indexOf('(',i+name.length);if(open<0||open-(i+name.length)>3)continue;const close=matchClose(src,open,'(',')');if(close<0)continue;const args=splitTop(src.slice(open+1,close));const nums=name==='Array.of'?flattenParts(args,env):(args[0]!=null?flattenParts([args[0]],env):null);if(nums)note(nums,name);i=close;}}
  return hits;}
function parameterNames(src){const names=new Set();const re=/function\s*[A-Za-z_$][\w$]*\s*\(([^)]*)\)|\(([^)]*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>/g;let m;while((m=re.exec(src))){if(m[3]){names.add(m[3]);continue;}const raw=m[1]!=null?m[1]:m[2];if(raw==null)continue;for(const part of raw.split(',')){const id=part.trim().split('=')[0].trim();if(/^[A-Za-z_$][\w$]*$/.test(id))names.add(id);}}return [...names];}
function locBaseline(root){const local=path.join(root,'test','loc.baseline.json');const file=fs.existsSync(local)?local:path.join(__dirname,'loc.baseline.json');return JSON.parse(fs.readFileSync(file,'utf8'));}
function barePc(body){return /(?:^|[^.\w$])PC\b(?!\s*[.\[(])/.test(body);}

function scan(root){
  const fails=[];
  const push=(rel,why)=>fails.push(rel+' '+why);
  const calls=read(root,'js/core/calls.js'),scoring=read(root,'js/core/scoring.js');
  const lists=[['CH_TARGETS',listFrom(calls,'CH_TARGETS')],['LOW_RING',listFrom(scoring,'LOW_RING')]].filter(([,v])=>v&&v.length);
  const seen={};
  const counts={};
  for(const rel of jsFiles(root,'js/core')){
    const raw=read(root,rel);
    if(raw.includes('js/ui'))push(rel,'references js/ui');
    const masked=maskComments(raw);
    for(const d of declFunctions(masked))if(ALLOW_FN[d.name])(seen[d.name]=seen[d.name]||[]).push(rel);
    if(path.basename(rel)==='location.js')continue;
    if(/\bp\s*\[\s*(?!['"\d])/.test(masked))push(rel,'uses non-literal p[...]');
    const ranges=declFunctions(masked).filter(d=>ALLOW_FN[d.name]===rel).map(d=>[d.start,d.end]);
    counts[rel]=fieldReads(masked,ranges);
  }
  for(const [name,files] of Object.entries(seen)){
    if(files.length>1||files[0]!==ALLOW_FN[name])for(const rel of new Set(files))push(rel,'duplicate function '+name);
  }
  const current=locBaseline(root),base=readBase(root,'test/loc.baseline.json');
  const files=new Set([...Object.keys(counts),...Object.keys(current)]);
  for(const rel of files){
    const n=counts[rel]||0,b=Object.prototype.hasOwnProperty.call(current,rel)?current[rel]:0;
    if(n>b)push(rel,'reads a pitch spot '+n+' time'+(n===1?'':'s')+', baseline '+b);
    else if(n<b)push(rel,'reads a pitch spot '+n+' time'+(n===1?'':'s')+', below baseline '+b);
  }
  if(!base.ok){push('test/loc.baseline.json','git show failed');for(const rel of Object.keys(current))push(rel,'git show failed');}
  else if(!base.missing){for(const rel of Object.keys(current)){const prev=Object.prototype.hasOwnProperty.call(base.json,rel)?base.json[rel]:0;if(!(rel in base.json)||current[rel]>prev)push(rel,'loc baseline rose from '+prev+' to '+current[rel]);}}
  for(const rel of jsFiles(root,'js/ui')){
    const src=maskComments(read(root,rel));
    const rule=/(?:function\s+|const\s+|let\s+|var\s+)((?:valid|calc)\w*|\w+Of|strikeFor)\b/g;
    let m;while((m=rule.exec(src)))push(rel,'defines '+m[1]);
    const bind=new RegExp('(?:const|let|var)\\s+(?:\\{[^}]*\\}|[A-Za-z_$][\\w$]*)\\s*=\\s*'+PC_REF+'(?!\\s*[.\\[?(])','g');
    while((m=bind.exec(src)))push(rel,'binds PC');
    const litKey=/PC\s*\[\s*(['"])[^'"]*\1\s*\]/g;
    while((m=litKey.exec(src)))push(rel,'uses '+m[0].replace(/\s+/g,''));
    const anyKey=/PC\s*\[\s*(?!['"])/g;
    while((m=anyKey.exec(src)))push(rel,'uses non-literal PC[...]');
    const opt=/PC\s*\?\./g;
    while((m=opt.exec(src)))push(rel,'uses PC?.');
    const alias=/(?:window\s*\[\s*(['"])PC\1\s*\]|globalThis\s*\[\s*(['"])PC\2\s*\]|globalThis\s*\.\s*PC\b)/g;
    while((m=alias.exec(src)))push(rel,'uses '+m[0].replace(/\s+/g,''));
    const win=/window\s*\.\s*PC\s*(?:\?\.|\.|\[)/g;
    while((m=win.exec(src)))push(rel,'uses window.PC');
    const arg=new RegExp('(?:\\(|,)\\s*'+PC_REF+'\\s*(?:,|\\))','g');
    while((m=arg.exec(src)))push(rel,'passes PC');
    const assignPc=/Object\.assign\s*\(\s*PC\s*,/g;
    while((m=assignPc.exec(src)))push(rel,'Object.assign(PC)');
    const assign=/PC\s*\.\s*([A-Za-z_$][\w$]*)\s*=(?!=)/g;
    while((m=assign.exec(src)))push(rel,'assigns PC.'+m[1]);
    const compound=/PC\s*\.\s*[A-Za-z_$][\w$]*\s*(?:\+\+|--|\|\|=|\?\?=|&&=|\+=|-=|\*=|\/=|%=|\*\*=|<<=|>>=|>>>=|&=|\^=|\|=)/g;
    while((m=compound.exec(src)))push(rel,'assigns PC with '+m[0].replace(/^.*?(?=\+\+|--|\|\|=|\?\?=|&&=|\+=|-=|\*=|\/=|%=|\*\*=|<<=|>>=|>>>=|&=|\^=|\|=)/,''));
    const prefix=/(?:\+\+|--)PC\s*\.\s*[A-Za-z_$][\w$]*/g;
    while((m=prefix.exec(src)))push(rel,'assigns PC with '+m[0].slice(0,2));
    if(barePc(src)){let q='';for(let i=0;i<src.length;i++){const c=src[i];if(q){if(c==='\\'){i++;continue;}if(c===q)q='';continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c!=='{'&&c!=='[')continue;const close=matchClose(src,i,c,c==='{'?'}':']');if(close<0)continue;if(barePc(src.slice(i+1,close))){push(rel,'literal contains PC');break;}}}
    const member=new RegExp('PC\\s*(?:\\?\\.\\s*)?(?:\\.|\\[\\s*[\'"])\\s*('+BANNED_MEMBERS.join('|')+')\\b','g');
    const gridDecl=declFunctions(src).find(d=>d.name===GRID_FN.name);
    const grid=gridDecl?[gridDecl.start,gridDecl.end]:null;
    while((m=member.exec(src))){if(m[1]==='GRID_XY'&&rel===GRID_FN.file&&grid&&m.index>=grid[0]&&m.index<=grid[1])continue;push(rel,'uses PC.'+m[1]);}
    const params=parameterNames(src).filter(n=>n!=='PC');
    if(params.length){const off=new RegExp('\\b(?:'+params.map(n=>n.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\s*(?:\\?\\.\\s*)?(?:\\.\\s*|\\[\\s*[\'"])('+BANNED_MEMBERS.join('|')+')\\b','g');while((m=off.exec(src)))push(rel,'reads '+m[1]+' off a parameter');}
    if(/\beval\s*\(/.test(src))push(rel,'uses eval');
    if(/\bnew\s+Function\b/.test(src))push(rel,'uses new Function');
    const countsMsg=new Map();
    const msg=/PC\s*\.\s*aimRejectMsg\b/g;
    const spans=namedSpans(src);
    while((m=msg.exec(src))){const key=rel+':'+owner(spans,m.index);countsMsg.set(key,(countsMsg.get(key)||0)+1);}
    for(const [key,n] of countsMsg){const name=key.slice(rel.length+1);const max=AIM_MSG_OK[key];if(max==null)push(rel,'builds aimRejectMsg in '+name);else if(n>max)push(rel,'builds aimRejectMsg in '+name+' '+n+' times, max '+max);}
    for(const hit of listHits(src,lists))push(rel,hit);
  }
  return fails;
}

if(require.main===module){
  const root=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..');
  const fails=scan(root);
  for(const f of fails)console.log('FAIL '+f);
  if(fails.length){console.log(fails.length+' architecture boundary failure'+(fails.length===1?'':'s'));process.exit(1);}
  console.log('arch scan ok');
}
module.exports={scan};
