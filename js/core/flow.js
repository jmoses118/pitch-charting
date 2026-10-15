/* Thunder Elite pitch charting – flow.js: one scoring state machine for every mode.
   Pure logic (no DOM). Loads after calls.js and location.js, before game.js. validCalled is the only aim validator.
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
  return{mode:d.mode==='bullpen'?'bullpen':'game',type:d.type||null,called,
    actual:d.actual==null||!Number.isFinite(+d.actual)?null:+d.actual,
    result:d.result||null,ip:d.ip||null,
    shook:d.shook?{type:d.shook.type||null,called:(d.shook.called||[]).map(z=>+z).filter(z=>Number.isFinite(z)),norm:d.shook.norm||null,raw:d.shook.raw||null}:null,
    velo:d.velo==null?null:d.velo,aimEdit:!!d.aimEdit};}
function scoreStep(d){d=d||{};const steps=flowSteps(d.mode);
  if(!d.type)return 'type';
  if(!(d.called&&d.called.length))return 'called';
  if(d.actual==null)return 'actual';
  if(steps.indexOf('result')>=0&&!d.result)return 'result';
  return 'done';}
// RULE-3a: dirt, way off and the backstop are actual locations only. RULE-1: a change-up aim is 4, 7, 8, 9, 13, 14, 18.
function validCalled(type,z){z=+z;if(!PC.GRID_XY[z])return false;if(PC.isWay(z)||PC.isActualOnly(z))return false;if(!(PC.isZone(z)||PC.isOut(z)))return false;if(type==='CH'&&!(PC.CH_TARGETS||[]).includes(z))return false;return true;}
function validActual(z){return !!PC.GRID_XY[+z];}
function fail(op,d,reason){return{ok:false,op,draft:d,step:scoreStep(d),reason};}
function scoreApply(draft,ev){const d=clone(draft);ev=ev||{};const op=ev.op;
  if(op==='call'){d.type=ev.type||null;const raw=Array.isArray(ev.called)?ev.called:[];d.called=raw.map(z=>+z).filter(z=>validCalled(d.type,z));d.actual=null;d.result=null;d.ip=null;d.aimEdit=false;
    return{ok:!!d.type,op,draft:d,step:scoreStep(d),reason:d.type?null:'need_type'};}
  if(op==='called'){if(!d.type)return fail(op,d,'need_type');const z=+ev.z;if(!validCalled(d.type,z))return fail(op,d,'bad_target');d.called=[z];d.aimEdit=false;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
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
// RULE-3d: after a shake-off the called location is the box re-signaled with the final pitch.
// When she did not re-signal, the original box stands. The screen still requires the aim tap.
function scoreCommit(d){d=clone(d);const her=d.called.slice();const original=d.shook&&d.shook.called?d.shook.called.slice():[];const boxes=her.length?her:(d.shook?original:[]);
  if(!boxes.length||!d.type||d.actual==null)return null;
  if(flowSteps(d.mode).indexOf('result')>=0&&!d.result)return null;
  if(!d.shook&&scoreStep(d)!=='done')return null;
  if(d.shook&&her.length&&scoreStep(d)!=='done')return null;
  return{type:d.type,targets:boxes,loc:d.actual,actualLoc:d.actual,calledLoc:PC.nearestTarget(boxes,d.actual),result:d.mode==='bullpen'?null:d.result,ip:d.ip||null,shook:!!d.shook,velo:d.velo};}
Object.assign(PC,{FLOW,GAME_RESULTS,flowSteps,flowLabel,scoreStep,scoreApply,scoreTap,scoreCommit,validCalled,validActual});
})(typeof window!=='undefined'?window:globalThis);
