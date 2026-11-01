# DM-INT results

Date: 2026-10-31. Current status: closed for the deterministic authorized simulator
demonstrator. Use cases: UC-FIRE-01/02; DR-02/03/04/05. Real-model interpretation,
physical operation and independent human acceptance remain unverified.

The initial rehearsal record below is historical. The integrated completion
addendum at the end records the current verified behavior after DM-03/DM-04/DM-05.

## What changed

- Added a compact deterministic fire-image rehearsal reducer inside the existing
  Disaster Mission Configuration action/policy. It reuses the current definition,
  factory, single-state transition, Storage, scoped API and Valerian. No new
  controller, agent runtime, dependency or database migration.
- Explicit fixture commands cover initiation/configuration, simulation
  confirmation, coordination, obstacle/ambiguity/timeout/lost-link escalation,
  resume/abort, completion and separate handoff acknowledgement.
- Snapshots carry simulation=true, operationalReady=false, deferred authorization
  and adapter labels. RunId/revision gates reject stale commands; progress must be
  renewed after escalation. Lost-link runs can only abort. Abort never invents
  evidence; completion alone never acknowledges responsibility.
- Snapshots and per-transition trace entries persist through existing Storage,
  with 24 accepted transitions maximum and reserved abort/handoff capacity.
  Existing 2048-character entry bounds are enforced without a broad refactor.
- Added five focused unit tests, two real scoped integration tests, two Valerian
  UI journeys and a scripted replay acceptance case (ordinary/obstacle/abort).
- Extended the existing plans/traceability/risk records in place; walkthrough:
  `../.doc/disaster-fire-demonstrator.md`. Original user-supplied planning files
  and backlog changes were preserved.

## What was verified

Windows, JDK 21, existing Maven wrapper/cached dependencies, MySQL 9.5 and installed
Chrome. All execution signals and evidence are deterministic simulation fixtures.
No real-provider credentials or physical endpoint were used.

