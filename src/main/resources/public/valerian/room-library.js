import {validatedRoom} from './room-artifacts.js';

// Independent of access codes and missions. Never put credentials in this store.
export const libraryKey='prometheus.room-library.v1';
const invalid=()=>new Error('Saved room library is invalid. Existing data has not been replaced.');
function roomName(name){
  if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw new Error('Enter a room name between 1 and 80 characters.');
  return name.trim();
}
export function readLibrary(storage){
  let text;
  try{text=storage.getItem(libraryKey);}catch{throw new Error('Browser storage is unavailable. Export your room to a file instead.');}
  if(text===null)return {format:'prometheus.room-library',version:1,rooms:[]};
  let data;
  try{data=JSON.parse(text);}catch{throw invalid();}
  if(data?.format!=='prometheus.room-library'||data.version!==1||!Array.isArray(data.rooms))throw invalid();
  const ids=new Set();
  const rooms=data.rooms.map(record=>{
    if(typeof record?.id!=='string'||!/^[a-f0-9-]{36}$/.test(record.id)||ids.has(record.id)||!Array.isArray(record.versions)||!record.versions.length)throw invalid();
    ids.add(record.id);
    return {id:record.id,versions:record.versions.map((saved,index)=>{
      if(saved?.revision!==index+1)throw invalid();
      return {revision:saved.revision,name:roomName(saved.name),room:validatedRoom(saved.room)};
    })};
  });
  return {format:'prometheus.room-library',version:1,rooms};
}
export function listLibraryRooms(storage){
  return readLibrary(storage).rooms.map(({id,versions})=>{
    const latest=versions.at(-1);
    return {id,name:latest.name,revision:latest.revision};
  });
}
export function loadLibraryRoom(storage,id,revision){
  const record=readLibrary(storage).rooms.find(room=>room.id===id);
  const saved=record?.versions.find(saved=>saved.revision===(revision??record.versions.length));
  if(!saved)throw new Error('Saved room revision not found. Refresh the room list.');
  return {id:record.id,...saved};
}
export function saveLibraryRoom(storage,{id=null,expectedRevision=0,name,room}){
  // Validate before writing, preserving both the library and the caller's draft on failure.
  const saved={name:roomName(name),room:validatedRoom(room)};
  const data=readLibrary(storage);
  let record=data.rooms.find(record=>record.id===id);
  if(id&&!record)throw new Error('Saved room no longer exists. Save this layout as a new room.');
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==(record?.versions.length??0))
    throw new Error('This room has a newer saved revision. Open it again, or save your layout as a new room.');
  if(!record){record={id:crypto.randomUUID(),versions:[]};data.rooms.push(record);}
  saved.revision=record.versions.length+1;
  record.versions.push(saved);
  try{storage.setItem(libraryKey,JSON.stringify(data));}catch{throw new Error('Room could not be saved: browser storage is full or unavailable. Export the layout instead.');}
  return {id:record.id,...saved};
}
