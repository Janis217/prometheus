import {listLibraryRooms,loadLibraryRoom} from './room-library.js';
import {parseScenario,scenarioDocument} from './room-artifacts.js';
import {inside,simulationOptions} from './room-simulation.js';

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
  return {name,simulationOptions:simulationOptions(input.simulationOptions),room:{id:selected.id,revision:selected.revision,name:selected.name.trim(),
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

export function mountMissionRoomPicker(root,draft,{defaultName='',compact=false,onChange=()=>{}}={}){
  root.innerHTML=`<h4 class="h6">Save mission with a room</h4>
    <p class="small">Choose a saved room and name this mission to reopen them together later. Saving keeps a copy of this room version. Leave both empty to save a task without a room.</p>
    <p class="small"><a href="rooms.html" target="_blank" rel="noopener">Build or save rooms</a> in another tab, then Refresh rooms.</p>
    <label class="form-label d-block">Mission name<input type="text" maxlength="80" class="form-control" data-testid="mission-name"></label>
    <label class="form-label d-block">Saved room<select class="form-select" data-testid="mission-saved-room"></select></label>
    <button type="button" class="btn btn-outline-ink btn-sm my-2" data-testid="mission-rooms-refresh">Refresh rooms</button>
    <div data-testid="mission-room-preview"></div>
    <fieldset data-testid="mission-simulation-controls"><legend class="h6">Simulation instructions</legend>
      <label class="form-label d-block">Search goal<select class="form-select" data-option="searchGoal"><option value="first">First fire picture</option><option value="all">All reachable fire pictures</option></select></label>
      <label class="form-label d-block">Evidence<select class="form-select" data-option="evidence"><option value="photo">Simulated photo</option><option value="observation">Observation only</option></select></label>
      <label class="form-label d-block">Doors<select class="form-select" data-option="doors"><option value="open_unlocked">Try opening doors; locked doors remain blocked</option><option value="avoid_closed">Avoid closed doors</option></select></label>
      <label class="form-label d-block">Autonomous step limit (1–512)<input class="form-control" type="number" min="1" max="512" step="1" required data-option="stepLimit"></label>
      <p class="small">Each autonomous action uses one step. The limit stops the run and reports partial results. Smoke, objects and starting pose come from the saved room. Mission priority, location and free-text boundaries/conditions describe the mission; they do not change routes or speed. Safety and supported-task checks still apply.</p>
    </fieldset><p class="small" role="status" data-testid="mission-room-picker-status"></p>`;
  const find=name=>root.querySelector(`[data-testid="${name}"]`);
  if(compact){
    root.querySelector('h4').textContent='Choose your room';root.querySelector(':scope > p').hidden=true;
    const help=find('mission-simulation-controls').querySelector('p');help.hidden=true;
    const settings=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Simulation settings';
    const controls=find('mission-simulation-controls');controls.before(settings);settings.append(summary,controls);
    controls.querySelector('legend').hidden=true;
  }
  const name=find('mission-name'),select=find('mission-saved-room'),status=find('mission-room-picker-status');
  let selected=draft?.room??null;name.value=draft?.name??'';
  const options=draft?.simulationOptions??simulationOptions();
  for(const control of root.querySelectorAll('[data-option]')){
    control.value=options[control.dataset.option];control.oninput=changed;
  }
  function rawOptions(){return {version:1,...Object.fromEntries([...root.querySelectorAll('[data-option]')].map(control=>[control.dataset.option,control.dataset.option==='stepLimit'?Number(control.value):control.value]))};}
  const key=room=>`${room.id}:${room.revision}`;
  function changed(){onChange({name:name.value,room:selected,simulationOptions:rawOptions()});}
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
    select.required=compact||!!draft?.room;name.required=compact;
    find('mission-simulation-controls').hidden=!selected;
    find('mission-simulation-controls').disabled=!selected;
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
      find('mission-simulation-controls').hidden=!selected;find('mission-simulation-controls').disabled=!selected;
    }catch(error){status.textContent=error.message;select.value=selected?key(selected):'';}
  };
  find('mission-rooms-refresh').onclick=refresh;refresh();
  return {read(){
    if(!compact&&!selected&&!name.value.trim()&&!draft?.room)return null;
    return validateMissionDetails({name:name.value,room:selected,simulationOptions:rawOptions()});
  }};
}
