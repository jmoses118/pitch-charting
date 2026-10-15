// ARCH-1 duplication gate. jscpd runs on a Prettier copy at --min-tokens 30.
// test/dup.baseline.json lists the clones that already exist, by file and span.
// A clone that is not listed fails. The list is shrink-only: it cannot grow, and
// the token floor cannot drop below 30. Renamed copies are checked after identifiers
// are blanked, which is what a name-only scan misses.
const fs=require('fs'),path=require('path'),os=require('os'),{execSync}=require('child_process');
const repo=path.join(__dirname,'..');
const MIN_TOKENS=30,MIN_LINES=5,MAX_BASELINE=12;
const PRETTIER='prettier@3.6.2',JSCPD='jscpd@4.0.5';
const RESERVED=new Set('function const let var return null true false if else new this typeof void in of for while do switch case break continue throw try catch finally class extends super import export default from async await yield delete instanceof undefined get set'.split(' '));
let fails=0;
const say=(ok,m)=>{console.log((ok?'PASS ':'FAIL ')+m);if(!ok)fails++;};

function walk(dir){return fs.readdirSync(dir).flatMap(n=>{const p=path.join(dir,n);return fs.statSync(p).isDirectory()?walk(p):p.endsWith('.js')?[p]:[];});}
function copyJs(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dup-'));fs.cpSync(path.join(repo,'js'),path.join(dir,'js'),{recursive:true});return dir;}
function formatDir(dir){const files=walk(path.join(dir,'js'));execSync('npx --yes '+PRETTIER+' --write '+files.map(f=>JSON.stringify(f)).join(' '),{stdio:'pipe'});}
function relJs(name){const n=String(name).replace(/\\/g,'/');const m=n.match(/(?:^|\/)(js\/.*)$/);return m?m[1]:n;}
function side(file){return{file:relJs(file.name),start:file.start,end:file.end};}
function key(s){return s.file+':'+s.start+'-'+s.end;}
function norm(c){let a=side(c.firstFile),b=side(c.secondFile);if(key(a)>key(b)){const t=a;a=b;b=t;}return{a,b};}
function same(x,y){return key(x.a)===key(y.a)&&key(x.b)===key(y.b);}
function jscpd(dir,minTokens){const out=path.join(dir,'report');fs.rmSync(out,{recursive:true,force:true});
  execSync('npx --yes '+JSCPD+' js --min-lines '+MIN_LINES+' --min-tokens '+minTokens+' --threshold 100 --reporters json --output '+JSON.stringify(out)+' --silent',{cwd:dir,stdio:'pipe'});
  const rep=JSON.parse(fs.readFileSync(path.join(out,'jscpd-report.json'),'utf8'));
  return (rep.duplicates||[]).map(norm);}
function gate(detected,baseline,minTokens){const bad=[];
  const floor=Math.min(minTokens,baseline&&baseline.minTokens!=null?baseline.minTokens:minTokens);
  if(floor<MIN_TOKENS)bad.push('token floor lowered below '+MIN_TOKENS);
  if(!baseline||!Array.isArray(baseline.clones))bad.push('baseline missing');
  else if(baseline.clones.length>MAX_BASELINE)bad.push('baseline grew past '+MAX_BASELINE+' ('+baseline.clones.length+')');
  else if(minTokens>=MIN_TOKENS){for(const c of detected){const hit=baseline.clones.some(b=>same(b,c));if(!hit)bad.push('clone not in baseline '+key(c.a)+' || '+key(c.b));}}
  return bad;}
function grab(src,start){const lines=src.split('\n');const i=lines.findIndex(l=>l.includes(start));if(i<0)throw new Error('missing '+start);
  if(start.startsWith('function ')){let depth=0,started=false,n=0;for(let k=i;k<lines.length;k++){for(const ch of lines[k]){if(ch==='{'){depth++;started=true;}else if(ch==='}')depth--;}n++;if(started&&depth===0)break;}return lines.slice(i,i+n).join('\n');}
  let j=i+1;while(j<lines.length&&!/^\s*(?:function |const \w+\s*=)/.test(lines[j]))j++;return lines.slice(i,j).join('\n');}
function blankIds(code){return code.replace(/[A-Za-z_$][\w$]*/g,m=>RESERVED.has(m)?m:'x');}
function renameIds(code){return code.replace(/[A-Za-z_$][\w$]*/g,m=>RESERVED.has(m)?m:'R_'+m);}
function namesClone(clones,plant,other){return clones.some(c=>[c.a.file,c.b.file].includes(plant)&&[c.a.file,c.b.file].includes(other));}

const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'dup.baseline.json'),'utf8'));
const formatted=copyJs();
formatDir(formatted);
const detected=jscpd(formatted,MIN_TOKENS);
const realBad=gate(detected,baseline,MIN_TOKENS);
say(!realBad.length,'e real tree passes ('+detected.length+' clone'+(detected.length===1?'':'s')+')');
if(realBad.length)console.log(realBad.slice(0,8).join('\n'));

