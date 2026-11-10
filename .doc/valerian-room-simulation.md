# Task specification and room simulation

## Main workflow

Open `/` or `/valerian/`. The home screen has two choices:

1. **Create simulation room** opens the room builder in a new tab. Name and save
   a layout, then return to the first tab.
2. **Start a mission** opens the original Valerian cockpit in the first tab,
   with guided questions in its Interaction panel. Enter an access code if
   requested; an existing session is reused. Sensing/camera components remain
   governed by the selected agent's existing capabilities.
3. At the end, name the mission, select its saved room and confirm the answers.
   Simulation settings are optional and collapsed by default.
4. **Run simulation** saves the task/room and opens `simulation.html` in a new tab.
5. **Start** begins execution there. The room and step output share the same
   simulation events. Pause/resume, Stop, repeat and export are available.

Opening or reloading the simulation tab never starts movement automatically.
Changing its saved mission in another tab invalidates the old simulation until
Reload mission. Export a report before replacing a run. Access stays in session
storage; URLs contain only the mission ID. A separately opened simulation link
may ask for its access code. Missing or incompatible data never uses another room.

Mission setup uses `/valerian/cockpit.html?setup=mission&agentId=...`, preserving
the original Valerian interface without an embedded room builder/player. The
full development cockpit remains at `/valerian/developer-cockpit.html`. The cockpit
sections below describe that separate surface and its existing compatibility flow.

## Function-call output (VT-13)

Every step is a simulated function call with parameters, followed by its actual
result. For example, move includes compass direction, one-metre distance and
from/to coordinates; open_door includes door ID, position and force=false.
Report_findings includes mission identity/revision, recipient, captured findings
and evidence, coverage and partial-result status.

The result line distinguishes succeeded, blocked, failed and not_implemented,
with a stable code such as OK, DOOR_LOCKED or OBSTACLE_BLOCKED. Expand **Result**
to inspect returned data and actual pose. Calls/results are also retained in the
exported report. The displayed function text is not evaluated as program code.

Actions execute against the current simulated world, so an obstacle appearing
between planning and execution can block a move. A deterministic scenario hook
supports this and simulated actuator faults; the planner can then replan from
updated observations. Full timed moving-object/floor-obstacle controls are later
work. See [function contracts and extension points](simulation-action-contract.md).

## Independent room library

Open `/valerian/rooms.html` on your current running server, or use **Build and
save rooms** on the access screen / **Rooms** in the cockpit header. This page
does not need an access code, agent instance or mission.

1. Choose a shape and place room objects and the robot using the existing grid.
2. Enter a **Room name**, then click **Save new room**.
3. Click **New room** to build and save another layout. Save/export current
   changes first; New room starts a blank layout.
4. Select a room from **Saved rooms** and click **Open saved room** to review or
   edit it. This also replaces the current working layout.
5. **Save new revision** retains the room identity and appends a version without
   overwriting its older layouts. **Save as new room** creates a separate identity.

The list opens the latest saved revision. Prior revisions remain stored for
explicit mission bindings. If another tab saves first,
reopen that room or save your own layout as a new room instead of overwriting it.

Rooms persist in this browser profile at this exact server address, independently
of login and access code. Ports 49679 and 8080 have separate libraries; so do
`localhost` and `127.0.0.1`. Export/import room JSON to transfer a layout to your
friend or another address. Clearing browser data removes saved rooms. No backend
room synchronization or per-access-code library privacy is provided.

Mission creation with a selected saved room is available (VT-08), as described
below. Saved-mission Run is available (VT-09). The mission-local simulator
walkthrough remains available for tasks without saved rooms; its old
**Save room in browser** stores a separate per-instance draft.

## Save and reopen a mission with a room

1. Build and save a named room on the Rooms page at the same browser/server
   address you will use for mission creation.
2. Return to Valerian, enter the access code and connect a Disaster Mission
   Configuration instance. To keep an existing mission, use **Start a new
   mission** to create a separate instance before entering the next task.
