// ARCH-1 negative cases. Each plant lives in a temp tree. The scan must exit
// non-zero and name that file. Nothing here is committed into js/.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync,execSync}=require('child_process');
const repo=path.join(__dirname,'..');
const scanJs=path.join(__dirname,'arch.scan.js');
let fails=0;
function tree(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arch-'));fs.cpSync(path.join(repo,'js'),path.join(dir,'js'),{recursive:true});return dir;}
function write(dir,rel,text){const p=path.join(dir,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);}
function append(dir,rel,text){fs.appendFileSync(path.join(dir,rel),text);}
function run(dir,env){const r=spawnSync(process.execPath,[scanJs,dir],{encoding:'utf8',env:Object.assign({},process.env,env||{})});return{code:r.status==null?1:r.status,out:(r.stdout||'')+(r.stderr||'')};}
function expectFail(name,dir,file,why,env){const r=run(dir,env);const ok=r.code!==0&&r.out.includes(file)&&(why==null||r.out.includes(why));console.log((ok?'PASS ':'FAIL ')+name);if(!ok){fails++;console.log(r.out.slice(0,500));}fs.rmSync(dir,{recursive:true,force:true});}
function expectPass(name,dir,env){const r=run(dir,env);const ok=r.code===0&&/arch scan ok/.test(r.out);console.log((ok?'PASS ':'FAIL ')+name);if(!ok){fails++;console.log(r.out.slice(0,500));}fs.rmSync(dir,{recursive:true,force:true});}

// (1) function strikeFor and const strikeFor=()=>
{const d=tree();write(d,'js/ui/plant-strike-fn.js','function strikeFor(p){return p&&p.n;}\n');expectFail('1 function strikeFor',d,'js/ui/plant-strike-fn.js');}
{const d=tree();write(d,'js/ui/plant-strike-const.js','const strikeFor=()=>1;\n');expectFail('1 const strikeFor',d,'js/ui/plant-strike-const.js');}
// (2) PC.validCalled2=, PC['x']=, Object.assign(PC,{})
{const d=tree();write(d,'js/ui/plant-assign.js','PC.validCalled2=1;\n');expectFail('2 PC.validCalled2=',d,'js/ui/plant-assign.js');}
{const d=tree();write(d,'js/ui/plant-bracket.js',"PC['x']=1;\n");expectFail("2 PC['x']=",d,'js/ui/plant-bracket.js');}
{const d=tree();write(d,'js/ui/plant-assignpc.js','Object.assign(PC,{});\n');expectFail('2 Object.assign(PC,{})',d,'js/ui/plant-assignpc.js');}
// (3) CH_TARGETS literal, shuffled, string, and Set
{const d=tree();write(d,'js/ui/plant-ch.js','const a=[4,7,8,9,13,14,18];\n');expectFail('3 [4,7,8,9,13,14,18]',d,'js/ui/plant-ch.js');}
{const d=tree();write(d,'js/ui/plant-ch-shuf.js','const a=[18,4,14,9,8,7,13];\n');expectFail('3 shuffled CH_TARGETS',d,'js/ui/plant-ch-shuf.js');}
{const d=tree();write(d,'js/ui/plant-ch-str.js',"const a='18, 4, 14, 9, 8, 7, 13';\n");expectFail('3 CH_TARGETS string',d,'js/ui/plant-ch-str.js');}
{const d=tree();write(d,'js/ui/plant-ch-set.js','const a=new Set([8,9,4,7,18,13,14]);\n');expectFail('3 CH_TARGETS Set',d,'js/ui/plant-ch-set.js');}
// (4) LOW_RING any order, plus string and Set
{const d=tree();write(d,'js/ui/plant-low.js','const a=[14,13,18];\n');expectFail('4 [13,18,14] shuffled',d,'js/ui/plant-low.js');}
{const d=tree();write(d,'js/ui/plant-low-str.js',"const a='14 13 18';\n");expectFail('4 LOW_RING string',d,'js/ui/plant-low-str.js');}
{const d=tree();write(d,'js/ui/plant-low-set.js','const a=new Set([18,14,13]);\n');expectFail('4 LOW_RING Set',d,'js/ui/plant-low-set.js');}
// (5) banned members, bracket, optional
{const d=tree();write(d,'js/ui/plant-iszone.js','const a=PC.isZone(1);\n');expectFail('5 PC.isZone',d,'js/ui/plant-iszone.js');}
{const d=tree();write(d,'js/ui/plant-isstrike.js','const a=PC.isStrike("called");\n');expectFail('5 PC.isStrike',d,'js/ui/plant-isstrike.js');}
{const d=tree();write(d,'js/ui/plant-cht.js','const a=PC.CH_TARGETS;\n');expectFail('5 PC.CH_TARGETS',d,'js/ui/plant-cht.js');}
{const d=tree();write(d,'js/ui/plant-near.js','const a=PC.nearestTarget([1],2);\n');expectFail('5 PC.nearestTarget',d,'js/ui/plant-near.js');}
{const d=tree();write(d,'js/ui/plant-bracket-iszone.js',"const a=PC['isZone'](1);\n");expectFail("5 PC['isZone']",d,'js/ui/plant-bracket-iszone.js');}
{const d=tree();write(d,'js/ui/plant-opt.js','const a=PC?.isZone(1);\n');expectFail('5 PC?.isZone',d,'js/ui/plant-opt.js');}
// (6) destructure and alias
{const d=tree();write(d,'js/ui/plant-dest.js','const {isZone}=PC;\n');expectFail('6 const {isZone}=PC',d,'js/ui/plant-dest.js');}
{const d=tree();write(d,'js/ui/plant-alias.js','const P=PC;P.isZone();\n');expectFail('6 const P=PC',d,'js/ui/plant-alias.js');}
// (7) GRID_XY in game.js and a second report.js read outside reportPNG
{const d=tree();append(d,'js/ui/game.js','\nfunction plantGrid(){return PC.GRID_XY[1];}\n');expectFail('7 GRID_XY in game.js',d,'js/ui/game.js');}
{const d=tree();append(d,'js/ui/report.js','\nfunction plantGrid(){return PC.GRID_XY[1];}\n');expectFail('7 second report.js GRID_XY',d,'js/ui/report.js');}
// (8) validBox
{const d=tree();write(d,'js/ui/plant-valid.js','function validBox(){return true;}\n');expectFail('8 validBox',d,'js/ui/plant-valid.js');}
// (9) core importing ui
{const d=tree();append(d,'js/core/modes.js',"\nconst plantUi='js/ui';\n");expectFail('9 core references js/ui',d,'js/core/modes.js');}
// (10) a new p.loc read above the baseline
{const d=tree();append(d,'js/core/scoring.js','\nfunction plantLoc(p){return p.loc;}\n');expectFail('10 p.loc above baseline',d,'js/core/scoring.js');}
// (12) a new aimRejectMsg; the three existing calls stay allowlisted by function
{const d=tree();write(d,'js/ui/plant-msg.js',"toast(PC.aimRejectMsg('CH',2));\n");expectFail('12 new aimRejectMsg',d,'js/ui/plant-msg.js');}
{const d=tree();for(const rel of ['js/ui/coach.js','js/ui/shared.js']){const p=path.join(d,rel);fs.writeFileSync(p,'\n'+fs.readFileSync(p,'utf8'));}expectPass('12 aimRejectMsg allowlist is by function',d);}
{const d=tree();const p=path.join(d,'js/ui/shared.js');const needle='PC.aimRejectMsg((r.draft&&r.draft.type)||D.type,z)';let s=fs.readFileSync(p,'utf8');if(!s.includes(needle))throw new Error('missing tapLoc aimRejectMsg');fs.writeFileSync(p,s.replace(needle,needle+',PC.aimRejectMsg("CH",1)'));expectFail('12 second aimRejectMsg in tapLoc',d,'js/ui/shared.js','tapLoc');}
// (13) passing PC, or a banned member off a parameter
{const d=tree();write(d,'js/ui/plant-pass.js','function f(x){return g(PC);}\n');expectFail('13 passes PC',d,'js/ui/plant-pass.js');}
{const d=tree();write(d,'js/ui/plant-param.js','function f(pc){return pc.isZone(1);}\n');expectFail('13 param.isZone',d,'js/ui/plant-param.js');}
// (14) window['PC'] and globalThis['PC']
{const d=tree();write(d,'js/ui/plant-win.js',"const a=window['PC'].isZone(1);\n");expectFail("14 window['PC']",d,'js/ui/plant-win.js');}
{const d=tree();write(d,'js/ui/plant-glob.js','const a=globalThis["PC"].nearestTarget([1],2);\n');expectFail('14 globalThis["PC"]',d,'js/ui/plant-glob.js');}
// (15) eval and new Function
{const d=tree();write(d,'js/ui/plant-eval.js',"eval('PC');\n");expectFail('15 eval',d,'js/ui/plant-eval.js');}
{const d=tree();write(d,'js/ui/plant-newfn.js',"const f=new Function('return 1');\n");expectFail('15 new Function',d,'js/ui/plant-newfn.js');}
// (16) non-literal PC[...] key
{const d=tree();write(d,'js/ui/plant-key.js','const a=PC[name];\n');expectFail('16 PC[name]',d,'js/ui/plant-key.js');}
// (17) Array.of and Array.from
{const d=tree();write(d,'js/ui/plant-of.js','const a=Array.of(4,7,8,9,13,14,18);\n');expectFail('17 Array.of CH_TARGETS',d,'js/ui/plant-of.js');}
{const d=tree();write(d,'js/ui/plant-from.js','const a=Array.from([4,7,...[8,9,13,14,18]]);\n');expectFail('17 Array.from CH_TARGETS',d,'js/ui/plant-from.js');}
// (18) spread-split list
{const d=tree();write(d,'js/ui/plant-spread.js','const a=[4,7,8,9];const b=[...a,13,14,18];\n');expectFail('18 spread-split CH_TARGETS',d,'js/ui/plant-spread.js');}
// (19) const {loc}=p counts
{const d=tree();append(d,'js/core/scoring.js','\nfunction plantDest(p){const {loc}=p;return loc;}\n');expectFail('19 const {loc}=p',d,'js/core/scoring.js');}
// (20) p['loc'] counts
{const d=tree();append(d,'js/core/scoring.js',"\nfunction plantBracket(p){return p['loc'];}\n");expectFail("20 p['loc']",d,'js/core/scoring.js');}
// (21) a fake scoreCommit in the wrong file
{const d=tree();append(d,'js/core/scoring.js','\nfunction scoreCommit(p){return p.loc;}\n');expectFail('21 fake scoreCommit',d,'js/core/scoring.js','duplicate');}
// (10b) the tree is below its baseline until that file is lowered
{const d=tree();const p=path.join(d,'js/core/calls.js');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\.targets\b/g,'.boxes'));expectFail('10b calls.js below loc baseline',d,'js/core/calls.js','below');}
{const d=tree();const p=path.join(d,'js/core/calls.js');fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\.targets\b/g,'.boxes'));fs.mkdirSync(path.join(d,'test'));const cur=JSON.parse(fs.readFileSync(path.join(repo,'test/loc.baseline.json'),'utf8'));cur['js/core/calls.js']=0;fs.writeFileSync(path.join(d,'test/loc.baseline.json'),JSON.stringify(cur));expectPass('10b lowered loc baseline passes',d);}
// (10c) a higher count than the base branch fails
{const d=tree();fs.mkdirSync(path.join(d,'test'));const cur=JSON.parse(fs.readFileSync(path.join(repo,'test/loc.baseline.json'),'utf8'));fs.writeFileSync(path.join(d,'test/loc.baseline.json'),JSON.stringify(cur));execSync('git init -q',{cwd:d});execSync('git config user.email t@example.com',{cwd:d});execSync('git config user.name t',{cwd:d});execSync('git add test/loc.baseline.json',{cwd:d});execSync('git commit -q -m base',{cwd:d});execSync('git update-ref refs/remotes/origin/fixture HEAD',{cwd:d});cur['js/core/calls.js']=cur['js/core/calls.js']+1;fs.writeFileSync(path.join(d,'test/loc.baseline.json'),JSON.stringify(cur));append(d,'js/core/calls.js','\nfunction plantRise(p){return p.loc;}\n');expectFail('10c loc baseline rises vs base',d,'js/core/calls.js','rose',{ARCH_BASE_REF:'fixture'});}
// (10d) raising sync.js 3→4 and adding a read must fail when git show cannot see the base
{const d=tree();fs.mkdirSync(path.join(d,'test'));const cur=JSON.parse(fs.readFileSync(path.join(repo,'test/loc.baseline.json'),'utf8'));cur['js/core/sync.js']=4;fs.writeFileSync(path.join(d,'test/loc.baseline.json'),JSON.stringify(cur));append(d,'js/core/sync.js','\nfunction plantSync(p){return p.loc;}\n');expectFail('10d sync.js 3 to 4',d,'js/core/sync.js','git show',{ARCH_BASE_REF:'no-such-base',GITHUB_BASE_REF:'',GITHUB_EVENT_NAME:''});}
// (22) nested destructure that pulls a banned member off an object holding PC
{const d=tree();write(d,'js/ui/plant-nest.js','const {a:{isZone:z}}={a:PC};\n');expectFail('22 nested {a:{isZone:z}}={a:PC}',d,'js/ui/plant-nest.js');}
// (23) object-property alias
{const d=tree();write(d,'js/ui/plant-aliasobj.js','const o={p:PC};o.p.isZone();\n');expectFail('23 const o={p:PC}',d,'js/ui/plant-aliasobj.js');}
// (24) compound assignment
for(const src of ['PC.x+=1;\n','PC.x-=1;\n','PC.x||=1;\n','PC.x??=1;\n','PC.x++;\n','PC.x--;\n']){const d=tree();write(d,'js/ui/plant-op.js',src);expectFail('24 '+src.trim(),d,'js/ui/plant-op.js');}
// (25) nested location destructure
{const d=tree();append(d,'js/core/scoring.js','\nfunction plantNest(p){const {a:{loc}}={a:p};return loc;}\n');expectFail('25 const {a:{loc}}',d,'js/core/scoring.js');}
// (26) computed pitch key
{const d=tree();append(d,'js/core/scoring.js','\nfunction plantKey(p){return p[k];}\n');expectFail('26 p[k]',d,'js/core/scoring.js','non-literal');}
// (11) a clean copy passes, including the allowlisted aimRejectMsg calls
expectPass('11 clean copy',tree());

if(fails){console.log(fails+' arch negative case'+(fails===1?'':'s')+' failed');process.exit(1);}
console.log('arch negative ok');
