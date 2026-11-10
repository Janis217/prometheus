import { missionText, executionText, eventText, supportedDemo } from './mission-presentation.js';
import { mountMissionWizard } from './mission-wizard.js';
import { taskSpecification, taskSpecificationText } from './task-specification.js';
import { renderRoomPreview } from './mission-rooms.js';

// Credentials stay in the password field only; never in storage, URLs or technical details.
export function mountMissionReview(root, getScope, {createNew,openSaved,separateSimulation=false} = {}) {
  root.innerHTML = `<h2 class="h5">Mission workspace</h2>
    <a href="rooms.html" target="_blank" rel="noopener" class="btn btn-outline-ink btn-sm mb-2" data-testid="mission-build-room">Create simulation room ↗</a>
    <p class="small" data-testid="mission-agent-identity"></p>
    <div class="d-flex flex-wrap gap-2 mb-2">
      <label>Saved missions<select class="form-select" data-testid="saved-missions"></select></label>
      <button type="button" class="btn btn-outline-ink btn-sm" data-testid="saved-missions-refresh">Refresh missions</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-testid="saved-missions-open">Open saved mission</button>
    </div><p class="small" role="status" data-testid="saved-missions-status"></p>
    <div data-testid="saved-mission-summary" class="small"></div>
    <div data-testid="saved-mission-room-preview"></div>
    <div data-testid="mission-guided-input"></div>
    <div class="d-flex gap-2 my-2"><button type="button" class="btn btn-primary" data-testid="mission-run-external" hidden>Run simulation</button><button type="button" class="btn btn-outline-ink" data-testid="mission-edit" hidden>Edit mission</button></div>
    <p role="status" data-testid="mission-run-status"></p>
    <details data-testid="mission-extra-details" open><summary>Mission details and review</summary>
    <p class="fw-semibold mt-3">Current mission</p>
    <div data-testid="mission-readable-summary" style="white-space:pre-wrap" aria-live="polite">Connect to a mission agent to begin.</div>
    <h3 class="h6 mt-3">Task specification and capabilities</h3>
    <p class="small">Define the task, then select a saved room when reviewing your answers. Create rooms in their separate tab.</p>
    <div data-testid="task-specification-readable" style="white-space:pre-wrap" aria-live="polite"></div>
    <details class="my-2"><summary>Review task specification JSON</summary>
      <pre data-testid="task-specification-json" style="white-space:pre-wrap;max-height:20rem;overflow:auto"></pre>
    </details>
    <button type="button" class="btn btn-outline-ink btn-sm my-2" data-testid="mission-review-load">Load current mission</button>
    <details><summary>Mission supervisor review</summary>
      <p class="small">Review the current mission and its operator declarations before deciding. Approval does not start execution.</p>
      <div data-testid="mission-review-credential"><label class="form-label d-block">Supervisor credential<input type="password" autocomplete="off" class="form-control" data-testid="mission-review-token"></label></div>
      <p class="small" data-testid="mission-review-password-mode" hidden>Supervisor password is disabled for testing.</p>
      <div class="d-flex gap-2"><button type="button" class="btn btn-primary btn-sm" data-decision="approve">Approve</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-decision="reject">Reject</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-decision="revoke">Revoke approval</button></div>
      <p role="status" data-testid="mission-review-status"></p>
    </details>
    </details><div data-testid="mission-inline-simulation">
    <hr><h3 class="h6">Legacy R-204 scripted simulation</h3>
    <p class="small">Simulation — predefined results; no physical robot, movement route or camera processing.</p>
    <label class="form-label">Simulation scenario<select class="form-select" data-testid="mission-execution-variant">
      <option value="ordinary">Ordinary — indicator found</option><option value="obstacle">Blocked path — operator decision</option>
      <option value="failure">Executor failure — no finding</option><option value="timeout">Timeout — no finding</option></select></label>
    <div data-testid="mission-execution-readable" style="white-space:pre-wrap" aria-live="polite"></div>
    <ol data-testid="mission-execution-timeline" class="mt-2"></ol>
    <div class="d-flex flex-wrap gap-2 mt-2">
      <button type="button" class="btn btn-primary btn-sm" data-execution="start">Run demo simulation</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-execution="step">Next simulation update</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-execution="resume">Continue within approved boundaries</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-execution="abort">Abort simulation</button>
      <button type="button" class="btn btn-outline-ink btn-sm" data-execution="handoff">Acknowledge result</button>
    </div>
    <p role="status" data-testid="mission-execution-status"></p>
    </div>
    <button type="button" class="btn btn-outline-ink btn-sm mt-2" data-testid="mission-new">Start a new mission</button>
    <p class="small">A new mission creates a separate instance and keeps this run's history. Other windows must connect to that new instance.</p>
    <details class="mt-3"><summary>Technical details</summary>
      <p>Current mission JSON</p><pre data-testid="mission-review-summary" style="white-space:pre-wrap;max-height:16rem;overflow:auto"></pre>
      <p>Simulation JSON</p><pre data-testid="mission-execution-summary" style="white-space:pre-wrap;max-height:16rem;overflow:auto"></pre>
    </details>`;
  const find = name => root.querySelector(`[data-testid="${name}"]`);
  const token = find('mission-review-token'), status = find('mission-review-status'), executionStatus = find('mission-execution-status');
  let snapshot = null, execution = null, version = 0, busy = false, refreshing = false, events = [],listedScope=null,autoOpened=false;
  if(separateSimulation){find('mission-inline-simulation').hidden=true;find('mission-extra-details').open=false;find('mission-agent-identity').hidden=true;find('saved-mission-room-preview').hidden=true;}
  const current = () => {
    const scope = getScope();
    if (!scope.agentId || !scope.accessCode) throw new Error('Connect to a mission agent first.');
    return {...scope, key: `${scope.agentId}:${scope.accessCode}`};
  };
  const mission = () => snapshot ? JSON.parse(snapshot.mission) : null;
  const credentialRequired = () => snapshot?.supervisorCredentialRequired !== false;
  function controls() {
    const m = mission(), phase = execution?.phase;
    const active = ['awaiting_acceptance','coordination','escalation'].includes(phase);
    const allowed = {start: !snapshot?.savedMission && !!m?.ready && supportedDemo(m) && !execution,
      step: ['awaiting_acceptance','coordination'].includes(phase), resume: phase === 'escalation',
      abort: active, handoff: phase === 'completion_handoff'};
    root.querySelectorAll('[data-execution]').forEach(button => {button.disabled = busy || !allowed[button.dataset.execution];});
    root.querySelectorAll('[data-decision]').forEach(button => {
      const action = button.dataset.decision;
      button.disabled = busy || !m || (action === 'approve' && (m.ready || m.phase !== 'safety_and_approval'))
        || (action === 'revoke' && !m.ready);
    });
    find('mission-review-load').disabled = busy;
    find('saved-missions-open').disabled=busy||!openSaved||!find('saved-missions').value;
    find('saved-missions-refresh').disabled=busy;
    find('saved-missions').disabled=busy;
    find('mission-execution-variant').disabled = busy || !!execution;
    find('mission-new').disabled = busy || !snapshot || !createNew || active || phase === 'completion_handoff';
    wizard.setBusy(busy || !snapshot || !!execution);
    const saved=snapshot?.savedMission;
    find('mission-run-external').hidden=!saved;
    find('mission-edit').hidden=!separateSimulation||!saved;
    find('mission-edit').disabled=busy;
    let canRun=false;
    try{canRun=!!saved&&saved.configuredRevision===m?.revision&&taskSpecification(m,{savedRoom:saved.room,options:saved.simulationOptions})?.specificationStatus==='reviewable';}catch{}
    find('mission-run-external').disabled=busy||!canRun;
  }
  function render() {
    const m = mission();
    find('mission-review-credential').hidden = !credentialRequired();
    find('mission-review-password-mode').hidden = credentialRequired();
    token.disabled = !credentialRequired();
    find('mission-agent-identity').textContent = getScope().agentId ? `Mission instance: ${getScope().agentId}` : '';
    find('mission-readable-summary').textContent = m ? missionText(m) : 'Load the current mission to begin.';
    const saved=snapshot?.savedMission;
    find('saved-mission-summary').textContent=saved?`Saved mission: ${saved.name} · task revision ${m.revision} · room ${saved.room.name}, revision ${saved.room.revision}${saved.configuredRevision!==m.revision?' · task changed since this room was selected; review and save the task again.':''}`:'';
    let specification;
    try{
      renderRoomPreview(find('saved-mission-room-preview'),saved?.room);
      specification=taskSpecification(m,{savedRoom:saved?.room,options:saved?.simulationOptions});
    }catch(error){
      find('saved-mission-room-preview').textContent=`Saved mission data unavailable: ${error.message} Reopen the task and review its room and simulation instructions.`;
      specification=taskSpecification(m);
    }
    find('task-specification-readable').textContent = taskSpecificationText(specification);
    find('task-specification-json').textContent = specification ? JSON.stringify(specification, null, 2) : '';
    find('mission-review-summary').textContent = m ? JSON.stringify(m, null, 2) : '';
    find('mission-execution-summary').textContent = execution ? JSON.stringify(execution, null, 2) : '';
    if (execution) find('mission-execution-variant').value = execution.variant;
    find('mission-execution-readable').textContent = executionText(execution);
    if(saved&&!execution)find('mission-execution-readable').textContent='Run simulation opens this mission in a separate tab.';
    if (m && !supportedDemo(m) && !execution) find('mission-execution-readable').textContent += '\nCustom missions can be configured and reviewed; this simulator only runs the R-204 printed-indicator demo.';
    if (execution && m && execution.revision !== m.revision) find('mission-execution-readable').textContent += '\nThis run belongs to an earlier mission revision. Its result is historical.';
    find('mission-execution-timeline').replaceChildren(...events.map(event => {
      const item = document.createElement('li'); item.textContent = eventText(event); return item;
    }));
    controls();
  }
  async function request(suffix, options = {}) {
    const scope = current();
    return fetch(`/demo/agents/${encodeURIComponent(scope.agentId)}${suffix}`, {
      ...options, cache:'no-store', headers: {'X-Prometheus-Access-Code':scope.accessCode, ...options.headers},
    });
  }
  async function load() {
    const scope = current(), generation = version;
    const valid = () => generation === version && getScope().agentId === scope.agentId && getScope().accessCode === scope.accessCode;
    const response = await request('/mission-review');
    if (!valid()) return;
    if (!response.ok) { snapshot = null; execution = null; events = []; render(); throw new Error(`Unable to load mission (${response.status}). Reconnect and try again.`); }
    const payload = await response.json();
    const running = await request('/mission-execution');
    if (!running.ok && running.status !== 404) throw new Error(`Unable to load simulation (${running.status}).`);
    const run = running.ok ? await running.json() : null;
    const stored = run ? await request('/storage') : null;
    const entries = stored?.ok ? await stored.json() : [];
    if (!valid()) return;
    const changed = snapshot && snapshot.mission !== payload.mission;
    snapshot = {...payload, scope:scope.key}; execution = run;
    events = entries.filter(entry => /^disaster_execution\.event\.\d+$/.test(entry.key))
      .map(entry => JSON.parse(entry.value)).filter(event => event.executionId === run?.executionId).sort((a,b) => a.sequence-b.sequence);
    if (changed) { token.value = ''; status.textContent = 'Mission updated. Review the current revision before deciding.'; }
    render();
  }
  const wizard = mountMissionWizard(find('mission-guided-input'), {compact:separateSimulation,getMission: mission,getSavedMission:()=>snapshot?.savedMission, save: async body => {
    let simulationTab=null;
    if(separateSimulation){
      if(!body.savedMission)throw new Error('Name the mission and select a saved room.');
      const spec=taskSpecification({...body.fields,missingInformation:[],approvalState:body.fields.safetyAssessment==='safe'?'not_requested':'blocked'}, {savedRoom:body.savedMission.room,options:body.savedMission.simulationOptions});
      if(spec.specificationStatus!=='reviewable')throw new Error('Choose printed fire-indicator inspection on flat indoor terrain and resolve the safety checks.');
      simulationTab=window.open('about:blank','_blank');
      if(!simulationTab)throw new Error('Allow a new tab for this application, then click Run simulation again.');
      simulationTab.opener=null;
    }
    const scope = current(), generation = ++version; busy = true; controls();
    try {
      const response = await request('/mission-configuration', {method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
      if (generation !== version || scope.key !== current().key) throw new Error('Connection changed. Open the form for the current mission.');
      if (!response.ok) {
        if (response.status === 409) { await load(); throw new Error('The mission changed in another window. Cancel and reopen the form to review the latest revision.'); }
        throw new Error(`Task could not be saved (${response.status}). Check the supported robot/terrain combination and keep descriptions short.`);
      }
      if(body.savedMission){
        const savedResponse=await response.json();
        if(!savedResponse.savedMission){await load();throw new Error('This server has not loaded the saved-room update. Restart the application, then review and save the mission again.');}
        if(body.savedMission.simulationOptions&&!savedResponse.savedMission.simulationOptions){await load();throw new Error('This server has not loaded simulation instructions. Restart the application, then review and save the mission again.');}
      }
      token.value = ''; await load();
      try{await refreshSavedMissions();}catch(error){find('saved-missions-status').textContent=error.message;}
      if(simulationTab){simulationTab.location.replace(new URL(`simulation.html?mission=${encodeURIComponent(scope.agentId)}`,location.href).href);find('mission-run-status').textContent='Press Start in the simulation tab.';}
    } catch(error){simulationTab?.close();throw error;} finally { busy = false; controls(); }
  }});
  async function refreshSavedMissions(){
    const scope=current(),generation=version,select=find('saved-missions');
    const headers={'X-Prometheus-Access-Code':scope.accessCode};
    const response=await fetch('/demo/agents',{cache:'no-store',headers});
    if(!response.ok)throw new Error(`Unable to list saved missions (${response.status}).`);
    const agents=await response.json();
    if(!Array.isArray(agents))throw new Error('Unable to read the saved mission list. Refresh missions to try again.');
    // Only request mission endpoints for agents that advertise the mission profile.
    const records=await Promise.all(agents.filter(agent=>agent.interactionProfile?.profileTags?.includes('demo.disaster_mission')).map(async agent=>{
      const result=await fetch(`/demo/agents/${encodeURIComponent(agent.id)}/mission-review`,{cache:'no-store',headers});
      if(!result.ok)throw new Error(`Unable to load a saved mission (${result.status}). Refresh the list.`);
      const review=await result.json();return {id:agent.id,saved:review.savedMission};
    }));
    if(generation!==version||getScope().agentId!==scope.agentId||getScope().accessCode!==scope.accessCode)return;
    select.replaceChildren(new Option('Choose a saved mission',''));
    for(const {id,saved} of records.filter(record=>record.saved).sort((a,b)=>a.saved.name.localeCompare(b.saved.name)))
      select.add(new Option(`${saved.name} · ${saved.room.name} (room v${saved.room.revision})`,id));
    select.value=scope.agentId;listedScope=scope.key;controls();
    find('saved-missions-status').textContent=records.some(record=>record.saved)?'Saved missions for this access code. Open restores the saved task and room preview; it does not start a run.':'No named missions saved yet. Select a room and mission name when reviewing your task.';
  }
  async function perform(operation, output) {
    if (busy) return;
    const generation = ++version; busy = true; controls();
    try { await operation(); }
    catch (error) { if (generation === version) output.textContent = error.message; }
    finally { if (generation === version) {busy = false; controls();} }
  }
  find('mission-review-load').onclick = () => perform(async () => {await load(); executionStatus.textContent = '';}, status);
  find('saved-missions').onchange=controls;
  find('saved-missions-refresh').onclick=()=>perform(refreshSavedMissions,find('saved-missions-status'));
  find('saved-missions-open').onclick=()=>perform(async()=>{const id=find('saved-missions').value;if(id&&openSaved)await openSaved(id);},find('saved-missions-status'));
  root.querySelectorAll('[data-decision]').forEach(button => { button.onclick = () => perform(async () => {
    const generation = version, scope = current(), credential = token.value, saved = snapshot;
    token.value = '';
    if (!saved || saved.scope !== scope.key) throw new Error('Load and review the current mission first.');
    if (credentialRequired() && !credential) throw new Error('Enter your supervisor credential.');
    const headers = {'Content-Type':'application/json'};
    if (credentialRequired()) headers['X-Prometheus-Supervisor-Token'] = credential;
    const response = await request('/mission-review', {method:'POST', headers,
      body:JSON.stringify({requestId:crypto.randomUUID(), revision:JSON.parse(saved.mission).revision,
        reviewVersion:saved.reviewVersion, safetyReference:saved.safetyReference, decision:button.dataset.decision})});
    if (generation !== version) return;
    await load();
    if (!response.ok) throw new Error(response.status === 409 ? 'The mission changed or is not ready for approval. Review the refreshed mission.' : `Decision rejected (${response.status}). Check your supervisor credential.`);
    status.textContent = `Recorded: ${button.dataset.decision}. No robot execution triggered.`;
  }, status); });
  root.querySelectorAll('[data-execution]').forEach(button => {button.onclick = () => perform(async () => {
    const generation = version, action = button.dataset.execution;
    if (!snapshot || snapshot.scope !== current().key) throw new Error('Load the current mission first.');
    const headers = {'Content-Type':'application/json'};
    let body, path = '/mission-execution';
    if (action === 'start') {
      if (credentialRequired() && !token.value) throw new Error('Enter the supervisor credential in Mission supervisor review to start the demo.');
      if (credentialRequired()) headers['X-Prometheus-Supervisor-Token'] = token.value;
      token.value = '';
      body = {requestId:crypto.randomUUID(), revision:mission().revision, reviewVersion:snapshot.reviewVersion,
        safetyReference:snapshot.safetyReference, variant:find('mission-execution-variant').value};
    } else {
      if (!execution) throw new Error('Start or load a simulation first.');
      path += '/updates'; body = {executionId:execution.executionId, expectedSequence:execution.sequence, action};
    }
    const response = await request(path, {method:'POST',headers,body:JSON.stringify(body)});
    token.value = '';
    if (generation !== version) return;
    await load();
    if (!response.ok) throw new Error(response.status === 409
      ? 'This action no longer applies. The current mission and simulation have been refreshed; use the available actions.'
      : `Simulation request rejected (${response.status}). Check your access and supervisor credential.`);
    executionStatus.textContent = execution?.phase === 'closed' ? 'Result acknowledged. This simulation is complete.' : 'Simulation updated.';
  }, executionStatus); });
  find('mission-new').onclick = () => perform(async () => { await createNew(); }, status);
  find('mission-edit').onclick=()=>wizard.start();
  find('mission-run-external').onclick=()=>{
    if(find('mission-run-external').disabled)return;
    const tab=window.open(`simulation.html?mission=${encodeURIComponent(current().agentId)}`,'_blank');
    if(tab){tab.opener=null;find('mission-run-status').textContent='Press Start in the simulation tab.';}
    else find('mission-run-status').textContent='Allow a new tab, then click Run simulation again.';
  };
  // Keep two operator windows synchronized without overwriting an open form's answers.
  const refresh = async () => {
    if (busy || refreshing || root.hidden || !getScope().agentId || !getScope().accessCode) return;
    refreshing = true;
    try {await load();if(listedScope!==current().key)await refreshSavedMissions();if(separateSimulation&&!autoOpened&&snapshot){autoOpened=true;if(!snapshot.savedMission)wizard.start();}} catch (error) {status.textContent = error.message;}
    finally {refreshing = false;}
  };
  const timer = setInterval(refresh, 3000);
  timer.unref?.();
  render();
  return {refresh, clear() {
    version++; busy = false; snapshot = null; execution = null; events = []; token.value = '';listedScope=null;autoOpened=false;find('mission-run-status').textContent='';
    find('saved-missions').replaceChildren();find('saved-missions-status').textContent='';
    status.textContent = ''; executionStatus.textContent = ''; wizard.clear(); render();
  }};
}
