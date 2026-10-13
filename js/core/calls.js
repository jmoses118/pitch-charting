/* Thunder Elite pitch charting – calls.js: Pitch types, call codes (Jim's wristband language), call sheets.
   Pure logic (no DOM). Loads in the browser (window.PC) and in node (see logic.js). */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const {insideCol,awayCol,cz,isZone,isOut,locInfo}=PC;
// ---------- Pitch types & call codes ----------
const BASE_TYPES=[{code:'FB',name:'Fastball'},{code:'CH',name:'Change-up'},{code:'CB',name:'Curveball'},{code:'DR',name:'Drop'},{code:'DC',name:'Drop curve'},{code:'RS',name:'Rise'},{code:'SC',name:'Screwball'}];
const ALIAS={FB:'FB',FAST:'FB',FASTBALL:'FB',CH:'CH',CHG:'CH',CHANGE:'CH',CU:'CB',CB:'CB',CRV:'CB',CURVE:'CB',DR:'DR',DB:'DR',DROP:'DR',DC:'DC',DROPCURVE:'DC',RS:'RS',RISE:'RS',SC:'SC',SRW:'SC',SCREW:'SC',SCREWBALL:'SC'};
function normType(t,custom){if(!t)return null;const u=String(t).toUpperCase().replace(/\s+/g,'');
  if(ALIAS[u])return ALIAS[u];
  for(const c of custom||[]){if(c.code.toUpperCase()===u||c.name.toUpperCase().replace(/\s+/g,'')===u)return c.code.toUpperCase();}
  return u||null;}
// ---- Jim's call-code table (one place to change what a code means) ----
// Pitch words (ALIAS above): FB/Fb=fastball, CH/CHG=change-up, CRV/CB=curve, SRW/SC=screwball, DB/DR=drop, DC=drop curve, RS=rise.
// Suffixes (pitcher's view grid; in/away follow the batter side, no batter = RHB):
//   number = that spot · IN/I = middle of the inside edge (6 vs RHB, 4 vs LHB) · O = away on the black (4 vs RHB, 6 vs LHB)
//   A = away waste (16 vs RHB, 17 vs LHB) · H = up in zone (2) · H+ = high waste (15) · L = low in zone (8)
//   e.g. SRWI = screwball in, SRWO = screwball away. No suffix: CB = glove side by pitcher hand (7/alt 4 RHP, 9/alt 6 LHP); others = no location.
const CALL_SUFFIX={
  IN:{at:(i,a)=>cz(i,1),desc:'inside to {B}'},
  O:{at:(i,a)=>cz(a,1),desc:'away edge vs {B}'},
  A:{at:(i,a)=>a===0?16:17,waste:true,desc:'center away waste vs {B}'},
  H:{at:()=>2,desc:'up in zone'},
  'H+':{at:()=>15,waste:true,desc:'center up waste'},
  L:{at:()=>8,desc:'down in zone'}};
// parseCall("CHG 7"|"FB IN"|"FB A"|"H+"|"CB"...,batterHand,pitcherThrows,customTypes)
// returns {type, suffix, targets:[zones], waste:bool, desc, norm} or null
function parseCall(code,hand,throws,custom){if(code==null)return null;const hand0=hand;hand=hand==='L'?'L':'R';throws=throws==='L'?'L':'R';
  let s=String(code).toUpperCase().trim().replace(/\s+/g,' ');if(!s)return null;
  if(s==='H+'||s==='A'||s==='IN')s='FB '+s;              // bare waste/in calls are fastballs
  let m=s.match(/^([A-Z]+?)\s*(\d{1,2}|IN|I|A|O|H\+|H|L)?$/);
  // allow e.g. "FBIN","CHG7"
  if(!m)return null;
  let rawT=m[1],suf=m[2]||'';
  if(!suf){const m2=rawT.match(/^(FB|CHG|CH|CB|CRV|DR|DB|DC|RS|SRW|SC)(IN|A|O|H|L|I)$/);if(m2){rawT=m2[1];suf=m2[2];}}
  const type=normType(rawT,custom);if(!type)return null;
  const inC=insideCol(hand),awC=awayCol(hand);
  let targets=[],alts=[],waste=false,desc='';
  if(/^\d+$/.test(suf)){const z=+suf;if(!(isZone(z)||isOut(z)))return null;targets=[z];desc=locInfo(z,hand0,throws).label;}
  else if(CALL_SUFFIX[suf==='I'?'IN':suf]){const d=CALL_SUFFIX[suf==='I'?'IN':suf];const r=d.at(inC,awC);targets=[r];waste=!!d.waste;desc=d.desc.replace('{B}',hand+'HB');}
  else if(type==='CB'){targets=throws==='L'?[9]:[7];alts=throws==='L'?[6]:[4];desc=`glove side of ${throws}HP (alt ${alts[0]})`;} // RHP glove side = pitcher's left: 7 (alt 4); LHP: 9 (alt 6)
  else desc='no location';
  const norm=type+(suf?(/^\d+$/.test(suf)?suf:' '+(suf==='I'?'IN':suf)):'');
  return{type,suffix:suf==='I'?'IN':suf,targets,alts,waste,desc,norm};}
// Jim's catcher wristband (rows 1-7 x columns 01-08), transcribed from his photo
const WRISTBAND_1=[['Fb 3','SRWI','Fb 1','CRV','Fb A','SRWO','CH7','FB In'],['Fb A','Fb','CRV','Fb9','Fb O','FB In','Fb H','CHG'],['Fb O','SRW','CH9','CHG','Fb In','CHG 9','Fb 7','Fb O'],
  ['Fb H','Fb O','SRWI','Fb A','Fb7','Fb3','CH9','SRW'],['CRV','Fb H+','SRW','DB','CHG 7','SRWO','CHG 7','Fb3'],['CHG 7','FB In','Fb H+','Fb 1','FB In','CRV','Fb O','DB'],['Fb In','Fb L','FB In','Fb H','Fb9','CHG','CRV','FB In']];
const sheetCols=n=>Array.from({length:n},(_,i)=>String(i+1).padStart(2,'0'));
function defaultCallSheet(){return{id:'cs_wristband1',name:'Wristband 1',pitcherId:null,cols:sheetCols(8),rows:WRISTBAND_1.map(r=>r.slice())};}
// "3-05" / "3 5" / "35" -> {r:2,c:4} (0-based) or null
function parseCellRef(s,sheet){const m=String(s||'').trim().match(/^(\d{1,2})\s*[-\s.,/]\s*(\d{1,2})$/)||String(s||'').trim().match(/^(\d)(\d{1,2})$/);if(!m)return null;
  const r=+m[1]-1,c=+m[2]-1;if(!sheet||r<0||c<0||r>=sheet.rows.length||c>=(sheet.rows[r]||[]).length)return null;return{r,c,text:sheet.rows[r][c]};}
Object.assign(PC,{BASE_TYPES,ALIAS,normType,CALL_SUFFIX,parseCall,WRISTBAND_1,sheetCols,defaultCallSheet,parseCellRef});
})(typeof window!=='undefined'?window:globalThis);
