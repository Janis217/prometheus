import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,place,startSimulation,stepSimulation,act} from '../../../src/main/resources/public/valerian/room-simulation.js';
import {scenarioDocument,parseScenario,runDocument} from '../../../src/main/resources/public/valerian/room-artifacts.js';
import {formatActionEvent} from '../../../src/main/resources/public/valerian/simulation-actions.js';
const spec={task:'inspect_room_for_printed_fire_indicator',specificationStatus:'reviewable',missionRevision:1};
function scenario(){
  const room=createRoom();place(room,'chair',3,3);place(room,'fire_picture',5,0);
  room.obstacleMoves=[{action:1,objectId:'object-1',x:1,y:0}];return room;
}
test('saved obstacle schedule blocks a planned move, replans, repeats and exports without changing the saved room',()=>{
  const room=parseScenario(JSON.stringify(scenarioDocument(scenario())));
  for(let repeat=0;repeat<2;repeat++){
    const run=startSimulation(room,spec),first=stepSimulation(run);
    assert.equal(first.response.code,'OBSTACLE_BLOCKED');
    assert.deepEqual(first.pose,{x:0,y:0,heading:1});
    assert.equal(first.worldChanges[0].status,'applied');
    assert.match(formatActionEvent(first),/Obstacle object-1 to \(1, 0\): applied/);
    for(let i=0;i<514&&run.phase==='running';i++)stepSimulation(run);
    assert.equal(run.phase,'completed');
    assert.ok(run.events.some(event=>event.action==='move'&&event.success&&event.pose.y>0));
    const report=runDocument(run);
    assert.deepEqual(report.initialRoom,room);
    assert.deepEqual(report.events[0].worldChanges,first.worldChanges);
    assert.equal(report.finalState.objects[0].x,1);
    assert.equal(room.objects[0].x,3);
  }
});
test('occupied scheduled destinations are recorded without overlapping robot or furniture',()=>{
  const room=scenario();room.obstacleMoves[0].x=0;
  const run=startSimulation(room,spec),first=act(run,'observe');
  assert.equal(first.worldChanges[0].status,'blocked');
  assert.equal(run.room.objects[0].x,3);
  room.obstacleMoves[0].x=5;
  assert.equal(act(startSimulation(room,spec),'observe').worldChanges[0].status,'blocked');
});
test('invalid imported schedules fail before execution; unscheduled legacy rooms still round-trip',()=>{
  const room=scenario(),move=room.obstacleMoves[0];
  for(const invalid of [null,{},Array(33).fill(move),[{...move,action:0}],[{...move,action:513}],
    [{...move,action:1.5}],[{...move,x:6}],[{...move,objectId:'object-2'}],[move,move]]){
    assert.throws(()=>scenarioDocument({...room,obstacleMoves:invalid}));
    assert.throws(()=>startSimulation({...room,obstacleMoves:invalid},spec));
  }
  const l=createRoom('l_shaped');place(l,'chair',2,2);
  assert.throws(()=>scenarioDocument({...l,obstacleMoves:[{...move,x:5,y:5}]}));
  delete room.obstacleMoves;
  assert.deepEqual(parseScenario(JSON.stringify(scenarioDocument(room))),room);
});
test('operator stop does not move obstacles and scheduled changes occur only at their action number',()=>{
  const room=scenario();room.obstacleMoves[0].action=2;
  const run=startSimulation(room,spec);
  assert.equal(act(run,'observe').worldChanges,undefined);
  assert.equal(act(run,'observe').worldChanges[0].status,'applied');
  const stopped=startSimulation(scenario(),spec);
  assert.equal(act(stopped,'stop').worldChanges,undefined);
  assert.equal(stopped.room.objects[0].x,3);
});
