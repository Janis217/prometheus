import {inside,visibleCells,startSimulation,act,stepSimulation} from './room-simulation.js';
import {parseScenario,runDocument} from './room-artifacts.js';
import {taskSpecification} from './task-specification.js';
import {formatActionCall} from './simulation-actions.js';

const el=id=>document.getElementById(id),accessKey='prometheus.valerian.accessCode';
const agentId=new URL(location.href).searchParams.get('mission');
let accessCode=sessionStorage.getItem(accessKey)||'',snapshot=null,initialRoom=null,specification=null,run=null,timer=null,checking=false,valid=false,version=0;
const symbols={door:'D',window:'W',fire_picture:'F',picture:'P',chair:'C',table:'T'},directions=['↑','→','↓','←'];
window.opener=null;
function stopTimer(){if(timer!==null){clearInterval(timer);timer=null;}}
function fail(text){stopTimer();valid=false;if(run?.phase==='running')run.phase='invalidated';el('player-status').textContent=text;el('reload-mission').hidden=false;render();}
async function fetchReview(){
  const response=await fetch(`/demo/agents/${encodeURIComponent(agentId)}/mission-review`,{cache:'no-store',headers:{'X-Prometheus-Access-Code':accessCode}});
  if(response.status===401){el('player-access').hidden=false;throw new Error('Enter a valid access code to open this mission.');}
  if(!response.ok)throw new Error('Unable to load this mission. Check the connection and reload.');
  return response.json();
}
function validate(review){
  const mission=JSON.parse(review.mission),saved=review.savedMission;
  if(!saved?.room)throw new Error('This mission has no saved room. Return to mission setup and choose one.');
  if(saved.configuredRevision!==mission.revision)throw new Error('Mission details changed. Review and save the mission again.');
  const room=parseScenario(saved.room.configuration),spec=taskSpecification(mission,{savedRoom:saved.room,options:saved.simulationOptions});
  if(spec.specificationStatus!=='reviewable')throw new Error('Complete a supported mission and resolve its safety checks before running.');
  spec.savedMission={id:agentId,name:saved.name,configuredRevision:saved.configuredRevision};
  return {room,spec};
}
function signature(review){const mission=JSON.parse(review.mission);return JSON.stringify([mission.revision,mission.approvalState==='blocked',mission.missingInformation,review.savedMission]);}
async function load(){
  const generation=++version;stopTimer();valid=false;run=null;el('player').hidden=true;el('reload-mission').hidden=true;el('player-status').textContent='';
  if(!agentId){fail('Open a saved mission and click Run simulation first.');return;}
  if(!accessCode){el('player-access').hidden=false;return;}
  try{
    const review=await fetchReview();if(generation!==version)return;
    const {room,spec}=validate(review);snapshot=review;initialRoom=room;specification=spec;valid=true;
    el('player-access').hidden=true;el('player').hidden=false;el('player-title').textContent=review.savedMission.name;el('player-room').textContent=review.savedMission.room.name;
    document.title=`${review.savedMission.name} · Simulation`;render();
  }catch(error){if(generation===version)fail(error.message);}
}
function render(){
  const world=run?.room||initialRoom;
  if(world){
    const visible=run?visibleCells(world):null;el('scene').style.gridTemplateColumns=`repeat(${world.width},minmax(0,1fr))`;el('scene').replaceChildren();
    for(let y=0;y<world.height;y++)for(let x=0;x<world.width;x++){
      const cell=document.createElement('span'),object=world.objects.find(o=>o.x===x&&o.y===y),robot=world.robot.x===x&&world.robot.y===y;
      cell.className=`cell${visible?.has(`${x},${y}`)?' seen':''}${robot?' robot':''}`;cell.dataset.x=x;cell.dataset.y=y;
      cell.style.visibility=inside(world,x,y)?'visible':'hidden';cell.textContent=robot?directions[world.robot.heading]:symbols[object?.type]||'';
      cell.title=`(${x}, ${y}) ${robot?'Robot':object?.type?.replaceAll('_',' ')||'Empty'}${object?.type==='door'?`, ${object.locked?'locked':'unlocked'}, ${object.open?'open':'closed'}`:''}${run?`, ${visible.has(`${x},${y}`)?'visible':'overview only'}`:''}`;
      el('scene').append(cell);
    }
    el('pose').textContent=run?`Robot (${world.robot.x}, ${world.robot.y}) · ${run.currentAction.replaceAll('_',' ')}`:'Saved starting layout';
  }
  const active=run?.phase==='running';
  const phases={running:timer===null?'Paused':'Running',completed:'Completed',partial:'Partial results',blocked:'Blocked',failed:'Failed',not_found:'No finding',stopped:'Stopped',invalidated:'Mission changed'};
  el('player-phase').textContent=run?phases[run.phase]||run.phase:valid?'Ready':'Unavailable';
  el('start').disabled=!valid||active;el('start').textContent=run&&!active?'Start again':'Start';el('pause').disabled=!active;el('pause').textContent=active&&timer===null?'Resume':'Pause';el('stop').disabled=!active;
  el('empty-output').hidden=!!run?.events.length;el('empty-output').textContent=valid?'Press Start to begin.':'Reload the mission to continue.';el('export-run').hidden=!run;
  const list=el('timeline'),atEnd=list.scrollHeight-list.scrollTop-list.clientHeight<50;
  list.replaceChildren(...(run?.events||[]).map(event=>{
    const item=document.createElement('li'),step=document.createElement('span'),action=document.createElement('code'),outcome=document.createElement('div'),detail=document.createElement('div');
    step.className='step';step.textContent=`Step ${event.sequence} · Robot (${event.pose.x}, ${event.pose.y})`;
    action.className='function-call';action.textContent=formatActionCall(event.call);
    outcome.className='function-outcome';outcome.dataset.status=event.response.status;outcome.textContent=`→ ${event.response.status} [${event.response.code}]`;
    detail.textContent=event.response.message;item.append(step,action,outcome,detail);
    const details=document.createElement('details'),summary=document.createElement('summary'),data=document.createElement('pre');
    summary.textContent='Result';data.textContent=JSON.stringify({data:event.response.data,pose:event.response.poseAfter,retryable:event.response.retryable},null,2);
    details.append(summary,data);item.append(details);return item;
  }));
  if(atEnd)list.scrollTop=list.scrollHeight;
}
function tick(){
  try{stepSimulation(run);if(run.phase!=='running'){stopTimer();el('player-status').textContent=run.events.at(-1).reason;}render();}
  catch(error){fail(error.message);}
}
function startTimer(){stopTimer();timer=setInterval(tick,450);}
el('start').onclick=()=>{
  if(!valid||run?.phase==='running')return;
  try{run=startSimulation(initialRoom,specification);act(run,'observe',null,'simulation_start');el('player-status').textContent='';startTimer();render();}
  catch(error){fail(error.message);}
};
el('pause').onclick=()=>{if(run?.phase!=='running')return;if(timer===null)startTimer();else stopTimer();render();};
el('stop').onclick=()=>{if(run?.phase!=='running')return;stopTimer();act(run,'stop',null,'operator_event');render();};
el('reload-mission').onclick=()=>void load();
el('player-access-form').onsubmit=event=>{event.preventDefault();accessCode=el('player-code').value.trim();sessionStorage.setItem(accessKey,accessCode);void load();};
el('export-run').onclick=()=>{
  const payload=runDocument(run,{paused:timer===null}),url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='prometheus-room-run.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
const poll=setInterval(async()=>{
  if(!valid||checking)return;checking=true;const generation=version;
  try{const latest=await fetchReview();if(generation===version&&signature(latest)!==signature(snapshot))fail('Mission changed in the setup tab. Reload the mission before starting again.');}
  catch(error){if(generation===version)fail(error.message);}finally{checking=false;}
},3000);
window.addEventListener('pagehide',()=>{version++;stopTimer();clearInterval(poll);});
void load();
