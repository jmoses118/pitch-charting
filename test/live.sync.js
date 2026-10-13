const __E=(()=>{const fs=require('fs'),p=require('path').join(__dirname,'..','.test-env');const o={};try{fs.readFileSync(p,'utf8').split('\n').forEach(l=>{const m=l.match(/^(\w+)=(.*)$/);if(m)o[m[1]]=m[2].trim();});}catch(e){}return o;})();const TEST_COACH=process.env.PC_TEST_COACH||__E.PC_TEST_COACH;if(!TEST_COACH){console.error('Set PC_TEST_COACH (throwaway zztest coach code) or create .test-env');process.exit(2);}
const {chromium}=require('playwright-core');(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const c=await b.newContext({viewport:{width:390,height:844}});const pg=await c.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>d.accept());
await pg.goto('https://jmoses118.github.io/pitch-charting/');console.log('title',await pg.title());
const tap=async z=>{const s=`#zone [data-z="${z}"]`;await pg.$eval(s,e=>e.scrollIntoView({block:"center"}));await pg.click(s,{force:true});};
await pg.click('nav [data-t="setup"]');await pg.fill('#teamCode',TEST_COACH);await pg.click('#teamSave');await pg.waitForTimeout(4000);
console.log('after save:',await pg.textContent('#syncTag'));
await pg.click('nav [data-t="bullpen"]');await pg.click('#types [data-c="FB"]');await tap(3);await tap(3);await pg.click('#types [data-c="CH"]');await tap(7);await tap(4);await pg.click('#undo');
console.log('pending before sync:',await pg.textContent('#syncTag'));
await pg.click('nav [data-t="setup"]');await pg.click('#syncNow');await pg.waitForTimeout(4000);console.log('after sync:',await pg.textContent('#syncTag'),'|',await pg.textContent('#syncMsg'));
// test mode must not sync
await pg.click('#testBtn');await pg.click('nav [data-t="bullpen"]');await pg.click('#types [data-c="DR"]');await tap(8);await tap(8);console.log('test tag:',await pg.textContent('#syncTag'));
await pg.click('nav [data-t="setup"]');await pg.click('#testBtn');
// fresh phone restore
const c2=await b.newContext();const p2=await c2.newPage();p2.on('dialog',d=>d.accept());await p2.goto('https://jmoses118.github.io/pitch-charting/');await p2.click('nav [data-t="setup"]');await p2.fill('#teamCode',TEST_COACH);await p2.click('#teamSave');await p2.waitForTimeout(3000);await p2.click('#pullCloud');await p2.waitForTimeout(3000);
const n=await p2.evaluate(()=>__app.store.real.sessions.reduce((a,s)=>a+s.pitches.length,0));console.log('fresh phone restored pitches:',n);
console.log('errors',errs);await b.close();})().catch(e=>{console.error(e);process.exit(1)});
