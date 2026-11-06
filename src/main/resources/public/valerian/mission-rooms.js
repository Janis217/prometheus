import {listLibraryRooms,loadLibraryRoom} from './room-library.js';
import {parseScenario,scenarioDocument} from './room-artifacts.js';
import {inside} from './room-simulation.js';

export function savedRoomSelection(storage,id,revision){
  const saved=loadLibraryRoom(storage,id,revision);
  return {id:saved.id,revision:saved.revision,name:saved.name,configuration:JSON.stringify(scenarioDocument(saved.room))};
}
export function validateMissionDetails(input){
  const name=input?.name?.trim(),selected=input?.room;
  if(!name||name.length>80)throw new Error('Enter a mission name between 1 and 80 characters.');
  if(!selected||typeof selected.id!=='string'||!/^[a-f0-9-]{36}$/.test(selected.id)
    ||!Number.isSafeInteger(selected.revision)||selected.revision<1||typeof selected.name!=='string'||!selected.name.trim()||selected.name.trim().length>80)
    throw new Error('Select a valid saved room revision.');
  return {name,room:{id:selected.id,revision:selected.revision,name:selected.name.trim(),
    configuration:JSON.stringify(scenarioDocument(parseScenario(selected.configuration)))}};
}
export function renderRoomPreview(root,selected){
  root.replaceChildren();if(!selected)return;
  const room=parseScenario(selected.configuration);
  const title=document.createElement('p');title.className='small';
  title.textContent=`${selected.name} · room revision ${selected.revision} · ${room.shape.replaceAll('_',' ')} · smoke ${room.smoke?'on':'off'} · robot facing ${['north','east','south','west'][room.robot.heading]}`;
  const grid=document.createElement('div');grid.setAttribute('aria-label','Selected room preview');
  grid.style.cssText=`display:grid;grid-template-columns:repeat(${room.width},minmax(0,1fr));gap:3px;max-width:24rem;margin-bottom:1rem`;
  const symbols={door:'D',window:'W',picture:'P',fire_picture:'F',chair:'C',table:'T'};
  for(let y=0;y<room.height;y++)for(let x=0;x<room.width;x++){
    const cell=document.createElement('span');
    const object=room.objects.find(o=>o.x===x&&o.y===y),robot=room.robot.x===x&&room.robot.y===y;
    cell.style.cssText='aspect-ratio:1;display:grid;place-items:center;border:1px solid #9aadb8;border-radius:3px;background:#edf4fa;color:#192c36';
    cell.style.visibility=inside(room,x,y)?'visible':'hidden';
    cell.textContent=robot?['\u2191','\u2192','\u2193','\u2190'][room.robot.heading]:symbols[object?.type]??'';
    cell.title=`${x}, ${y}: ${robot?'robot':object?.type??'empty'}${object?.type==='door'?`, ${object.locked?'locked':'unlocked'}, ${object.open?'open':'closed'}`:''}`;
    grid.append(cell);
  }
  root.append(title,grid);
}

export function mountMissionRoomPicker(root,draft,{defaultName='',onChange=()=>{}}={}){
  root.innerHTML=`<h4 class="h6">Save mission with a room</h4>
    <p class="small">Choose a saved room and name this mission to reopen them together later. Saving keeps a copy of this room version. Leave both empty to save a task without a room.</p>
    <p class="small"><a href="rooms.html" target="_blank" rel="noopener">Build or save rooms</a> in another tab, then Refresh rooms.</p>
    <label class="form-label d-block">Mission name<input type="text" maxlength="80" class="form-control" data-testid="mission-name"></label>
    <label class="form-label d-block">Saved room<select class="form-select" data-testid="mission-saved-room"></select></label>
    <button type="button" class="btn btn-outline-ink btn-sm my-2" data-testid="mission-rooms-refresh">Refresh rooms</button>
    <div data-testid="mission-room-preview"></div><p class="small" role="status" data-testid="mission-room-picker-status"></p>`;
  const find=name=>root.querySelector(`[data-testid="${name}"]`);
  const name=find('mission-name'),select=find('mission-saved-room'),status=find('mission-room-picker-status');
  let selected=draft?.room??null;name.value=draft?.name??'';
  const key=room=>`${room.id}:${room.revision}`;
  function changed(){onChange({name:name.value,room:selected});}
  function refresh(){
    select.replaceChildren(new Option('Choose a saved room',''));
    if(selected)select.add(new Option(`${selected.name} · revision ${selected.revision} (selected snapshot)`,key(selected)));
    try{
      for(const room of listLibraryRooms(localStorage))if(!selected||key(room)!==key(selected))
        select.add(new Option(`${room.name} · revision ${room.revision}`,key(room)));
      status.textContent='';
    }catch(error){status.textContent=error.message;}
    select.value=selected?key(selected):'';
    // Existing saved missions must keep a room until explicitly replaced.
    select.required=!!draft?.room;
    renderRoomPreview(find('mission-room-preview'),selected);
  }
  name.oninput=changed;
  select.onchange=()=>{
    try{
      if(!select.value)selected=null;
      else if(!selected||key(selected)!==select.value){
        const [id,revision]=select.value.split(':');selected=savedRoomSelection(localStorage,id,Number(revision));
      }
      if(selected&&!name.value)name.value=defaultName.slice(0,80);
      renderRoomPreview(find('mission-room-preview'),selected);status.textContent='';changed();
    }catch(error){status.textContent=error.message;select.value=selected?key(selected):'';}
  };
  find('mission-rooms-refresh').onclick=refresh;refresh();
  return {read(){
    if(!selected&&!name.value.trim()&&!draft?.room)return null;
    return validateMissionDetails({name:name.value,room:selected});
  }};
}
