// Regression (PR G): walk EVERY tab and state (Game idle / scheduled list / in progress, Bullpen, Stats, Setup) at 390x844, 375x667, 430x932
// and assert no text is clipped or ellipsized (scrollWidth > clientWidth), the pitcher name never truncates, nothing runs off-screen, and nothing overlaps.
// Throwaway profile, Supabase blocked, test data only (first names). usage: node test/layout.ui.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://localhost:8766/';let fails=0;const SHOT=process.env.SHOT_DIR||'';if(SHOT)require('fs').mkdirSync(SHOT,{recursive:true});const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
// in-page audit: returns a list of problems
const AUDIT=()=>{const out=[];const W=innerWidth;const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'')+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).join('.'):'')+' "'+(e.textContent||'').trim().slice(0,28)+'"';
  const shown=e=>{const d=e.closest('details:not([open])');if(d&&!e.closest('summary'))return false; // closed <details> content is not rendered
    const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return false;const cs=getComputedStyle(e);return cs.visibility!=='hidden'&&+cs.opacity!==0;};
  const scroller=e=>{const cs=getComputedStyle(e);return cs.overflowX==='auto'||cs.overflowX==='scroll';};
  const inScroller=e=>{for(let p=e.parentElement;p;p=p.parentElement)if(scroller(p))return true;return false;};
  const cx=document.createElement('canvas').getContext('2d');
  for(const e of document.querySelectorAll('header *,main *,nav *')){if(!shown(e)||e.closest('svg')||e.matches('input,textarea,option,br'))continue;const cs=getComputedStyle(e);
    if(e.tagName==='SELECT'){const o=e.options[e.selectedIndex];if(!o)continue;cx.font=cs.font;const room=e.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)-(e.id==='pitcher'?0:-4);
      if(cx.measureText(o.text).width>room+1)out.push('select text truncated: '+name(e)+' "'+o.text+'" '+Math.round(cx.measureText(o.text).width)+'>'+Math.round(room));continue;}
    if(cs.display==='inline'||scroller(e))continue;
    if(e.scrollWidth>e.clientWidth+1&&(cs.overflowX!=='visible'||cs.textOverflow==='ellipsis'||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())))out.push('clipped: '+name(e)+' '+e.scrollWidth+'>'+e.clientWidth);
    const r=e.getBoundingClientRect();if(!inScroller(e)&&(r.right>W+1||r.left<-1))out.push('off-screen: '+name(e)+' '+Math.round(r.left)+'..'+Math.round(r.right));}
  const Q=[...document.querySelectorAll('header button,header select,header .tag,header .wlmini,header .brand,main button,main select,main input,main .tag,main .lbl,main .title,main label,nav button')].filter(e=>shown(e)&&!inScroller(e));
  const ctx=e=>e.closest('header,nav,dialog,.bsheet,.entrybar,.zonewrap')||document.body;
  for(let i=0;i<Q.length;i++)for(let j=i+1;j<Q.length;j++){const a=Q[i],b=Q[j];if(a.contains(b)||b.contains(a)||ctx(a)!==ctx(b))continue;const A=a.getBoundingClientRect(),B=b.getBoundingClientRect();
    const ox=Math.min(A.right,B.right)-Math.max(A.left,B.left),oy=Math.min(A.bottom,B.bottom)-Math.max(A.top,B.top);if(ox>2&&oy>2)out.push('overlap: '+name(a)+' × '+name(b));}
  return out;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
for(const [W,H] of [[390,844],[375,667],[430,932]]){const tag=`${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true,deviceScaleFactor:SHOT?3:1,colorScheme:'dark'});await c.route(/supabase\.co/,r=>r.abort());
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));const ev=(f,a)=>p.evaluate(f,a);
  await p.goto(BASE);await ev(()=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'},{id:'p_x',name:'Alexandria',num:'12',throws:'L'}];S.curPitcher='p_x';
    const s={id:'s1',date:'2026-10-12',pitcherId:'p_x',started:1,ended:2,pitches:[]};[[3,3],[7,5],[9,14],[1,1]].forEach(([t,l],i)=>s.pitches.push({id:'x'+i,pitcherId:'p_x',type:'FB',targets:[t],loc:l,b:0,s:0}));S.sessions.push(s);__app.store.save();__app.render();});
  const check=async(state,prep)=>{await prep();await p.waitForTimeout(300);await ev(()=>scrollTo(0,0));const probs=await ev(AUDIT);const dup=await ev(()=>[document.getElementById('wlMsg'),document.getElementById('wlMini')].filter(e=>e.getBoundingClientRect().height>0).length);if(dup>1)probs.push('workload counts shown twice');
    if(SHOT&&W===390)await p.screenshot({path:SHOT+state.replace(/[^a-z]+/g,'-').replace(/-$/,'')+'.png'});ok(!probs.length,`${tag} ${state}: no clipping/overlap${probs.length?' → '+probs.slice(0,6).join(' | '):''}`);};
  await check('game idle',()=>p.click('nav [data-t="game"]'));
  await check('game scheduled list',async()=>{await ev(()=>{const S=__app.store.real;[['10-17','12:00 PM','Outlaws Premier 2031 Lightel','P7','Field 20','Berliner Sports Park, Columbus'],['10-18','8:30 AM','Team All American 14U','P43','Field 9','Berliner Sports Park, Columbus']].forEach(([d,t,o,n,f,l],i)=>S.games.push({id:'sg'+i,date:'2026-'+d,time:t,opponent:o,gameNo:n,field:f,location:l,status:'scheduled',link:'https://web.gc.com/x',lineup:[],pitches:[],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:0}}));__app.store.save();__app.render();});});
  await check('game in progress',()=>ev(()=>{const S=__app.store.real;S.games.push({id:'g1',date:'2026-10-13',opponent:'Central Ohio Pride 13-Sharrow',homeAway:'away',status:'active',started:1,event:'Fall Classic',lineup:[{slot:1,name:'B1',num:'1',hand:'R'}],cur:{inning:3,outs:2,slot:0,b:3,s:2,abn:9},pitches:[]});S.activeGame='g1';__app.store.save();__app.render();}));
  await check('bullpen',async()=>{await ev(()=>{const S=__app.store.real;S.games.find(g=>g.id==='g1').ended=Date.now();S.games.find(g=>g.id==='g1').status='final';S.activeGame=null;__app.store.save();__app.render();});await p.click('nav [data-t="bullpen"]');});
  await check('stats',()=>p.click('nav [data-t="stats"]'));
  await check('setup (all sections open)',async()=>{await p.click('nav [data-t="setup"]');await ev(()=>document.querySelectorAll('#tab-setup details').forEach(d=>d.open=true));});
  ok(!errs.length,`${tag}: no page errors `+errs.join('|'));await c.close();}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);})();
