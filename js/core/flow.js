/* Thunder Elite pitch charting – flow.js: one scoring state machine for every mode.
   Pure logic (no DOM). Loads after calls.js and location.js, before game.js. validCalled is the only aim validator.
   callWarn is the soft warning beside it. It does not refuse a call and it is not stored.
   Game: type → called location → actual location → result.
   Bullpen: type → called location → actual location → save. No ball/strike step.
   Optional and outside the required list: shake-off, velocity, in-play detail, editing a past location. */
(function(root){
'use strict';
const PC=root.PC=root.PC||{};
const FLOW={game:['type','called','actual','result'],bullpen:['type','called','actual']};
const GAME_RESULTS=['ball','called','swinging','foul','foultip','inplay','hbp','kd3','kd3out'];
const STEP_LABEL={type:'Pitch',called:'Aim',actual:'Where',result:'Result'};
function flowSteps(mode){return (mode==='bullpen'?FLOW.bullpen:FLOW.game).slice();}
function flowLabel(step){return STEP_LABEL[step]||step;}
function clone(d){d=d||{};
  const called=Array.isArray(d.called)?d.called.map(z=>+z).filter(z=>Number.isFinite(z)):[] ;
  const xy=PC.cleanXY(d.actual_x,d.actual_y,d.xy_loc);
  const point=xy.actual_x==null?{}:{actual_x:xy.actual_x,actual_y:xy.actual_y,xy_loc:xy.xy_loc};
  return{mode:d.mode==='bullpen'?'bullpen':'game',type:d.type||null,called,
    actual:d.actual==null||!Number.isFinite(+d.actual)?null:+d.actual,
    result:d.result||null,ip:d.ip||null,
    shook:d.shook?{type:d.shook.type||null,called:(d.shook.called||[]).map(z=>+z).filter(z=>Number.isFinite(z)),norm:d.shook.norm||null,raw:d.shook.raw||null}:null,
    velo:d.velo==null?null:d.velo,aimEdit:!!d.aimEdit,...point,...(d.calledFlag?{calledFlag:true}:{})};}
function scoreStep(d){d=d||{};const steps=flowSteps(d.mode);
  if(!d.type)return 'type';
  if(!(d.called&&d.called.length))return 'called';
  if(d.actual==null)return 'actual';
  if(steps.indexOf('result')>=0&&!d.result)return 'result';
  return 'done';}
// RULE-3a: dirt, way off and the backstop are actual locations only. RULE-1: a change-up aim is 4, 7, 8, 9, 13, 14, 18.
function validCalled(type,z){z=+z;if(!PC.GRID_XY[z])return false;if(PC.isWay(z)||PC.isActualOnly(z))return false;if(!(PC.isZone(z)||PC.isOut(z)))return false;if(type==='CH'&&!(PC.CH_TARGETS||[]).includes(z))return false;return true;}
function validActual(z){return !!PC.GRID_XY[+z];}
// One bad-aim check for commit, CSV import, and sync. True when any box fails validCalled.
function aimFlag(type,boxes){return (boxes||[]).some(z=>!validCalled(type,z));}
function aimNote(draft,compact){const boxes=((draft&&draft.called)||[]).map(z=>+z).filter(z=>Number.isFinite(z));const bad=boxes.find(z=>!validCalled(draft.type,z));return bad==null?'':PC.aimRejectMsg(draft.type,bad,compact);}
function fail(op,d,reason){return{ok:false,op,draft:d,step:scoreStep(d),reason};}
function scoreApply(draft,ev){const d=clone(draft);ev=ev||{};const op=ev.op;
  if(op==='call'){d.type=ev.type||null;const raw=Array.isArray(ev.called)?ev.called:[];const nums=raw.map(z=>+z).filter(z=>Number.isFinite(z));
    // RULE-3d: no new aim after a shake-off keeps the original box, even when the new type cannot be called there.
    if(d.shook&&!nums.length&&d.type)d.called=(d.shook.called||[]).map(z=>+z).filter(z=>Number.isFinite(z));
    else d.called=nums.filter(z=>validCalled(d.type,z));
    if(aimFlag(d.type,d.called))d.calledFlag=true;else delete d.calledFlag;
    d.actual=null;d.result=null;d.ip=null;d.aimEdit=false;
    return{ok:!!d.type,op,draft:d,step:scoreStep(d),reason:d.type?null:'need_type'};}
  if(op==='called'){if(!d.type)return fail(op,d,'need_type');const z=+ev.z;if(!validCalled(d.type,z))return fail(op,d,'bad_target');d.called=[z];d.aimEdit=false;delete d.calledFlag;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  if(op==='actual'){if(!d.type)return fail(op,d,'need_type');if(!d.called.length)return fail(op,d,'need_called');const z=+ev.z;if(!validActual(z))return fail(op,d,'bad_actual');
    // FLOW-1: one toggle. A second tap of the same actual location clears it. A different cell replaces it.
    if(d.actual===z){d.actual=null;d.result=null;d.ip=null;}else d.actual=z;
    return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  if(op==='result'){if(d.mode==='bullpen')return fail(op,d,'no_result');if(!d.type)return fail(op,d,'need_type');if(!d.called.length)return fail(op,d,'need_called');if(d.actual==null)return fail(op,d,'need_actual');if(GAME_RESULTS.indexOf(ev.result)<0)return fail(op,d,'bad_result');d.result=ev.result;d.ip=ev.result==='inplay'?(ev.ip||null):null;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  if(op==='shake'){if(!d.type)return fail(op,d,'need_type');d.shook={type:d.type,called:d.called.slice(),norm:ev.norm||null,raw:ev.raw||null};d.type=null;d.called=[];d.actual=null;d.result=null;d.ip=null;d.aimEdit=false;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  if(op==='velo'){d.velo=ev.velo==null?null:ev.velo;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  if(op==='ip'){if(d.result!=='inplay')return fail(op,d,'need_result');d.ip=ev.ip||null;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  return fail(op,d,'bad_op');}
function scoreTap(draft,z){const d=clone(draft);if(d.aimEdit)return scoreApply(d,{op:'called',z});const step=scoreStep(d);
  if(step==='type')return{ok:false,reason:'need_type',step,draft:d,op:null};
  if(step==='called')return scoreApply(d,{op:'called',z});
  return scoreApply(d,{op:'actual',z});}
// The call step already copied a shake-off's original box onto called. Commit does not read shook.called.
function scoreCommit(d){d=clone(d);const boxes=d.called.slice();
  if(!boxes.length||!d.type||d.actual==null)return null;
  if(flowSteps(d.mode).indexOf('result')>=0&&!d.result)return null;
  if(scoreStep(d)!=='done')return null;
  const row={type:d.type,targets:boxes,loc:d.actual,actualLoc:d.actual,calledLoc:PC.nearestTarget(boxes,d.actual),result:d.mode==='bullpen'?null:d.result,ip:d.ip||null,shook:!!d.shook,velo:d.velo};
  if(d.actual_x!=null){row.actual_x=d.actual_x;row.actual_y=d.actual_y;row.xy_loc=d.xy_loc;}
  if(aimFlag(d.type,boxes))row.calledFlag=true;
  return row;}
// HM-9b. Box 5 warns for every type. Every other warned box is TYPE_MISS[type].warn. No type list lives here.
const BOX5_WARN='Box 5 is always scored as a missed spot';
function callWarn(type,z){
  z=+z;
  if(z===5)return true;
  const rule=PC.TYPE_MISS[type];
  return !!(rule&&Array.isArray(rule.warn)&&rule.warn.includes(z));
}
// Does not check validCalled: a refused change-up on 5 still gets the box 5 text here. Callers that show a stored aim go through callWarnOf.
function callWarnMsg(type,z,opt){
  if(!callWarn(type,z))return '';
  z=+z;
  const short=!!(opt&&opt.short);
  if(z===5)return short?'Box 5 = missed spot':BOX5_WARN;
  const name=PC.BASE_TYPES.find(t=>t.code===type).name.toLowerCase();
  if(PC.TOP_ROW.includes(z))return short?name+': not up':name+' is usually not aimed up';
  return short?name+': not middle':name+' is usually not aimed in the middle row';
}
// The aim is calledBoxes. The called type is calledTypeOf. A box that fails validCalled is kept and is not a soft warning.
function callWarnOf(p,opt){
  const type=PC.calledTypeOf(p);
  const boxes=PC.calledBoxes(p);
  for(let i=0;i<boxes.length;i++){
    if(!PC.validCalled(type,boxes[i]))continue;
    const msg=callWarnMsg(type,boxes[i],opt);
    if(msg)return msg;
  }
  return '';
}
// A live draft's called list is the aim until scoreCommit stores it. calledBoxes reads that list as targets.
function callWarnDraft(d,opt){
  d=d||{};
  const called=Array.isArray(d.called)?d.called.slice():[];
  return callWarnOf({type:d.type||'',calledType:d.type||'',targets:called,shook:!!d.shook,call:d.call||'',hand:d.hand||''},opt);
}
// The hard refusal wins. Otherwise the soft warning. {short:true} picks the short refusal and the short warning for the coach line.
function aimLine(d,opt){const note=aimNote(d,opt&&opt.short?'short':undefined);return note||callWarnDraft(d,opt);}
Object.assign(PC,{FLOW,GAME_RESULTS,flowSteps,flowLabel,scoreStep,scoreApply,scoreTap,scoreCommit,validCalled,validActual,aimFlag,aimNote,callWarn,callWarnMsg,callWarnOf,callWarnDraft,aimLine});
})(typeof window!=='undefined'?window:globalThis);
