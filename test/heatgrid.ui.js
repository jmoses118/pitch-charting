// Heat map palette (step 3a). P-2: no #1E3FD0 text or thin line on dark (blueBad = 0). P-4: aimed cells at least 48x48 with a 3:1 edge.
// HM-6: aimed cells use the class colours. HM-8: Landed and the HM-7 drill use the ramp. Cell text is at least 4.5:1 on its cell.
// Night and Field, at 375x667, 667x375, 440x956 and 956x440. Throwaway profile, Supabase blocked, test data only (first names).
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const SEED=()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';const s={id:'s1',date:'2026-10-12',pitcherId:'p_a',started:1,ended:2,pitches:[]};
  [[3,3],[3,3],[7,8],[7,7],[1,9],[9,8],[9,9],[16,16],[3,2]].forEach(([t,l],i)=>s.pitches.push({id:'x'+i,pitcherId:'p_a',type:'FB',targets:[t],loc:l,b:0,s:0}));S.sessions.push(s);__app.store.save();__app.render();};
// in-page: every cell of one map, with its fill, edge, size, the text on it, and P-2 offenders
const PROBE=sel=>{const hex=c=>{const m=String(c).match(/[\d.]+/g);return m?'#'+m.slice(0,3).map(v=>(+v).toString(16).padStart(2,'0')).join('').toUpperCase():'';};
  const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const lum=h=>{const c=rgb(h).map(v=>v/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2];};
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  const mix=(t,b,a)=>'#'+rgb(t).map((v,i)=>Math.round(v*a+rgb(b)[i]*(1-a)).toString(16).padStart(2,'0')).join('').toUpperCase();
  const svg=document.querySelector(sel),k=svg.getScreenCTM().a,bg=hex(getComputedStyle(svg.closest('.card,dialog')).backgroundColor);const cells={};let blueBad=0;
  svg.querySelectorAll('[data-z]').forEach(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect(),fill=hex(cs.fill),stroke=cs.stroke==='none'?'':hex(cs.stroke);
    cells[e.dataset.z]={fill,stroke,w:r.width,h:r.height,btn:e.getAttribute('role')==='button',edge:Math.max(ratio(fill,bg),stroke?ratio(stroke,bg):1),texts:[]};});
  svg.querySelectorAll('*').forEach(e=>{const cs=getComputedStyle(e);const thin=cs.stroke!=='none'&&parseFloat(cs.strokeWidth)*k<4&&hex(cs.stroke)==='#1E3FD0';
    if((e.tagName==='text'&&hex(cs.fill)==='#1E3FD0'||thin)&&lum(bg)<0.05)blueBad++;});
  svg.querySelectorAll('text').forEach(t=>{const r=t.getBoundingClientRect();if(!r.width||t.closest('.ball'))return;const pt=new DOMPoint(r.x+r.width/2,r.y+r.height/2).matrixTransform(svg.getScreenCTM().inverse());const under=[...svg.querySelectorAll('[data-z]')].find(x=>x.isPointInFill(pt));if(!under)return;
    const c=cells[under.dataset.z],a=+getComputedStyle(t).opacity*(+getComputedStyle(t).fillOpacity||1);c.texts.push(+ratio(mix(hex(getComputedStyle(t).fill),c.fill,a),c.fill).toFixed(2));});
  return {bg,blueBad,cells};};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});const node=require('../logic.js');
for(const theme of ['night','field'])for(const [W,H] of [[375,667],[667,375],[440,956],[956,440]]){const tag=`${theme} ${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());
  await c.addInitScript(t=>{localStorage.setItem('te_ui_portrait_ok','1');localStorage.setItem('te_ui_theme',t);},theme);
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a);
  await p.goto(BASE);await ev(SEED);await p.click('nav [data-t="stats"]');await p.click('#hvI');await p.waitForTimeout(250);
  const d=await ev(()=>PC.missData(PC.heatItems(__app.store.state),{}));const L=await ev(()=>PC.heatData(PC.heatItems(__app.store.state),{},'actual'));
  const aim=await ev(PROBE,'#hMap');const want=z=>node.classColor(d.cells[z].cls,theme).fill;
  ok(aim.blueBad===0,`${tag} P-2 Aim view blueBad = 0`);
  ok(Object.keys(aim.cells).every(z=>aim.cells[z].fill===want(z)),`${tag} HM-6 aimed cells use the class colour, empty cells ramp step 0`);
  ok(['3','7','1'].every(z=>aim.cells[z].fill===node.MISS_CLASS[d.cells[z].cls].fill)&&new Set(['3','7','1'].map(z=>d.cells[z].cls)).size===3,`${tag} HM-6 all three classes drawn`);
  const btn=Object.values(aim.cells).filter(x=>x.btn);
  ok(btn.length>=5&&btn.every(x=>x.w>=48&&x.h>=48),`${tag} P-4 aimed cells at least 48x48 (smallest ${Math.round(Math.min(...btn.map(x=>Math.min(x.w,x.h))))})`);
  ok(Object.values(aim.cells).every(x=>x.edge>=3),`${tag} P-4 every cell edge at least 3:1 (lowest ${Math.min(...Object.values(aim.cells).map(x=>x.edge)).toFixed(2)})`);
  const tx=Object.values(aim.cells).flatMap(x=>x.texts);ok(tx.length>0&&tx.every(v=>v>=4.5),`${tag} P-3 Aim cell text at least 4.5:1 (lowest ${Math.min(...tx)})`);
  await p.click('#hvA');await p.waitForTimeout(150);const land=await ev(PROBE,'#hMap');
  ok(land.blueBad===0&&Object.keys(land.cells).every(z=>land.cells[z].fill===node.landColor(L.cells[z].n,theme).fill),`${tag} HM-8 Landed cells use the ramp, blueBad = 0`);
  const lt=Object.values(land.cells).flatMap(x=>x.texts);ok(lt.every(v=>v>=4.5),`${tag} P-3 Landed cell text at least 4.5:1 (lowest ${Math.min(...lt)})`);
  ok(Object.values(land.cells).every(x=>x.edge>=3),`${tag} P-4 Landed cell edge at least 3:1`);
  await p.click('#hvI');await p.waitForTimeout(150);await p.$eval('#hMap [data-z="3"]',e=>e.dispatchEvent(new MouseEvent('click',{bubbles:true})));await p.waitForTimeout(250);
  const dd=await ev(PROBE,'#ddMap');const L3=d.cells[3].land;
  ok(dd.blueBad===0&&Object.keys(dd.cells).every(z=>dd.cells[z].fill===node.landColor(L3[z]?L3[z].n:0,theme).fill),`${tag} HM-7 drill landings use the ramp, blueBad = 0`);
  ok(dd.cells[3].stroke===node.heatEdge(theme),`${tag} HM-7 the aimed cell is outlined in ${node.heatEdge(theme)}`);
  ok(await ev(()=>![...document.querySelectorAll('#ddCap [style]')].some(e=>/color/.test(e.getAttribute('style')))),`${tag} drill caption uses no extra colours`);
  await p.click('#ddClose');await ev(()=>{document.getElementById('sScope').value='s1';document.getElementById('sScope').onchange();});await p.click('#sReport');await p.waitForTimeout(250);
  const rp=await ev(PROBE,'#rMap');ok(rp.blueBad===0&&Object.keys(rp.cells).every(z=>rp.cells[z].fill===want(z)),`${tag} HM-6 report map uses the class colours`);
  ok(!errs.length,`${tag} no page errors ${errs.join('|')}`);await c.close();}
console.log(fails?fails+' FAILED':'ALL PASS');await b.close();process.exit(fails?1:0);})();
