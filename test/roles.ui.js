const __E=(()=>{const fs=require('fs'),p=require('path').join(__dirname,'..','.test-env');const o={};try{fs.readFileSync(p,'utf8').split('\n').forEach(l=>{const m=l.match(/^(\w+)=(.*)$/);if(m)o[m[1]]=m[2].trim();});}catch(e){}return o;})();const TEST_COACH=process.env.PC_TEST_COACH||__E.PC_TEST_COACH;if(!TEST_COACH){console.error('Set PC_TEST_COACH (throwaway zztest coach code) or create .test-env');process.exit(2);}
global.window={};require('../config.js');const CFG=global.window.PC_CONFIG;const {chromium}=require('playwright-core');const BASE=process.argv[2];
const H=c=>({apikey:CFG.key,Authorization:'Bearer '+CFG.key,'Content-Type':'application/json','x-team-code':c});
(async()=>{const mk=async(a)=>JSON.parse(await (await fetch(CFG.url+'/rest/v1/rpc/coach_create_code',{method:'POST',headers:H(TEST_COACH),body:JSON.stringify(a)})).text());
  const pcode=await mk({p_role:'player',p_pitcher_id:'p_za',p_label:'ZA'}),vcode=await mk({p_role:'viewer',p_label:'V2'});
  const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const errs=[];
  for(const [name,code] of [['player',pcode],['viewer',vcode],['coach',TEST_COACH]]){const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.dismiss());
    await p.goto(BASE);await p.click('nav [data-t="setup"]');await p.fill('#teamCode',code);await p.click('#teamSave');await p.waitForTimeout(4500);
    const tabs=await p.$$eval('nav button:not(.hide)',x=>x.map(e=>e.dataset.t));const vis=async s=>p.isVisible(s);
    console.log(name,'tabs',tabs.join(','),'| +P',await vis('#addPQuick'),'| pitchers card',await vis('#pCard'),'| codes card',await vis('#codesCard'),'| pitcher options',await p.$$eval('#pitcher option',x=>x.map(e=>e.textContent).join('/')),'|',(await p.textContent('#roleMsg')));
    if(name==='player'){await p.click('nav [data-t="bullpen"]');const tap=async z=>{const s=`#zone [data-z="${z}"]`;await p.$eval(s,e=>e.scrollIntoView({block:"center"}));await p.click(s,{force:true});};
      await p.click('#types [data-c="FB"]');await tap(3);await tap(2);await p.click('nav [data-t="setup"]');await p.click('#syncNow');await p.waitForTimeout(3000);console.log('  player sync:',await p.textContent('#syncTag'),await p.textContent('#syncMsg'));
      console.log('  rows',JSON.stringify(await p.evaluate(()=>{const s=JSON.parse(JSON.stringify(__app.store.real));return [PC.buildRows(s).rows.sessions,s.sync.role,s.sync.pitcherId]})));await p.screenshot({path:'/workspace/pitch-charting-app/test/shot-player.png'});}
    if(name==='coach')console.log('  coach codes listed:',await p.$$eval('#codesList .prow',x=>x.length));
    await c.close();}
  console.log('errors',errs);await b.close();})().catch(e=>{console.error(e);process.exit(1)});
