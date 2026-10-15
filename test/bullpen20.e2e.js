// DoD: a 20-pitch bullpen at 390x844. Type is sticky after the first pitch.
// No result step, no strike, and the line shows hit-spot %.
// usage: node test/bullpen20.e2e.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://127.0.0.1:8766/';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
const tapZ=async z=>{const xy=await p.$eval(`#zone [data-z="${z}"]`,e=>{const s=e.ownerSVGElement,pt=s.createSVGPoint(),bb=e.getBBox();pt.x=bb.x+bb.width/2;pt.y=bb.y+bb.height/2;const q=pt.matrixTransform(s.getScreenCTM());return[q.x,q.y];});await p.mouse.click(xy[0],xy[1]);};
await p.goto(BASE);
await p.evaluate(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games=[];S.activeGame=null;S.sessions=[];S.activeSession=null;__app.store.save();__app.render();});
await p.click('nav [data-t="bullpen"]');await p.waitForTimeout(200);
await p.click('#types [data-c="FB"]');
for(let i=0;i<20;i++){
  if(i===1)ok(await p.evaluate(()=>D.type==='FB'&&PC.scoreStep(pullDraft())==='called'),'FLOW-6 the pitch type stays for the next bullpen pitch');
  await tapZ(5);await tapZ(5);await p.waitForTimeout(80);
}
const sum=await p.evaluate(()=>{const ps=__app.store.real.sessions.at(-1).pitches;return{n:ps.length,types:[...new Set(ps.map(x=>x.type))],results:ps.filter(x=>x.result!=null).length,strikes:ps.filter(x=>PC.strikeOf(x)!=null).length,line:document.getElementById('bpSum').textContent,sheet:document.getElementById('resSheet').classList.contains('hide')};});
ok(sum.n===20&&sum.types.length===1&&sum.types[0]==='FB','20 fastballs logged '+JSON.stringify(sum.types));
ok(sum.results===0&&sum.strikes===0&&sum.sheet,'bullpen pitches have no result and no strike');
ok(/^20 pitches · hit spot /.test(sum.line)&&!/strike/i.test(sum.line),'the bullpen line is hit-spot, not strike %: '+sum.line);
ok(!errs.length,'no page errors '+errs.join('|'));
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
