// ARCH-1: these files are IIFEs, so an import linter cannot see a cross-file call.
// Core never mentions the UI. The UI does not define rule functions, bind PC,
// copy a banned list, or read a pitch spot except through the baseline below.
const fs=require('fs'),path=require('path');
const BANNED_MEMBERS=['isZone','isStrike','GRID_XY','CH_TARGETS','nearestTarget'];
const ALLOW_FNS=['scoreCommit','rowPitch','importSpots','editActual','revertEdit'];
const FIELD=/\.(loc|targets|calledLoc|actualLoc)\b/g;
const AIM_MSG_OK={'js/ui/coach.js':new Set([85,88]),'js/ui/shared.js':new Set([77])};
const GRID_FN={file:'js/ui/report.js',name:'reportPNG'};

function maskComments(src){let out='',i=0;while(i<src.length){if(src[i]==='/'&&src[i+1]==='/'){let j=i;while(j<src.length&&src[j]!=='\n')j++;out+=' '.repeat(j-i);i=j;}
  else if(src[i]==='/'&&src[i+1]==='*'){const end=src.indexOf('*/',i+2);const j=end<0?src.length:end+2;out+=src.slice(i,j).replace(/[^\n]/g,' ');i=j;}
  else{out+=src[i];i++;}}return out;}
