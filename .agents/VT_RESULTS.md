# Valerian task specification and room simulation results

Date: 2026-11-06. User authorized starting the newly recorded tasks.

VT-07 is now complete for an independent named room library, accessible before
login/mission creation at `/valerian/rooms.html`. Saved layouts are browser-local
per origin, with immutable revisions and JSON transfer. See `VT07_RESULTS.md`
for implementation and verification. VT-08 saved-room mission selection is also
complete: see `VT08_RESULTS.md` for scoped atomic task/snapshot persistence,
reopening and verification. VT-09 integrated saved-mission Run is next.

## Current scope and autonomous execution acceptance

Supervisor testing mode update (2026-11-06): added
`prometheus.supervisor.credential-required` with protected default `true`.
The user explicitly requested `false` for the current testing runtime; that local
server was restarted with the setting disabled and its database retained.
Valerian hides the password field based on the scoped backend response; explicit
review and simulator start work without tokens. Authentication is bypassed only
for the supervisor password, with stable scope-specific testing identity and
audited `authenticationMode`; access-code scope, safety/completeness and stale
review rejection remain enforced. Existing individual credentials are retained.

Validation of this change: 3 authentication-mode Java tests plus 4 existing
mission tests passed; all 9 widget Chrome cases passed (including both password
modes); 1 real-backend Chrome journey passed without password headers through
approve/revoke/reject/reapprove and legacy simulator start. Its incomplete/stale
approval and invalid-code attempts failed as expected, all four stored audits
identify testing mode, and its own temporary agent was removed. An initial
sandbox dependency-access failure was resolved by the approved test rerun.
Re-enable with the documented property or the local restart helper's
`-CredentialRequired $true`. No provider requests, credential deletion, commit,
push or deployment.

The user explicitly corrected the requirements: no speech-to-text or verbal
interpretation; define the task using dropdowns and text fields, then execute
autonomously from those instructions. This supersedes the original verbal gates
for VT-01/VT-05. Historical DM-02 provider validation remains separate.

VT-01 through VT-06 are complete for this bounded structured-input software demo.
The objective dropdown explicitly selects printed-fire-indicator inspection;
text fields preserve location, boundary, hazards and operating conditions. Start
launches a 450ms simulation loop. The robot searches perceived/remembered cells,
approaches the target, opens unlocked doors, attempts locked doors once, replans
or reports blocked, takes a simulated photo and reports. Smoke exploration scans
all headings instead of prematurely concluding that no target exists. Search
has a 512-step bound. Pause/resume/stop, revision invalidation and timer cleanup
are implemented. Manual actions remain optional paused inspection tools.

## VT-06: Reusable scenarios and run evidence

Complete (2026-11-06). The user's next-step request led to per-mission browser
save/load, portable room JSON and downloadable run evidence. Import reconstructs
only validated scene fields: supported template/dimensions, unique object IDs and
slots, wall placement, robot pose, boolean smoke/door states and a 64 KB bound.
Invalid files leave the existing scene intact. Imported layouts never replace a
task, grant approval or start execution. Browser drafts use mission-instance keys,
without access codes or supervisor tokens. A room file can be reused in another
window after reviewing that window's own task.

Run reports explicitly identify simulation-only evidence, task/room revisions,
the original room snapshot, final robot/object state, perceived observations,
actions, outcomes, photo references, terminal phase and running/paused state.
Reports are snapshots, not resumable executions or importable room files.
An exported initial scene produces the identical event sequence when rerun with
the same task. New assets are available from the current local runtime.

Current verification (includes prior behaviour):

- 19 Node engine/contract/artifact cases passed, including autonomous door opening,
  smoke search for a target behind the initial heading, locked enclosure,
  no-target termination, rejection of hidden photo targets, scene validation,
  per-agent storage, report accuracy, snapshot isolation and deterministic rerun.
- 7 Chrome widget cases passed, including automatic completion after Start,
  no additional clicks, task setup entirely through dropdowns/text, and timer
  pause/resume/disconnect cancellation, saved layouts surviving reload, scope
  separation, portable file downloads/imports and rejected run-report imports.
- 1 real-backend Chrome case passed against the existing loopback demo:
  `room-autonomous-integration.spec.mjs`. It created its own agent, completed the
  form with a custom room name and boundary, saved via the real scoped API,
  checked the MySQL-backed storage record and missing-information/approval
  state, saved its room draft, then completed automatic door opening, approach,
  photo and reporting. Its downloaded run report matched the persisted task
  location/revision, original room and actual completion events.
  Its new agent was deleted in cleanup; existing user agents were untouched.
