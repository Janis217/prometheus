import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,place,startSimulation,act,stepSimulation,executeAction} from '../../../src/main/resources/public/valerian/room-simulation.js';
import {createActionRequest,formatActionCall} from '../../../src/main/resources/public/valerian/simulation-actions.js';
import {runDocument} from '../../../src/main/resources/public/valerian/room-artifacts.js';
const spec={task:'inspect_room_for_printed_fire_indicator',specificationStatus:'reviewable',missionRevision:3,
  savedMission:{id:'mission-a',name:'Test',configuredRevision:3}};
function finish(run){for(let i=0;i<514&&run.phase==='running';i++)stepSimulation(run);return run;}

test('move and turn are correlated function calls with compass direction, distance and actual poses',()=>{
  const room=createRoom();room.robot={x:2,y:2,heading:1};const run=startSimulation(room,spec);
  for(const direction of ['east','south','west','north']){
    const moved=act(run,'move');
    assert.equal(moved.call.function,'move');assert.equal(moved.call.parameters.direction,direction);
    assert.equal(moved.call.parameters.distanceMeters,1);
    assert.deepEqual(moved.call.parameters.from,{x:moved.response.poseBefore.x,y:moved.response.poseBefore.y});
    assert.deepEqual(moved.call.parameters.to,{x:moved.pose.x,y:moved.pose.y});
    assert.equal(moved.response.requestId,moved.call.id);assert.equal(moved.response.status,'succeeded');
    assert.equal(moved.response.code,'OK');assert.equal(moved.response.mode,'simulation');
    assert.match(formatActionCall(moved.call),new RegExp(`move\\(direction="${direction}", distanceMeters=1`));
    const turned=act(run,'turn');assert.equal(turned.call.parameters.angleDegrees,90);assert.equal(turned.call.parameters.direction,'clockwise');
  }
  assert.deepEqual(room.robot,{x:2,y:2,heading:1});
});

test('door, wall and furniture failures are typed results with no movement',()=>{
  const room=createRoom();place(room,'door',1,0,{locked:true});const run=startSimulation(room,spec);
  const door=act(run,'open_door',room.objects[0].id);
  assert.deepEqual(door.call.parameters,{doorId:'object-1',position:{x:1,y:0},force:false});
  assert.equal(door.response.code,'DOOR_LOCKED');assert.equal(door.response.status,'blocked');
  const move=act(run,'move');assert.equal(move.response.code,'DOOR_CLOSED');assert.equal(move.response.data.distanceMovedMeters,0);
  assert.deepEqual(move.response.poseBefore,move.response.poseAfter);
  const wall=createRoom();wall.robot.heading=0;
  assert.equal(act(startSimulation(wall,spec),'move').response.code,'WALL_BLOCKED');
  const furniture=createRoom();place(furniture,'chair',1,0);
  assert.equal(act(startSimulation(furniture,spec),'move').response.code,'OBSTACLE_BLOCKED');
});

