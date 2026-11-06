import {createRoom,inside,wallSlot,place,visibleCells,startSimulation,act,stepSimulation} from './room-simulation.js';
import {taskSpecification} from './task-specification.js';
import {scenarioDocument,parseScenario,saveRoom,loadRoom,runDocument,scenarioLimit,validatedRoom} from './room-artifacts.js';

const names={robot:'Robot start',door:'Door',window:'Window',fire_picture:'Fire picture',picture:'Non-fire picture',chair:'Chair',table:'Table',erase:'Remove object'};
const symbols={door:'D',window:'W',fire_picture:'F',picture:'P',chair:'C',table:'T'};
export function mountRoomWorkspace(root,getMission,{getScope=()=>({}),builderOnly=false}={}) {
  let room=createRoom(), run=null, generated=false, timer=null, importing=false, importVersion=0;
  root.innerHTML=`<hr><h3 class="h6">Room simulation builder</h3>
    <p class="small">Browser-local demonstration. Each slot is one metre. D = door, W = window, F = fire picture, P = other picture, C = chair, T = table. Wall items occupy boundary slots.</p>
    <div class="d-flex flex-wrap gap-2 align-items-end">
      <label>Room shape<select class="form-select" data-room="shape"><option value="square">Square</option><option value="rectangle">Rectangle</option><option value="l_shaped">L-shaped</option></select></label>
      <label>Place item<select class="form-select" data-room="tool">${Object.entries(names).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label>
      <label><input type="checkbox" data-room="locked"> Locked door</label>
      <label><input type="checkbox" data-room="open"> Open door</label>
      <label><input type="checkbox" data-room="smoke"> Smoke (one field ahead)</label>
      <label>Starting direction<select class="form-select" data-room="heading"><option value="0">North</option><option value="1" selected>East</option><option value="2">South</option><option value="3">West</option></select></label>
    </div>
    <p class="small mt-2">Choose an item, then a highlighted valid slot. Shape changes clear the room. Furniture blocks sight and movement. Closed doors block movement and sight beyond them.</p>
    <div class="d-flex flex-wrap gap-2 my-2">
      <button type="button" class="btn btn-outline-ink btn-sm" data-room="save">Save room in browser</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-room="load">Load saved room</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-room="export">Export room JSON</button>
      <label class="btn btn-outline-ink btn-sm mb-0">Import room JSON<input type="file" accept=".json,application/json" class="d-block small" data-room="import" aria-label="Import room JSON"></label>
      <button type="button" class="btn btn-outline-ink btn-sm" data-room="report">Export run report</button>
    </div>
    <p class="small">${builderOnly?'Save named rooms using the controls above. Import and export transfer a layout between browsers or server addresses.':'Saved rooms belong to the connected mission instance in this browser. Room files contain the layout only; your current task remains unchanged. Export a run report before returning to the builder to keep its timeline.'}</p>
    <div data-room="grid" class="my-2" style="display:grid;gap:3px;max-width:32rem" aria-label="Room overview"></div>
    <p data-room="pose" class="small"></p>
    <section data-room="execution" ${builderOnly?'hidden':''}>
    <div class="d-flex flex-wrap gap-2 my-2"><button type="button" class="btn btn-outline-ink btn-sm" data-room="generate">Generate room</button>
      <button type="button" class="btn btn-primary btn-sm" data-room="start">Start autonomous simulation</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-room="pause">Pause</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-room="edit">Return to builder</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-room="step">Next autonomous step</button></div>
    <label class="d-block">Perceived target<select class="form-select" data-room="target"></select></label>
    <div class="d-flex flex-wrap gap-2 my-2">${['observe','move','turn','open_door','take_photo','fetch','pick_up','report_findings','stop'].map(action=>`<button type="button" class="btn btn-outline-ink btn-sm" data-room-action="${action}">${action}</button>`).join('')}</div>
    <p class="small">Starting runs the task automatically: search, approach a perceived fire picture, open unlocked doors, take a simulated photo and report. Pause to inspect or inject manual demo actions. Locked doors cannot be forced. Fetch and pick_up are pretend acknowledgements.</p>
    <details><summary>Bound simulation task JSON</summary><pre data-room="specification" style="white-space:pre-wrap;max-height:18rem;overflow:auto"></pre></details>
    <ol data-room="timeline" style="max-height:18rem;overflow:auto" aria-label="Simulation text timeline"></ol>
    </section><p role="status" data-room="status"></p>`;
  const el=name=>root.querySelector(`[data-room="${name}"]`);
  if(builderOnly)for(const name of ['save','load','report'])el(name).hidden=true;
  function message(text){el('status').textContent=text;}
  function active(){return run?.phase==='running';}
  function stopTimer(){if(timer!==null){clearInterval(timer);timer=null;}}
  function startTimer(){
    stopTimer();
    timer=setInterval(()=>attempt(()=>{
      if(!ensureRevision()||!active()){stopTimer();return;}
      stepSimulation(run);
      if(!active()){stopTimer();message(run.events.at(-1).reason);}
    }),450);
  }
  function ensureRevision(){
    if (run && getMission()?.revision!==run.missionRevision) {
      stopTimer();run.phase='invalidated';message('Task revision changed. Return to the builder and review the new specification.');
      return false;
    }
    return true;
  }
  function validSlot(type,x,y){
    if (run || importing || !inside(room,x,y)) return false;
    if (type==='erase') return room.objects.some(o=>o.x===x&&o.y===y);
    return !room.objects.some(o=>o.x===x&&o.y===y)
      && (type==='robot'||room.robot.x!==x||room.robot.y!==y)
      && (!['door','window','fire_picture','picture'].includes(type)||wallSlot(room,x,y));
  }
  function render(){
    const world=run?.room||room, visible=run?visibleCells(world):null, tool=el('tool').value;
    el('grid').style.gridTemplateColumns=`repeat(${world.width},minmax(0,1fr))`;
    el('grid').replaceChildren();
    for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){
      const cell=document.createElement('button');cell.type='button';
      cell.dataset.x=x;cell.dataset.y=y;
      cell.style.cssText='aspect-ratio:1;min-width:0;border:1px solid #888;border-radius:4px;font-weight:bold';
      const exists=inside(world,x,y), object=world.objects.find(o=>o.x===x&&o.y===y), robot=world.robot.x===x&&world.robot.y===y;
      const seen=visible?.has(`${x},${y}`), valid=validSlot(tool,x,y);
      cell.style.visibility=exists?'visible':'hidden';
      cell.style.background=run?(seen?'#d4edda':'#e3e3e3'):(valid?'#dbeafe':'#eee');
      cell.style.color='#17202a';
      cell.textContent=robot?['↑','→','↓','←'][world.robot.heading]:object?symbols[object.type]:'';
      const detail=object?`${names[object.type]}${object.type==='door'?`, ${object.locked?'locked':'unlocked'}, ${object.open?'open':'closed'}`:''}`:'empty';
      cell.setAttribute('aria-label',`Slot ${x}, ${y}: ${robot?'robot, ':''}${detail}${run?`, ${seen?'visible to robot':'overview only'}`:''}`);
      cell.title=cell.getAttribute('aria-label');cell.disabled=!valid;
      cell.onclick=()=>attempt(()=>{
        if(tool==='erase'){room.objects=room.objects.filter(o=>o.x!==x||o.y!==y);room.revision++;}
        else place(room,tool,x,y,{locked:el('locked').checked,open:el('open').checked});
        generated=false;message(builderOnly?'Room changed. Save to keep this layout.':'Room changed. Generate it before starting.');
      });el('grid').append(cell);
    }
    el('pose').textContent=run?`Simulated robot: (${world.robot.x}, ${world.robot.y}), ${['north','east','south','west'][world.robot.heading]}. Action: ${run.currentAction}. Phase: ${run.phase}. Green cells are current perception; grey cells are operator overview only.`:'Place the robot and room objects using the highlighted slots.';
    el('specification').textContent=run?JSON.stringify(run.specification,null,2):'No room snapshot bound yet.';
    const selected=el('target').value;el('target').replaceChildren(new Option('Choose a visible object',''));
    if(run)for(const o of world.objects.filter(o=>visible.has(`${o.x},${o.y}`)))el('target').add(new Option(`${names[o.type]} (${o.x}, ${o.y})`,o.id));
    el('target').value=selected;
    root.querySelectorAll('[data-room-action]').forEach(button=>{button.disabled=!active()||(timer!==null&&button.dataset.roomAction!=='stop');});
    for(const name of ['shape','tool','locked','open','smoke','heading','generate','import'])el(name).disabled=!!run||importing;
    const hasScope=!!getScope().agentId;
    el('save').disabled=!!run||importing||!hasScope;el('load').disabled=!!run||importing||!hasScope;
    el('export').disabled=importing;el('report').disabled=!run;
    el('start').disabled=!!run||!generated||importing;el('edit').disabled=!run;el('step').disabled=!active()||timer!==null;
    el('pause').disabled=!active();el('pause').textContent=timer===null?'Resume':'Pause';
    el('timeline').replaceChildren(...(run?.events||[]).map(event=>{
      const item=document.createElement('li');item.textContent=`${event.sequence}. ${event.trigger} → perceived ${event.perception.objects.map(o=>o.type).join(', ')||'no objects'} → ${event.action}: ${event.success?'success':'failed'} — ${event.reason} Robot (${event.pose.x}, ${event.pose.y}).`;return item;
    }));
  }
  function attempt(operation){try{operation();}catch(error){stopTimer();message(error.message);}render();}
  function download(payload,filename){
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
    const link=document.createElement('a');link.href=url;link.download=filename;root.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function replaceRoom(next){
    room=next;generated=false;
    el('shape').value=room.shape;el('smoke').checked=room.smoke;el('heading').value=String(room.robot.heading);
    message(builderOnly?'Room loaded. Review or edit the layout, then save.':'Room loaded. Review the layout and current task, then Generate room.');
  }
  el('save').onclick=()=>attempt(()=>{saveRoom(localStorage,getScope().agentId,room);message('Room saved for this mission instance in this browser.');});
  el('load').onclick=()=>attempt(()=>replaceRoom(loadRoom(localStorage,getScope().agentId)));
  el('export').onclick=()=>attempt(()=>{download(scenarioDocument(room),'prometheus-room.json');message('Room layout exported.');});
  el('report').onclick=()=>attempt(()=>{download(runDocument(run,{paused:timer===null}),'prometheus-room-run.json');message('Run snapshot exported with its task, initial room and event timeline.');});
  el('import').onchange=async()=>{
    const file=el('import').files[0];el('import').value='';if(!file)return;
    const version=++importVersion,agentId=getScope().agentId;importing=true;render();
    try{
      if(file.size>scenarioLimit)throw new Error('Room files must be at most 64 KB.');
      const next=parseScenario(await file.text());
      if(version===importVersion&&agentId===getScope().agentId&&!run)replaceRoom(next);
    }catch(error){if(version===importVersion)message(error.message);}
    finally{if(version===importVersion){importing=false;render();}}
  };
  el('shape').onchange=()=>attempt(()=>{room=createRoom(el('shape').value);el('smoke').checked=false;el('heading').value='1';generated=false;message('New room. Place objects and the robot.');});
  el('tool').onchange=render;
  el('smoke').onchange=()=>attempt(()=>{room.smoke=el('smoke').checked;room.revision++;generated=false;});
  el('heading').onchange=()=>attempt(()=>{room.robot.heading=Number(el('heading').value);room.revision++;generated=false;});
  el('generate').onclick=()=>attempt(()=>{generated=true;message(`Generated ${room.shape.replaceAll('_',' ')} room, revision ${room.revision}. Review the task, then start.`);});
  el('start').onclick=()=>attempt(()=>{
    run=startSimulation(room,taskSpecification(getMission()));
    act(run,'observe',null,'simulation_start');startTimer();message('Robot executing the saved task autonomously. No physical execution is triggered.');
  });
  el('edit').onclick=()=>attempt(()=>{stopTimer();run=null;message('Returned to the builder. The previous local timeline has been cleared.');});
  el('pause').onclick=()=>attempt(()=>{
    if(!ensureRevision()||!active())return;
    if(timer!==null){stopTimer();message('Simulation paused. Inspect the task or use manual demo controls.');}
    else {startTimer();message('Autonomous execution resumed.');}
  });
  el('step').onclick=()=>attempt(()=>{if(ensureRevision())stepSimulation(run);});
  root.querySelectorAll('[data-room-action]').forEach(button=>{button.onclick=()=>attempt(()=>{if(ensureRevision()){
    act(run,button.dataset.roomAction,el('target').value,'operator_event');
    if(!active())stopTimer();
  }});});
  // A scope reset discards local state, keeping rooms/runs from leaking between agents.
  render();
  return {clear(){stopTimer();importVersion++;importing=false;room=createRoom();run=null;generated=false;el('shape').value='square';el('smoke').checked=false;el('heading').value='1';message('');render();},
    getRoom(){if(importing)throw new Error('Wait for the room import to finish.');if(run)throw new Error('Return to the builder before saving a room.');return validatedRoom(room);},
    setRoom(next){if(importing||run)throw new Error('Finish importing or return to the builder before opening a room.');const valid=validatedRoom(next);replaceRoom(valid);render();},
    refresh(){ensureRevision();render();}};
}
