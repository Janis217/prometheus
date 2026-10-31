# DM-04 results

Date: 2026-10-31. Status: closed for bounded demo authorization scope.
UC-FIRE-01/02; DR-02/03/04. Integrated execution acceptance remains DM-05/DM-INT.

## What changed

Individually issued scope-bound supervisor credentials, revision/safety/version
review decisions, persisted audit records and compact Valerian controls are being
implemented through existing admin/scoped API and agent-turn boundaries.
Admin-issued reviewer UUID/name and one scope UUID bind 256-bit credentials;
only digests are persisted. Shared demo codes and chat text cannot approve.
Decisions bind revision, safety digest and review version; exact retries are
idempotent, conflicting concurrent decisions lose the version race. Audits retain
identity, scope, revision, reference, decision and UTC time across reset. Relevant
edits clear readiness. A compact, mission-only Valerian panel loads the reviewed
snapshot, clears credentials after each action/scope change and displays results.
Existing CORS configuration now permits the separate supervisor header.

## What was verified

JDK 21, dedicated loopback MySQL 9.5, installed Chrome. Exact commands, with
JAVA_HOME/PATH set to C:/Program Files/Java/jdk-21:

```powershell
.\mvnw.cmd -o -q '-Dtest=PlatformSafetyUnitTest,DisasterMissionConfigurationUnitTest,DisasterMissionSimulationUnitTest' test
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests MissionReviewIntegrationTest,DisasterMissionScopedIntegrationTest,DisasterMissionSimulationIntegrationTest --browser --browser-spec tests/playwright/disaster-mission.spec.mjs --browser-spec tests/playwright/disaster-mission-simulation.spec.mjs
.\mvnw.cmd -o -q '-Dtest=PrometheusCorsConfigurationWebMvcTest,ValerianClientStaticResourceContractTest' test
```

- 12 domain/unit regressions passed, zero failures/errors/skips.
- 8 Java integration tests passed (3 review, 3 configuration, 2 rehearsal), zero
  failures/errors/skips. Committed requests/detached reload verify admin-only
  credential issuance/revocation, missing/foreign/revoked reviewer rejection,
  disabled/invisible scope rejection, incomplete/unsafe/stale mission rejection,
  approval/rejection/revocation, audit identity/time, idempotent retry and actual
  concurrent approve/reject CAS (one 200, one 409).
- 6 browser cases with Live enabled and 6 disabled passed, zero skips/failures.
  Real Valerian/API/MySQL; successful mission review uses a separate issued
  credential, tests token clearing and displayed/stored equality. Ordinary,
  obstacle and abort rehearsal replays remain explicitly simulated.
- 18 focused CORS/static-client checks passed (4 + 14), including supervisor-header
  preflight while untrusted origins remain rejected.

Initial acceptance target/gptlive-acceptance-7508baef00 failed two existing
configuration cases: a special chat-confirmation question was persisted but
normalization emitted different JSON. Removed that inconsistency and retained
fail-closed chat behavior. A passing intermediate run is c54efc59cc; the final
full rerun below includes admin-boundary assertions and mission-only UI controls.
No failed provider or hardware trial occurred.

## What remains unverified

No enterprise identity provider, independent identity attestation, credential
delivery procedure or multi-instance distributed locking was verified. Admin
assignments are trusted; token possession authenticates that assigned principal.
Credential disabling blocks future decisions but does not erase earlier approvals;
approval revocation is a separate audited action. Runtime is the existing single
process agent-turn boundary. Physical safety/provider quality remain open gates.

## Explicit non-claims

No organization IAM, external identity verification, provider quality, physical
safety, deployment or paid requests. See PLAN_DM04.md for the limited trust model.

## Artifact references

PLAN_DM04.md; ../.doc/mission-supervisor-review.md;
target/dm04-unit-final.log; target/dm04-client-contracts.log; target/dm04-verified.log;
target/gptlive-acceptance-678a9c847f/{java,compile,browser-true,browser-false}.log,
browser result/screenshots/JSON attachments and target/surefire-reports.
Runner cleanup confirmed owned apps stopped and disposable schema/account removed;
the dedicated MySQL helper remains for DM-05. No production database used.

Next: DM-05 immutable approved-revision simulator adapter, then integrated DM-INT.
Repo-local backlog remains authoritative; GitHub issues are disabled.
