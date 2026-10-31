# DM-05 results

Date: 2026-10-31. Status: closed for simulation software; operational/model gate
remains open. UC-FIRE-01/02; DR-03/04/05. No operational handoff is accepted.

## What changed

In-process FireImageSimulator, immutable approved-mission handoff, persisted
execution state/feedback and scoped simulation-only endpoints. See PLAN_DM05.md.
The adapter receives immutable serialized approved mission JSON plus execution
identity, revision, review version and safety reference. It supports exactly the
synthetic R-204 printed-indicator inspection, with ordinary/obstacle/failure/timeout
variants. Start requires enabled scope-bound supervisor authority. Scoped operator
updates can step the simulator, resume within unchanged bounds, abort or acknowledge
handoff; user text cannot impersonate adapter feedback.

Backend reducers fence foreign/stale/out-of-order updates, require progress before
completion, make repeated starts idempotent and avoid duplicate feedback effects.
Changed/revoked approval cancels active runs. Immutable mission, snapshots and
events persist through existing bounded Storage. Completion and handoff are
separate; the acknowledging access scope is recorded, unsuccessful runs contain
no invented evidence. Reset clears execution but retains review audit history.
The existing Valerian review panel now exposes this simulator lifecycle. Added
unit/API/browser coverage and a replay script that never invokes inference.

## What was verified

Final source: Windows, JDK 21, dedicated loopback MySQL 9.5, installed Chrome.
Exact commands (JAVA_HOME/PATH set to C:/Program Files/Java/jdk-21):

```powershell
.\mvnw.cmd -o -q '-Dtest=FireMissionExecutionUnitTest,PlatformSafetyUnitTest,DisasterMissionConfigurationUnitTest,DisasterMissionSimulationUnitTest,PrometheusCorsConfigurationWebMvcTest,ValerianClientStaticResourceContractTest' test
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests MissionExecutionIntegrationTest,MissionReviewIntegrationTest,DisasterMissionScopedIntegrationTest,DisasterMissionSimulationIntegrationTest --browser --browser-spec tests/playwright/disaster-fire-adapter.spec.mjs --browser-spec tests/playwright/disaster-mission.spec.mjs --browser-spec tests/playwright/disaster-mission-simulation.spec.mjs
.\mvnw.cmd -o -q -DskipTests package
```

- 34 focused Java unit/client checks passed (16 mission/reducer guards + 18
  CORS/static-client contracts), zero failures/errors/skips.
- 11 committed Java integration tests passed (3 executor, 3 review, 3 mission,
  2 rehearsal), zero failures/errors/skips. Execution tests exercise all five
  outcomes including abort, same-request start retry, authorization/unsupported
  scenario rejection, stale/foreign update rejection, persisted cancellation on
  approval change, immutable snapshot and detached reload/reset.
- 9 browser cases with Live enabled and 9 disabled passed, no skips/failures.
  New ordinary and obstacle journeys include incomplete capture, clarification,
  declaration renewal, safety reassessment, authenticated approval, adapter
  progress, escalation decision, completion/handoff and persisted reconnect.
  Third new case runs Python adapter replay ordinary/obstacle/abort via real HTTP.
  Existing mission and rehearsal regressions also pass. Backend HTTP, transactions
  and MySQL are real; extraction and all execution findings are fixtures.
- Packaging passed. ZIP inspection confirmed simulator/review/UI components
  in the production JAR and no BOOT-INF/classes/fixtures test helpers.

An initial backend-only acceptance (cc41c66860) passed all six execution/review
integration tests. First full run (1598301163) passed all 11 integration and 18
browser cases; final rerun below includes explicit handoff scope/confidence and
credential-toString redaction. No failed DM-05 test run occurred.

## What remains unverified

DM-02 provider gate remains deferred; physical validation is DM-06.
All simulation-software packages are complete; the acceptance condition requiring
a passed interpretation gate before operational handoff remains intact. No such
handoff was attempted or accepted. Deadline expiry is verified with a controlled
clock at reducer level; the service checks the persisted five-minute deadline on
read/update, not via a background watchdog. Physical link-loss response, real images,
navigation, real-model language quality and independent human review are unverified.
Authorization/concurrency uses the existing single-process turn boundary, not a
distributed deployment guarantee. Handoff identifies an access scope, not a
verified human/legal recipient.

## Explicit non-claims

No sensors, autonomous mobility, physical endpoints, operational/model acceptance,
production deployment or paid requests.

## Artifact references

PLAN_DM05.md; ../.doc/disaster-fire-adapter.md; ../tests/disaster/replay_fire_adapter.py;
target/dm-software-unit-final.log; target/dm-software-acceptance-final.log;
target/dm-software-package.log; target/gptlive-acceptance-c84c63a264/:
java.log, compile.log, browser-true.log, browser-false.log, screenshots, authorized
timeline and adapter replay JSON attachments. Surefire reports under target/surefire-reports.
The runner stopped its apps and removed disposable schema/account. Dedicated
MySQL helper cleanup is recorded separately at target/dm-software-cleanup.json.

Next: integrated DM-INT closure consumes this simulation evidence; the remaining
DM-02 interpretation gate and DM-06 supervised hardware pilot require external
prerequisites. No GitHub issue created: repo-local backlog is authoritative while
issues are disabled.
