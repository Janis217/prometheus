# VT-08: Save missions with selected rooms

Date: 2026-11-06. Status: complete for selection, saving and reopening.

## Delivered behaviour

- Task review retains existing dropdown/text inputs and now offers a mission
  name, saved-room selector, read-only preview and room-list refresh. Selecting
  a different snapshot clears the declarations checkbox for explicit reconfirmation.
- A selection captures a particular room UUID/revision and normalized scenario;
  later library edits never silently change a mission. A saved selection stays
  available in the form even if the originating browser library is gone.
- Existing scoped `mission-configuration` accepts optional `savedMission`
  details. The backend validates layout schema, template dimensions, robot pose,
  object types/IDs, placement/collisions, door booleans, names and the 64 KB limit.
  Unknown fields are stripped; no authority fields are imported.
- Mission identity is the existing agent instance ID. Task data, name and room
  snapshot are saved together under the existing serialized/transactional
  boundary. The normal task revision check rejects stale saves, and task/room
  edits invalidate earlier approval through the existing evaluation flow.
- Existing agent Storage holds `saved_mission` metadata and bounded 800-character
  configuration chunks under `saved_mission.room.*`. Each serialized entry stays
  within the 2048-character column limit. No schema migration/new table.
- Scoped mission-review responses include saved details and the task revision
  at configuration time. Saved mission summaries, room previews and specification
  JSON show the stored snapshot. This is saved definition data, not a started run.
- Named saved missions are listed by querying visible mission-profile agents
  with the current access code. Open saved mission switches the connection and
  updates the URL; reload reconnects to that selected instance.
- Old task-only requests remain supported; if a mission already has a saved
  room, omitting details preserves its binding. Reset clears task and saved-room
  metadata. Start a new mission creates another instance and retains the old one.

## Runtime and limits

The independent room library remains browser-local and per origin. Named
missions and their room copies are backend/database scoped and survive browser
library deletion or use from another browser. They remain subject to the
database's lifetime (the manual harness uses a disposable database). No provider
or speech requirement was added, and mission input semantics are unchanged.

Named missions currently have a read-only room preview. Integrated execution is
VT-09. Their unrelated local editor and legacy scripted Start are unavailable
to prevent running a different room/scenario. Existing tasks without saved rooms
retain the prior local simulation controls.

Restarted the existing offline demo on port 49679 with the existing database and
supervisor-password setting (`false` as read from that runtime). No credential,
mission or room-library data was reset. The independent app on port 8080 has
not been restarted; it needs its own restart. The frontend reports a missing
saved-room update if an old backend silently omits the new response field.

## Verification

- Focused Maven suite: 11 passed (`SavedMissionDetailsTest`,
  `MissionSupervisorAuthenticationUnitTest`, `DisasterMissionConfigurationUnitTest`).
  Covers normalized snapshot persistence/validation, invalid/stale retention,
  approval invalidation after a room update, scope enforcement, legacy binding
  preservation and reset. The sandbox blocked a cached dependency; approved
  execution outside the sandbox passed using the repository's cached Maven/JDK.
- `npm.cmd run test:room:unit`: 23 passed, including saved-room capture independent
  of later library changes/deletion and specification display without execution.
- 9 existing room/mission browser widget cases passed after the final module
  changes. All 5 connection lifecycle cases also passed after the URL fix.
- `npm.cmd run test:mission:rooms` against the actual offline server/database:
  1 full journey passed. It saves two named missions with different task data
  sharing one room, reloads/switches missions, changes the room library, verifies
  original mission isolation, explicitly applies a newer room version, removes
  the browser library, reopens/resaves the stored snapshot, and verifies stale,
  malformed and invalid-code requests cannot alter/read the saved result.
  A 19-object room exercises multiple bounded storage chunks through the database.
  Saving starts no execution; the saved definition appears in task JSON.
  Both test-owned agents are deleted in cleanup; user agents are retained.
- The live journey also checks mobile width and zero JavaScript page errors.
  Screenshots: `target/saved-mission-room.png` and
  `target/saved-mission-room-picker-mobile.png`.
- During verification, an automatic-login timing issue in the test was fixed,
  then the test exposed the real stale-URL bug on saved-mission switching.
  Updating the URL on successful connection fixed reload restoration. An initial
  storage-chunk fixture was too small; increasing its objects exercised the
  intended multiple-chunk path, which passed.

No provider calls, physical execution, commit, push or deployment.