test('report findings consumes captured evidence positions and includes mission and recipient parameters',()=>{
  const room=createRoom();place(room,'fire_picture',1,0);const run=startSimulation(room,spec);
  const photo=act(run,'take_photo','object-1');assert.equal(photo.response.data.photoId,'simulated-photo:object-1');
  run.room.objects[0].x=5;run.room.objects[0].y=5; // Later world movement cannot rewrite the captured evidence.
  const request=createActionRequest(run,'report_findings',null,'test');
  request.parameters.findings=request.parameters.findings.map(({objectId,type,position,evidence})=>({position,evidence,type,objectId}));
  const report=executeAction(run,request);
  assert.equal(report.call.parameters.missionId,'mission-a');assert.equal(report.call.parameters.missionRevision,3);
  assert.equal(report.call.parameters.recipient,'supervisor');
  assert.deepEqual(report.call.parameters.findings[0].position,{x:1,y:0});
  assert.equal(report.call.parameters.findings[0].evidence.type,'simulated_photo');
  assert.deepEqual(report.response.data.findings,report.call.parameters.findings);
  assert.match(formatActionCall(report.call),/report_findings\(missionId="mission-a"/);
});

test('an obstacle moving into the path between planning and execution blocks that move and causes replanning',()=>{
  const room=createRoom();place(room,'chair',3,3);place(room,'fire_picture',5,0);
  let inserted=false;
  const run=startSimulation(room,spec,{beforeAction:({request,world})=>{
    if(request.function==='move'&&!inserted){inserted=true;Object.assign(world.objects[0],{x:1,y:0});}
  }});
  const first=stepSimulation(run);
  assert.equal(first.response.code,'OBSTACLE_BLOCKED');assert.equal(first.response.retryable,true);
  assert.deepEqual(first.call.parameters.to,{x:1,y:0});assert.deepEqual(first.pose,{x:0,y:0,heading:1});
  assert.ok(first.perceptionAfter.objects.some(object=>object.type==='chair'&&object.x===1&&object.y===0));
  finish(run);assert.equal(run.phase,'completed');
  assert.ok(run.events.some(event=>event.action==='move'&&event.success&&event.pose.y>0));
  assert.deepEqual(room.objects[0],{id:'object-1',type:'chair',x:3,y:3});
});

test('injected action faults are recorded and a non-retryable actuator failure stops the run',()=>{
  const room=createRoom();place(room,'fire_picture',5,0);
  const run=startSimulation(room,spec,{beforeAction:({request})=>request.function==='move'?{status:'failed',code:'ACTUATOR_FAULT',message:'Simulated wheel fault.',retryable:false}:null});
  const event=stepSimulation(run);assert.equal(event.response.code,'ACTUATOR_FAULT');
  assert.equal(event.response.status,'failed');assert.equal(run.phase,'failed');assert.equal(event.response.phaseAfter,'failed');
  assert.deepEqual(run.room.robot,room.robot);assert.throws(()=>stepSimulation(run),/finished/);
});

test('terminal step limit results are complete before logging and exports retain isolated request/result data',()=>{
  const room=createRoom();place(room,'fire_picture',1,0);
  const run=startSimulation(room,{...spec,simulationOptions:{version:1,searchGoal:'all',evidence:'observation',doors:'open_unlocked',stepLimit:1}});
  stepSimulation(run);const stopped=stepSimulation(run);
  assert.deepEqual(stopped.call.parameters,{reason:'step_limit'});assert.equal(stopped.response.code,'STEP_LIMIT');
  assert.equal(stopped.response.phaseAfter,'partial');assert.equal(stopped.response.data.findings.length,1);
  assert.equal(stopped.response.message,stopped.reason);assert.deepEqual(stopped.result,stopped.response.data);
  const report=runDocument(run);assert.equal(report.actionProtocolVersion,1);
  report.events[0].call.parameters.targetId='changed';assert.equal(run.events[0].call.parameters.targetId,'object-1');
});

test('invalid, replayed or fabricated calls cannot execute unreported movement or invented findings',()=>{
  const room=createRoom(),run=startSimulation(room,spec);
  const valid=createActionRequest(run,'move',null,'test');executeAction(run,valid);
  assert.throws(()=>executeAction(run,valid),/out-of-sequence/);
  const before={...run.room.robot},invalid=createActionRequest(run,'move',null,'test');invalid.parameters.distanceMeters=2;
  const rejected=executeAction(run,invalid);assert.equal(rejected.response.code,'INVALID_ARGUMENT');assert.deepEqual(run.room.robot,before);
  const other=startSimulation(room,spec),fake=createActionRequest(other,'report_findings',null,'test');fake.parameters.findings=[{objectId:'invented'}];
  assert.equal(executeAction(other,fake).response.code,'INVALID_ARGUMENT');
  const all=startSimulation(room,{...spec,simulationOptions:{version:1,searchGoal:'all',evidence:'photo',doors:'open_unlocked',stepLimit:512}});
  const badSchema=createActionRequest(all,'move',null,'test');badSchema.schemaVersion=2;
  assert.throws(()=>executeAction(all,badSchema),/Invalid or out-of-sequence/);assert.equal(all.sequence,0);
  place(all.room,'fire_picture',1,0);act(all,'take_photo','object-1');
  const falseComplete=createActionRequest(all,'report_findings',null,'test');falseComplete.parameters.coverage='first_finding';falseComplete.parameters.partial=false;
  assert.equal(executeAction(all,falseComplete).response.code,'INVALID_ARGUMENT');assert.notEqual(all.phase,'completed');
});

test('manipulation placeholders are explicit not-implemented functions, without pretend world effects',()=>{
  const room=createRoom();place(room,'chair',1,0);const run=startSimulation(room,spec);
  for(const name of ['fetch','pick_up']){
    const event=act(run,name,'object-1');assert.equal(event.call.parameters.objectId,'object-1');
    assert.equal(event.response.status,'not_implemented');assert.equal(event.response.data.worldChanged,false);assert.equal(event.success,false);
  }
  assert.deepEqual(run.room,room);
});

test('a target moving after planning rejects the stale call and permits a fresh observed call',()=>{
  const room=createRoom();place(room,'door',1,0);let moved=false;
  const run=startSimulation(room,spec,{beforeAction:({request,world})=>{
    if(request.function==='open_door'&&!moved){world.objects[0].x=0;world.objects[0].y=1;moved=true;}
  }});
  const stale=act(run,'open_door','object-1');
  assert.equal(stale.response.code,'TARGET_MOVED');assert.equal(stale.response.retryable,true);
  assert.equal(run.room.objects[0].open,false);assert.deepEqual(stale.call.parameters.position,{x:1,y:0});
  const fresh=act(run,'open_door','object-1');assert.equal(fresh.response.status,'succeeded');
  assert.deepEqual(fresh.call.parameters.position,{x:0,y:1});assert.equal(room.objects[0].open,false);
});

test('a throwing scenario hook produces a terminal auditable executor failure',()=>{
  const room=createRoom();const run=startSimulation(room,spec,{beforeAction(){throw new Error('Scenario fault');}});
  const event=act(run,'move');assert.equal(event.response.code,'EXECUTOR_ERROR');assert.equal(run.phase,'failed');
  assert.deepEqual(event.response.poseBefore,event.response.poseAfter);
  const report=runDocument(run);assert.equal(report.phase,'failed');assert.equal(report.events[0].response.requestId,event.call.id);
  assert.equal(report.events[0].response.message,'Simulation executor failed: Scenario fault');
});
