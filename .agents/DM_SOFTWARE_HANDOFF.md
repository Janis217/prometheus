# Disaster software handoff

Date: 2026-10-31. Current checkout/branch retained. No commit, push or deployment.

## Outcome

- DM-03: declarative platform safety checks complete.
- DM-04: individual scope-bound supervisor authorization and audits complete.
- DM-05: simulation software complete; operational real-model gate remains open.
- DM-INT: authorized deterministic simulator demonstrator complete.

The canonical tracker is GITHUB_ISSUE_BACKLOG.md. Exact commands, failures and
artifacts are in DM03_RESULTS.md, DM04_RESULTS.md, DM05_RESULTS.md and the
DM_INT_RESULTS.md completion addendum. Demonstrator: ../.doc/disaster-fire-adapter.md.

## Final verification

34 focused unit/client checks, 11 committed integration tests and 18 browser/replay
cases passed; zero failures/errors/skips in the final runs. Packaging and JAR
fixture-exclusion inspection passed. Traceability checker passed 126 matrix cells,
six use cases and five DM-INT mappings. git diff --check passed (ordinary CRLF warnings).

Logs: target/dm-software-unit-final.log, target/dm-software-acceptance-final.log,
target/dm-software-package.log, target/gptlive-acceptance-c84c63a264/.
Cleanup: target/dm-software-cleanup.json; zero disposable schemas/accounts left,
owned MySQL helper shut down and process exit verified. Installed service untouched.

## Remaining gates and non-claims

DM-02 real-model trial remains user-deferred. DM-06 needs chosen hardware/operator,
controlled area and actual trials. Gala lacks checkout-specific material; Cutoff
acceptance remains separate/open. No operational handoff, physical safety,
perception quality, mobility, certification or production rollout is claimed.
Deadlines are polling-enforced for an inert local simulator, not physical watchdogs.
Supervisor identities are admin-provisioned demo principals; handoff identifies
an access scope, not an externally verified person or legal responsibility transfer.

Next: human review/replay of the bounded demonstrator; then configure the separately
approved provider trial and hardware prerequisites. Existing independent gates
must retain their own evidence and must not be silently marked complete.

## Files for review

This is the current uncommitted worktree manifest, including pre-existing
user-authorized planning/rehearsal changes. Those were preserved; inclusion here
does not claim every file was first authored in this run. In particular,
PLAN_DM_EVIDENCE_PROTOCOL.md was already present and was not rewritten.
Generated logs, credentials, MySQL data and build output stay in ignored target.

- `.agents/DM03_RESULTS.md`
- `.agents/DM04_RESULTS.md`
- `.agents/DM05_RESULTS.md`
- `.agents/DM_DEPENDENCY_ORDER_RESULTS.md`
- `.agents/DM_INT_RESULTS.md`
- `.agents/DM_SOFTWARE_HANDOFF.md`
- `.agents/DM_UC_RESULTS.md`
- `.agents/GITHUB_ISSUE_BACKLOG.md`
- `.agents/PLAN_DM03.md`
- `.agents/PLAN_DM04.md`
- `.agents/PLAN_DM05.md`
- `.agents/PLAN_DM_DEMONSTRATOR_FIRE.md`
- `.agents/PLAN_DM_EVIDENCE_PROTOCOL.md`
- `.agents/PLAN_DM_IMPLEMENTATION_PLANNING.md`
- `.agents/PLAN_DM_INTERACTION_LIFECYCLE.md`
- `.agents/PLAN_DM_SCOPE_AND_RISKS.md`
- `.agents/PLAN_DM_TRACEABILITY.md`
- `.agents/PLAN_DM_USECASE_SYSTEMATICS.md`
- `.agents/dm-usecase-matrix.json`
- `.doc/disaster-fire-adapter.md`
- `.doc/disaster-fire-demonstrator.md`
- `.doc/disaster-mission-configuration.md`
- `.doc/dm02-validation.md`
- `.doc/mission-supervisor-review.md`
- `PROJECT.md`
- `README.md`
- `src/main/java/ch/zhaw/prometheus/application/FireImageSimulator.java`
- `src/main/java/ch/zhaw/prometheus/application/MissionExecutionService.java`
- `src/main/java/ch/zhaw/prometheus/application/MissionReviewService.java`
- `src/main/java/ch/zhaw/prometheus/config/PrometheusCorsConfiguration.java`
- `src/main/java/ch/zhaw/prometheus/controllers/MissionExecutionController.java`
- `src/main/java/ch/zhaw/prometheus/controllers/MissionReviewController.java`
- `src/main/java/ch/zhaw/prometheus/model/disaster/DisasterMission.java`
- `src/main/java/ch/zhaw/prometheus/model/disaster/DisasterMissionAction.java`
- `src/main/java/ch/zhaw/prometheus/model/disaster/DisasterMissionPolicy.java`
- `src/main/java/ch/zhaw/prometheus/model/disaster/DisasterMissionSimulation.java`
- `src/main/java/ch/zhaw/prometheus/model/disaster/FireMissionExecution.java`
- `src/main/java/ch/zhaw/prometheus/model/disaster/MissionSupervisor.java`
- `src/main/java/ch/zhaw/prometheus/model/disaster/PlatformSafety.java`
- `src/main/java/ch/zhaw/prometheus/repositories/MissionSupervisorRepository.java`
- `src/main/java/ch/zhaw/prometheus/spi/MissionExecutor.java`
- `src/main/resources/public/valerian/index.html`
- `src/main/resources/public/valerian/mission-review.js`
- `src/main/resources/public/valerian/script.js`
- `src/test/java/ch/zhaw/prometheus/agentdefs/core/DisasterMissionConfigurationUnitTest.java`
- `src/test/java/ch/zhaw/prometheus/agentdefs/core/DisasterMissionSimulationUnitTest.java`
- `src/test/java/ch/zhaw/prometheus/agentdefs/core/FireMissionExecutionUnitTest.java`
- `src/test/java/ch/zhaw/prometheus/agentdefs/core/PlatformSafetyUnitTest.java`
- `src/test/java/ch/zhaw/prometheus/config/PrometheusCorsConfigurationWebMvcTest.java`
- `src/test/java/ch/zhaw/prometheus/controllers/DisasterMissionScopedIntegrationTest.java`
- `src/test/java/ch/zhaw/prometheus/controllers/DisasterMissionSimulationIntegrationTest.java`
- `src/test/java/ch/zhaw/prometheus/controllers/MissionExecutionIntegrationTest.java`
- `src/test/java/ch/zhaw/prometheus/controllers/MissionReviewIntegrationTest.java`
- `src/test/java/fixtures/gptlive/DisasterMissionFixture.java`
- `tests/disaster/check_usecase_traceability.py`
- `tests/disaster/replay_fire_adapter.py`
- `tests/disaster/replay_fire_simulation.py`
- `tests/playwright/disaster-fire-adapter.spec.mjs`
- `tests/playwright/disaster-mission-simulation.spec.mjs`
- `tests/playwright/disaster-mission.spec.mjs`