Exact final commands, from repository root:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
.\mvnw.cmd -o -q '-Dtest=DisasterMissionConfigurationUnitTest,DisasterMissionSimulationUnitTest' test
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests DisasterMissionScopedIntegrationTest,DisasterMissionSimulationIntegrationTest --browser --browser-spec tests/playwright/disaster-mission-simulation.spec.mjs
python tests/disaster/check_usecase_traceability.py
git diff --check
```

Outcomes:

- Unit selector: **8 passed**, zero failures/errors/skips (3 existing configuration,
  5 new simulation). Final log: `target/dm-int-unit-final.log`; reports:
  `target/surefire-reports/ch.zhaw.prometheus.agentdefs.core.DisasterMissionConfigurationUnitTest.txt`
  and `...DisasterMissionSimulationUnitTest.txt`.
- Integration selector: **5 passed**, zero failures/errors/skips (3 existing
  scoped configuration, 2 new simulation). New cases include ordinary/obstacle
  journeys, detached JPA reload, emitted/stored equality, cross-scope rejection,
  stale commands, lost-link abort and reset. Each request commits separately.
- Browser suite: **3 passed with Live enabled, 3 passed with Live disabled**,
  no skips/failures. Real Valerian creation/connect/input, scoped HTTP, MySQL,
  persisted trace and explicit reconnect hydration. Two UI journeys per mode;
  third test executes Python replay ordinary/obstacle/abort, each on a fresh
  agent. No backend-route or persistence mocks. No model inference is needed
  by rehearsal commands; existing configurator regressions use offline extraction.
- Traceability check: exit 0, 126 unique cells, six use cases, five DM-INT
  work-package mappings and DR-01..DR-05; milestone-specific consumers checked.
- `git diff --check`: exit 0 (Git reports ordinary LF/CRLF conversion warnings).

Final acceptance artifacts: `target/gptlive-acceptance-2bb3e0da92/`:

- `java.log`, `compile.log`, `browser-true.log`, `browser-false.log`: all exit 0.
- `browser-true/` and `browser-false/`: JSON timeline/storage attachments,
  replay-ordinary.json, replay-obstacle.json, replay-abort.json and screenshots.
- `browser-true/disaster-mission-simulatio-39241-tacle-and-persisted-handoff/simulation-handoff.png`
  was visually inspected: synthetic result and unauthenticated acknowledgement
  appear in the existing JSON conversation output. No dedicated result UI.
- Runner transcript: `target/dm-int-acceptance-final.log`; owned application
  stopped and disposable schema/account removed.

The test database was the existing dedicated loopback instance on port 33097,
using `target/dm02-local-mysql/data`, not the installed service's data. Before
shutdown, a PyMySQL check compared @@datadir to that exact owned path and counted
zero remaining `prometheus_gptlive_%` schemas and `gptlive_%` accounts. Then
`SHUTDOWN` was sent only to that instance. Artifact: `target/dm-int-cleanup.json`.
No credentials are included in committed evidence. Logs/generated artifacts are
under ignored target; source tests and replay script make them reproducible.

## Attempts and corrections

The initial unit compile failed because the new tests treated Agent.getStorage()
as Storage rather than its existing Map view. Corrected test-only toMap calls;
failure log retained at `target/dm-int-unit-initial-failure.log`. Subsequent
unit runs passed. This was not a runtime or provider failure.

An earlier acceptance run, `target/gptlive-acceptance-539f5d01e7/`, passed all
five integration tests, two browser tests with Live enabled and three disabled;
the replay case was added during that run. The final clean rerun above executed
the complete three-case suite in both modes against the final runtime contract.

## Initial-run gaps and subsequent resolution

The plan's approval phase requires an authorized role, and its dependencies name
DM-03 safety constraints, DM-04 supervisor identity and the DM-05 adapter. Those
are not implemented by this rehearsal. At the time of the implementation run,
the user's completion-first order created a dependency cycle. That historical
ordering problem is resolved by the subsequent authorization recorded below;
the missing implementations still prevent full closure.

Independent state/message/escalation/completion contracts are complete; ordinary
and challenging journeys/tests are implemented only for the simulated scope.
Their backlog work packages remain unchecked for full authorized acceptance.
DM-03/DM-04 were not started in that implementation run. Subsequently, on
2026-10-31, the user authorized prerequisite work before DM-INT closure.
The former ordering blocker is resolved; missing implementations and integrated
acceptance remain open. Scope and dependencies were not reduced. See
`DM_DEPENDENCY_ORDER_RESULTS.md` for the correction and verification.

Also unverified: real-model interpretation, arbitrary natural-language fire-image
configuration, actual perception/images, autonomous mobility, physical stop/link
behavior, authenticated handoff and independent human/lecturer acceptance.

## Explicit non-claims

Simulation confirmation is not supervisor authorization. Actor labels/access
codes do not establish a supervisor identity. Synthetic evidence URIs are not
captured images; confidence 1.0 is fixture data, not measured detection quality.
Injected timeout/lost-link commands are not watchdog or transport validation.
Acknowledgement records only a demo action, not real responsibility transfer.
No physical dispatch, safety certification, operational readiness, DM-03/04/05
closure, model-gate completion, Gala/Cutoff closure, commit, push or deployment.

## Initial-run recommendation (superseded by integrated completion below)

Implement DM-03, DM-04 and DM-05 in the now-authorized prerequisite order before
claiming integrated DM-INT acceptance. Retain DM-05 adapter acceptance and the
user-deferred DM-02 provider gate for operational handoff. Human review can use
the checked matrix and repeatable fire rehearsal now.

## Integrated completion addendum

DM-03 platform requirements, DM-04 individual scope-bound supervisor review and
the DM-05 simulator adapter are now implemented and verified. Their original
requirements were retained; the user authorized prerequisite order rather than
removing authorization or safety gates. This closes the five DM-INT work packages
for the plan's simulated demonstrator scope. The earlier unauthenticated command
rehearsal remains separate and cannot authorize this adapter.

### What changed

The new fire-image journey uses the original core agent for incomplete capture,
clarification, platform declaration renewal and safety reassessment. Valerian then
requires an individually provisioned supervisor credential bound to the current
revision, safety digest and review version. Only that approved immutable snapshot
is passed to the local MissionExecutor implementation, with a separate execution
UUID. Adapter feedback, operator escalation/resume/abort and final handoff are
persisted in bounded Storage entries and queryable through the scoped API/UI.
Final results include synthetic evidence/location/confidence, outcome and a
separate responsibility acknowledgement identifying the receiving access scope.

### What was verified

Exact commands are recorded in DM05_RESULTS.md and the executable guide
`../.doc/disaster-fire-adapter.md`. Final focused commands:

```text
.\mvnw.cmd -o -q '-Dtest=FireMissionExecutionUnitTest,PlatformSafetyUnitTest,DisasterMissionConfigurationUnitTest,DisasterMissionSimulationUnitTest,PrometheusCorsConfigurationWebMvcTest,ValerianClientStaticResourceContractTest' test
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests MissionExecutionIntegrationTest,MissionReviewIntegrationTest,DisasterMissionScopedIntegrationTest,DisasterMissionSimulationIntegrationTest --browser --browser-spec tests/playwright/disaster-fire-adapter.spec.mjs --browser-spec tests/playwright/disaster-mission.spec.mjs --browser-spec tests/playwright/disaster-mission-simulation.spec.mjs
.\mvnw.cmd -o -q -DskipTests package
```

JDK 21, existing local test dependencies, isolated loopback MySQL and installed
Chrome; PYTHONPATH=target/dm02-python and PLAYWRIGHT_CHROMIUM_CHANNEL=chrome.
Final results: 34 focused unit/client checks, 11 committed integration tests,
9 browser cases with Live enabled plus 9 disabled, all passed with zero skips,
failures or errors. Packaging and fixture-exclusion inspection passed.

The two new UI journeys exercise all phases, including an initially incomplete
mission, authenticated approval, ordinary execution or obstacle/resume, fresh
progress, separate pending handoff and closed outcome. Reconnect/reload preserves
the exact execution JSON. Adapter replay also exercises abort. Unit/API tests cover
unsafe/incomplete/stale authorization, conflicting concurrent review, duplicate
and foreign/out-of-order feedback, timeout/failure/cancellation and immutable
snapshot retention. These are real HTTP/JPA/MySQL boundaries with explicit
deterministic interpretation/execution fixtures, not real-model quality evidence.

Artifacts: target/gptlive-acceptance-c84c63a264/ with java/compile/browser logs,
authorized-simulation-timeline and replay JSON, plus authorized-simulation-handoff.png
screenshots. The browser-true dc246 screenshot was inspected: English review and
simulation controls, empty credential field and explicitly labelled synthetic
execution JSON. This is a compact JSON-based demonstrator, not a polished editor.
Logs: target/dm-software-unit-final.log, target/dm-software-acceptance-final.log,
target/dm-software-package.log. Runner removed its disposable schema/account and
stopped apps; target/dm-software-cleanup.json records zero remaining objects and
shutdown of the exact owned MySQL data directory, separate from the installed service.

### What remains unverified and explicit non-claims

The DM-02 real-provider gate is still user-deferred; no operational handoff is
accepted. No actual image analysis/capture, navigation, robot movement, measured
sensor confidence, physical communications-loss behavior or certification was
validated. Credentials authenticate admin-assigned demo identities, not enterprise
identity attestations. Handoff identifies a scope, not a legally verified human.
The five-minute deadline is enforced on read/update, not a background physical
watchdog. Human/lecturer evaluation of interaction quality remains pending.
Gala, Cutoff and DM-06 remain open. No commit, push or deployment occurred.

Next: human review of the reproducible demonstrator, then the explicitly deferred
interpretation gate and hardware prerequisites. Do not broaden autonomy first.

## Manual test usability follow-up

The user requested step-by-step manual Valerian instructions. Added --manual to
the existing isolated acceptance runner; default automated acceptance is unchanged.
It starts the same offline fixture application with Live disabled, provisions a
DM001 access scope and an individual temporary supervisor credential, then waits
for Enter before existing application/schema/account cleanup. The credential is
written only to ignored target/gptlive-acceptance-<id>/manual-access.json, never
printed or committed. Paid/browser modes cannot be combined with manual mode.

Guide: ../.doc/valerian-manual-fire-test.md. Exact startup verification:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --manual
```

Startup/compile and provisioning passed at target/gptlive-acceptance-b5a4e8fb0b/.
Using that temporary fixture application, the four capture/reassessment inputs,
scoped supervisor approval and replay_fire_adapter.py --variant obstacle passed
through real local HTTP/MySQL (8 adapter transitions); artifact
target/manual-demo-proof.json. Enter exited normally and removed app/schema/account.
A subsequent check found zero disposable schemas/accounts before shutting down
only the dedicated MySQL instance (verified by exact data directory).

No provider/hardware call or Java runtime change. Prior browser evidence covers
the GUI; this follow-up claims no new human usability approval.
