/* Thunder Elite pitch charting – flow.js: one scoring state machine for every mode.
   Pure logic (no DOM). Loads after calls.js (canAim, GRID_XY, nearestTarget) and before game.js.
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
    // prevType / prevCalled stay on the shake so Cancel can put the call back. They are not a second shake object.
    shook:d.shook?{type:d.shook.type||null,called:(d.shook.called||d.shook.targets||[]).map(z=>+z).filter(z=>Number.isFinite(z)),norm:d.shook.norm||null,raw:d.shook.raw||null,prevType:d.shook.prevType||d.shook.type||null,prevCalled:(d.shook.prevCalled||d.shook.called||d.shook.targets||[]).map(z=>+z).filter(z=>Number.isFinite(z))}:null,
    velo:d.velo==null?null:d.velo,aimEdit:!!d.aimEdit};}
function scoreStep(d){d=d||{};const steps=flowSteps(d.mode);
  if(!d.type)return 'type';
  if(!(d.called&&d.called.length))return 'called';
  if(d.actual==null)return 'actual';
  if(steps.indexOf('result')>=0&&!d.result)return 'result';
  return 'done';}
// Dirt, way off and backstop are legal called spots so a pitch aimed there can be a hit.
// Change-up high zone/ring boxes stay illegal. Band setup still uses canAim (zone and ring only).
function validCalled(type,z){z=+z;if(!PC.GRID_XY[z])return false;if(PC.isWay(z)||PC.isActualOnly(z))return true;return PC.canAim(type,z);}
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
  if(op==='shake'){if(!d.type)return fail(op,d,'need_type');d.shook={type:d.type,called:d.called.slice(),norm:ev.norm||null,raw:ev.raw||null,prevType:d.type,prevCalled:d.called.slice()};d.type=null;d.called=[];d.actual=null;d.result=null;d.ip=null;d.aimEdit=false;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  if(op==='velo'){d.velo=ev.velo==null?null:ev.velo;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  if(op==='ip'){if(d.result!=='inplay')return fail(op,d,'need_result');d.ip=ev.ip||null;return{ok:true,op,draft:d,step:scoreStep(d),reason:null};}
  return fail(op,d,'bad_op');}
function scoreTap(draft,z){const d=clone(draft);if(d.aimEdit)return scoreApply(d,{op:'called',z});const step=scoreStep(d);
  if(step==='type')return{ok:false,reason:'need_type',step,draft:d,op:null};
  if(step==='called')return scoreApply(d,{op:'called',z});
  return scoreApply(d,{op:'actual',z});}
// One writer for targets (her called spots), loc / actualLoc, and calledLoc.
// A shake-off's calledLoc is the coach's box nearest the landing, never her aim.
function scoreCommit(d){d=clone(d);if(scoreStep(d)!=='done')return null;const her=d.called.slice();const coach=d.shook?(d.shook.called||[]):her;const pool=coach.length?coach:her;
  return{type:d.type,targets:her,loc:d.actual,actualLoc:d.actual,calledLoc:PC.nearestTarget(pool,d.actual),result:d.mode==='bullpen'?null:d.result,ip:d.ip||null,shook:!!d.shook,velo:d.velo};}
Object.assign(PC,{FLOW,GAME_RESULTS,flowSteps,flowLabel,scoreStep,scoreApply,scoreTap,scoreCommit,validCalled,validActual});
})(typeof window!=='undefined'?window:globalThis);