function lineOf(src,index){let n=1;for(let i=0;i<index&&i<src.length;i++)if(src[i]==='\n')n++;return n;}
function jsFiles(root,dir){const abs=path.join(root,dir);if(!fs.existsSync(abs))return [];return fs.readdirSync(abs).filter(f=>f.endsWith('.js')).sort().map(f=>path.join(dir,f));}
function read(root,rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function fnRanges(src){const ranges=[];for(const name of ALLOW_FNS){const re=new RegExp('function\\s+'+name+'\\s*\\(');const m=re.exec(src);if(!m)continue;const brace=src.indexOf('{',m.index);if(brace<0)continue;let depth=0;for(let i=brace;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'){depth--;if(depth===0){ranges.push([brace,i]);break;}}}}return ranges;}
function inRange(ranges,index){return ranges.some(([a,b])=>index>=a&&index<=b);}
function listFrom(src,name){const m=src.match(new RegExp('\\b'+name+'\\s*=\\s*\\[([^\\]]*)\\]'));if(!m)return null;return m[1].split(',').map(s=>+s.trim()).filter(n=>Number.isFinite(n));}
function sameMulti(a,b){if(a.length!==b.length)return false;const s=[...a].map(Number).sort((x,y)=>x-y),t=[...b].map(Number).sort((x,y)=>x-y);return s.every((n,i)=>n===t[i]);}
function numsOf(body){const parts=body.split(',').map(s=>s.trim()).filter(Boolean);if(!parts.length)return null;const nums=[];for(const p of parts){const m=p.match(/^(?:(['"])(\d+)\1|(\d+))$/);if(!m)return null;nums.push(+(m[2]||m[3]));}return nums;}
function stringList(body){const parts=body.split(/[\s,]+/).filter(Boolean);if(!parts.length||parts.some(p=>!/^\d+$/.test(p)))return null;return parts.map(Number);}
function whichList(nums,lists){if(!nums)return null;for(const [name,list] of lists)if(sameMulti(nums,list))return name;return null;}

function scan(root){
  const fails=[];
  const push=(rel,why)=>fails.push(rel+' '+why);
  const calls=read(root,'js/core/calls.js'),scoring=read(root,'js/core/scoring.js');
  const lists=[['CH_TARGETS',listFrom(calls,'CH_TARGETS')],['LOW_RING',listFrom(scoring,'LOW_RING')]].filter(([,v])=>v&&v.length);
  for(const rel of jsFiles(root,'js/core')){
    const raw=read(root,rel);
    if(raw.includes('js/ui'))push(rel,'references js/ui');
    if(path.basename(rel)==='location.js')continue;
    const masked=maskComments(raw);
    const ranges=fnRanges(masked);
    let n=0,m;FIELD.lastIndex=0;
    while((m=FIELD.exec(masked)))if(!inRange(ranges,m.index))n++;
    const base=baseline()[rel]||0;
    if(n>base)push(rel,'reads a pitch spot '+n+' time'+(n===1?'':'s')+', baseline '+base);
  }
  for(const rel of jsFiles(root,'js/ui')){
    const raw=read(root,rel),src=maskComments(raw);
    const rule=/(?:function\s+|const\s+|let\s+|var\s+)((?:valid|calc)\w*|\w+Of|strikeFor)\b/g;
    let m;while((m=rule.exec(src)))push(rel,'defines '+m[1]);
    const bind=/(?:const|let|var)\s+(?:\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*(?:window\s*\.\s*)?PC\b(?!\s*[.\[?(])/g;
    while((m=bind.exec(src)))push(rel,'binds PC');
    const bracket=/PC\s*\[\s*(['"])[^'"]+\1\s*\]/g;
    while((m=bracket.exec(src)))push(rel,'uses PC['+m[0].slice(m[0].indexOf(m[1]))+']');
    const opt=/PC\s*\?\./g;
    while((m=opt.exec(src)))push(rel,'uses PC?.');
    const win=/window\s*\.\s*PC\s*(?:\?\.|\.|\[)/g;
    while((m=win.exec(src)))push(rel,'uses window.PC');
    const assignPc=/Object\.assign\s*\(\s*PC\s*,/g;
    while((m=assignPc.exec(src)))push(rel,'Object.assign(PC)');
    const assign=/PC\s*\.\s*([A-Za-z_$][\w$]*)\s*=(?!=)/g;
    while((m=assign.exec(src)))push(rel,'assigns PC.'+m[1]);
    const member=new RegExp('PC\\s*(?:\\?\\.\\s*)?(?:\\.|\\[\\s*[\'"])\\s*('+BANNED_MEMBERS.join('|')+')\\b','g');
    const grid=fnRangesNamed(src,GRID_FN.name);
    while((m=member.exec(src))){
      if(m[1]==='GRID_XY'&&rel===GRID_FN.file&&grid&&m.index>=grid[0]&&m.index<=grid[1])continue;
      push(rel,'uses PC.'+m[1]);
    }
    const msg=/PC\s*\.\s*aimRejectMsg\b/g;
    const okLines=AIM_MSG_OK[rel]||new Set();
    while((m=msg.exec(src))){const line=lineOf(src,m.index);if(!okLines.has(line))push(rel,'builds aimRejectMsg on line '+line);}
    const arr=/\[([^\[\]]*)\]/g;
    while((m=arr.exec(src))){const hit=whichList(numsOf(m[1]),lists);if(hit)push(rel,'literal '+hit);}
    const setRe=/new\s+Set\s*\(\s*\[([^\[\]]*)\]/g;
    while((m=setRe.exec(src))){const hit=whichList(numsOf(m[1]),lists);if(hit)push(rel,'Set '+hit);}
    const str=/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g;
    while((m=str.exec(src))){const body=m[1]||m[2]||m[3]||'';const hit=whichList(stringList(body),lists);if(hit)push(rel,'string '+hit);}
  }
  return fails;
}
function fnRangesNamed(src,name){const re=new RegExp('function\\s+'+name+'\\s*\\(');const m=re.exec(src);if(!m)return null;const brace=src.indexOf('{',m.index);if(brace<0)return null;let depth=0;for(let i=brace;i<src.length;i++){if(src[i]==='{')depth++;else if(src[i]==='}'){depth--;if(depth===0)return [brace,i];}}return null;}
function baseline(){return JSON.parse(fs.readFileSync(path.join(__dirname,'loc.baseline.json'),'utf8'));}

if(require.main===module){
  const root=process.argv[2]?path.resolve(process.argv[2]):path.join(__dirname,'..');
  const fails=scan(root);
  for(const f of fails)console.log('FAIL '+f);
  if(fails.length){console.log(fails.length+' architecture boundary failure'+(fails.length===1?'':'s'));process.exit(1);}
  console.log('arch scan ok');
}
module.exports={scan};
