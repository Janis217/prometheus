# DM-03 results

Date: 2026-10-31. Status: closed for declarative software scope. UC-FIRE-01/02;
DR-02, DR-05. Authentication and physical safety remain separate milestones.

## What changed

Added explicit platform requirement evaluation and mission schema version 2,
reusing the existing extraction/action/policy/Storage flow. See PLAN_DM03.md.
PlatformSafety evaluates common and embodiment-specific requirements, rejects
unknown/conflicting/malformed declarations, exposes unresolved reasons and fails
closed for unsupported embodiments. Relevant mission edits invalidate declarations;
evidence edits require a subsequent safety reassessment. Legacy schema 1 data
cannot supply the new checks. Long briefs still fail closed within the existing
2048-character entry limit; compacted repeated constraint wording avoids migration.
Updated extraction instructions, deterministic test fixtures and demo documentation.

## What was verified

JDK 21, existing Maven wrapper, dedicated loopback MySQL 9.5 and installed Chrome.
Exact commands (JAVA_HOME/PATH set to C:/Program Files/Java/jdk-21):

```powershell
.\mvnw.cmd -o -q '-Dtest=PlatformSafetyUnitTest,DisasterMissionConfigurationUnitTest,DisasterMissionSimulationUnitTest' test
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests DisasterMissionScopedIntegrationTest --browser --browser-spec tests/playwright/disaster-mission.spec.mjs
```

- Unit selector: 12 passed (3 platform rules, 4 mission guards, 5 simulation
  regressions), zero failures/errors/skips. All three supported embodiments,
  each missing/failed/ambiguous declaration, malformed values, unknown embodiment,
  legacy record, evidence change and renewed assessment are covered.
- Integration: 3 passed, zero failures/errors/skips. Committed requests and detached
  JPA reload preserve platform status, requirements and unresolved checks; mission
  changes invalidate them and emitted JSON matches scoped storage.
- Browser: 3 passed with Live enabled, 3 disabled; real API/MySQL/Valerian,
  offline extraction fixtures, explicit reconnect and stored/displayed equality.
- Runner stopped its own applications and removed its disposable schema/account.
  The owned MySQL helper remains running for the immediately following milestone.

Initial evidence-change regression failed the older missing-information test:
it assumed new affirmative declarations and their safety reassessment occurred
in the same turn. The conservative contract requires a later reassessment;
the test now explicitly supplies that turn. An intermediate comparison also
included irrelevant platform keys; comparison now normalizes to required keys.
Retained failure: target/dm03-unit-assessment-failure.log. Final runs above pass.

## What remains unverified

Authenticated review is DM-04; provider and hardware gates remain separate.
No independent physical verification of declarations or actual platform envelope
is performed. Real-model interpretation is still the user-deferred DM-02 gate.

## Explicit non-claims

Operator declarations are not sensor proof, certification or physical readiness.
No supervisor identity, robot control, provider trial, deployment or billing.

## Artifact references

PLAN_DM03.md; target/dm03-unit-final.log; target/dm03-acceptance.log;
target/gptlive-acceptance-7f743ba247/{java,compile,browser-true,browser-false}.log;
target/surefire-reports/ch.zhaw.prometheus.agentdefs.core.PlatformSafetyUnitTest.txt.
Sources: PlatformSafety.java, DisasterMission.java, DisasterMissionAction.java;
focused unit/integration fixtures and tests. Logs are ignored local artifacts.

Next: DM-04 authenticated, revision-bound supervisor decisions. Repo-local backlog
is authoritative; no GitHub issue was created because issue tracking is disabled.