3. Use **Create task** and the existing dropdown/text questions, or **Load R-204
   demo**. On **Review your answers**, enter a **Mission name** and choose a
   **Saved room**. Review its read-only layout and saved revision. **Refresh
   rooms** discovers rooms saved in another tab without changing your selection.
4. Confirm the declarations after selecting the room, then **Save task for
   supervisor review**. Task configuration, mission name and a validated copy of
   the selected room are saved in one database transaction. Saving does not
   approve the mission or start simulation.
5. Use **Saved missions → Refresh missions**, select a named mission and
   **Open saved mission**. The task and its room preview reopen together; reload
   reconnects to that selected mission. This list is limited to the access code's
   visible agents and requires a mission-agent connection.
6. To change a mission's room, reopen its task review, explicitly select the
   desired saved revision, reconfirm and save. This increments the task revision
   and invalidates earlier approval. Saving a newer room in the browser library
   alone never changes an existing mission.

Mission identity is its agent instance ID; room identity/revision and its full
layout are saved with the task. Names need not be unique. Saved missions use the
server database and access scope, while the room library is browser-local. An
already saved mission still shows its room if the local library is cleared or
the mission is opened from another browser with the same server/access scope.
The demo database remains disposable when its harness is cleaned up.

Click **Run saved mission** in the simulation workspace. The saved layout and
robot pose appear before execution. Each run starts from the saved initial state,
including doors and smoke. Pause/resume, Stop, synchronized grid/timeline and
**Export run report** remain available. Run again after completion or Stop, or
use **Reset to saved room** to clear the previous local timeline. Export before
resetting to retain evidence. Reports include mission identity/task revision,
saved room identity/revision, initial world and actual results.

Runs are browser-local demonstrations using existing supported-task, completeness
and blocked-safety checks. Runtime changes never update saved definitions.
Reload/disconnect discards the run. Changed task revisions require resaving;
malformed room snapshots disable Run with feedback. The room editor and legacy
scripted Start remain disabled for saved-room missions. Tasks saved without a
room retain their existing demo controls. Physical execution is not triggered.

## Room creation and playback stay separate

The mission workspace never mounts or imports the room builder, in either
cockpit mode. Use **Create simulation room** to open the independent room editor
in a new tab, then return and select that saved room when reviewing the mission.
The selected-room preview is read-only. **Run simulation** opens the separate
player; press **Start** there. A task without a saved room must select one before
it can use this room simulation. The development cockpit retains its separate
legacy R-204 diagnostic controls, which do not create rooms.

## Simulation instructions (VT-10)

On the task review screen, select a saved room, then set the four simulation
instructions before confirming and saving. Reopen Create task or Load R-204 demo
to change them; saving increments the task revision and invalidates approval.
Mission name and saved room remain required for this saved-mission workflow.

| Instruction | Values and default | Observable effect |
|---|---|---|
| Search goal | First (default), all reachable | First reports after one finding; all continues exploring reachable observed cells. |
| Evidence | Photo (default), observation only | Collects simulated photos or records findings without any photo action. |
| Doors | Open unlocked (default), avoid closed | Attempts doors without forcing locks, or routes around closed doors without opening them. |
| Autonomous step limit | Integer 1?512; default 512 | At most this many autonomous actions, then stop with retained partial findings. |

Smoke, geometry, objects, door states and robot starting pose come from the room.
Priority, location, free-text search boundary, risks and operating conditions are
mission context; their prose does not alter the route, speed or stopping policy.
Supported task/terrain, completeness and blocked-safety checks still apply.
These controls extend the existing review form rather than removing its safety
and capability declarations.

An all-goal run searches reachable observed space; it never uses unseen target
coordinates. Closed/locked doors or inaccessible known findings yield a partial
report when evidence exists, or a blocked result without evidence. Exhausting
an empty reachable room reports not found. A step limit with no findings reports
blocked; with findings it reports partial. Neither claims full completion.
The initial perception refresh and final limit-stop event are outside the
autonomous action budget; manual demo injections are also outside that budget.

