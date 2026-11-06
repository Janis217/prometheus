import {mountRoomWorkspace} from './room-workspace.js';
import {listLibraryRooms,loadLibraryRoom,saveLibraryRoom,libraryKey} from './room-library.js';

const el=id=>document.getElementById(id);
const editor=mountRoomWorkspace(el('room-editor'),()=>null,{builderOnly:true});
let current=null;
function status(message){el('library-status').textContent=message;}
function identity(){
  el('room-identity').textContent=current?`Saved room: ${current.name} · revision ${current.revision}`:'Unsaved room';
  el('save-room').textContent=current?'Save new revision':'Save new room';
}
function refresh(selected=el('saved-rooms').value){
  const records=listLibraryRooms(localStorage);
  el('saved-rooms').replaceChildren(new Option(records.length?'Choose a saved room':'No saved rooms yet',''));
  for(const record of records)el('saved-rooms').add(new Option(`${record.name} · revision ${record.revision}`,record.id));
  el('saved-rooms').value=selected;
  el('open-room').disabled=!el('saved-rooms').value;
}
function attempt(operation){try{operation();}catch(error){status(error.message);}}
el('saved-rooms').onchange=()=>{el('open-room').disabled=!el('saved-rooms').value;};
el('refresh-rooms').onclick=()=>attempt(()=>{refresh();status('Room list refreshed.');});
el('new-room').onclick=()=>{editor.clear();current=null;el('room-name').value='';identity();status('New room. Choose a shape and place objects, then name and save it.');};
el('open-room').onclick=()=>attempt(()=>{
  const saved=loadLibraryRoom(localStorage,el('saved-rooms').value);
  editor.setRoom(saved.room);current=saved;el('room-name').value=saved.name;
  identity();status(`Opened ${saved.name}, revision ${saved.revision}. Saving edits creates a new revision and keeps the previous layout.`);
});
async function save(copy){
  const button=el(copy?'save-copy':'save-room');button.disabled=true;
  try{
    // Serialize read/append/write across tabs; stale editors still require explicit reopening.
    const operation=()=>{
      const saved=saveLibraryRoom(localStorage,{id:copy?null:current?.id,
        expectedRevision:copy?0:current?.revision??0,name:el('room-name').value,room:editor.getRoom()});
      current=saved;identity();refresh(saved.id);
      status(`Saved ${saved.name}, revision ${saved.revision}.`);
    };
    if(!navigator.locks)throw new Error('Saving requires a browser with Web Locks. Open this page on localhost in a current browser, or export the room instead.');
    await navigator.locks.request(libraryKey,operation);
  }catch(error){status(error.message);}finally{button.disabled=false;}
}
el('save-room').onclick=()=>save(false);
el('save-copy').onclick=()=>save(true);
window.addEventListener('storage',event=>{if(event.key===libraryKey||event.key===null)attempt(()=>{refresh();status('Room library changed in another tab. Your current layout is unchanged.');});});
identity();attempt(()=>refresh());
