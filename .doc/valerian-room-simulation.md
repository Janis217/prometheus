# Task specification and room simulation

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
below. Run of a saved mission is next (VT-09). The mission-local simulator
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

Named missions with saved rooms currently show a preview; their integrated Run
flow is VT-09. The separate room editor and legacy scripted Start are disabled
for these missions so an unrelated room/scenario cannot be mistaken for the
saved one. Tasks saved without a room retain their existing demo controls.

Technical persistence: `PUT /demo/agents/{id}/mission-configuration` optionally
accepts `savedMission: {name, room: {id, revision, name, configuration}}`.
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

1. Open Valerian and connect to `core.disaster_mission_configuration`.
2. Use **Create task** or **Load R-204 demo**, review and save the answers. The
   task objective for this simulator is **Find printed fire indicator** and
   terrain is **Flat indoor terrain**. Complete the missing details and safety
   declarations. For fire inspection, choose **Find printed fire indicator**
   from the objective dropdown. Text fields capture the room name, boundary,
   hazards and operating conditions; no natural-language model is called.
3. Review **Task specification and capabilities** and its JSON. Missing facts
   require clarification. A blocked or unsupported specification cannot start
   the room simulator. The generic mission tools remain available for other tasks.
4. In **Room simulation builder**, choose square, rectangle or L-shaped.
   Choose each item and click a highlighted valid slot. Move the robot first
   to use its starting slot for an object. Doors, windows and pictures require
   boundary slots; chairs/tables occupy free interior slots. Use **Remove
   object** to clear an occupied slot. Configure locked/open states before
   placing each door. Multiple doors are supported.
5. Set starting direction and optional smoke, then **Generate room** and
   **Start autonomous simulation**. This binds an immutable local room snapshot to
   the current task revision. Inspect **Bound simulation task JSON**.
6. The robot now runs automatically, searching, approaching a perceived fire
   picture, opening unlocked doors, recording a simulated `take_photo`, then
   `report_findings`. No additional commands are required. **Pause** freezes the
   run, **Resume** continues, and `stop` ends it. While paused, optional manual
   controls and **Next autonomous step** let you inspect individual actions.
7. Compare the grid with the text timeline: trigger, perception, action,
   success/failure, reason and resulting position come from the same event.

## Save, reuse and export

- **Save room in browser** stores one layout for the connected mission instance.
  After reload/reconnect, use **Load saved room** to restore it, then review and
  generate it again. Saving another layout replaces that instance's saved draft.
- **Export room JSON** downloads the initial room layout. **Import room JSON**
  loads a compatible layout while in the builder. The current task stays unchanged
  and execution never starts automatically. Import validates geometry, placement,
  IDs and states before changing the room; files must be at most 64 KB.
- **Export run report** downloads a snapshot containing the task specification,
  initial room, final state, perceptions, actions and outcomes. A running/paused
  snapshot is labelled as unfinished. Export before returning to the builder to
  retain its timeline. Reports cannot be imported as layouts or resumed runs.
- To repeat a demonstration, import its original room file, configure the same
  task, Generate and Start. To use another browser, transfer the room JSON file;
  browser-saved drafts and active runs are not server-synchronized.

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
- `fetch` and `pick_up` are explicit pretend acknowledgements for reachable
  furniture, with no manipulation physics or world change.
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