Review text, bound task JSON and run exports show the effective instructions.
Reports retain finding IDs independently from photo IDs. Export before reset.
Older records without instructions resolve to the original defaults; loading
alone does not rewrite them. Task-only older clients preserve existing saved
controls. Explicit unsupported versions/values and fractional/out-of-range
limits are rejected before storage or simulation replacement.

Repeatable paired example: square room, robot at (0,0) facing east, fire pictures
at (1,0) and (5,5). First/photo produces one photo. All/observation produces two
findings and zero photos. All/photo with step limit 1 captures the adjacent
picture then stops partial. In a room with a closed unlocked door at (1,0) and
a picture at (5,0), open-unlocked opens the door; avoid-closed takes another route.

Technical persistence: `PUT /demo/agents/{id}/mission-configuration` optionally
accepts `savedMission: {name, room: {id, revision, name, configuration}, simulationOptions: {version: 1, searchGoal, evidence, doors, stepLimit}}`.
`configuration` is a version-1 room-scenario JSON string. The scoped
`mission-review` response includes `savedMission` and its `configuredRevision`.
Room layouts are validated server-side and stripped to known fields. Metadata
and bounded JSON-string chunks use existing agent Storage entries under
`saved_mission` / `saved_mission.room.*`, avoiding the 2048-character entry limit.
Legacy configuration requests without this field preserve an existing binding;
agent reset removes the saved-mission metadata and room snapshot with the task.

This browser-local demo validates a specification for one task: inspect a flat
indoor room for a printed fire-indicator picture and report simulated photo
evidence. Task definition uses dropdowns and text fields, with no speech-to-text
or inference provider. Human-machine task specification is the research focus. The simulator
provides supporting validation; its perception, movement and photos are synthetic.

## Walkthrough

1. Open Valerian and choose **Create simulation room**. The room editor opens in
   another tab. Choose square, rectangle or L-shaped, place objects, set door
   states, robot pose and optional smoke, then name and save the room.
2. Return to the first tab and choose **Start a mission**. Enter the access code
   if requested; guided questions run in the original Valerian interface.
3. Choose **Find printed fire indicator** on **Flat indoor terrain**, and complete
   the location/boundary, hazards, stop conditions and safety declarations.
4. At the end, name the mission and select the saved room. Review the answers
   and optional simulation settings, confirm and press **Run simulation**.
5. The separate simulation tab shows the saved starting world. Press **Start**.
   The robot searches, approaches a perceived indicator and executes the selected
   evidence/report functions automatically. Room and text output use the same events.
6. Use **Pause**, **Resume** or **Stop** in that tab. Export its run report before
   starting again; repeating resets to the saved initial room. Reload never auto-runs.

## Save, reuse and export

- On the separate Rooms page, named saves retain immutable revisions. Open or
  save another revision there; mission workspaces only select/preview saved rooms.
- Export/import room JSON transfers layouts between browser origins. Imports
  validate geometry, IDs, placement, door state, pose, revision and the 64 KB limit.
- Saved mission snapshots remain independent from later room-library edits.
- The player exports mission/task and room revisions, initial/final state,
  function calls, actual results and observations. Reports cannot be imported as
  rooms or resumed runs. Active runs are local to their simulation tab.
- The old per-mission inline room-draft buttons are no longer exposed in a cockpit.

## Challenging variants

- Place a closed door immediately east of the east-facing robot. The robot
  automatically attempts `open_door` when its route reaches that door. Unlocked
  doors open; locked doors fail once and are avoided. The robot replans or ends
  with `blocked` if the remaining search is inaccessible. A no-target search
  ends with `not_found`; neither outcome reports a successful photo.
