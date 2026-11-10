# VT-09: Run saved missions

Completed 2026-11-10 for browser-local simulation.

Changes: saved mission workspace restores its immutable room before explicit Run.
Each run uses the saved starting pose, objects, doors and smoke. Existing autonomous
simulation, pause/resume/stop and export remain available. Repeated runs reset world
state; runtime changes never overwrite definitions. Export specification includes
mission instance/name/configured task revision and saved room identity/revision.
Changed task revisions and incompatible room data disable Run with feedback.

Verification:
- node --test tests/js/disaster/*.test.mjs: 23 passed.
- PLAYWRIGHT_CHROMIUM_CHANNEL=chrome, room-workspace.spec.mjs: 10 passed.
- Same channel, PROMETHEUS_ROOM_ACCESS_CODE set for local server,
  mission-room-integration.spec.mjs: 1 passed on port 8080. Real scoped persistence,
  room creation, mission saving/reload/select/Run, repeat from initial state,
  changed room revision and library removal verified. Temporary agents deleted.
- Browser fixture also covers two different room shapes, door reset/export,
  stale revision rejection and corrupt room rejection.
- Default Playwright browser was absent; installed Chrome used successfully.

Limits: runs are browser-local, discarded on reload/disconnect; no hardware,
provider or human usability acceptance claimed. Existing simulation readiness
rules retained; this is not physical execution approval. GitHub issue creation
skipped because repository tracks issues in its local backlog (issues disabled).

Next: VT-10 requires user agreement on input fields and their simulation effects.
