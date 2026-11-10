import {headings,visibleCells} from './room-world.js';
export {shapes,headings,inside,createRoom,wallSlot,place,visibleCells} from './room-world.js';
import {createActionRequest} from './simulation-actions.js';
import {executeSimulationAction} from './simulation-action-executor.js';
const key=(x,y)=>`${x},${y}`;
export const defaultSimulationOptions = Object.freeze({version:1,searchGoal:'first',evidence:'photo',doors:'open_unlocked',stepLimit:512});
export function simulationOptions(input){
  if(input==null)return {...defaultSimulationOptions};
  if(input.version!==1||!['first','all'].includes(input.searchGoal)||!['photo','observation'].includes(input.evidence)
    ||!['open_unlocked','avoid_closed'].includes(input.doors)||!Number.isSafeInteger(input.stepLimit)||input.stepLimit<1||input.stepLimit>512)
    throw new Error('Choose valid simulation controls: first/all, photo/observation, door policy and a whole-number step limit from 1 to 512.');
  return {version:1,searchGoal:input.searchGoal,evidence:input.evidence,doors:input.doors,stepLimit:input.stepLimit};
}
export function startSimulation(room, specification, {beforeAction=null}={}) {
  if(beforeAction!==null&&typeof beforeAction!=='function')throw new Error('Simulation beforeAction must be a function.');
  if (!specification || specification.task !== 'inspect_room_for_printed_fire_indicator'
    || specification.specificationStatus !== 'reviewable') throw new Error('Complete and review a supported task first.');
  const bound = structuredClone(specification);
  bound.simulationOptions=simulationOptions(specification.simulationOptions);
  bound.room = {...bound.room,configuration:structuredClone(room),binding:'browser_local_snapshot'};
  bound.execution = {mode:'simulation_only',started:true,roomSimulatorReady:true};
  return {room:structuredClone(room), missionRevision:specification.missionRevision,
    roomRevision:room.revision, simulation:true, phase:'running', events:[], known:[], visited:[], photographed:[],
    observedObjects:[], findings:[], beforeAction, confirmed:[], failedDoors:[], avoidedDoors:[], scanned:{}, autonomousSteps:0,
    specification:bound, currentAction:'hold', sequence:0};
}
function observe(run) {
  const visible = visibleCells(run.room);
  for (const cell of visible) if (!run.known.includes(cell)) run.known.push(cell);
  const here = key(run.room.robot.x,run.room.robot.y);
  if (!run.visited.includes(here)) run.visited.push(here);
  run.scanned[here] ||= [];
  if(!run.scanned[here].includes(run.room.robot.heading))run.scanned[here].push(run.room.robot.heading);
  const objects=run.room.objects.filter(o => visible.has(key(o.x,o.y))).map(o => ({...o}));
  // Forget stale positions once the robot observes that cell empty or the object elsewhere.
  run.observedObjects=run.observedObjects.filter(object=>!visible.has(key(object.x,object.y))&&!objects.some(current=>current.id===object.id));
  run.observedObjects.push(...objects);
  return {visible:[...visible],objects};
}
export function executeAction(run,call) {
  if(run.phase!=='running')throw new Error('This simulation has finished. Start a new run.');
  const request=structuredClone(call),perception=observe(run),response=executeSimulationAction(run,request);
  if(response.status==='failed'&&!response.retryable)run.phase='failed';
  response.phaseAfter=run.phase;
  run.currentAction=request.function;
  const event={sequence:++run.sequence,trigger:request.trigger,perception,action:request.function,
    targetId:request.parameters.doorId||request.parameters.targetId||request.parameters.objectId||null,
    success:response.status==='succeeded',reason:response.message,result:structuredClone(response.data),
    call:request,response,pose:{...run.room.robot},simulation:true};
  event.perceptionAfter=observe(run);run.events.push(event);return event;
}
export function act(run,action,targetId,trigger='operator',context={}) {
  if(run.phase!=='running')throw new Error('This simulation has finished. Start a new run.');
  observe(run);
  return executeAction(run,createActionRequest(run,action,targetId,trigger,context));
}
// Search uses observed targets and known traversable cells, never a hidden target's coordinates.
export function stepSimulation(run) {
  if(run.phase!=='running')throw new Error('This simulation has finished. Start a new run.');
  const options=run.specification.simulationOptions;
  if(run.autonomousSteps>=options.stepLimit)
    return act(run,'stop',null,'simulation_tick',{reason:'step_limit'});
  run.autonomousSteps++;
  const perception=observe(run), robot=run.room.robot;
  if (run.confirmed.length&&options.searchGoal==='first') return act(run,'report_findings',null,'simulation_tick');
  const pending=run.observedObjects.filter(o => o.type==='fire_picture' && !run.confirmed.includes(o.id));
  const photo=pending.find(o=>perception.objects.some(seen=>seen.id===o.id)&&Math.abs(o.x-robot.x)+Math.abs(o.y-robot.y)<=1)||pending[0];
  if (photo && perception.objects.some(o=>o.id===photo.id) && Math.abs(photo.x-robot.x)+Math.abs(photo.y-robot.y)<=1)
    return act(run,options.evidence==='photo'?'take_photo':'record_observation',photo.id,'simulation_tick');
  const queue=[{x:robot.x,y:robot.y,path:[]}], seen=new Set([key(robot.x,robot.y)]);
  let route=null, explorationRoute=null;
  while (queue.length) {
    const cell=queue.shift();
    const goal = photo ? Math.abs(photo.x-cell.x)+Math.abs(photo.y-cell.y)<=1
      : !run.visited.includes(key(cell.x,cell.y)) || (run.room.smoke && (run.scanned[key(cell.x,cell.y)]||[]).length<4);
    if(cell.path.length && !explorationRoute && (!run.visited.includes(key(cell.x,cell.y))
      || (run.room.smoke && (run.scanned[key(cell.x,cell.y)]||[]).length<4)))explorationRoute=cell.path;
    if (cell.path.length && goal) {route=cell.path;break;}
    for (let h=0;h<4;h++) {
      const [dx,dy]=headings[h], x=cell.x+dx,y=cell.y+dy,k=key(x,y);
      const obstacle=run.observedObjects.find(o=>o.x===x&&o.y===y);
      const traversable=!obstacle || !['table','chair','door'].includes(obstacle.type)
        || (obstacle.type==='door' && (obstacle.open || (options.doors==='open_unlocked'&&!run.failedDoors.includes(obstacle.id))));
      if(obstacle?.type==='door'&&!obstacle.open&&options.doors==='avoid_closed'&&!run.avoidedDoors.includes(obstacle.id))run.avoidedDoors.push(obstacle.id);
      if (!seen.has(k) && run.known.includes(k) && traversable) {
        seen.add(k);queue.push({x,y,path:[...cell.path,h]});
      }
    }
  }
  if(!route)route=explorationRoute;
  // Scan all headings before leaving a smoke cell during exploration. Revisit
  // partially scanned cells if a target approach previously interrupted that scan.
  if(run.room.smoke && !photo && run.scanned[key(robot.x,robot.y)].length<4)
    return act(run,'turn',null,'simulation_tick');
  if (route) {
    if(robot.heading!==route[0])return act(run,'turn',null,'simulation_tick');
    const [dx,dy]=headings[robot.heading];
    const door=perception.objects.find(o=>o.type==='door'&&!o.open&&o.x===robot.x+dx&&o.y===robot.y+dy);
    return door ? act(run,'open_door',door.id,'simulation_tick') : act(run,'move',null,'simulation_tick');
  }
  if(run.confirmed.length){
    run.searchExhausted=true;
    const partial=!!(run.failedDoors.length||run.avoidedDoors.length||pending.length);
    return act(run,'report_findings',null,'simulation_tick',{coverage:'reachable_observed_cells',partial});
  }
  return act(run,'stop',null,'simulation_tick',{reason:run.avoidedDoors.length?'door_policy':run.failedDoors.length?'locked_doors':'search_exhausted'});
}
