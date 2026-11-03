export const labels = {
  missionType: 'Task', objective: 'Objective', priority: 'Priority', location: 'Location', environment: 'Terrain',
  risks: 'Hazards', operatingConditions: 'Operating conditions', searchBoundary: 'Search boundary',
  safetyAssessment: 'Safety assessment', platformSafety: 'Platform checks',
  communications: 'Stop on lost connection', safeStandoff: 'Safe distance', platformSuitability: 'Robot suitability',
  accessClearance: 'Room access clearance', terrainSuitability: 'Terrain suitability',
  flightClearance: 'Flight clearance', weatherEnvelope: 'Weather suitability', structuralClearance: 'Structural clearance',
  fire_hotspot_inspection: 'Fire indicator / hotspot inspection', missing_person_search: 'Missing person search',
  rubble_assessment: 'Rubble assessment', indoor_flat: 'Flat indoor terrain', indoor_rubble: 'Indoor rubble',
  outdoor_open: 'Open outdoor terrain', unknown: 'Not yet specified', safe: 'Assessed and confirmed', unsafe: 'Unsafe',
  confirmed: 'Confirmed', failed: 'Not satisfied', ground_robot: 'Ground robot',
  awaiting_supervisor_approval: 'Awaiting supervisor approval', supervisor_approved: 'Approved by supervisor',
  supervisor_rejected: 'Rejected by supervisor', supervisor_revoked: 'Approval revoked',
  not_requested: 'Configuration incomplete', blocked: 'Blocked — resolve hazards before approval',
};
export const label = value => labels[value] || (value ? String(value).replaceAll('_', ' ') : 'Not yet specified');
export function missionText(mission) {
  const lines = [`${mission.objective || 'Create a mission to get started'} — ${mission.location || 'Location not set'}`,
    `Status: ${label(mission.approvalState)} · Revision ${mission.revision}`,
    `Robot: ${label(mission.selectedEmbodiment)} · Terrain: ${label(mission.environment)} · Priority: ${label(mission.priority)}`];
  for (const key of ['searchBoundary', 'risks', 'operatingConditions']) if (mission[key]) lines.push(`${label(key)}: ${mission[key]}`);
  if (mission.missingInformation?.length) lines.push(`Still needed: ${mission.missingInformation.map(label).join(', ')}`);
  if (mission.platformSafety?.declarations) lines.push('Operator declarations:', ...Object.entries(mission.platformSafety.declarations)
    .map(([key, value]) => `• ${label(key)}: ${label(value)}`));
  if (mission.ready) lines.push('Configuration approved. No execution has started automatically.');
  return lines.join('\n');
}
export function readableMissionSpeech(text) {
  try {
    const mission = JSON.parse(text);
    return mission?.schemaVersion >= 2 && Array.isArray(mission.missingInformation) && 'missionType' in mission
      ? missionText(mission) : text;
  } catch { return text; }
}
export function executionText(run) {
  if (!run) return 'No simulation started. Configure the R-204 demo and obtain supervisor approval first.';
  const phase = {
    awaiting_acceptance: 'Simulation started — waiting for the simulated robot to accept.',
    coordination: run.lastAction === 'resume' ? 'Inspection resumed within approved boundaries.'
      : run.progressObserved ? 'Inspection underway — simulated progress reported.' : 'Mission accepted by the simulated robot.',
    escalation: 'Simulated obstacle reported. Continue within approved boundaries or abort.',
    completion_handoff: 'Run finished — review the result and acknowledge it.',
    closed: 'Mission closed — result acknowledged.',
  }[run.phase] || label(run.phase);
  const result = run.result;
  const lines = [phase];
  if (result) {
    lines.push(({completed:'Printed fire indicator found (predefined simulation result).', cancelled:'Simulation cancelled.',
      failed:'Simulated executor failure — no finding reported.', timed_out:'Simulation timed out — no finding reported.'})[result.outcome] || label(result.outcome));
    if (result.outcome === 'completed') lines.push(`Reported location: ${result.location}`);
    if (result.closureReason === 'configuration_or_approval_changed') lines.push('The mission or its approval changed. A new review is required.');
    if (result.closureReason === 'deadline_expired') lines.push('The five-minute simulation deadline elapsed.');
  }
  lines.push(`Approved mission revision: ${run.revision}`);
  return lines.join('\n');
}
export function eventText(event) {
  return ({start:'Simulation started', accepted:'Mission accepted', progress:'Inspection progress reported',
    obstacle:'Obstacle reported — supervisor decision needed', resume:'Continued within approved boundaries',
    complete:'Printed fire indicator found (simulated)', cancelled:'Simulation cancelled', failed:'Executor failure',
    timed_out:'Simulation timed out', handoff:'Result acknowledged — mission closed'})[event.lastAction] || label(event.lastAction);
}
export function supportedDemo(mission) {
  return mission?.missionType === 'fire_hotspot_inspection' && mission?.objective === 'Find printed fire indicator'
    && mission.location === 'R-204' && mission.environment === 'indoor_flat' && mission.searchBoundary === 'R-204 interior only';
}
