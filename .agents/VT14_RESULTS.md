# VT-14 scheduled obstacle scenario results

Date: 2026-11-13. Complete for deterministic simulation software.

User steering: “simulation only” in response to the platform question. DM-06
physical integration remains deferred. This increment exposes the VT-13 scenario
extension through the existing room workflow.

## Delivered behavior

Room builder controls schedule chair/table relocations before numbered actions.
At most 32 validated moves survive named-room revision saves, scenario JSON,
mission snapshots and run exports. Existing rooms without schedules are unchanged.
Runtime occupancy checks reject moves into the robot or another object. The
action executor checks the changed world, so a stale planned move can block and
the planner can choose another route. Stop does not apply scheduled changes.
Removing furniture clears its draft schedule. Existing saved revisions stay intact.

Both timelines show applied/blocked changes; events and exported reports retain
object/action identity, original/destination coordinates, status and reason.
Every fresh run restores the saved initial world and schedule. No time-based
animation, moving-person model, new floor-obstacle category or hardware was added.

Contract and operator instructions: [.doc/simulation-action-contract.md](../.doc/simulation-action-contract.md#saved-obstacle-moves).

## Verification

- `npm.cmd test`: 195 passed, no failures/skips; four new scenario unit cases
  cover serialization, rejected inputs, live occupancy, blocked robot movement,
  replanning, repeatability, Stop and immutable initial/report evidence.
- Chrome room/library suites: 18 passed, including schedule editing, save/reload,
  blocking the planned path and restoring the initial layout. Artifacts:
  `target/obstacle-scenarios-browser`.
- Focused player suite: 2 passed, including repeat runs, completed replanning,
  exported world changes, narrow viewport and the existing locked-door case.
  Artifacts: `target/obstacle-player-browser`.
- Additional named-room schedule case: 1 passed; immutable revision restoration,
  deleting referenced furniture and narrow viewport. Artifacts:
  `target/obstacle-library-browser`.

Browser commands used `PROMETHEUS_SKIP_WEBSERVER=true`,
`PROMETHEUS_BASE_URL=http://127.0.0.1:8765` and
`PLAYWRIGHT_CHROMIUM_CHANNEL=chrome`, with a workspace-owned static server:
`python -m http.server 8765 --bind 127.0.0.1 --directory src/main/resources/public`.
Playwright selections were `room-workspace.spec.mjs room-library.spec.mjs`,
`mission-flow.spec.mjs --grep player`, and
`room-library.spec.mjs --grep 'named room revisions'` under playwright.config.mjs.
Player HTTP reviews were controlled fixtures; no database or paid provider used.
Backend code was unchanged, so the full Java/integration suite was not repeated.