- Full styled cockpit screenshot `target/room-autonomous-integrated.png` was
  inspected. Current static modules were copied to the existing runtime's
  `target/classes/public/valerian`; refresh the browser to load them.

An initial provider-evaluation harness was discarded after the scope correction;
no paid or real provider requests were made. Its temporary compiled classes were
removed. Earlier offline probe artifacts under ignored target/ are not current
acceptance evidence. Only the tests above establish this increment.

Remaining boundaries: unsaved layouts and active runs reset on reload/disconnect;
saved room drafts persist per mission instance in that browser. Portable room
files can be transferred, but running executions are not synchronized between
windows. No arbitrary natural-language instruction execution,
physical robot, real photo or authenticated authority is claimed. Human
qualitative usability evaluation is not claimed. The earlier result record
below describes the first increment before the user's scope correction.

## Initial increment delivered (before scope correction)

- VT-01 software: JSON plus readable specification projection from the existing
  mission, required sensing/behaviour capabilities, missing/unsupported/blocked
  status, revision-bound local room snapshot, and printed-target extraction
  guidance. Existing verbal event ingress and supervisor review are reused.
- VT-02: deterministic browser-local event/state model and text timeline with
  operator triggers, perceptions, actions, outcomes, reasons and robot pose.
  Includes move/turn/observe, door attempts, simulated photos/reporting and
  explicitly pretend fetch/pick_up for reachable furniture.
- VT-03: square (6x6), rectangle (8x5), L-shaped (8x8 minus lower-right 4x4)
  builder; one-metre slots, highlighted valid placement, multiple doors with
  independent locked/open states, wall windows/fire/non-fire pictures,
  chairs/tables, robot start/heading, removal and smoke setting.
- VT-04: one shared state drives the visual overview and text results.
  Clear-air grid line-of-sight respects wall/furniture/closed-door occlusion;
  smoke reveals only the robot cell plus one forward field. Autonomous steps
  approach visible targets and search known reachable cells. Hidden target IDs
  cannot generate photographic evidence. Task revision changes invalidate runs.
- VT-05 preparation: repeatable walkthrough and ambiguous, incomplete and
  complete brief examples in `../.doc/valerian-room-simulation.md`.

VT-02/03/04 are complete for this bounded local demonstration. VT-01 remains
open for real spoken interpretation/clarification quality; VT-05 remains open
for primary research interaction evaluation. DM-02's provider gate is unchanged.

## Verification

- `node --test tests/js/disaster/*.test.mjs`: 12 passed, no skipped cases.
  Covers all shapes/objects, invalid placement, smoke direction, L/furniture
  occlusion, door failure/success, snapshot isolation, hidden-target rejection,
  approach/photo/report completion, bounded smoke/no-target search, incomplete,
  unsupported and blocked contracts.
- Playwright `tests/playwright/room-workspace.spec.mjs`: 3 passed in Chrome.
  Covers builder workflow and smoke target list, locked-door failure,
  invalidation/clear, autonomous visual/text agreement, full mission-widget
  mounting and disconnect clearing. Uses source modules and fixture responses;
  no real-provider or database acceptance is implied.
- `DisasterMissionConfigurationUnitTest`: 4 passed with JDK 21 and cached Maven
  dependencies, covering existing backend capture/clarification/approval/unsafe
  paths with a mocked gateway. The initial sandboxed compilation failed on a
  cached JAR; the approved rerun outside the sandbox passed.
- Desktop/mobile screenshots: `target/room-simulation-desktop.png` and
  `target/room-simulation-mobile.png`; mobile screenshot inspected. Browser
  fixture at 390px verifies no horizontal overflow. This is widget-level
  acceptance, not a full styled cockpit visual audit.
- `git diff --check`: passed.
- Existing local server returned HTTP 200 for the new workspace asset.

## Runtime and remaining boundaries

The current server serves refreshed static assets after compile/copy; refresh
Valerian to load the new module graph. The Java extraction prompt requires a
server restart to take effect; no live provider configuration was changed.
Room runs are per-window and reset on reload/disconnect. They do not persist to
the backend or synchronize between windows. The separately authenticated DM-05
adapter is retained under the legacy scripted simulator heading.

The task contract is a client review projection, not a new backend authority
or robot protocol. Browser-local simulation accepts complete, nonblocked task
specifications without conferring supervisor approval. All photos/actions are
synthetic; fetch/pick_up do not perform manipulation. No real model, microphone,
camera or hardware quality claim, commit, push or deployment.

Next acceptance work: configure/authorize a real provider trial, capture actual
spoken complete/incomplete/ambiguous specification journeys, and evaluate
completeness, clarification and capability matching separately from simulator
correctness. Human walkthrough feedback remains pending.
