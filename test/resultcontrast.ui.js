// VIEW-2. Soft coach result buttons are the muted Ball / strike / Foul / In play / HBP
// controls. They stay on screen, so the label has to clear WCAG AA (4.5:1) in Night
// and Field. Opacity is part of the paint: the check blends the text and the fill
// over the page behind the button. A switched-off control that is not a result
// (Redo with nothing to redo) may stay dim. The Okabe-Ito fills stay put.
// usage: node test/resultcontrast.ui.js <url>
const {chromium}=require('playwright-core');const fs=require('fs');const BASE=process.argv[2]||'http://127.0.0.1:8766/';
const SHOT=process.env.SHOT_DIR||'';if(SHOT)fs.mkdirSync(SHOT,{recursive:true});
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const GAME={id:'g1',date:'2026-10-14',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'Batter 1',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]};
// In the page. Blends for element opacity, then the WCAG ratio of the label on the fill.
const READ=()=>{
  const nums=c=>{const m=String(c).match(/[\d.]+/g);return m?m.map(Number):null;};
  const lin=c=>{c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);};
  const lum=rgb=>0.2126*lin(rgb[0])+0.7152*lin(rgb[1])+0.0722*lin(rgb[2]);
  const ratio=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);};
  const mix=(fg,bg,a)=>fg.map((v,i)=>v*a+bg[i]*(1-a));
  const behind=el=>{let n=el.parentElement;while(n){const p=nums(getComputedStyle(n).backgroundColor);if(p&&(p.length<4||p[3]>=0.99))return p.slice(0,3);n=n.parentElement;}return [0,0,0];};
  const fillOf=el=>{if(el.classList.contains('b-ball'))return [86,180,233];if(el.classList.contains('b-foul'))return [240,228,66];if(el.classList.contains('b-ip'))return [0,115,90];if(el.classList.contains('b-hbp'))return [204,121,167];if(el.classList.contains('b-cs')||el.classList.contains('b-ss'))return [179,71,0];return null;};
  const inkOf=el=>el.classList.contains('b-ball')||el.classList.contains('b-foul')||el.classList.contains('b-hbp')?[11,15,23]:[255,255,255];
  const one=el=>{const cs=getComputedStyle(el),fg=nums(cs.color).slice(0,3),bg=nums(cs.backgroundColor).slice(0,3),a=+cs.opacity,page=behind(el),r=el.getBoundingClientRect();
    return {r:el.dataset.r||el.dataset.cx||'',label:(el.textContent||'').replace(/\s+/g,' ').trim(),soft:el.classList.contains('soft'),disabled:!!el.disabled,opacity:a,
      ratio:ratio(mix(fg,page,a),mix(bg,page,a)),fg,bg,wantFill:fillOf(el),wantInk:el.dataset.r?inkOf(el):null,
      box:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)]};};
  const box=sel=>{const el=document.querySelector(sel);if(!el)return null;const r=el.getBoundingClientRect();return [Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)];};
  return {soft:[...document.querySelectorAll('#cRes button.soft[data-r]')].map(one),
    ready:[...document.querySelectorAll('#cRes button[data-r]:not(.soft)')].map(one),
    portrait:[...document.querySelectorAll('#resBtns button[data-r]:not([disabled])')].map(one),
    redo:document.querySelector('#cRes [data-cx="redo"]')?one(document.querySelector('#cRes [data-cx="redo"]')):null,
    layout:{zone:box('#cZone'),band:box('#cBand'),status:box('#cStatus'),bat:box('#batTog'),res:box('#resBtns')}};
};
const same=(a,b)=>!!a&&!!b&&a.length===b.length&&a.every((v,i)=>v===b[i]);
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--disable-dev-shm-usage']});
for(const theme of ['night','field']){
  {const tag=`${theme} 667x375`;
    const c=await b.newContext({viewport:{width:667,height:375},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());
    await c.addInitScript(t=>{localStorage.setItem('te_ui_theme',t);},theme);
    const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
    await p.goto(BASE);await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games=[g];S.activeGame='g1';__app.store.save();__app.render();},GAME);
    await p.waitForTimeout(300);
    const soft=await p.evaluate(READ);
    if(SHOT)await p.screenshot({path:`${SHOT}/result-soft-${theme}-667x375.png`});
    const rows=soft.soft;
    ok(documentReady(rows),`${tag} VIEW-2 soft result labels ≥4.5:1 ${rows.map(r=>r.r+' '+r.ratio.toFixed(2)+':1').join(', ')||'none'}`);
    ok(rows.length>=7&&rows.every(r=>r.label&&same(r.bg,r.wantFill)&&same(r.fg,r.wantInk)),`${tag} VIEW-2 soft results keep their labels and Okabe-Ito fills`);
    ok(soft.redo&&soft.redo.disabled&&Math.abs(soft.redo.opacity-0.4)<0.001,`${tag} VIEW-2 Redo stays dim (${soft.redo?soft.redo.opacity:'missing'})`);
    console.log('RECTS '+tag+' soft '+JSON.stringify({rows:rows.map(r=>({r:r.r,box:r.box,opacity:r.opacity,ratio:+r.ratio.toFixed(2)})),layout:soft.layout}));
    await p.evaluate(()=>{placeCall('FB',[5]);takeDraft(PC.scoreApply(pullDraft(),{op:'actual',z:6}));render();});
    await p.waitForTimeout(100);
    const ready=await p.evaluate(READ);
    ok(ready.ready.length>=7&&ready.ready.every(r=>!r.disabled&&r.ratio>=4.5&&same(r.bg,r.wantFill)),`${tag} VIEW-2 ready result labels ≥4.5:1 ${ready.ready.map(r=>r.r+' '+r.ratio.toFixed(2)+':1').join(', ')}`);
    ok(!errs.length,`${tag} no page errors ${errs.join('|')}`);
    await c.close();}
  {const tag=`${theme} 375x667`;
    const c=await b.newContext({viewport:{width:375,height:667},isMobile:true,hasTouch:true});await c.route(/supabase\.co/,r=>r.abort());
    await c.addInitScript(t=>{localStorage.setItem('te_ui_portrait_ok','1');localStorage.setItem('te_ui_theme',t);},theme);
    const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
    await p.goto(BASE);await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games=[g];S.activeGame='g1';__app.store.save();__app.render();},GAME);
    await p.click('nav [data-t="game"]');await p.waitForTimeout(200);
    await p.evaluate(()=>{placeCall('FB',[5]);takeDraft(PC.scoreApply(pullDraft(),{op:'actual',z:6}));D.sheet=true;render();});
    await p.waitForTimeout(200);
    const view=await p.evaluate(READ);
    if(SHOT)await p.screenshot({path:`${SHOT}/result-portrait-${theme}-375x667.png`});
    const rows=view.portrait;
    ok(rows.length>=6&&rows.every(r=>!r.disabled&&r.label&&r.box[2]>0&&r.box[3]>0&&r.ratio>=4.5&&same(r.bg,r.wantFill)&&same(r.fg,r.wantInk)),`${tag} VIEW-2 interactive result labels ≥4.5:1 ${rows.map(r=>r.r+' '+r.ratio.toFixed(2)+':1').join(', ')||'none'}`);
    console.log('RECTS '+tag+' '+JSON.stringify({rows:rows.map(r=>({r:r.r,box:r.box,ratio:+r.ratio.toFixed(2)})),layout:view.layout}));
    ok(!errs.length,`${tag} no page errors ${errs.join('|')}`);
    await c.close();}
}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
function documentReady(rows){return rows.length>=7&&rows.every(r=>r.label&&r.box[2]>0&&r.box[3]>0&&r.ratio>=4.5);}
})().catch(e=>{console.error(e);process.exit(1);});
