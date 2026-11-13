# Plan: Valerian task specification and room simulation

Status: VT-01 through VT-06 complete for the structured-input, browser-local
software demonstration (2026-11-06). VT-07 is complete for an independent
browser-local room library. VT-08 is complete for scoped saved missions with
room snapshots; VT-09 is complete for saved-room runs; VT-10 is complete for the user-approved four simulation controls.
VT-11/12 cover cockpit readiness and the clean home/original-Valerian setup/separate-player flow.
VT-13 adds function-call execution and structured results; see its result record.
Human usability review and hardware evidence are not claimed.
Evidence: `VT_RESULTS.md`; walkthrough: `../.doc/valerian-room-simulation.md`.
Source: `inputs/2026-11-06-newValeriaTasks.txt`, copied verbatim from the user's Downloads folder.
Canonical milestone tracker: `GITHUB_ISSUE_BACKLOG.md`.

## Research focus and scope

User scope correction (2026-11-06): no speech-to-text or verbal interpretation.
Use dropdowns and text input to define the task, then run autonomously from those
instructions. This overrides the original input's verbal-interaction wording.

Demonstrate structured human-machine interaction that produces a reviewable
specification for one task, including required sensing and behaviour capabilities.
The execution environment validates the feasibility of that specification.
It is a demonstration simulator; physical robot actions are represented rather
than implemented. The primary contribution is the specification interaction.
Use the existing fire-image room task as the initial planning assumption.

Previously completed DM milestones retain their bounded acceptance evidence.
They do not establish completion of this configurable room simulator. DM-02's
historical real-model gate remains separate; it is not a prerequisite for this
structured-input demonstration and no provider is required.
DM-06 hardware work is outside this new demo sequence.

## Milestones and todos

### VT-01: One-task specification interaction

- [x] Define the single task and its required sensing/behaviour capabilities.
- [x] Map dropdown/text capture, required-field clarification and review onto the existing mission flow.
- [x] Select the task specification format: JSON plus a readable view.
- [x] Define how the reviewed task refers to the generated room and capability constraints.
- [x] Record incomplete/ambiguous briefs and a complete specification as evaluation examples.
- [x] Validate complete form input through real scoped backend persistence without a provider.

Acceptance: an operator can specify one task through dropdowns/text, complete
missing details and inspect the resulting task and required capabilities. No
speech or natural-language interpretation is required.

### VT-02: Text simulation and event contract

Depends on VT-01's specification/event contracts.

- [x] Define shared world state, robot pose, observations, action requests and results.
- [x] Add human-triggered demo events that become perceptions and then behaviour.
- [x] Represent simulated actions such as `fetch`, `open_door`, `pick_up`, and `take_photo`.
- [x] Show each action and its success/failure with a reason in a text timeline.
- [x] Make a locked door cause an unsuccessful `open_door` attempt.

Acceptance: a repeatable text run exposes trigger -> perception -> behaviour ->
result, including a successful action and locked-door failure. Actions remain
explicitly simulated. Catalogue examples do not imply a separate full mission
for each action or actual hardware integrations.

### VT-03: Visual room builder

Depends on VT-02's world schema; UI work can follow once that schema is stable.

- [x] Offer square, rectangular and L-shaped room templates.
- [x] Place one or multiple doors, each independently open/closed and locked/unlocked.
- [x] Place windows, fire pictures and non-fire pictures on walls.
- [x] Place chairs and tables inside the room and select the robot's starting location.
- [x] Choose predefined valid one-metre grid slots.
- [x] Validate placements and generate the configured room.
- [x] Include a smoke toggle in the builder.

Acceptance: each room template can be generated with the listed objects and
states, a valid robot start, and smoke setting. Reject placements outside the
room or incompatible with the chosen placement rules.

### VT-04: Synchronized visual execution and visibility

Depends on VT-02 and VT-03.

