# Fire-image interaction rehearsal

For the integrated, authenticated simulator-adapter journey, use
[disaster-fire-adapter.md](disaster-fire-adapter.md). The commands below remain
an explicitly unauthenticated rehearsal, separate from supervisor approval and
the trusted adapter interface.

UC-FIRE-01/02 use the existing Disaster Mission Configuration agent. This is a
command-driven simulation of interaction ordering, persisted coordination,
escalation and handoff. It does not inspect an image, move a robot or authenticate
a supervisor. The subsequent integrated journey is verified separately in
`.agents/DM_INT_RESULTS.md`; these rehearsal commands still confer no authority.

## Setup and focused verification

Reuse the dedicated loopback MySQL setup in [dm02-validation.md](dm02-validation.md).
With that isolated server running, JDK 21 and installed local test dependencies:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
.\mvnw.cmd -o -q '-Dtest=DisasterMissionConfigurationUnitTest,DisasterMissionSimulationUnitTest' test
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests DisasterMissionScopedIntegrationTest,DisasterMissionSimulationIntegrationTest --browser --browser-spec tests/playwright/disaster-mission-simulation.spec.mjs
```

The existing runner uses disposable schemas/accounts and offline providers, then
cleans up its applications and database objects. Tests cover real scoped API,
MySQL and Valerian with Live enabled/disabled, plus Python replay ordinary,
obstacle and abort variants. Findings and execution signals stay synthetic.

## Manual Valerian walkthrough

1. Allow `core.disaster_mission_configuration` for a local demo access code.
   Create a fresh instance and explicitly Connect.
2. Send `simulate fire begin`. Read configuration, missing fields, runId,
   revision 0, simulation=true and operationalReady=false.
3. Send `simulate fire configure <runId> 0`. Review the fixed R-204 configuration,
   now revision 1: a printed visual indicator, never real fire.
4. Send `simulate fire confirm <runId> 1`, then `simulate fire start <runId> 1`.
   Confirmation is explicitly a rehearsal, not authenticated approval.
5. Send `simulate fire progress <runId> 1`.
6. Ordinary: send `simulate fire complete <runId> 1`. Challenging: first send
   `simulate fire obstacle <runId> 1`. Observe escalation and pending decision.
   Completion is rejected until `resume`, fresh `progress`, then `complete`
   have been sent with the same runId/revision. Alternatively inject
   `connection_loss`, then `abort`; resume is forbidden after link loss.
7. Review outcome, synthetic reference (or absent evidence on abort) and pending
   responsibility acknowledgement. Completion has not yet closed the mission.
8. Send `simulate fire handoff <runId> 1`; phase becomes closed and responsibility
   becomes acknowledged_by_demo_operator_not_authenticated.
9. Reload, explicitly reconnect, and compare displayed JSON with
   `GET /demo/agents/<agentId>/storage`. Event entries retain phase/decision order.
   `simulate fire status` also returns the snapshot.
10. Use existing Reset before another rehearsal or ordinary mission capture.
    Reset intentionally removes rehearsal history; save wanted artifacts first.

## Scripted scoped-API replay

Use a fresh instance in an already running, explicitly local application:

```powershell
# Set DM_ACCESS_CODE privately in the environment; never log credentials.
python tests/disaster/replay_fire_simulation.py --base-url http://127.0.0.1:8080 --agent-id <agent-uuid> --variant obstacle --output target/fire-obstacle.json
```

Variants: ordinary, obstacle, abort; use a fresh/reset agent each time. The script
refuses non-loopback origins and existing rehearsal state; it never resets an
existing agent. Its artifact records commands, snapshots and scoped rehearsal
entries without the access code. No paid/provider request is made.

Entries stay within existing 2048-character Storage bounds. Maximum 24 accepted
transitions, reserving two for abort/handoff. No automatic timeout, perception
algorithm, actual image file, map, platform-safety proof or real responsibility
transfer is produced.
