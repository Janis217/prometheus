import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,place,startSimulation,stepSimulation} from '../../../src/main/resources/public/valerian/room-simulation.js';
import {validatedRoom,scenarioDocument,parseScenario,saveRoom,loadRoom,runDocument} from '../../../src/main/resources/public/valerian/room-artifacts.js';

test('portable scenarios preserve all template geometry, states and starting pose without binding a task',()=>{
  for(const shape of ['square','rectangle','l_shaped']){
    const room=createRoom(shape);room.smoke=true;place(room,'robot',0,1);room.robot.heading=3;
    place(room,'door',1,0,{locked:true,open:false});place(room,'door',2,0,{locked:false,open:true});
    place(room,'window',3,0);place(room,'picture',4,0);place(room,'fire_picture',5,0);place(room,'table',2,2);place(room,'chair',3,2);
    const document=scenarioDocument(room),restored=parseScenario(JSON.stringify(document));
    assert.deepEqual(restored,room);
    restored.objects[0].locked=false;
    assert.equal(room.objects[0].locked,true);
    assert.equal(document.specification,undefined);
  }
});

test('imports reject invalid geometry, collisions, IDs, states and unsupported schema',()=>{
  const original=createRoom();place(original,'door',1,0);place(original,'fire_picture',5,0);
  const mutations=[r=>r.width=999,r=>r.revision=-1,r=>r.shape='constructor',r=>r.shape=['square'],r=>r.smoke='true',
    r=>r.robot.heading=9,r=>r.robot.x=-1,r=>r.objects[0].locked='false',r=>r.objects[0].type='unknown',
    r=>r.objects[0].x=0,r=>r.objects[0].id='object-900',r=>r.objects[1].id=r.objects[0].id,
    r=>{r.objects[0].x=2;r.objects[0].y=2;},r=>r.schemaVersion=9,r=>r.objects.push(null)];
  for(const mutate of mutations){const bad=structuredClone(original);mutate(bad);assert.throws(()=>validatedRoom(bad));}
  assert.throws(()=>parseScenario('broken JSON'));
  assert.throws(()=>parseScenario(JSON.stringify({...scenarioDocument(original),version:2})));
  assert.throws(()=>parseScenario(' '.repeat(65537)));
});

test('import reconstructs only known room fields and cannot load run or approval data',()=>{
  const room=createRoom();room.ready=true;room.accessCode='not-a-real-code';room.robot.secret='ignored';
  const document=scenarioDocument(room);document.supervisorToken='ignored';
  const restored=parseScenario(JSON.stringify(document));
  assert.deepEqual(restored,createRoom());
  assert.throws(()=>parseScenario(JSON.stringify({format:'prometheus.room-run',version:1,room})));
});

test('browser drafts are isolated by mission instance and fail clearly without storage',()=>{
  const records=new Map(),storage={setItem:(k,v)=>records.set(k,v),getItem:k=>records.get(k)??null};
  const room=createRoom('rectangle');place(room,'fire_picture',5,0);
  saveRoom(storage,'agent-A',room);
  assert.deepEqual(loadRoom(storage,'agent-A'),room);
  assert.throws(()=>loadRoom(storage,'agent-B'),/No room/);
  assert.throws(()=>saveRoom(storage,null,room),/Connect/);
  assert.throws(()=>saveRoom({setItem(){throw new Error('quota');}},'agent-A',room),/Export/);
  assert.throws(()=>loadRoom({getItem(){throw new Error('denied');}},'agent-A'),/Import/);
});

test('run exports retain immutable initial layout, final state and perception/action outcomes',()=>{
  const room=createRoom();place(room,'door',1,0);place(room,'fire_picture',5,0);
  const spec={task:'inspect_room_for_printed_fire_indicator',specificationStatus:'reviewable',missionRevision:4};
  const run=startSimulation(room,spec);
  const ongoing=runDocument(run,{paused:true});assert.equal(ongoing.paused,true);assert.equal(ongoing.finished,false);
  for(let i=0;i<512&&run.phase==='running';i++)stepSimulation(run);
  const report=runDocument(run);
  assert.equal(report.phase,'completed');assert.equal(report.finished,true);assert.equal(report.operationalReady,false);
  assert.equal(report.initialRoom.objects[0].open,false);assert.equal(report.finalState.objects[0].open,true);
  assert.equal(report.summary.eventCount,run.events.length);assert.equal(report.summary.photos.length,1);
  assert.ok(report.events.some(e=>e.action==='open_door'&&e.success&&e.perception.objects.some(o=>o.type==='door')));
  const repeated=startSimulation(parseScenario(JSON.stringify(scenarioDocument(room))),spec);
  for(let i=0;i<512&&repeated.phase==='running';i++)stepSimulation(repeated);
  assert.deepEqual(repeated.events,run.events);
  report.events[0].pose.x=99;assert.notEqual(run.events[0].pose.x,99);
  assert.throws(()=>parseScenario(JSON.stringify(report)),/room scenario/);
});
