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
export function opaque(room,x,y) {
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