- Enable smoke. Only the robot cell and one field directly ahead are perceived.
  Rotate to change that field; the grey overview cells are not robot perception.
  Hidden picture IDs cannot be used to take photos.
- Use an L-shaped room and put a target around the corner. Clear-air rays
  stop at walls and cannot see through the cutout. Furniture and closed doors
  also occlude rays. Search explores observed reachable cells; no-target or
  blocked searches stop without inventing evidence.
- Edit the mission in another window: after the next refresh, its revision
  invalidates the local run. Return to the builder and review the new task.

## Original verbal examples (superseded)

The table below preserves the original intake examples. The user subsequently
specified dropdown/text task definition, with no verbal interpretation. These
examples are historical and do not define current acceptance gates.

| Operator brief | Expected specification interaction | Evidence status |
| --- | --- | --- |
| “Find something in a room.” | Clarify target, room, boundary and capabilities; do not invent a printed-fire task | Unsupported/incomplete projection fixtures; real-model trial pending |
| “Find a printed fire indicator.” | Capture the task; ask for location, priority, terrain, hazards, boundary and declarations | Missing-information tests and existing mocked extraction tests |
| “Find a printed fire indicator in R-204, flat indoor terrain, low priority, within R-204 only; printed image, no actual fire; stop on hazards or lost link.” | Produce JSON plus readable review; ask for each missing explicit platform/safety declaration | Complete fixture and guided demo path; real spoken interpretation pending |

Current interaction evaluation checks required-field completion, supported task
selection, capability matching and preservation of entered room/boundary values.
The real-backend browser journey saves a dropdown/text task, verifies its persisted
record, then observes automatic door opening, photo and completion without further
instructions. Simulation consistency remains supporting evidence. No speech/model
quality claim is made or required. Human usability review remains separate.

## Boundaries

- Unsaved layouts and active timelines reset on reload/disconnect. Explicitly
  saved layouts persist per mission instance in that browser; portable room files
  and downloaded run reports retain the exported data. They grant no backend
  approval and do not synchronize or resume active execution.
- This simulator requires a complete, nonblocked specification; it does not
  confer or require operational supervisor authority. The previous authenticated
  R-204 adapter remains separate under **Legacy R-204 scripted simulation**.
- Wall items are represented by boundary grid slots rather than wall edges.
  Doors govern traversal of their slot. Clear air uses omnidirectional grid
  line-of-sight; smoke restricts perception to one forward cell (one metre).
- `fetch` and `pick_up` are explicit NOT_IMPLEMENTED function placeholders for
  reachable furniture, with no manipulation physics or world change.
- Autonomous execution is deterministic for the single printed-fire-indicator
  task; text fields do not constitute an arbitrary robot programming language.
  Search uses perceived and remembered objects, scans headings under smoke and
  stops after at most 512 autonomous steps. Timers stop on completion, pause,
  stop, task invalidation, disconnect or return to the builder.
- No real camera, autonomous robot, thermal detection, or hardware integration
  is claimed. The extraction prompt change takes effect after a server restart;
  static UI assets are available from the running local server after compilation.

## Verification

Run `node --test tests/js/disaster/*.test.mjs` and the Playwright
`tests/playwright/room-workspace.spec.mjs` suite. The browser suite serves current
source modules and uses fixture mission responses; it is not real-provider or
database acceptance. Existing `DisasterMissionConfigurationUnitTest` checks
backend capture, missing information, revocation and unsafe paths with a mocked
gateway. Results: `.agents/VT_RESULTS.md`.

For opt-in real-backend acceptance, set `PROMETHEUS_ROOM_ACCESS_CODE` to an
existing demo scope, `PROMETHEUS_BASE_URL` to its loopback server URL,
`PROMETHEUS_SKIP_WEBSERVER=true`, and run
`npx playwright test --config=playwright.config.mjs tests/playwright/room-autonomous-integration.spec.mjs`.
The test creates and removes only its own new mission instance; it does not
require administrator credentials or any model provider.
