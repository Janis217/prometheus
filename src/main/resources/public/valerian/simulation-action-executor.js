import {headings,inside,visibleCells,opaque} from './room-world.js';
import {actionProtocolVersion,directionNames,validateActionRequest,findingParameters} from './simulation-actions.js';

const outcome=(status,code,message,data={},retryable=false)=>({status,code,message,data,retryable});
const ok=(message,data={})=>outcome('succeeded','OK',message,data);
const blocked=(code,message,data={})=>outcome('blocked',code,message,data,true);
const invalid=message=>outcome('failed','INVALID_ARGUMENT',message);
const samePosition=(a,b)=>!!a&&!!b&&a.x===b.x&&a.y===b.y;
function sameData(a,b){
  if(a===b)return true;
  if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
  const keys=Object.keys(a),other=Object.keys(b);
  return keys.length===other.length&&keys.every(key=>Object.hasOwn(b,key)&&sameData(a[key],b[key]));
}
function targetFor(run,parameters){
  const id=parameters.doorId||parameters.targetId||parameters.objectId;
  const visible=visibleCells(run.room);
  return run.room.objects.find(object=>object.id===id&&visible.has(`${object.x},${object.y}`));
}
function changedTarget(target,parameters){return !samePosition(target,parameters.position);}
function evidence(run,p,photo){
  if((photo?'photo':'observation')!==run.specification.simulationOptions.evidence)
    return outcome('blocked','EVIDENCE_POLICY',photo?'Mission requests observation only; no photo captured.':'Mission requires photographic evidence.');
  const target=targetFor(run,p);
  if(!target||target.type!=='fire_picture')return blocked('TARGET_NOT_VISIBLE','No visible fire picture selected.');
  if(changedTarget(target,p))return blocked('TARGET_MOVED','Target moved after the action was planned.');
  if(!run.confirmed.includes(target.id))run.confirmed.push(target.id);
  if(photo&&!run.photographed.includes(target.id))run.photographed.push(target.id);
  if(!run.findings.some(finding=>finding.objectId===target.id))run.findings.push({objectId:target.id,type:'printed_fire_indicator',position:{x:target.x,y:target.y},
    evidence:photo?{type:'simulated_photo',photoId:`simulated-photo:${target.id}`}:{type:'observation'}});
  return ok(photo?'Simulated fire-indicator photo recorded.':'Simulated fire-indicator observation recorded; no photo captured.',
    {simulated:true,objectId:target.id,x:target.x,y:target.y,evidenceType:photo?'simulated_photo':'observation',...(photo?{photoId:`simulated-photo:${target.id}`}:{})});
}
// Each registered function owns its simulation checks and effects. No hardware is invoked.
const functions={
  observe(run){const visible=visibleCells(run.room);return ok('Current perception refreshed.',{visible:[...visible],objects:structuredClone(run.room.objects.filter(o=>visible.has(`${o.x},${o.y}`)))});},
  move(run,p){
    const robot=run.room.robot,direction=directionNames.indexOf(p.direction);
    if(direction<0||p.distanceMeters!==1||direction!==robot.heading)return invalid('Move requires the current heading and a one-metre distance.');
    if(!samePosition(robot,p.from))return blocked('POSE_CHANGED','Robot pose changed after the action was planned.');
    const [dx,dy]=headings[direction],to={x:robot.x+dx,y:robot.y+dy};
    if(!samePosition(to,p.to))return invalid('Move destination does not match its direction and distance.');
    if(opaque(run.room,to.x,to.y)){
      const obstacle=run.room.objects.find(o=>samePosition(o,to));
      return blocked(!inside(run.room,to.x,to.y)?'WALL_BLOCKED':obstacle?.type==='door'?'DOOR_CLOSED':'OBSTACLE_BLOCKED',
        'Wall, furniture or closed door blocks movement.',{attemptedPosition:to,obstacle:obstacle?{id:obstacle.id,type:obstacle.type,position:to}:null,distanceMovedMeters:0});
    }
    robot.x=to.x;robot.y=to.y;return ok('Moved one metre.',{position:to,direction:p.direction,distanceMovedMeters:1});
  },
  turn(run,p){
    const robot=run.room.robot;
    if(p.fromHeading!==directionNames[robot.heading])return blocked('POSE_CHANGED','Robot heading changed after the action was planned.');
    if(p.direction!=='clockwise'||p.angleDegrees!==90||p.toHeading!==directionNames[(robot.heading+1)%4])return invalid('Turn requires a clockwise 90-degree rotation.');
    robot.heading=(robot.heading+1)%4;return ok('Turned clockwise.',{heading:directionNames[robot.heading],angleDegrees:90});
  },
  open_door(run,p){
    if(p.force!==false)return invalid('Forcing doors is not supported.');
    if(run.specification.simulationOptions.doors==='avoid_closed')return outcome('blocked','DOOR_POLICY','Mission door policy forbids opening closed doors.');
    const target=targetFor(run,p),robot=run.room.robot;
    if(!target||target.type!=='door')return blocked('TARGET_NOT_VISIBLE','No perceived door selected.');
    if(changedTarget(target,p))return blocked('TARGET_MOVED','Door moved after the action was planned.');
    if(Math.abs(target.x-robot.x)+Math.abs(target.y-robot.y)>1)return blocked('OUT_OF_REACH','Door is out of reach.');
    if(target.locked&&!target.open){if(!run.failedDoors.includes(target.id))run.failedDoors.push(target.id);return blocked('DOOR_LOCKED','Door is locked.',{doorId:target.id,open:false,locked:true});}
    target.open=true;return ok('Door is open.',{doorId:target.id,open:true,locked:target.locked});
  },
  take_photo(run,p){return evidence(run,p,true);},
  record_observation(run,p){return evidence(run,p,false);},
  fetch(run,p){
    const target=targetFor(run,p),robot=run.room.robot;
    if(!target||!['chair','table'].includes(target.type)||Math.abs(target.x-robot.x)+Math.abs(target.y-robot.y)>1)return blocked('OUT_OF_REACH','Select visible furniture within reach.');
    if(changedTarget(target,p))return blocked('TARGET_MOVED','Object moved after the action was planned.');
    return outcome('not_implemented','NOT_IMPLEMENTED','Simulated manipulation is not implemented; no object or world state changed.',{objectId:target.id,worldChanged:false});
  },
  pick_up(run,p){return functions.fetch(run,p);},
  report_findings(run,p){
    const all=run.specification.simulationOptions.searchGoal==='all';
    const coverage=all?(run.searchExhausted?'reachable_observed_cells':'incomplete'):'first_finding';
    const partial=all&&(!run.searchExhausted||!!(run.failedDoors.length||run.avoidedDoors.length||run.observedObjects.some(o=>o.type==='fire_picture'&&!run.confirmed.includes(o.id))));
    if(p.missionId!==(run.specification.savedMission?.id||null)||p.missionRevision!==run.missionRevision||p.recipient!=='supervisor'
      ||!sameData(p.findings,findingParameters(run))||typeof p.partial!=='boolean'
      ||p.coverage!==coverage||p.partial!==partial)return invalid('Report parameters must match captured findings and actual search coverage.');
    if(!run.confirmed.length)return outcome('failed','NO_FINDINGS','No fire-indicator evidence captured.',{},true);
    run.phase=partial?'partial':'completed';
    let message=run.specification.simulationOptions.evidence==='photo'?'Reported simulated photographic evidence.':'Reported simulated observations; no photos captured.';
    if(partial)message+=' Search ended with limited coverage; partial results.';
    else if(p.coverage==='reachable_observed_cells')message+=' Search exhausted reachable observed cells; all reachable findings recorded.';
    return ok(message,{confirmed:[...run.confirmed],photos:[...run.photographed],findings:structuredClone(p.findings),recipient:p.recipient,coverage:p.coverage,partial});
  },
  stop(run,p){
    if(!['operator_requested','step_limit','search_exhausted','locked_doors','door_policy'].includes(p.reason))return invalid('Unknown stop reason.');
    let code='OPERATOR_STOP',message='Operator stopped the simulation.';run.phase='stopped';
    if(p.reason==='step_limit'){
      code='STEP_LIMIT';run.phase=run.confirmed.length?'partial':'blocked';message=`Autonomous step limit (${run.specification.simulationOptions.stepLimit}) reached; partial results: ${run.confirmed.length} findings. No completion claimed.`;
    }else if(p.reason!=='operator_requested'){
      run.phase=p.reason==='search_exhausted'?'not_found':'blocked';
      code=p.reason==='search_exhausted'?'SEARCH_EXHAUSTED':p.reason==='locked_doors'?'DOOR_LOCKED':'DOOR_POLICY';
      message=p.reason==='door_policy'?'Search limited by mission policy: closed doors avoided; no completion claimed.':p.reason==='locked_doors'?'Search blocked by locked doors; no target photo or completion claimed.':'Search exhausted reachable observed cells; no fire-indicator evidence found.';
    }
    return {...ok(message,{phase:run.phase,confirmed:[...run.confirmed],photos:[...run.photographed],findings:findingParameters(run),partial:run.phase==='partial'}),code};
  },
};
export function executeSimulationAction(run,input){
  const request=validateActionRequest(input,run.sequence),before={...run.room.robot};
  let response;
  try{
    // Trusted, synchronous scenario hook: update live obstacles or return a fault.
    // The action still checks the resulting world immediately before any effect.
    const fault=run.beforeAction?.({request:structuredClone(request),world:run.room});
    if(fault){
      if(fault.then||!['blocked','failed'].includes(fault.status)||typeof fault.code!=='string'||typeof fault.message!=='string')throw new Error('Invalid synchronous simulation fault.');
      response=outcome(fault.status,fault.code,fault.message,structuredClone(fault.data||{}),fault.retryable===true);
    }else response=functions[request.function](run,request.parameters);
  }catch(error){response=outcome('failed','EXECUTOR_ERROR',`Simulation executor failed: ${error.message}`);}
  return {schemaVersion:actionProtocolVersion,requestId:request.id,mode:'simulation',...response,poseBefore:before,poseAfter:{...run.room.robot},phaseAfter:run.phase};
}