- [x] Display robot position and current action during execution.
- [x] Drive visual state and text output from the same simulation events/results.
- [x] Show door attempts and outcomes consistently in both views.
- [x] Define clear-air visibility, including occlusion around the L-shaped corner.
- [x] With smoke enabled, limit robot perception to one field directly ahead
      (approximately one metre; settle grid size and heading semantics first).
- [x] Keep the robot's perceived state distinct from the operator's room overview.
- [x] Allow direct movement to a visible fire picture when the route is clear;
      define bounded search behaviour when the target is not visible.

Acceptance: text and visual views agree on pose, actions and outcomes. The robot
cannot use a target hidden by the selected visibility rules as if it had seen it.
Demonstrate clear air, smoke, an L-shaped occlusion and a locked-door failure.

### VT-05: Integrated demonstration and evaluation

Depends on VT-01 through VT-04; uses structured form input, without a model gate.

- [x] Prepare one walkthrough: dropdown/text input -> reviewed specification -> generated
      room -> injected event/perception -> simulated behaviour -> result.
- [x] Include clear-air success and smoke/locked-door challenging variants.
- [x] Evaluate specification completeness, required-field clarification and capability matching
      as the primary outcome; simulator consistency is supporting validation.
- [x] Record repeatable inputs, expected outputs, limitations and evidence.
- [x] Execute autonomously after Start: approach/photo/report, automatic door attempts,
      smoke search and bounded blocked/no-target outcomes; verify pause/resume/stop and timer cleanup.

Acceptance: a reviewer can reproduce the walkthrough and distinguish evidence
for the specification interaction from evidence for the demonstration simulator.

## Follow-up milestones

### New user requirements: room -> mission -> run (2026-11-06)

The user confirmed that the room building itself is done and looks good.
The next workflow must let an operator define and save a room first, create
and save a mission with that room and the existing mission information, then
run the saved mission with its room displayed again. Mission input fields and
their effects on simulation will be redesigned later; their final semantics
are not specified yet.

VT-06 covers one browser draft per existing mission, room JSON transfer and
run exports. It does not deliver independent saved rooms, a saved mission's
room association, or the requested saved-mission launch flow. Keep VT-01–06
complete for their original scope; implement the missing workflow below.

Implementation sequence: **VT-07 -> VT-08 -> VT-09**. VT-10 follows the user's
later input/behaviour decisions. These milestones are recorded for subsequent
work. VT-07 through VT-10 were subsequently authorized and completed.

### VT-06: Reusable room scenarios and exportable evidence (follow-up)

Status: complete for browser-local scenarios and downloadable evidence.

- [x] Save/load one room draft per mission instance in the same browser.
- [x] Export/import portable room-only JSON without importing tasks or authority.
- [x] Validate templates, placement, IDs, robot pose, door state and file size
      before replacing the existing scene; reject malformed imports atomically.
- [x] Export run snapshots with task revision, initial room, final state,
      perceptions/actions/results, completion state and explicit simulation flags.
- [x] Demonstrate deterministic replay of the same room and task in unit coverage.
- [x] Verify browser reload, mission isolation, file downloads and rejected imports.
- [x] Verify task-to-export correspondence through the running scoped backend.

Acceptance: a saved room can be reused after reload, a room file can be moved
between browser windows without altering their task or starting execution, and
a run report accurately records its original scene and actual observed outcome.
Runs do not resume automatically after reload; saved rooms are browser-local,
not server persistence or execution synchronization.

### VT-07: Independently saved rooms

Status: complete (2026-11-06). Browser-local independent room library,
available before login/mission creation. Stable IDs and immutable numbered
revisions prepare explicit bindings for VT-08. Storage is per browser origin,
not per access code; it survives reload but is not shared across browsers,
hosts or ports. No access credentials are stored in the library. Existing
mission-specific drafts remain separate; JSON transfer remains available.

Goal: define and save a room before creating any mission, reusing the accepted
room builder.

- [x] Make room creation accessible without a connected/existing mission.
- [x] Define a saved-room record with identity, name, validated layout and
      revision, including objects, door states, robot start/heading and smoke.
