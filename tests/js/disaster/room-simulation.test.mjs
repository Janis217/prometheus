import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,place,inside,visibleCells,startSimulation,act,stepSimulation} from '../../../src/main/resources/public/valerian/room-simulation.js';
const specification={task:'inspect_room_for_printed_fire_indicator',specificationStatus:'reviewable',missionRevision:2};

test('all templates enforce boundaries, wall slots and occupied/robot slots',()=>{
  for(const shape of ['square','rectangle','l_shaped']){
    const room=createRoom(shape);
    assert.throws(()=>place(room,'chair',-1,0));
    assert.throws(()=>place(room,'table',0,0));
    assert.throws(()=>place(room,'window',2,2));
    place(room,'door',1,0,{locked:true});place(room,'door',2,0,{open:true});
    place(room,'window',3,0);place(room,'fire_picture',4,0);place(room,'picture',5,0);
    place(room,'table',2,2);place(room,'chair',1,2);place(room,'robot',0,1);
    assert.equal(room.objects.length,7);
    assert.throws(()=>place(room,'chair',2,2));
    if(shape==='l_shaped')assert.equal(inside(room,6,6),false);
  }
});
test('smoke exposes only the robot cell and one cell ahead, rotated with heading',()=>{
  const room=createRoom();room.smoke=true;
  assert.deepEqual([...visibleCells(room)].sort(),['0,0','1,0']);
  room.robot.heading=2;
  assert.deepEqual([...visibleCells(room)].sort(),['0,0','0,1']);
});
test('L-shaped walls and furniture occlude targets in clear air',()=>{
  const room=createRoom('l_shaped');room.robot={x:6,y:2,heading:2};
  assert.equal(visibleCells(room).has('2,6'),false);
  const flat=createRoom();place(flat,'table',1,0);
  assert.equal(visibleCells(flat).has('2,0'),false);
  assert.equal(visibleCells(flat).has('1,0'),true);
});
test('locked-door failure, unlock-free open-door success, and movement share world state',()=>{
  const room=createRoom();place(room,'door',1,0,{locked:true});
  const run=startSimulation(room,specification), id=room.objects[0].id;
  assert.equal(act(run,'open_door',id).success,false);
  assert.match(run.events.at(-1).reason,/locked/);
  assert.equal(act(run,'move').success,false);
  assert.deepEqual(run.room.robot,room.robot);
  const unlocked=createRoom();place(unlocked,'door',1,0);
  const run2=startSimulation(unlocked,specification);
  assert.equal(act(run2,'open_door',unlocked.objects[0].id).success,true);
  assert.equal(act(run2,'move').success,true);
  assert.equal(run2.room.robot.x,1);
  assert.equal(unlocked.objects[0].open,false); // run owns a snapshot
});
test('unseen targets cannot be photographed or manipulated through supplied ids',()=>{
  const room=createRoom();room.smoke=true;place(room,'fire_picture',5,0);
  const run=startSimulation(room,specification);
  assert.equal(act(run,'take_photo',room.objects[0].id).success,false);
  assert.equal(act(run,'report_findings').success,false);
  assert.equal(run.phase,'running');
});
test('autonomous clear-air run approaches a visible indicator and reports matching evidence',()=>{
  const room=createRoom();place(room,'fire_picture',5,0);
  const run=startSimulation(room,specification);
  for(let i=0;i<80&&run.phase==='running';i++)stepSimulation(run);
  assert.equal(run.phase,'completed');
  assert.ok(run.events.some(e=>e.action==='move'));
  const photo=run.events.find(e=>e.action==='take_photo');
  assert.equal(photo.result.objectId,room.objects[0].id);
  assert.equal(run.events.at(-1).action,'report_findings');
  assert.throws(()=>act(run,'move'));
});
test('smoke search completes within a bounded small room and no-target search stops',()=>{
  const room=createRoom();room.smoke=true;place(room,'fire_picture',5,0);
  const run=startSimulation(room,specification);
  for(let i=0;i<500&&run.phase==='running';i++)stepSimulation(run);
  assert.equal(run.phase,'completed');
  const empty=startSimulation(createRoom(),specification);
  for(let i=0;i<500&&empty.phase==='running';i++)stepSimulation(empty);
  assert.equal(empty.phase,'not_found');
  assert.equal(empty.photographed.length,0);
});

test('autonomous execution opens an unlocked door without manual action',()=>{
  const room=createRoom();place(room,'door',1,0);place(room,'fire_picture',5,0);
  const run=startSimulation(room,specification);
  for(let i=0;i<512&&run.phase==='running';i++)stepSimulation(run);
  assert.equal(run.phase,'completed');
  assert.ok(run.events.some(e=>e.action==='open_door'&&e.success&&e.trigger==='simulation_tick'));
  assert.equal(room.objects.find(o=>o.type==='door').open,false);
});

test('smoke search finds a target behind the start and terminates when a locked door encloses the robot',()=>{
  const room=createRoom();room.smoke=true;place(room,'robot',4,4);place(room,'fire_picture',0,5);
  const run=startSimulation(room,specification);
  for(let i=0;i<512&&run.phase==='running';i++)stepSimulation(run);
  assert.equal(run.phase,'completed');
  const blocked=createRoom();blocked.smoke=true;
  place(blocked,'door',1,0,{locked:true});place(blocked,'table',0,1);place(blocked,'fire_picture',5,0);
  const enclosed=startSimulation(blocked,specification);
  for(let i=0;i<512&&enclosed.phase==='running';i++)stepSimulation(enclosed);
  assert.equal(enclosed.phase,'blocked');
  assert.equal(enclosed.photographed.length,0);
  assert.equal(enclosed.events.filter(e=>e.action==='open_door').length,1);
  assert.match(enclosed.events.at(-1).reason,/locked doors/);
});
test('incomplete and unsupported specifications do not start simulation',()=>{
  assert.throws(()=>startSimulation(createRoom(),null));
  assert.throws(()=>startSimulation(createRoom(),{...specification,specificationStatus:'needs_clarification'}));
});
