import {createRoom,inside,wallSlot} from './room-simulation.js';
import {actionProtocolVersion} from './simulation-actions.js';
import {obstacleMoves} from './room-world.js';

export const scenarioLimit=65536;
const types=new Set(['door','window','fire_picture','picture','chair','table']);
const wallTypes=new Set(['door','window','fire_picture','picture']);

// Reconstruct known fields instead of trusting imported dimensions, flags or extra properties.
export function validatedRoom(input){
  if(!input||input.schemaVersion!==1)throw new Error('Unsupported room schema.');
  const room=createRoom(input.shape);
  if(input.width!==room.width||input.height!==room.height)throw new Error('Room dimensions do not match the template.');
  if(!Number.isSafeInteger(input.revision)||input.revision<0||input.revision>1000000)throw new Error('Invalid room revision.');
  if(typeof input.smoke!=='boolean')throw new Error('Smoke must be enabled or disabled.');
  const robot=input.robot;
  if(!robot||!inside(room,robot.x,robot.y)||!Number.isInteger(robot.heading)||robot.heading<0||robot.heading>3)
    throw new Error('Invalid robot starting position or direction.');
  if(!Array.isArray(input.objects)||input.objects.length>room.width*room.height)throw new Error('Invalid room objects.');
  const ids=new Set(),slots=new Set([`${robot.x},${robot.y}`]);
  for(const item of input.objects){
    if(!item||!types.has(item.type)||!inside(room,item.x,item.y))throw new Error('Invalid room object or position.');
    if(typeof item.id!=='string'||!/^object-[1-9][0-9]{0,6}$/.test(item.id)||Number(item.id.slice(7))>input.revision||ids.has(item.id))
      throw new Error('Object IDs must be unique and match the room revision.');
    const slot=`${item.x},${item.y}`;
    if(slots.has(slot))throw new Error('Objects and robot start must occupy different slots.');
    if(wallTypes.has(item.type)&&!wallSlot(room,item.x,item.y))throw new Error('Doors, windows and pictures need wall slots.');
    const object={id:item.id,type:item.type,x:item.x,y:item.y};
    if(item.type==='door'){
      if(typeof item.locked!=='boolean'||typeof item.open!=='boolean')throw new Error('Door states must be enabled or disabled.');
      Object.assign(object,{locked:item.locked,open:item.open});
    }
    room.objects.push(object);ids.add(item.id);slots.add(slot);
  }
  const moves=obstacleMoves(room,input.obstacleMoves);
  return {...room,revision:input.revision,smoke:input.smoke,robot:{x:robot.x,y:robot.y,heading:robot.heading},
    ...(moves.length?{obstacleMoves:moves}:{})};
}

export function scenarioDocument(room){
  return {format:'prometheus.room-scenario',version:1,room:validatedRoom(room)};
}
export function parseScenario(text){
  if(typeof text!=='string'||new TextEncoder().encode(text).length>scenarioLimit)throw new Error('Room files must be at most 64 KB.');
  let document;
  try{document=JSON.parse(text);}catch{throw new Error('Choose a valid room JSON file.');}
  if(!document||document.format!=='prometheus.room-scenario'||document.version!==1)
    throw new Error('Choose a version 1 room scenario, not a run report.');
  return validatedRoom(document.room);
}

export function roomStorageKey(agentId){
  return typeof agentId==='string'&&agentId ? `prometheus.room-draft.v1:${encodeURIComponent(agentId)}` : null;
}
export function saveRoom(storage,agentId,room){
  const key=roomStorageKey(agentId);
  if(!key)throw new Error('Connect to a mission agent before saving a room.');
  const text=JSON.stringify(scenarioDocument(room));
  try{storage.setItem(key,text);}catch{throw new Error('Browser storage is unavailable. Export the room to a file instead.');}
}
export function loadRoom(storage,agentId){
  const key=roomStorageKey(agentId);
  if(!key)throw new Error('Connect to a mission agent before loading a room.');
  let text;
  try{text=storage.getItem(key);}catch{throw new Error('Browser storage is unavailable. Import a room file instead.');}
  if(text===null)throw new Error('No room has been saved for this mission instance.');
  return parseScenario(text);
}

export function runDocument(run,{paused=false}={}){
  if(!run||!run.specification?.room?.configuration)throw new Error('Start a simulation before exporting its run.');
  return {format:'prometheus.room-run',version:1,simulator:'room-grid-v1',actionProtocolVersion,simulation:true,operationalReady:false,
    exportedAt:new Date().toISOString(),phase:run.phase,paused:run.phase==='running'&&paused,
    finished:run.phase!=='running',missionRevision:run.missionRevision,roomRevision:run.roomRevision,
    specification:structuredClone(run.specification),initialRoom:validatedRoom(run.specification.room.configuration),
    finalState:{robot:{...run.room.robot},smoke:run.room.smoke,objects:structuredClone(run.room.objects)},
    summary:{eventCount:run.events.length,autonomousSteps:run.autonomousSteps,photos:[...run.photographed],findings:[...run.confirmed]},
    events:structuredClone(run.events)};
}
