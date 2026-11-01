// RULE-11: editing a jersey number saves, and Cancel leaves it unchanged.
// RULE-12: the Thunder Elite branding stays.
// D-5: a CSV row with a bad x/y is skipped, and the import toast names it and stays up longer.
// usage: node test/jersey.ui.js <url>
const {chromium}=require('playwright-core');const BASE=process.argv[2]||'http://127.0.0.1:8766/';
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/google-chrome'});
const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await c.route(/supabase\.co/,r=>r.abort());await c.addInitScript(()=>localStorage.setItem('te_ui_portrait_ok','1'));
const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('dialog',d=>d.accept());
await p.goto(BASE);await p.click('nav [data-t="setup"]');await p.waitForTimeout(200);
const num=()=>p.evaluate(()=>__app.store.real.pitchers.find(x=>x.id==='p_woods').num);
const label=()=>p.evaluate(()=>document.querySelector('#pList [data-e="p_woods"]').parentElement.textContent);
ok(await p.title()==='Thunder Elite · Pitch Chart','RULE-12 title stays Thunder Elite');
ok(await p.getAttribute('.brand img','alt')==='Thunder Elite','RULE-12 wordmark stays Thunder Elite');
await p.click('#pList [data-e="p_woods"]');await p.waitForTimeout(200);
const field=await p.evaluate(()=>{const e=document.getElementById('pdNum');return{pattern:e.getAttribute('pattern'),max:e.maxLength,label:e.getAttribute('aria-label')};});
ok(field.pattern==='[0-9]*'&&field.max===2&&field.label==='Jersey number','RULE-11 jersey field is numeric, two digits, and labeled');
const editLabel=await p.getAttribute('#pList [data-e="p_woods"]','aria-label');
ok(editLabel==='Edit Avery #45','Edit button names the pitcher');
await p.fill('#pdNum','99');await p.click('#pDlg button[value="cancel"]');await p.waitForTimeout(200);
ok(await num()==='45'&&!/99/.test(await label()),'RULE-11 Cancel leaves the jersey number unchanged');
const reject=async(raw,msg)=>{await p.click('#pList [data-e="p_woods"]');await p.waitForTimeout(150);
  await p.evaluate(v=>{document.getElementById('pdNum').value=v;},raw);await p.click('#pdOk');await p.waitForTimeout(250);
  const toast=await p.textContent('#toast');const open=await p.evaluate(()=>document.getElementById('pDlg').open);
  ok(toast===msg&&open&&await num()==='45','RULE-11 rejects '+JSON.stringify(raw)+' ('+toast+', open='+open+')');
  await p.click('#pDlg button[value="cancel"]');await p.waitForTimeout(150);};
await reject('100','Jersey number is 0–99 (00 is OK)');
await reject('-1','Jersey number is 0–99 (00 is OK)');
await reject('abc','Jersey number is 0–99 (00 is OK)');
await reject('4 5','Jersey number is 0–99 (00 is OK)');
await p.click('#pList [data-e="p_crich"]');await p.waitForTimeout(150);
await p.fill('#pdNum','45');await p.click('#pdOk');await p.waitForTimeout(250);
ok((await p.textContent('#toast'))==='#45 is already Avery'&&await p.evaluate(()=>document.getElementById('pDlg').open),'duplicate jersey names Avery and stays open');
await p.fill('#pdNum','00');await p.click('#pdOk');await p.waitForTimeout(200);
ok(await p.evaluate(()=>__app.store.real.pitchers.find(x=>x.id==='p_crich').num)==='00','00 is saved and is not 0');
await p.click('#pList [data-e="p_larbus"]');await p.waitForTimeout(150);
await p.fill('#pdNum','0');await p.click('#pdOk');await p.waitForTimeout(200);
ok(await p.evaluate(()=>__app.store.real.pitchers.find(x=>x.id==='p_larbus').num)==='0','0 stays distinct from 00');
await p.click('#pList [data-e="p_woods"]');await p.waitForTimeout(200);
await p.fill('#pdNum','12');await p.click('#pdOk');await p.waitForTimeout(200);
ok(await num()==='12'&&/Avery #12/.test(await label()),'RULE-11 saving the jersey number updates the pitcher');
const list=await p.textContent('#pList');
ok(!/Woods|Crich|Larbus/.test(list),'RULE-10 no surnames in the pitcher list');
// D-5: a row with a bad x/y is skipped, and the toast says so and stays up for 4 seconds instead of 1.3.
const imp=async(rows)=>{const csv=await p.evaluate(r=>PC.toCSV(r.map((o,i)=>Object.assign({mode:'bullpen',session:'s_d5_'+o.k,date:'2026-10-22',pitcher:'Avery',pitcher_num:'12',throws:'R',bats:'R',type:'FB',call_target:'8',location:'8',actual_location:'8',ts:new Date(Date.UTC(2026,9,22,15,i)).toISOString()},o))),rows);
  await p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>{if(d.querySelector('#impCSV'))d.open=true;});});
  const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#impCSV')]);await fc.setFiles({name:'d5.csv',mimeType:'text/csv',buffer:Buffer.from(csv)});
  await p.waitForTimeout(200);const text=await p.textContent('#toast');await p.waitForTimeout(1800);
  return {text,up:await p.evaluate(()=>document.getElementById('toast').classList.contains('on'))};};
