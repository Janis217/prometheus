# Approved fire-image simulator demonstrator

For a browser test with a server that stays running and temporary credentials
already provisioned, follow [the manual step-by-step guide](valerian-manual-fire-test.md).

UC-FIRE-01/02 demonstrate mission interaction through the existing PROMETHEUS
agent and Valerian. The local adapter performs a synthetic printed-indicator
inspection, with no camera, actual image, map, robot movement or provider trial.
All execution results include simulation=true and operationalReady=false.

## Setup and verification

Use the isolated local MySQL/JDK 21/Chrome procedure in
[dm02-validation.md](dm02-validation.md). The runner uses only offline extraction
fixtures and disposable schemas/accounts. From the repository root:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
.\mvnw.cmd -o -q '-Dtest=FireMissionExecutionUnitTest,PlatformSafetyUnitTest,DisasterMissionConfigurationUnitTest,DisasterMissionSimulationUnitTest' test
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests MissionExecutionIntegrationTest,MissionReviewIntegrationTest,DisasterMissionScopedIntegrationTest,DisasterMissionSimulationIntegrationTest --browser --browser-spec tests/playwright/disaster-fire-adapter.spec.mjs --browser-spec tests/playwright/disaster-mission.spec.mjs --browser-spec tests/playwright/disaster-mission-simulation.spec.mjs
```

## Fire demonstrator procedure

1. Create/connect a fresh Disaster Mission Configuration instance for your scoped
   demo access code. Obtain a separately issued supervisor credential using the
   existing [admin provisioning boundary](mission-supervisor-review.md).
2. In the offline fixture harness, send `Start printed-indicator mission in R-204`.
   The incomplete mission asks for missing facts, including searchBoundary.
3. Send `Configure printed-indicator mission: inspect only R-204 interior, low
   urgency, no actual fire, flat terrain; stop on hazards or lost link.`
4. Send `Confirm R-204 platform declarations: communications stop, safe standoff,
   platform suitability, access clearance and terrain suitability confirmed.`
5. Send `Reassess R-204 safety: all declared conditions reviewed; hazards mitigated
   and platform clearance confirmed.` These are deterministic extraction fixtures,
   not evidence that a real model interpreted the dialogue. New declarations
   require a subsequent safety reassessment; the final mission is reviewable.
6. Open Mission supervisor review, Load current mission and inspect its checks.
   Enter the separate credential and Approve. Text confirmation alone cannot
   approve. No execution has started yet.
7. Select Ordinary or Blocked path. Enter the supervisor credential again and
   Start simulation. Its immutable mission snapshot, execution UUID, approved
   revision, review version and safety reference are persisted separately.
8. Press Next simulation update twice: adapter acceptance and progress. Ordinary
   completes on the next update. Blocked path instead escalates on that update;
   choose Resume within bounds, then request fresh progress and completion.
   Aborting is an alternative. Different bounds require a new mission/review.
9. Inspect completion_handoff and the synthetic result URI/location or an empty
   finding for failed/cancelled/timed-out runs. Choose Acknowledge handoff to close.
   The responsibility recipient is the access-scoped operator, not an externally
   verified identity. No legal responsibility-transfer claim follows.
10. Reload Valerian, explicitly reconnect, reopen review and Load current mission.
    The execution state is reloaded. GET scoped storage to inspect
    disaster_execution, disaster_execution.mission and disaster_execution.event.*.
    Save artifacts before Reset: reset intentionally removes execution history,
    while retaining supervisor decision audits.

Failure and Timeout fixture variants return structured unsuccessful results with
no invented evidence. A five-minute persisted deadline is also checked on read or
update; there is no automatic background watchdog. Changed/revoked approval cancels
active simulation on the next read/update. These semantics are for the inert
simulator and cannot be reused as physical safety protections without DM-06 work.

## API replay without model requests

For an already configured/approved fresh R-204 instance in a local application:

```powershell
# Set DM_ACCESS_CODE and DM_SUPERVISOR_TOKEN privately; never log credentials.
python tests/disaster/replay_fire_adapter.py --base-url http://127.0.0.1:8080 --agent-id <agent-uuid> --variant obstacle --output target/fire-adapter-obstacle.json
```

Variants: ordinary, obstacle, failure, timeout, abort. The script never captures a
brief, calls inference, resets an agent or replaces an existing execution. It
rejects non-loopback origins. Its JSON artifact contains review, immutable snapshot,
state timeline and events without credentials. Automated browser acceptance runs
ordinary/obstacle/abort scripts against real local scoped HTTP and MySQL.

Start: POST `/demo/agents/<id>/mission-execution`, access/supervisor headers,
requestId/revision/reviewVersion/safetyReference/variant. Updates: POST the same
path plus `/updates`, access header, executionId/expectedSequence/action. Actions:
step, resume, abort, handoff. GET returns current state and processes expiry or
approval invalidation. Old versions conflict; user actor labels cannot impersonate
adapter feedback. The server generates feedback through MissionExecutor.

The DM-02 real-model gate and DM-06 physical pilot remain separate. See
`.agents/DM05_RESULTS.md` and `.agents/DM_INT_RESULTS.md` for actual evidence and
remaining acceptance gates. The earlier unauthenticated command rehearsal remains
documented separately in [disaster-fire-demonstrator.md](disaster-fire-demonstrator.md).
