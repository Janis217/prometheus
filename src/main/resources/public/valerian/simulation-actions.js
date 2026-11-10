// Data contracts for simulated function calls. These strings are never evaluated as code.
export const actionProtocolVersion=1;
export const directionNames=['north','east','south','west'];
export const actionFunctions=Object.freeze(['observe','move','turn','open_door','take_photo','record_observation','fetch','pick_up','report_findings','stop']);
const position=object=>object?{x:object.x,y:object.y}:null;

export function findingParameters(run){
  return structuredClone(run.findings);
}
export function createActionRequest(run,name,targetId,trigger,context={}){
  if(!actionFunctions.includes(name))throw new Error('Unsupported simulation action.');
  const robot=run.room.robot,[dx,dy]=[[0,-1],[1,0],[0,1],[-1,0]][robot.heading];
  const target=run.observedObjects.find(object=>object.id===targetId);
  const parameters={
    observe:()=>({position:position(robot),heading:directionNames[robot.heading],visibility:run.room.smoke?'smoke':'clear',rangeMeters:run.room.smoke?1:null}),
    move:()=>({direction:directionNames[robot.heading],distanceMeters:1,from:position(robot),to:{x:robot.x+dx,y:robot.y+dy}}),
    turn:()=>({direction:'clockwise',angleDegrees:90,fromHeading:directionNames[robot.heading],toHeading:directionNames[(robot.heading+1)%4]}),
    open_door:()=>({doorId:targetId||null,position:position(target),force:false}),
    take_photo:()=>({targetId:targetId||null,position:position(target),subject:'printed_fire_indicator'}),
    record_observation:()=>({targetId:targetId||null,position:position(target),subject:'printed_fire_indicator'}),
    fetch:()=>({objectId:targetId||null,position:position(target)}),
    pick_up:()=>({objectId:targetId||null,position:position(target)}),
    report_findings:()=>({missionId:run.specification.savedMission?.id||null,missionRevision:run.missionRevision,recipient:'supervisor',
      findings:findingParameters(run),coverage:context.coverage|| (run.specification.simulationOptions.searchGoal==='first'?'first_finding':'incomplete'),partial:context.partial??(run.specification.simulationOptions.searchGoal==='all')}),
    stop:()=>({reason:context.reason||'operator_requested'}),
  }[name]();
  return {schemaVersion:actionProtocolVersion,id:`action-${run.sequence+1}`,function:name,parameters,mode:'simulation',trigger};
}
export function validateActionRequest(request,sequence){
  if(!request||request.schemaVersion!==actionProtocolVersion||request.mode!=='simulation'
    ||request.id!==`action-${sequence+1}`||!actionFunctions.includes(request.function)
    ||!request.parameters||typeof request.parameters!=='object'||Array.isArray(request.parameters)||typeof request.trigger!=='string')
    throw new Error('Invalid or out-of-sequence simulated function call.');
  return structuredClone(request);
}
export function formatActionCall(request){
  if(!request)return '';
  return `${request.function}(${Object.entries(request.parameters).map(([name,value])=>`${name}=${JSON.stringify(value)}`).join(', ')})`;
}
export function formatActionEvent(event){
  if(!event.call)return `${event.action}: ${event.success?'success':'failed'} — ${event.reason}`;
  return `${formatActionCall(event.call)} → ${event.response.status} [${event.response.code}] — ${event.response.message}`;
}
