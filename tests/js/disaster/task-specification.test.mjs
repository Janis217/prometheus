import { test } from 'node:test';
import assert from 'node:assert/strict';
import { taskSpecification, taskSpecificationText } from '../../../src/main/resources/public/valerian/task-specification.js';

const mission = {missionType:'fire_hotspot_inspection', objective:'Find printed fire indicator',
  environment:'indoor_flat', revision:3, location:'R-204', searchBoundary:'R-204 interior only',
  missingInformation:[], constraints:['Stop on lost link'], operatingConditions:'No actual fire',
  approvalState:'supervisor_approved', ready:true};

test('complete task remains a revision-bound specification, without invented room or execution authority', () => {
  const original = structuredClone(mission);
  const spec = taskSpecification(mission);
  assert.equal(spec.specificationStatus, 'reviewable');
  assert.equal(spec.missionRevision, 3);
  assert.equal(spec.room.configuration, null);
  assert.equal(spec.room.binding, 'not_bound');
  assert.deepEqual(spec.execution, {mode:'simulation_only', started:false, roomSimulatorReady:false});
  assert.ok(spec.requiredSensing.includes('visibility_observation'));
  assert.ok(spec.requiredBehaviour.includes('open_door'));
  assert.match(taskSpecificationText(spec), /Room: R-204/);
  spec.constraints.push('edit');
  assert.deepEqual(mission, original);
});

test('incomplete task identifies clarification rather than claiming readiness', () => {
  const spec = taskSpecification({...mission, location:'', missingInformation:['location','platformSafety'],
    question:'Which room and platform declarations?', approvalState:'not_requested', ready:false});
  assert.equal(spec.specificationStatus, 'needs_clarification');
  assert.match(taskSpecificationText(spec), /Clarify: location, platformSafety/);
  assert.equal(spec.clarification, 'Which room and platform declarations?');
});

test('ambiguous or unsupported task cannot silently become the fire-image task', () => {
  for (const changes of [{objective:'Find something'}, {missionType:'missing_person_search'}, {environment:'outdoor_open'}]) {
    const spec = taskSpecification({...mission, ...changes});
    assert.equal(spec.specificationStatus, 'unsupported');
    assert.match(taskSpecificationText(spec), /supports one task/);
    assert.equal(spec.execution.roomSimulatorReady, false);
  }
  assert.equal(taskSpecification(null), null);
});

test('blocked safety state cannot become a reviewable simulation specification', () => {
  const spec = taskSpecification({...mission, approvalState:'blocked'});
  assert.equal(spec.specificationStatus, 'blocked');
  assert.match(taskSpecificationText(spec), /resolve hazards/);
});
