// ARCH-1 negative cases. Each plant lives in a temp tree. The scan must exit
// non-zero and name that file. Nothing here is committed into js/.
const fs=require('fs'),path=require('path'),os=require('os'),{spawnSync}=require('child_process');
const repo=path.join(__dirname,'..');
const scanJs=path.join(__dirname,'arch.scan.js');
let fails=0;
function tree(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'arch-'));fs.cpSync(path.join(repo,'js'),path.join(dir,'js'),{recursive:true});return dir;}
function write(dir,rel,text){const p=path.join(dir,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,text);}
function append(dir,rel,text){fs.appendFileSync(path.join(dir,rel),text);}
function run(dir){const r=spawnSync(process.execPath,[scanJs,dir],{encoding:'utf8'});return{code:r.status==null?1:r.status,out:(r.stdout||'')+(r.stderr||'')};}
function expectFail(name,dir,file){const r=run(dir);const ok=r.code!==0&&r.out.includes(file);console.log((ok?'PASS ':'FAIL ')+name);if(!ok){fails++;console.log(r.out.slice(0,500));}fs.rmSync(dir,{recursive:true,force:true});}
function expectPass(name,dir){const r=run(dir);const ok=r.code===0&&/arch scan ok/.test(r.out);console.log((ok?'PASS ':'FAIL ')+name);if(!ok){fails++;console.log(r.out.slice(0,500));}fs.rmSync(dir,{recursive:true,force:true});}

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
// (12) a new aimRejectMsg; the three existing calls stay allowlisted
{const d=tree();write(d,'js/ui/plant-msg.js',"toast(PC.aimRejectMsg('CH',2));\n");expectFail('12 new aimRejectMsg',d,'js/ui/plant-msg.js');}
// (11) a clean copy passes, including the allowlisted aimRejectMsg lines
expectPass('11 clean copy',tree());

if(fails){console.log(fails+' arch negative case'+(fails===1?'':'s')+' failed');process.exit(1);}
console.log('arch negative ok');
