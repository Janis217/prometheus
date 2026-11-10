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

test('mission controls change first/all goal and photo/observation evidence in the same room',()=>{
  const room=createRoom();place(room,'fire_picture',1,0);place(room,'fire_picture',5,5);
  function execute(options){
    const run=startSimulation(room,{...specification,simulationOptions:{version:1,searchGoal:'first',evidence:'photo',doors:'open_unlocked',stepLimit:512,...options}});
    for(let i=0;i<514&&run.phase==='running';i++)stepSimulation(run);
    return run;
  }
  const first=execute({}),all=execute({searchGoal:'all'}),observed=execute({searchGoal:'all',evidence:'observation'});
  assert.equal(first.phase,'completed');assert.equal(first.confirmed.length,1);
  assert.equal(all.phase,'completed');assert.equal(all.confirmed.length,2);assert.equal(all.photographed.length,2);
  assert.equal(observed.phase,'completed');assert.equal(observed.confirmed.length,2);assert.equal(observed.photographed.length,0);
  assert.equal(observed.events.some(e=>e.action==='take_photo'),false);
  assert.ok(observed.events.some(e=>e.action==='record_observation'));
  assert.ok(all.autonomousSteps>first.autonomousSteps);
  assert.deepEqual(room.robot,{x:0,y:0,heading:1});
});

test('door policy changes route/actions while leaving saved room unchanged',()=>{
  const room=createRoom();place(room,'door',1,0);place(room,'fire_picture',5,0);
  const execute=doors=>{
    const run=startSimulation(room,{...specification,simulationOptions:{version:1,searchGoal:'first',evidence:'photo',doors,stepLimit:512}});
    for(let i=0;i<514&&run.phase==='running';i++)stepSimulation(run);
    return run;
  };
  const open=execute('open_unlocked'),avoid=execute('avoid_closed');
  assert.equal(open.phase,'completed');assert.equal(avoid.phase,'completed');
  assert.ok(open.events.some(e=>e.action==='open_door'));
  assert.equal(avoid.events.some(e=>e.action==='open_door'),false);
  assert.ok(avoid.events.some(e=>e.action==='move'&&e.pose.y>0));
  assert.equal(room.objects[0].open,false);
});

test('step limit reports partial findings and rejects invalid or unsupported instructions',()=>{
  const room=createRoom();place(room,'fire_picture',1,0);place(room,'fire_picture',5,5);
  const options={version:1,searchGoal:'all',evidence:'photo',doors:'open_unlocked',stepLimit:1};
  const run=startSimulation(room,{...specification,simulationOptions:options});
  stepSimulation(run);stepSimulation(run);
  assert.equal(run.autonomousSteps,1);assert.equal(run.phase,'partial');assert.equal(run.confirmed.length,1);
  assert.match(run.events.at(-1).reason,/partial results: 1/);
  for(const change of [{version:2},{searchGoal:'any'},{evidence:'thermal'},{doors:'force'},{stepLimit:0},{stepLimit:513},{stepLimit:1.5},{stepLimit:'20'}])
    assert.throws(()=>startSimulation(room,{...specification,simulationOptions:{...options,...change}}));
});

test('all-goal reports constrained coverage as partial and avoid-door policy can block search',()=>{
  const room=createRoom();place(room,'fire_picture',0,1);place(room,'door',1,0);place(room,'table',1,1);
  const options={version:1,searchGoal:'all',evidence:'observation',doors:'avoid_closed',stepLimit:512};
  const run=startSimulation(room,{...specification,simulationOptions:options});
  for(let i=0;i<514&&run.phase==='running';i++)stepSimulation(run);
  assert.equal(run.phase,'partial');assert.equal(run.confirmed.length,1);assert.match(run.events.at(-1).reason,/partial results/);
  assert.equal(run.events.some(e=>e.action==='open_door'),false);
  const enclosed=createRoom();place(enclosed,'door',1,0);place(enclosed,'table',0,1);
  const blocked=startSimulation(enclosed,{...specification,simulationOptions:options});
  for(let i=0;i<514&&blocked.phase==='running';i++)stepSimulation(blocked);
  assert.equal(blocked.phase,'blocked');assert.match(blocked.events.at(-1).reason,/closed doors avoided/);
});

test('manual early report cannot claim all-goal completion',()=>{
  const room=createRoom();place(room,'fire_picture',1,0);place(room,'fire_picture',5,5);
  const run=startSimulation(room,{...specification,simulationOptions:{version:1,searchGoal:'all',evidence:'photo',doors:'open_unlocked',stepLimit:512}});
  stepSimulation(run);const event=act(run,'report_findings');
  assert.equal(run.phase,'partial');assert.equal(event.result.partial,true);
  assert.equal(event.result.confirmed.length,1);
});

test('first-goal stops after exactly one finding even with two adjacent pictures',()=>{
  const room=createRoom();place(room,'fire_picture',1,0);place(room,'fire_picture',0,1);
  const run=startSimulation(room,specification);
  for(let i=0;i<5&&run.phase==='running';i++)stepSimulation(run);
  assert.equal(run.phase,'completed');assert.equal(run.photographed.length,1);
});
