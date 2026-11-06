import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,place} from '../../../src/main/resources/public/valerian/room-simulation.js';
import {libraryKey,listLibraryRooms,loadLibraryRoom,saveLibraryRoom} from '../../../src/main/resources/public/valerian/room-library.js';

function store(){const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};}
test('independent named rooms restore geometry, states and pose and preserve immutable revisions',()=>{
  const storage=store(),room=createRoom('l_shaped');
  place(room,'robot',0,1);room.robot.heading=3;room.smoke=true;
  place(room,'door',1,0,{locked:true,open:false});place(room,'door',2,0,{locked:false,open:true});
  place(room,'window',3,0);place(room,'picture',4,0);place(room,'fire_picture',5,0);place(room,'table',2,2);place(room,'chair',3,2);
  const first=saveLibraryRoom(storage,{name:'Training A',room});
  saveLibraryRoom(storage,{name:'Training B',room:createRoom('rectangle')});
  assert.equal(listLibraryRooms(storage).length,2);
  assert.deepEqual(loadLibraryRoom(storage,first.id).room,room);
  const original=structuredClone(room);room.smoke=false;room.objects[0].locked=false;room.revision++;
  const next=saveLibraryRoom(storage,{id:first.id,expectedRevision:1,name:'Training A updated',room});
  assert.equal(next.id,first.id);assert.equal(next.revision,2);
  assert.deepEqual(loadLibraryRoom(storage,first.id,1).room,original);
  assert.deepEqual(loadLibraryRoom(storage,first.id).room,room);
  next.room.robot.x=99;assert.equal(loadLibraryRoom(storage,first.id).room.robot.x,0);
});
test('invalid saves and stale editors never overwrite saved versions',()=>{
  const storage=store(),room=createRoom();
  const first=saveLibraryRoom(storage,{name:'A',room});
  const before=storage.getItem(libraryKey);
  for(const name of ['', ' '.repeat(3),'x'.repeat(81)])assert.throws(()=>saveLibraryRoom(storage,{name,room}));
  assert.throws(()=>saveLibraryRoom(storage,{name:'Bad',room:{...room,width:99}}));
  assert.throws(()=>saveLibraryRoom(storage,{id:first.id,expectedRevision:0,name:'Stale',room}),/newer/);
  assert.equal(storage.getItem(libraryKey),before);
  assert.throws(()=>loadLibraryRoom(storage,first.id,999),/not found/);
});
test('unavailable storage and corrupt libraries fail without replacing data',()=>{
  const storage=store(),room=createRoom();storage.setItem(libraryKey,'broken');
  assert.throws(()=>saveLibraryRoom(storage,{name:'A',room}),/invalid/);
  assert.equal(storage.getItem(libraryKey),'broken');
  assert.throws(()=>listLibraryRooms({getItem(){throw Error();}}),/unavailable/);
  assert.throws(()=>saveLibraryRoom({getItem(){return null;},setItem(){throw Error();}},{name:'A',room}),/could not be saved/);
});
