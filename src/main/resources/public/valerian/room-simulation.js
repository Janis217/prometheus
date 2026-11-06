// Deterministic, browser-local demonstration. No hardware or provider calls.
export const shapes = {square:[6,6], rectangle:[8,5], l_shaped:[8,8]};
export const headings = [[0,-1],[1,0],[0,1],[-1,0]];
const wallTypes = new Set(['door','window','fire_picture','picture']);
const key = (x,y) => `${x},${y}`;
export function inside(room,x,y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < room.width && y < room.height
    && !(room.shape === 'l_shaped' && x >= 4 && y >= 4);
}
export function createRoom(shape = 'square') {
  if (typeof shape!=='string'||!Object.hasOwn(shapes,shape)) throw new Error('Choose a supported room shape.');
  const [width,height] = shapes[shape];
  return {schemaVersion:1, revision:0, shape, width, height, smoke:false, objects:[], robot:{x:0,y:0,heading:1}};
}
export function wallSlot(room,x,y) {
  return inside(room,x,y) && headings.some(([dx,dy]) => !inside(room,x+dx,y+dy));
}
export function place(room,type,x,y, options = {}) {
  if (!['robot','chair','table',...wallTypes].includes(type)) throw new Error('Unknown object.');
  if (!inside(room,x,y)) throw new Error('Place objects inside the room.');
  if (wallTypes.has(type) && !wallSlot(room,x,y)) throw new Error('Choose a wall slot.');
  if (room.objects.some(item => item.x === x && item.y === y)) throw new Error('This slot is occupied.');
  if (type !== 'robot' && room.robot.x === x && room.robot.y === y) throw new Error('Move the robot first.');
  if (type === 'robot') room.robot = {x,y,heading:room.robot.heading};
  else room.objects.push({id:`object-${room.revision+1}`,type,x,y,
    ...(type === 'door' ? {locked:!!options.locked,open:!!options.open} : {})});
  room.revision++;
}
function opaque(room,x,y) {
  return !inside(room,x,y) || room.objects.some(o => o.x === x && o.y === y
    && (o.type === 'table' || o.type === 'chair' || (o.type === 'door' && !o.open)));
}
// Grid ray traversal makes corners/walls opaque and uses the same geometry as movement.
function lineOfSight(room,from,to) {
  const dx = to.x-from.x, dy = to.y-from.y, steps = Math.max(Math.abs(dx),Math.abs(dy))*4;
  let previous = from;
  for (let i=1; i<=steps; i++) {
    const cell = {x:Math.round(from.x+dx*i/steps),y:Math.round(from.y+dy*i/steps)};
    if (cell.x !== previous.x && cell.y !== previous.y
      && (opaque(room,previous.x,cell.y) || opaque(room,cell.x,previous.y))) return false;
    if (cell.x === to.x && cell.y === to.y) return true;
    if (opaque(room,cell.x,cell.y)) return false;
    previous = cell;
  }
  return true;
}
export function visibleCells(room) {
  const pose = room.robot, cells = [key(pose.x,pose.y)];
  const [dx,dy] = headings[pose.heading];
  if (room.smoke) {
    if (inside(room,pose.x+dx,pose.y+dy)) cells.push(key(pose.x+dx,pose.y+dy));
    return new Set(cells);
  }
  for (let y=0;y<room.height;y++) for (let x=0;x<room.width;x++)
    if (inside(room,x,y) && lineOfSight(room,pose,{x,y})) cells.push(key(x,y));
  return new Set(cells);
}
export function startSimulation(room, specification) {
  if (!specification || specification.task !== 'inspect_room_for_printed_fire_indicator'
    || specification.specificationStatus !== 'reviewable') throw new Error('Complete and review a supported task first.');
  const bound = structuredClone(specification);
  bound.room = {...bound.room,configuration:structuredClone(room),binding:'browser_local_snapshot'};
  bound.execution = {mode:'simulation_only',started:true,roomSimulatorReady:true};
  return {room:structuredClone(room), missionRevision:specification.missionRevision,
    roomRevision:room.revision, simulation:true, phase:'running', events:[], known:[], visited:[], photographed:[],
    observedObjects:[], failedDoors:[], scanned:{}, autonomousSteps:0,
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
  for(const object of objects){
    run.observedObjects=run.observedObjects.filter(o=>o.id!==object.id);
    run.observedObjects.push({...object});
  }
  return {visible:[...visible],objects};
}
export function act(run, action, targetId, trigger = 'operator') {
  if (run.phase !== 'running') throw new Error('This simulation has finished. Start a new run.');
  const perception = observe(run), robot = run.room.robot, [dx,dy] = headings[robot.heading];
  const target = perception.objects.find(o => o.id === targetId);
  let success = false, reason = '', result = null;
  switch (action) {
    case 'turn': robot.heading = (robot.heading+1)%4; success = true; reason = 'Turned clockwise.'; break;
    case 'move': {
      const x = robot.x+dx, y = robot.y+dy;
      success = !opaque(run.room,x,y);
      if (success) {robot.x=x;robot.y=y;}
      reason = success ? 'Moved one metre.' : 'Wall, furniture or closed door blocks movement.'; break;
    }
    case 'open_door':
      if (!target || target.type !== 'door') reason = 'No perceived door selected.';
      else if (Math.abs(target.x-robot.x)+Math.abs(target.y-robot.y)>1) reason = 'Door is out of reach.';
      else if (target.locked && !target.open) {
        reason = 'Door is locked.';
        if(!run.failedDoors.includes(target.id))run.failedDoors.push(target.id);
      }
      else {run.room.objects.find(o => o.id === targetId).open=true;success=true;reason='Door is open.';}
      break;
    case 'take_photo':
      if (!target || target.type !== 'fire_picture') reason = 'No visible fire picture selected.';
      else {success=true;result={simulated:true,objectId:target.id,x:target.x,y:target.y};
        if (!run.photographed.includes(target.id)) run.photographed.push(target.id);
        reason='Simulated fire-indicator photo recorded.';}
      break;
    case 'fetch': case 'pick_up':
      success=!!target && ['chair','table'].includes(target.type)
        && Math.abs(target.x-robot.x)+Math.abs(target.y-robot.y)<=1;
      reason=success ? 'Pretend action acknowledged; no physical manipulation or world change.' : 'Select visible furniture within reach.'; break;
    case 'report_findings':
      success=run.photographed.length>0;
      reason=success ? 'Reported simulated photographic evidence.' : 'No fire-indicator photo captured.';
      if (success) run.phase='completed'; break;
    case 'stop': success=true;reason='Operator stopped the simulation.';run.phase='stopped';break;
    case 'observe': success=true;reason='Current perception refreshed.';break;
    default: throw new Error('Unsupported simulation action.');
  }
  run.currentAction=action;
  const event={sequence:++run.sequence,trigger,perception,action,targetId:targetId||null,success,reason,result,
    pose:{...robot},simulation:true};
  run.events.push(event); observe(run); return event;
}
// Search uses observed targets and known traversable cells, never a hidden target's coordinates.
export function stepSimulation(run) {
  if(run.phase!=='running')throw new Error('This simulation has finished. Start a new run.');
  if(++run.autonomousSteps>512){
    const event=act(run,'stop',null,'simulation_tick');run.phase='blocked';
    event.reason='Autonomous step limit reached; no completion claimed.';return event;
  }
  const perception=observe(run), robot=run.room.robot;
  const photo=run.observedObjects.find(o => o.type==='fire_picture' && !run.photographed.includes(o.id));
  if (photo && perception.objects.some(o=>o.id===photo.id) && Math.abs(photo.x-robot.x)+Math.abs(photo.y-robot.y)<=1)
    return act(run,'take_photo',photo.id,'simulation_tick');
  if (run.photographed.length) return act(run,'report_findings',null,'simulation_tick');
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
        || (obstacle.type==='door' && (obstacle.open || !run.failedDoors.includes(obstacle.id)));
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
  {
    const event=act(run,'stop',null,'simulation_tick');
    run.phase=run.failedDoors.length?'blocked':'not_found';
    event.reason=run.failedDoors.length?'Search blocked by locked doors; no target photo or completion claimed.'
      :'Search exhausted reachable observed cells; no target photo found.';
    return event;
  }
}
