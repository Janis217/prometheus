// A review/export projection of the backend mission. It grants no execution authority.
import {parseScenario} from './room-artifacts.js';
import {simulationOptions} from './room-simulation.js';
export function taskSpecification(mission,{savedRoom=null,options=null}={}) {
  if (!mission) return null;
  const supported = mission.missionType === 'fire_hotspot_inspection'
    && mission.objective === 'Find printed fire indicator' && mission.environment === 'indoor_flat';
  return {
    schemaVersion: 1,
    task: supported ? 'inspect_room_for_printed_fire_indicator' : 'unsupported_task',
    missionRevision: mission.revision,
    simulationOptions:simulationOptions(options),
    objective: mission.objective,
    room: {location: mission.location, boundary: mission.searchBoundary,
      configuration:savedRoom?parseScenario(savedRoom.configuration):null,binding:savedRoom?'saved_definition':'not_bound',
      ...(savedRoom?{savedRoomId:savedRoom.id,savedRoomRevision:savedRoom.revision,savedRoomName:savedRoom.name}:{})},
    specificationStatus: !supported ? 'unsupported' : mission.approvalState === 'blocked' ? 'blocked'
      : mission.missingInformation?.length ? 'needs_clarification' : 'reviewable',
    clarification: mission.question,
    missingInformation: [...(mission.missingInformation || [])],
    requiredSensing: supported
      ? ['visual_indicator_detection', 'obstacle_detection', 'door_state_observation', 'visibility_observation']
      : [...(mission.requiredPerception || [])],
    requiredBehaviour: supported ? ['move', 'turn', ...(simulationOptions(options).doors==='open_unlocked'?['open_door']:[]),simulationOptions(options).evidence==='photo'?'take_photo':'record_observation', 'report_findings']
      : [...(mission.requiredBehavior || [])],
    constraints: [...(mission.constraints || []), mission.operatingConditions].filter(Boolean),
    approvalState: mission.approvalState,
    execution: {mode: 'simulation_only', started: false, roomSimulatorReady: false},
  };
}

export function taskSpecificationText(specification) {
  if (!specification) return 'Create or load a task to review its capabilities.';
  if (specification.task === 'unsupported_task')
    return 'The room simulator supports one task: find a printed fire indicator on flat indoor terrain. Clarify the task using that objective before room simulation.';
  return [
    'Task: inspect a room for printed fire indicators and report the requested evidence.',
    `Instructions: ${specification.simulationOptions.searchGoal==='first'?'first finding':'all reachable findings'}; ${specification.simulationOptions.evidence==='photo'?'simulated photos':'observations only'}; ${specification.simulationOptions.doors==='open_unlocked'?'try opening doors':'avoid closed doors'}; maximum ${specification.simulationOptions.stepLimit} autonomous steps.`,
    `Required sensing: ${specification.requiredSensing.map(humanize).join(', ')}.`,
    `Required behaviour: ${specification.requiredBehaviour.map(humanize).join(', ')}.`,
    `Room: ${specification.room.location || 'not specified'}; boundary: ${specification.room.boundary || 'not specified'}.`,
    specification.specificationStatus === 'blocked' ? 'Task blocked: resolve hazards before starting a room simulation.'
      : specification.missingInformation.length ? `Clarify: ${specification.missingInformation.map(humanize).join(', ')}.` : 'Task details captured; review the constraints and approval below.',
    specification.room.binding==='saved_definition'
      ?`Saved layout: ${specification.room.savedRoomName}, revision ${specification.room.savedRoomRevision}. Simulation has not started.`
      :'Select a saved room when reviewing the task, then open its simulation in a separate tab.',
  ].join('\n');
}

const humanize = value => String(value).replaceAll('_', ' ');
