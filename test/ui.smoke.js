const {chromium}=require('playwright-core');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const pg=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,colorScheme:'dark'});await pg.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('http://localhost:'+process.argv[2]+'/');
await pg.fill('#gOpp','Lightning');await pg.click('#gStart');
// result picker is a bottom sheet (v34): open it with the Result button when no location was tapped
const openRes=async()=>{if(await pg.isHidden('#resSheet'))await pg.click('#resTog');};
const tap=async z=>{const s=`#zone [data-z="${z}"]`;await pg.$eval(s,e=>e.scrollIntoView({block:"center"}));await pg.click(s,{force:true});};
const foul=async()=>{await pg.click('#types [data-c="FB"]');await openRes();await pg.click('[data-r=\"foul\"]');};
await pg.click('#types [data-c="FB"]');await tap(3);await openRes();await pg.click('[data-r=\"called\"]');
await foul();await foul();await foul();
let cnt=await pg.textContent('#cnt'),pc=await pg.textContent('#pc');console.log('after K,F,F,F count',cnt,'pc',pc);
if(cnt!=='0-2'||pc!=='4')throw 'count';
await pg.click('#types [data-c="FB"]');await openRes();await pg.click('[data-r=\"swinging\"]');console.log('after K3 count',await pg.textContent('#cnt'),'outs',await pg.$$eval('#outs .on',x=>x.length));
{const h=(await openRes(),await pg.isVisible('[data-r=\"kd3\"]'));console.log('K-D3 button hidden at 0-0:',!h);if(h)throw 'kd3 visible at 0-0';}await pg.click('#undo');{const v=(await openRes(),await pg.isVisible('[data-r=\"kd3\"]'));console.log('K-D3 button shown at 2 strikes:',v);if(!v)throw 'kd3 hidden at 2 strikes';}await pg.click('#types [data-c="FB"]');await openRes();await pg.click('[data-r=\"kd3\"]');const o2=await pg.$$eval('#outs .on',x=>x.length);console.log('after K-D3 outs',o2,'count',await pg.textContent('#cnt'));if(o2!==0)throw 'kd3';await pg.click('#undo');console.log('after undo',await pg.textContent('#cnt'),await pg.textContent('#pc'));
await pg.screenshot({path:require('path').join(__dirname,'shot-game.png'),fullPage:true});
// bullpen with call
await pg.click('#gPause'); // a game in progress locks the bullpen (modes are exclusive)
await pg.click('nav [data-t="bullpen"]');await pg.check('#callOn');await pg.fill('#callTxt','chg 7');await tap(7);
await pg.fill('#callTxt','FB A');console.log('desc',await pg.textContent('#callDesc'),await pg.isVisible('#callTxt'),await pg.inputValue('#callTxt'));await tap(16);console.log('afterA',await pg.evaluate(()=>{const s=__app.store.state;return [s.activeSession,s.sessions.map(x=>x.id+':'+x.pitches.length)]}),await pg.textContent('#bpSum'),await pg.textContent('#callDesc'));await pg.fill('#callTxt','H+');await tap(15);await pg.click('#types [data-c="DC"]');await tap(8);await tap(9);
await pg.uncheck('#callOn');
for(const [t,want,act] of [['FB',3,3],['CH',7,8]]){await pg.click(`#types [data-c="${t}"]`);if(!/intended|Last:/.test(await pg.textContent('#phase'))||(await pg.textContent('#steps li.now'))!=='Aim')throw 'step2 '+t;await tap(want);if(!(await pg.textContent('#phase')).includes('actually'))throw 'step3 '+t;await tap(act);if((await pg.textContent('#steps li.now'))!=='Aim'||!(await pg.textContent('#phase')).includes('Last:'))throw 'sticky type, back to aim '+t;}
console.log('bullpen sum:',await pg.textContent('#bpSum'));
await pg.screenshot({path:require('path').join(__dirname,'shot-bullpen.png'),fullPage:true});
// test mode
const before=await pg.evaluate(()=>localStorage.getItem('te_pitchchart_v1'));
await pg.click('nav [data-t="setup"]');await pg.click('#testBtn');await pg.click('nav [data-t="bullpen"]');
await pg.click('#types [data-c="DR"]');await tap(8);await tap(9);
const vis=await pg.isVisible('#testbar');const after=await pg.evaluate(()=>localStorage.getItem('te_pitchchart_v1'));
console.log('testbar visible',vis,'storage unchanged',before===after);await pg.screenshot({path:require('path').join(__dirname,'shot-test.png')});
pg.on('dialog',d=>d.accept());await pg.click('nav [data-t="setup"]');await pg.click('#testBtn');
console.log('test exited, testbar visible',await pg.isVisible('#testbar'));
console.log('errors',errs);await b.close();if(errs.length||!vis||before!==after)process.exit(1);})().catch(e=>{console.error(e);process.exit(1)});