- [x] Choose and document persistence appropriate to the saved-mission workflow;
      resolve browser-local versus backend storage before implementation and
      state its reload/browser/access-scope guarantees explicitly.
- [x] Save and list multiple named rooms; reopen a saved room for review/editing.
- [x] Keep validation and existing room import/export usable with saved rooms.
- [x] Specify how edits produce revisions so a later mission's selected layout
      cannot change silently.
- [x] Verify room creation before mission creation and exact layout restoration
      after reload; reject invalid saves without losing the current room.

Acceptance: create and save two different rooms before creating a mission,
reload, select either by name, and recover its full layout and starting state.

Evidence: `VT07_RESULTS.md`. Entry point: `/valerian/rooms.html`, linked from
the access screen and cockpit. Previous versions remain loadable by stable ID
and revision through the library module; the UI opens the latest revision.
Web Locks serialize saves across tabs; stale editors must reopen or save a
new room. Existing mission drafts/runs and supervisor authentication are unchanged.

### VT-08: Mission building with a selected saved room

Status: complete (2026-11-06). Depends on VT-07. Keep the independent
room library browser-local; save the mission name and validated immutable room
snapshot in the scoped backend, atomically with current task configuration.
Existing unnamed tasks remain supported. Integrated saved-mission Run is VT-09.

Goal: create a mission using a saved room and the existing mission inputs, then
save the complete mission for later selection and execution.

- [x] Define the saved mission's identity, task data, revision and selected room
      reference/revision or immutable room snapshot.
- [x] Let the operator select and preview a saved room during mission creation.
- [x] Retain the current dropdown/text inputs and review interaction initially;
      defer their redesign to VT-10.
- [x] Save task information and the room association together with explicit
      validation and success/failure feedback.
- [x] List and reopen saved missions with their task information and room intact.
- [x] Define room-edit handling: an existing saved mission retains its reviewed
      layout until an explicit update, which invalidates affected prior review.
- [x] Respect existing access scopes and applicable mission review/version rules.
- [x] Verify two missions can reuse a room, survive reload and preserve their
      own task data and intended room revision without cross-over.

Acceptance: select a saved room, enter the current mission information, save
the mission, reload, then reopen it with the same task and room. Saving alone
does not start simulation.

Evidence: `VT08_RESULTS.md`. Existing scoped agent Storage persists task,
mission name and a validated, normalized room snapshot in one transaction.
Room snapshots use bounded chunks to respect the 2048-character entry limit.
Reopening updates the selected mission ID in the URL so reload restores the
right instance. Explicit room changes increment task revision and invalidate
approval. Named saved-room missions show a read-only preview; their integrated
Run is VT-09, with unrelated legacy/demo Start disabled for these missions.

### VT-09: Run a saved mission in its saved room

Status: complete (2026-11-10). Evidence: `VT09_RESULTS.md`.

Goal: select a saved mission, run it, redisplay its associated room and observe
the simulation in that room.

- [x] Add an explicit Run action for a selected saved mission with clear
      readiness feedback using the applicable existing simulation checks.
- [x] Load the mission's saved room and task revision together; display the room
      before movement starts rather than requiring the user to rebuild it.
- [x] Start a fresh run from the saved initial layout, object states and robot
      pose, retaining existing visibility and autonomous simulation behaviour.
- [x] Keep runtime world changes separate from saved room/mission definitions.
- [x] Retain synchronized room/timeline output, pause/resume/stop and run export;
      identify the saved mission and room revisions in run evidence.
- [x] Handle missing/incompatible saved data with actionable feedback and no
      silent fallback to a different room or task.
- [x] Verify the full room-save -> mission-save -> reload -> select -> Run path,
      plus repeated runs and two missions bound to different rooms.

Acceptance: reopen a saved mission after reload, click Run, and see its exact
room and starting robot pose restored before autonomous execution. Changes
within the run do not overwrite the saved starting room. Repeating the run
starts from that saved state. Mid-run persistence/resume is not assumed.

### VT-10: Mission inputs that determine simulation behaviour

