import { label } from './mission-presentation.js';
import { mountMissionRoomPicker } from './mission-rooms.js';

export const demoFields = {missionType:'fire_hotspot_inspection', objective:'Find printed fire indicator', priority:'low',
  location:'R-204', environment:'indoor_flat', risks:'printed image only; no actual fire',
  operatingConditions:'clear room; stop on hazard or lost link', searchBoundary:'R-204 interior only', safetyAssessment:'safe'};
const robots = {indoor_flat:'ground robot', indoor_rubble:'dog robot', outdoor_open:'drone'};
const commonChecks = ['communications','safeStandoff','platformSuitability'];
export const requiredChecks = terrain => [...commonChecks, ...(terrain === 'outdoor_open'
  ? ['flightClearance','weatherEnvelope'] : terrain === 'indoor_rubble' ? ['structuralClearance','terrainSuitability'] : ['accessClearance','terrainSuitability'])];
const questions = [
  ['missionType','What should the robot do?', ['fire_hotspot_inspection','missing_person_search','rubble_assessment']],
  ['objective','Describe the objective'], ['location','Where is the mission?'],
  ['environment','What terrain will it encounter?', ['indoor_flat','indoor_rubble','outdoor_open']],
  ['robot','Which supported robot should be used?', ['ground robot','dog robot','drone']],
  ['priority','What is the priority?', ['low','medium','high','critical']],
  ['searchBoundary','What is the search boundary?'], ['risks','What hazards are present?'],
  ['operatingConditions','What operating conditions and stop rules apply?'],
  ['safetyAssessment','Have hazards, mitigations, robot suitability and applicable clearances been assessed?', ['unknown','safe','unsafe']],
];
export function mountMissionWizard(root, {save, getMission, getSavedMission=()=>null,compact=false,onCancel=()=>{}}) {
  let fields = {}, evidence = {}, robot = '', step = 0, expectedRevision = 0, roomDraft=null;
  root.innerHTML = `<div class="d-flex flex-wrap gap-2"><button type="button" class="btn btn-primary" data-testid="mission-create">Create task</button>
    <button type="button" class="btn btn-outline-ink" data-testid="mission-demo">Load R-204 demo</button></div>
    <p class="small mt-2">Answer the questions or use demo answers. The room builder simulates printed fire-indicator inspection on flat indoor terrain. The scripted demo uses R-204.</p>
    <form data-testid="mission-wizard" hidden class="mt-3"></form><p role="status" data-testid="mission-config-status"></p>`;
  const form = root.querySelector('form'), status = root.querySelector('[role="status"]');
  if(compact){root.dataset.wizardMode='compact';root.querySelector(':scope > div').hidden=true;root.querySelector(':scope > p').hidden=true;}
  function steps() { return [...questions.map(question => question[0]==='objective' && fields.missionType==='fire_hotspot_inspection'
    ? ['objective','Which inspection task should the robot perform?', ['Find printed fire indicator','Inspect thermal hotspots']]
    : question), ...requiredChecks(fields.environment).map(key => [key, `Confirm: ${label(key)}`, ['unknown','confirmed','failed']])]; }
  function start(demo) {
    const previous = getMission(); expectedRevision = previous?.revision ?? 0;
    roomDraft=structuredClone(getSavedMission());
    fields = demo ? {...demoFields} : Object.fromEntries(Object.keys(demoFields).map(key => [key, previous?.[key] || '']));
    evidence = demo ? Object.fromEntries(requiredChecks('indoor_flat').map(key => [key,'confirmed'])) : {...previous?.platformSafety?.declarations};
    robot = demo ? 'ground robot' : robots[fields.environment] || ''; step = demo ? steps().length : 0;
    status.textContent = ''; form.hidden = false; render();
  }
  function render() {
    const all = steps(), final = step >= all.length;
    let roomPicker=null;
    form.replaceChildren();
    const heading = document.createElement('h3'); heading.className = 'h6';
    heading.textContent = final ? 'Review your answers' : `Question ${step + 1} of ${all.length}`;
    if(!compact||!final)form.append(heading);
    if (final) {
      const list = document.createElement('dl');
      for (const [key,value] of [...Object.entries(fields), ['robot',robot], ...Object.entries(evidence)]) {
        const term = document.createElement('dt'), definition = document.createElement('dd');
        term.textContent = key === 'robot' ? 'Robot' : label(key); definition.textContent = label(value); list.append(term,definition);
      }
      if(compact){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Review answers';details.append(summary,list);form.append(details);}
      else form.append(list);
      const roomRoot=document.createElement('section');form.append(roomRoot);
      roomPicker=mountMissionRoomPicker(roomRoot,roomDraft,{compact,defaultName:fields.location?`${fields.location} inspection`:'Room inspection',onChange:value=>{
        roomDraft=value;const confirm=form.querySelector('[data-testid="mission-confirm"]');if(confirm)confirm.checked=false;
      }});
      const confirmation = document.createElement('label'); confirmation.className = 'd-block my-2';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.required = true;
      checkbox.dataset.testid = 'mission-confirm'; confirmation.append(checkbox, compact?' I confirm the mission details and safety checks.':' I reviewed these answers and explicitly confirm the selected safety declarations for this mission.');
      form.append(confirmation);
    } else {
      const [key, question, options] = all[step];
      const title = document.createElement('label'); title.className = 'form-label'; title.htmlFor = 'mission-answer'; title.textContent = question;
      const control = document.createElement(options ? 'select' : 'input');
      control.id = 'mission-answer'; control.className = options ? 'form-select' : 'form-control'; control.dataset.testid = 'mission-answer';
      if (options) {
        const placeholder = new Option('Choose an answer', ''); control.add(placeholder);
        const available=compact&&['missionType','environment','objective'].includes(key)
          ? options.filter(option=>option===({missionType:'fire_hotspot_inspection',environment:'indoor_flat',objective:'Find printed fire indicator'}[key])):options;
        for (const option of available) {
          const item = new Option(label(option), option);
          if (key === 'robot') item.disabled = option !== robots[fields.environment];
          control.add(item);
        }
      } else { control.maxLength = 300; control.type = 'text'; }
      control.required = true; control.value = key === 'robot' ? robot : fields[key] ?? evidence[key] ?? '';
      form.append(title, control);
      if (key === 'robot') {
        const hint = document.createElement('p'); hint.className = 'small'; hint.textContent = `Recommended: ${robots[fields.environment]}. Other terrain/robot combinations are not supported by this planner.`; form.append(hint);
      }
      const defaultButton = document.createElement('button'); defaultButton.type = 'button'; defaultButton.className = 'btn btn-outline-ink btn-sm my-2';
      defaultButton.dataset.testid = 'mission-use-default'; defaultButton.textContent = 'Use demo answer';
      defaultButton.onclick = () => { control.value = key === 'robot' ? robots[fields.environment] : demoFields[key] ?? 'confirmed'; };
      if(!compact)form.append(defaultButton);
    }
    const actions = document.createElement('div'); actions.className = 'd-flex gap-2 mt-2';
    const back = document.createElement('button'); back.type = 'button'; back.className = 'btn btn-outline-ink'; back.textContent = 'Back'; back.disabled = step === 0;
    back.onclick = () => { if (!final) remember(); step--; render(); };
    const next = document.createElement('button'); next.type = 'submit'; next.className = 'btn btn-primary'; next.dataset.testid = 'mission-next';
    next.textContent = final ? (compact?'Run simulation':'Save task for supervisor review') : 'Next';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'btn btn-outline-ink'; cancel.textContent = 'Cancel'; cancel.onclick = () => {form.hidden = true;onCancel();};
    actions.append(back,next,cancel); form.append(actions);
    form.onsubmit = async event => {
      event.preventDefault();
      if (!final) { remember(); step++; render(); return; }
      next.disabled = true;
      try { await save({expectedRevision, fields, platformEvidence: evidence, robot,savedMission:roomPicker.read()}); form.hidden = true;
        status.textContent = compact?'':'Task saved. Review the summary below. Complete tasks need separate supervisor approval.';
      } catch (error) { status.textContent = error.message; }
      finally { next.disabled = false; }
    };
    form.querySelector('#mission-answer')?.focus();
  }
  function remember() {
    const key = steps()[step][0], value = form.querySelector('#mission-answer').value;
    if (key === 'robot') robot = value;
    else if (key in demoFields) {
      if (key === 'environment' && fields.environment !== value) { evidence = {}; robot = robots[value] || ''; fields.safetyAssessment = 'unknown'; }
      fields[key] = value;
    } else evidence[key] = value;
  }
  root.querySelector('[data-testid="mission-create"]').onclick = () => start(false);
  root.querySelector('[data-testid="mission-demo"]').onclick = () => start(true);
  return {start:()=>start(false),clear() { form.hidden = true; form.replaceChildren(); status.textContent = ''; },
    setBusy(busy) {root.querySelectorAll(':scope > div button').forEach(button => {button.disabled = busy;});}};
}