const clean=await imp([{k:'a',actual_x:'0.500',actual_y:'0.700'}]);
ok(clean.text==='Imported 1 pitch'&&!clean.up,'D-5 a clean import says Imported 1 pitch and the toast is gone after 2 s ('+JSON.stringify(clean)+')');
const bad=await imp([{k:'b',actual_x:'0.500',actual_y:'0.700'},{k:'b',actual_x:'1.2',actual_y:'0.500'}]);
ok(bad.text==='Imported 1 pitch ·\u00a01\u00a0skipped\u00a0(bad\u00a0x/y)'&&bad.up,'D-5 a bad x/y row is skipped, the toast names it and is still up after 2 s ('+JSON.stringify(bad)+')');
ok(await p.evaluate(()=>__app.store.real.sessions.filter(s=>/^s_d5_/.test(s.id)).map(s=>s.pitches.length).join(','))==='1,1','D-5 the skipped row is not saved');
const box=sel=>p.evaluate(s=>{const e=document.querySelector(s);const r=e.getBoundingClientRect();return Math.round(Math.min(r.width,r.height));},sel);
await p.click('nav [data-t="bullpen"]');await p.waitForTimeout(150);
ok(await box('#bpHands')>=44,'batter-hand checkbox is at least 44px');
await p.evaluate(()=>{const S=__app.store.real;S.games=[{id:'g1',date:'2026-10-15',opponent:'Storm',homeAway:'home',started:1,lineup:[{slot:1,name:'B',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]}];S.activeGame='g1';__app.store.save();__app.render();});
await p.click('nav [data-t="game"]');await p.waitForTimeout(200);
await p.click('#jerseyEdit');await p.waitForTimeout(200);
ok(await p.evaluate(()=>document.getElementById('pDlg').open&&document.getElementById('pdNum').value==='12'&&document.getElementById('pdName').value==='Avery'),'Game opens the jersey editor');
await p.click('#pDlg button[value="cancel"]');await p.waitForTimeout(100);
ok(await box('#pitcher')>=48,'pitcher picker is at least 48px');
ok(await box('#jerseyEdit')>=48,'jersey link is at least 48px');
ok(await box('#wbTog')>=48,'Band is at least 48px');
ok(await box('#resTog')>=48,'Result is at least 48px');
ok(await box('#batTog')>=48,'batter chip is at least 48px');
await p.click('#wbTog');await p.waitForTimeout(150);
ok(await p.evaluate(()=>document.querySelector('#wbTbl td button').getBoundingClientRect().height)>=48,'wristband cell is at least 48px tall');
await p.click('#wbTog');await p.waitForTimeout(100);
ok(await p.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('cxMenu')).minHeight)>=44),'coach menu is at least 44px');
ok(!errs.length,'no page errors '+errs.join('|'));
// VIEW-4: the Field wordmark plate (Elite script plus the letter outline) must clear 4.5:1 on the white header.
// Night keeps that plate white. The royal Thunder fill stays #1E3FD0. Coach landscape does not show the header.
function decodePNG(buf){
  let o=8,w=0,h=0,depth=0,ctype=0;const idats=[];
  while(o<buf.length){
    const len=buf.readUInt32BE(o);const type=buf.toString('ascii',o+4,o+8);const data=buf.subarray(o+8,o+8+len);
    if(type==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);depth=data[8];ctype=data[9];}
    else if(type==='IDAT')idats.push(data);
    else if(type==='IEND')break;
    o+=12+len;
  }
  if(depth!==8||(ctype!==6&&ctype!==2))throw new Error('png '+ctype+'/'+depth);
  const raw=require('zlib').inflateSync(Buffer.concat(idats));
  const ch=ctype===6?4:3,px=Buffer.alloc(w*h*4);let i=0;
  for(let y=0;y<h;y++){
    const filter=raw[i++],row=y*w*4,prev=y?yy=>px[row-w*4+yy]:()=>0;
    for(let x=0;x<w;x++){
      const di=row+x*4,src=[];
      for(let c=0;c<ch;c++)src.push(raw[i++]);
      if(ch===3)src.push(255);
      const L=[0,1,2,3].map(c=>x?px[di-4+c]:0),U=[0,1,2,3].map(c=>prev(x*4+c));
      for(let c=0;c<4;c++){
        let v=src[c];
        if(filter===1)v+=L[c];
        else if(filter===2)v+=U[c];
        else if(filter===3)v+=Math.floor((L[c]+U[c])/2);
        else if(filter===4){const a=L[c],bb=U[c],cc=x?prev((x-1)*4+c):0,p=a+bb-cc,pa=Math.abs(p-a),pb=Math.abs(p-bb),pc=Math.abs(p-cc);v+=(pa<=pb&&pa<=pc)?a:(pb<=pc?bb:cc);}
        px[di+c]=v&255;
      }
    }
  }
  return {w,h,px};
}
function linC(c){c/=255;return c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4);}
function lumC(p){return 0.2126*linC(p[0])+0.7152*linC(p[1])+0.0722*linC(p[2]);}
function ratioC(a,b){const x=lumC(a),y=lumC(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
function plateOf(png,bg){
  const {px}=decodePNG(png),blue=[30,63,208],dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const plate=[];let blueN=0;
  for(let i=0;i<px.length;i+=4){
    const p=[px[i],px[i+1],px[i+2]];
    if(px[i+3]<20||dist(p,bg)<18)continue;
    if(dist(p,blue)<70){blueN++;continue;}
    plate.push(p);
  }
  plate.sort((a,b)=>lumC(a)-lumC(b));
  const at=q=>plate.length?plate[Math.min(plate.length-1,Math.floor(plate.length*q))]:null;
  const ink=at(0.1),light=at(0.9);
  return {blueN,plateN:plate.length,ink,inkContrast:ink?ratioC(ink,bg):0,light,lightContrast:light?ratioC(light,bg):0};
}
const markInfo=()=>p=>p.evaluate(()=>{
  const img=document.querySelector('.brand img'),r=img.getBoundingClientRect(),header=document.querySelector('header'),hs=getComputedStyle(header);
  const zone=document.getElementById('cZone'),band=document.querySelector('#cBand');
  const box=el=>{if(!el)return null;const b=el.getBoundingClientRect();return {w:+b.width.toFixed(1),h:+b.height.toFixed(1),on:b.width>0&&b.left>=-1&&b.top>=-1&&b.right<=innerWidth+1&&b.bottom<=innerHeight+1};};
  return {alt:img.getAttribute('alt'),filter:getComputedStyle(img).filter,theme:document.documentElement.dataset.theme,
    x:+r.x.toFixed(2),y:+r.y.toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),
    headerDisplay:hs.display,headerBg:hs.backgroundColor,coach:document.body.classList.contains('coachmode'),
    text:getComputedStyle(document.documentElement).getPropertyValue('--c-text').trim(),
    nav:getComputedStyle(document.querySelector('nav')).display,zone:box(zone),band:box(band)};
});
const rgbOf=hex=>{const m=String(hex).match(/^#([0-9a-f]{6})$/i);if(!m)return null;const n=m[1];return [parseInt(n.slice(0,2),16),parseInt(n.slice(2,4),16),parseInt(n.slice(4,6),16)];};
const readBg=s=>{const m=String(s).match(/[\d.]+/g).map(Number);return [m[0],m[1],m[2]];};
const GAME={id:'g1',date:'2026-10-13',opponent:'Storm',homeAway:'home',status:'active',started:1,lineup:[{slot:1,name:'B',num:'1',hand:'R'}],cur:{inning:1,outs:0,slot:0,b:0,s:0,abn:1},pitches:[]};
for(const [W,H,theme,land] of [[375,667,'field',false],[390,844,'field',false],[430,932,'field',false],[375,667,'night',false],[667,375,'field',true],[844,390,'field',true],[932,430,'field',true],[667,375,'night',true]]){
  const tag=`VIEW-4 ${theme} ${W}x${H}`;
  const c=await b.newContext({viewport:{width:W,height:H},isMobile:true,hasTouch:true});
  await c.addInitScript(t=>localStorage.setItem('te_ui_theme',t),theme);
  await c.route(/supabase\.co/,r=>r.abort());
  const p=await c.newPage();const perr=[];p.on('pageerror',e=>perr.push(e.message));
  await p.goto(BASE);await p.waitForTimeout(200);
  if(land){
    await p.evaluate(g=>{const S=__app.store.real;S.pitchers=[{id:'p_a',name:'Avery',num:'45',throws:'R'}];S.curPitcher='p_a';S.games.push(g);S.activeGame='g1';__app.store.save();__app.render();},GAME);
    await p.click('nav [data-t="game"]').catch(()=>{});await p.waitForTimeout(250);
  }else{await p.click('nav [data-t="setup"]').catch(()=>{});await p.waitForTimeout(150);}
  const info=await markInfo()(p);
  ok(info.alt==='Thunder Elite',`${tag}: wordmark name stays Thunder Elite`);
  ok(!perr.length,`${tag}: no page errors ${perr.join('|')}`);
  if(land){
    ok(info.coach&&info.headerDisplay==='none'&&info.h===0,`${tag}: coach screen hides the header, wordmark box ${info.w}x${info.h}`);
    ok(info.zone&&info.zone.on&&info.band&&info.band.on,`${tag}: wristband and zone stay on screen`);
  }else{
    const shot=await p.locator('.brand img').screenshot();
    const plate=plateOf(shot,readBg(info.headerBg));
    ok(info.h===30&&info.w>=80&&info.w<=88&&info.x>=0&&info.x+info.w<=W+0.5,`${tag}: wordmark box ${info.w}x${info.h} at ${info.x},${info.y}`);
    ok(info.nav!=='none',`${tag}: tab bar stays visible`);
    ok(plate.blueN>50,`${tag}: Thunder stays royal blue (${plate.blueN} px)`);
    if(theme==='field'){
      const want=rgbOf(info.text);
      ok(plate.plateN>plate.blueN&&plate.inkContrast>=4.5&&want&&plate.ink.join(',')===want.join(','),`${tag}: Elite plate ${plate.inkContrast.toFixed(2)}:1 matches --c-text ${info.text} (${plate.plateN} px, ink ${plate.ink})`);
      ok(info.filter.includes('wmField'),`${tag}: field wordmark uses the plate filter`);
    }else{
      ok(plate.lightContrast>=4.5,`${tag}: Night plate stays light ${plate.lightContrast.toFixed(2)}:1 ${plate.light}`);
      ok(info.filter==='none',`${tag}: Night wordmark is not recolored`);
    }
  }
  await c.close();
}
await b.close();console.log(fails?fails+' FAILED':'ALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