Status: complete (2026-11-10). User approved first/all findings, photo/observation
evidence, door policy and step limit. Evidence: `VT10_RESULTS.md`.
Mapping and examples: `../.doc/valerian-room-simulation.md#simulation-instructions-vt-10`.

Goal: revise what the mission form asks and make the agreed executable inputs
actually affect simulation.

- [x] Agree which fields to retain, add, change or remove and the intended
      simulation effect of each; distinguish descriptive fields explicitly.
- [x] Record a field-to-behaviour mapping with validation, units/allowed values,
      defaults and treatment of unsupported or conflicting instructions.
- [x] Update the mission schema, form and readable review to match that mapping.
- [x] Decide how existing saved missions are reopened or migrated when inputs
      change; never silently reinterpret their saved meaning.
- [x] Connect executable mission inputs to simulation setup, decisions, stopping
      conditions and outcome evaluation as agreed for each field.
- [x] Show the effective instructions used by each run in its review/report.
- [x] Verify paired runs with the same room but different executable inputs
      exhibit the agreed differences, including invalid/unsupported cases.

Acceptance: for every agreed executable input, a documented example demonstrates
its observable simulation effect. Final examples and field semantics must be
defined with the user before declaring this milestone ready for implementation.

### VT-12: Clean entry, guided setup and a separate simulation tab

Status: complete (2026-11-10), explicitly requested by the user. Evidence: `VT12_RESULTS.md`.

- [x] Home has two choices: Start a mission / Create simulation room.
- [x] Room builder opens a new tab and saves rooms for selection in the first tab.
- [x] Mission questions stay in the first tab; room selection is at the end.
- [x] Run simulation saves the mission and opens a new tab without auto-starting.
- [x] New tab shows room, Start/pause/resume/stop and synchronized step output.
- [x] Preserve task/room version binding, scoped access and exports; reject invalid data.
- [x] Verify full multi-tab workflow, popup retry, reload, changed mission and mobile layout.

### VT-13: Simulated function calls and execution results

Status: complete (2026-11-10), explicitly requested by the user. Evidence: `VT13_RESULTS.md`.

- [x] Define a versioned action-call and correlated result contract for every action.
- [x] Include directions, units, poses, target IDs, findings/evidence and report recipient.
- [x] Execute calls through a simulation function registry with live-world checks.
- [x] Separate immutable capture evidence from later changes to observed/world objects.
- [x] Support deterministic scenario hooks for faults and obstacle movement at action boundaries.
- [x] Display calls/results in both timelines and retain them in exported evidence.
- [x] Verify live obstruction, replanning, failures, terminal outcomes and existing workflows.

VT-14 below adds scheduled furniture relocation; continuous moving actors,
new floor-obstacle types and hardware adapters remain future work.

### VT-14: Saved scheduled obstacle moves

Status: complete (2026-11-13). User selected simulation only after the next-task
discussion. Evidence: `VT14_RESULTS.md`.

- [x] Add/remove chair/table relocations at numbered action boundaries in the room builder.
- [x] Validate and retain schedules in imports, named room revisions and mission snapshots.
- [x] Reject occupied runtime destinations without overlapping objects or the robot.
- [x] Recheck planned robot actions against the changed world and replan normally.
- [x] Display and export applied/blocked changes; repeat runs restore original state.
- [x] Verify invalid schedules, legacy files, repeat runs, saved revisions and player UI.

## Original implementation decisions

- Exact single-task boundary and specification format.
- Grid/slot placement versus free placement and room dimensions.
- Clear-air field of view, wall/object occlusion, robot heading and smoke range.
- Bounded movement/search rules and blocked-action recovery.
- Reuse/extension points in the current mission schema, DM-05 adapter and Valerian UI.

These are implementation decisions, not reasons to lose or defer the requirements.
The original intake made no runtime changes. Current software evidence and
remaining boundaries are recorded in `VT_RESULTS.md`. Qualitative human usability
evaluation is separate from the completed deterministic software acceptance.