// (e) a clone that is not listed fails, and names the new file
{const dir=copyJs();fs.cpSync(path.join(formatted,'js'),path.join(dir,'js'),{recursive:true});
  const block=fs.readFileSync(path.join(dir,'js/ui/stats.js'),'utf8').split('\n').slice(270,310).join('\n');
  fs.writeFileSync(path.join(dir,'js/ui/plant-extra.js'),block+'\n');
  const clones=jscpd(dir,MIN_TOKENS);
  const bad=gate(clones,baseline,MIN_TOKENS);
  const named=bad.some(s=>s.includes('js/ui/plant-extra.js'));
  say(bad.length>0&&named,'e clone not in the baseline fails and names js/ui/plant-extra.js');
  if(!named)console.log(bad.slice(0,6).join('\n'));
  fs.rmSync(dir,{recursive:true,force:true});}

// (a) verbatim pitchMiss paste names both files
{const dir=copyJs();fs.cpSync(path.join(formatted,'js'),path.join(dir,'js'),{recursive:true});
  const fn=grab(fs.readFileSync(path.join(dir,'js/core/scoring.js'),'utf8'),'function pitchMiss');
  fs.writeFileSync(path.join(dir,'js/ui/plant-miss.js'),fn+'\n');
  const clones=jscpd(dir,MIN_TOKENS);
  const hit=namesClone(clones,'js/ui/plant-miss.js','js/core/scoring.js');
  say(hit,'a verbatim pitchMiss fails and names js/ui/plant-miss.js and js/core/scoring.js');
  fs.rmSync(dir,{recursive:true,force:true});}

// (b) the same paste with renamed identifiers
{const dir=copyJs();fs.cpSync(path.join(formatted,'js'),path.join(dir,'js'),{recursive:true});
  const fn=grab(fs.readFileSync(path.join(dir,'js/core/scoring.js'),'utf8'),'function pitchMiss');
  fs.writeFileSync(path.join(dir,'js/ui/plant-renamed.js'),renameIds(fn)+'\n');
  for(const f of walk(path.join(dir,'js')))fs.writeFileSync(f,blankIds(fs.readFileSync(f,'utf8')));
  const clones=jscpd(dir,MIN_TOKENS);
  const hit=namesClone(clones,'js/ui/plant-renamed.js','js/core/scoring.js');
  say(hit,'b renamed pitchMiss fails and names js/ui/plant-renamed.js and js/core/scoring.js');
  fs.rmSync(dir,{recursive:true,force:true});}

// (c) a one-line copy is caught after Prettier
{const dir=copyJs();fs.cpSync(path.join(formatted,'js'),path.join(dir,'js'),{recursive:true});
  const fn=grab(fs.readFileSync(path.join(dir,'js/core/scoring.js'),'utf8'),'function pitchMiss').replace(/\/\*[\s\S]*?\*\//g,' ').replace(/\/\/[^\n]*/g,' ').replace(/\s+/g,' ').trim();
  const plant=path.join(dir,'js/ui/plant-oneline.js');
  fs.writeFileSync(plant,fn+'\n');
  execSync('npx --yes '+PRETTIER+' --write '+JSON.stringify(plant),{stdio:'pipe'});
  const clones=jscpd(dir,MIN_TOKENS);
  const hit=namesClone(clones,'js/ui/plant-oneline.js','js/core/scoring.js');
  say(hit,'c one-line pitchMiss is caught after Prettier and names js/ui/plant-oneline.js');
  fs.rmSync(dir,{recursive:true,force:true});}

// (d) a renamed strikeOf body
{const dir=copyJs();fs.cpSync(path.join(formatted,'js'),path.join(dir,'js'),{recursive:true});
  const fn=grab(fs.readFileSync(path.join(dir,'js/core/scoring.js'),'utf8'),'const strikeOf');
  fs.writeFileSync(path.join(dir,'js/ui/plant-strike.js'),renameIds(fn)+'\n');
  for(const f of walk(path.join(dir,'js')))fs.writeFileSync(f,blankIds(fs.readFileSync(f,'utf8')));
  const clones=jscpd(dir,MIN_TOKENS);
  const hit=namesClone(clones,'js/ui/plant-strike.js','js/core/scoring.js');
  say(hit,'d renamed strikeOf fails and names js/ui/plant-strike.js and js/core/scoring.js');
  fs.rmSync(dir,{recursive:true,force:true});}

// (f) token floor, a rise versus the base branch, and a tree below its baseline
{const low=gate(detected,{...baseline,minTokens:20},20,baseline);
  say(low.some(s=>/token floor/.test(s)),'f lowering the token floor fails');
  const extra={a:{file:'js/ui/extra.js',start:1,end:9},b:{file:'js/ui/extra2.js',start:1,end:9}};
  const grown={...baseline,clones:baseline.clones.concat([extra])};
  const up=gate(detected.concat([extra]),grown,MIN_TOKENS,baseline);
  say(up.some(s=>/rose/.test(s)),'f baseline entry rises vs base');
  const stale={...baseline,clones:baseline.clones.slice(0,-1).concat([extra])};
  const down=gate(detected,stale,MIN_TOKENS,baseline);
  say(down.some(s=>/below/.test(s)),'f tree below baseline');
  const last=baseline.clones[baseline.clones.length-1];
  const trimmed={...baseline,clones:baseline.clones.slice(0,-1)};
  const less=detected.filter(c=>!same(c,last));
  const fixed=gate(less,trimmed,MIN_TOKENS,baseline);
  say(fixed.length===0,'f lowered baseline passes');}

fs.rmSync(formatted,{recursive:true,force:true});
if(fails){console.log(fails+' dup case'+(fails===1?'':'s')+' failed');process.exit(1);}
console.log('dup scan ok');
