// Bug (live v37, Oct 14): Jim's test-mode sequence – 3 band-called pitches in landscape, then 3 no-aim pitches in portrait.
// Asserts Game (pitch count, count, outs, zone note), the heat map (Landed + Miss) and the per-pitch report all agree,
// pitches with no aim still count everywhere, Miss says they're left out, and labels are kid-clear (no "✓1.0").
// Throwaway profile, Supabase blocked, test data only (first names). usage: node test/agree.ui.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const SHOT=process.env.SHOT_DIR?process.env.SHOT_DIR+(process.env.SHOT_PREFIX||''):'';
const GAME={id:'g_1',date:'2026-10-14',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'},{slot:2,name:'Batter 2',num:'2',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const c=await b.newContext({viewport:{width:844,height:390},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?2:1});await c.route(/supabase\.co/,r=>r.abort());
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a),w=ms=>p.waitForTimeout(ms||150);
await p.goto(BASE);await ev(()=>{const R=__app.store.real;R.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];R.curPitcher='p_a';__app.store.save();__app.store.enterTest();},null);
// test mode (never syncs), then start the game inside it
await ev(g=>{const s=S();s.games.push(g);s.activeGame='g_1';s.curPitcher='p_a';__app.render();},GAME);await w(300);
ok(await ev(()=>__app.store.isTest&&!document.getElementById('testbar').classList.contains('hide')),'test mode on (nothing saved)');
const G=()=>ev(()=>S().games[0]);
// AB1 – landscape coach screen, band calls (aimed): 3-05 → landed 4 ball; 1-01 → 8 called; 2-03 → 7 in play out
for(const [r,c2,loc,res] of [[2,4,4,'ball'],[0,0,8,'called'],[1,2,7,'inplay']]){await p.click(`#cBand button[data-r="${r}"][data-c="${c2}"]`);await p.click(`#cZone button[data-z="${loc}"]`);await p.click(`#cRes [data-r="${res}"]`);await w();if(res==='inplay'){await p.click('#cRes [data-ip="out"]');await w();}}
// AB2 – portrait one-screen entry, type only (no aim): 11 ball, 14 foul, 5 in play 1B
await p.setViewportSize({width:390,height:844});await ev(()=>{localStorage.setItem('te_ui_portrait_ok','1');__app.render();});await w(300);
const tapZ=async z=>{const xy=await p.$eval(`#zone [data-z="${z}"]`,e=>{const s=e.ownerSVGElement,pt=s.createSVGPoint(),bb=e.getBBox();const cx={11:[bb.x+4,bb.y+4],14:[bb.x+bb.width-4,bb.y+bb.height-4]}[e.dataset.z]||[bb.x+bb.width/2,bb.y+bb.height/2];pt.x=cx[0];pt.y=cx[1];const q=pt.matrixTransform(s.getScreenCTM());return[q.x,q.y];});await p.mouse.click(xy[0],xy[1]);};
for(const [loc,res,ip] of [[11,'ball'],[14,'foul'],[5,'inplay','1B']]){await p.click('#types button:first-child');await tapZ(loc);await w();await p.click(`#resBtns [data-r="${res}"]`);await w();if(ip){await p.click(`[data-ip="${ip}"]`);await w();}}
const g=await G();const P=g.pitches.filter(x=>!x.noPitch);
ok(JSON.stringify(P.map(x=>x.loc))==='[4,8,7,11,14,5]','6 pitches stored with the landed spots tapped '+JSON.stringify(P.map(x=>x.loc)));
ok(JSON.stringify(P.map(x=>x.targets||[]))==='[[6],[3],[7],[],[],[]]','aims stored only for the band calls (landscape + portrait use the same fields) '+JSON.stringify(P.map(x=>x.targets)));
// ---- Game ----
ok(await p.textContent('#pc')==='6','Game: PITCHES 6');
ok(g.cur.outs===1&&g.cur.b===0&&g.cur.s===0&&g.cur.abn===3&&await p.textContent('#cnt')==='0-0','Game: count/outs correct after two finished at-bats (0-0, 1 out, 3rd batter)');
ok(/Last batter's 3 pitches · 1B · new at-bat starts 0-0/.test(await ev(()=>document.getElementById('zoneNote')?.textContent||''))&&await ev(()=>!document.getElementById('zoneNote').classList.contains('hide')),'Game: zone says the balls are the last batter\'s, so 0-0 is not a stuck count');
if(SHOT){await w(1500);await p.screenshot({path:SHOT+'game-portrait.png'});}
await p.click('#types button:first-child');await tapZ(5);await w();await p.click('#resBtns [data-r="ball"]');await w();
ok(await ev(()=>!!document.getElementById('zoneNote')?.classList.contains('hide'))&&await p.textContent('#cnt')==='1-0','Game: note clears and count moves on the next pitch (1-0)');
await p.click('#undo');await w(1600);
// ---- Stats: heat map ----
await p.click('nav [data-t="stats"]');await w(400);
await p.click('#hvA');await w();const landed=await ev(()=>({t:document.getElementById('hSummary').textContent,n:[...document.querySelectorAll('#hMap text')].map(e=>e.textContent).filter(t=>/^\d+$/.test(t)&&+t>0)}));
ok(/^6 pitches · where they landed/.test(landed.t),'Landed: counts all 6 pitches, aimed or not → "'+landed.t+'"');
if(SHOT){await p.screenshot({path:SHOT+'heat-landed.png'});}
await p.click('#hvI');await w();const miss=await ev(()=>({t:document.getElementById('hSummary').textContent,cells:[...document.querySelectorAll('#hMap text')].map(e=>e.textContent)}));
ok(/^3 of 6 pitches had an aimed spot/.test(miss.t)&&/3 pitches with no aim left out \(see Landed\)/.test(miss.t),'Miss: says 3 of 6 aimed and the 3 with no aim are left out → "'+miss.t+'"');
ok(!miss.cells.some(t=>/[✓✗]/.test(t))&&miss.cells.some(t=>/ off$|^On spot$/.test(t))&&miss.cells.filter(t=>/ aimed$/.test(t)).length===3,'Miss: kid-clear box labels ("1 off" / "On spot", "1 aimed"), no ✓1.0 '+miss.cells.filter(t=>/off|spot|aimed/.test(t)).join(','));
if(SHOT){await p.screenshot({path:SHOT+'heat-miss.png'});}
// ---- per-pitch report agrees with Game ----
const rep=await ev(()=>[...document.querySelectorAll('#sTypes .tsec')].map(s=>{const t=s.textContent;return{n:+(t.match(/(\d+) thrown/)||[])[1],aim:(t.match(/On target (\d+) of (\d+) aimed/)||[]).slice(1).map(Number),st:+(t.match(/Strikes (\d+)%/)||[])[1]};}));
const thrown=rep.reduce((a,x)=>a+x.n,0),aimed=rep.reduce((a,x)=>a+(x.aim[1]||0),0);
ok(thrown===6&&aimed===3,`report: ${thrown} thrown across types (=6), ${aimed} aimed (=3) `+JSON.stringify(rep));
const exp=await ev(()=>{const P=S().games[0].pitches.filter(p=>!p.noPitch),by={};P.forEach(p=>{const t=p.type||'?';(by[t]=by[t]||{n:0,s:0}).n++;if(PC.isStrike(p.result))by[t].s++;});return by;});
const fb=rep.find(x=>x.n===exp.FB.n);ok(!!fb&&fb.st===Math.round(100*exp.FB.s/exp.FB.n),`report: FB strike % follows the umpire results like the Game count (${fb&&fb.st}% vs ${Math.round(100*exp.FB.s/exp.FB.n)}%)`);
ok(/Each pitch type/.test(await p.textContent('#sTypesCard .lbl')),'report title says it covers every pitch thrown');
if(SHOT){await p.$eval('#sTypesCard',e=>e.scrollIntoView());await w(200);await p.screenshot({path:SHOT+'report.png'});}
ok(!errs.length,'no page errors '+errs.join('|'));await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
