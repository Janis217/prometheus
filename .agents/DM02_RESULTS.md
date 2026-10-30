# DM-02: Disaster Mission End-to-End Validation results

Date: 2026-10-30. Plan: [PLAN_DM02.md](PLAN_DM02.md).
Demo/setup: [.doc/dm02-validation.md](../.doc/dm02-validation.md).

## Status

Automated scope complete. The user explicitly deferred the real-model trial as
an open gate; it is not claimed as passed. No provider credentials were configured
and no paid request occurred. No robot execution or supervisor roles were added.

- [x] Isolated loopback MySQL setup and test dependencies.
- [x] Scoped success, missing-information and unsafe integration paths.
- [x] JSON emission equals committed storage and detached JPA reload.
- [x] Real Valerian HTTP/SSE/database journeys and explicit reconnect hydration.
- [x] Revision change revokes approval; reset and access boundaries verified.
- [x] Repeatable demo instructions, screenshots and cleanup evidence.
- [ ] Real-model interpretation trial: deferred by the user, not run.

## What changed

- Added DisasterMissionScopedIntegrationTest with three focused integration cases.
  Requests commit separately (no enclosing test transaction); storage and the full
  custom action/policy graph are reloaded through the actual repositories.
- Added three Valerian browser journeys, executed with Live enabled and disabled.
  Access-code creation/permissions, agent creation/connection, typed mission input,
  emitted output, stored JSON, scope rejection and reload/reconnection use real
  application endpoints, SSE and MySQL. No backend/network/persistence mocks.
- Added a deterministic disaster extraction fixture to the existing test-classpath
  LiveSmokeConfiguration. Both direct/typed extraction paths are supported without
  changing existing non-disaster fixture behavior. It is scripted evidence, not
  natural-language interpretation or a production fallback.
- Extended the existing acceptance runner with repeatable `--browser-spec` selection;
  default suites/feature modes and disposable-schema cleanup are unchanged.
- Added setup/demo instructions in English. Production mission code was not
  rewritten; the existing AgentDefinition/factory and scoped controller suffice.

## Environment and exact verification

Local Windows workstation, JDK 21.0.5, MySQL 9.5.0, installed Chrome 156, repository
Maven wrapper (3.9.11), existing locked Playwright dependencies. PyMySQL 1.2.3 was
installed only under ignored target/dm02-python. A dedicated MySQL process used
target/dm02-local-mysql/data and loopback port 33097, separate from the installed
service/data. target/dm02-database.properties selects only that dedicated instance.
No remote or production database was used.

Final command actually executed:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests DisasterMissionScopedIntegrationTest --browser --browser-spec tests/playwright/disaster-mission.spec.mjs
```

Final artifacts: `target/gptlive-acceptance-55fe662028/`.

- `java.log`: **3 passed**, zero failures/errors/skips.
- `compile.log`: test-classpath fixture compilation passed.
- `browser-true.log`: **3 passed**, zero failures/skips.
- `browser-false.log`: **3 passed**, zero failures/skips.
- `target/dm02-acceptance.log`: all four stages exit 0, disposable cleanup confirmed.
- `target/surefire-reports/ch.zhaw.prometheus.controllers.DisasterMissionScopedIntegrationTest.txt`.
- `browser-true/` and `browser-false/`: mission-ready/success/missing/unsafe screenshots.
  Ready and blocked interaction panels were visually inspected. They display the
  canonical JSON; this milestone does not add a separate mission-editor UI.

Also ran `./mvnw.cmd -o -q -DskipTests package` with JDK 21: passed
(`target/dm02-package.log`). `git diff --check` passed.

No broader test suite was necessary: production runtime/API contracts were not
changed. The new checks target real boundaries absent from the prior unit tests.

## Failures and corrections retained

Two initial integration runs passed only the incomplete path and failed the
success/unsafe assertions. Their deterministic fixture read the last prompt
message, but the existing assembler appends an extraction reminder after selected
event history. The fixture now explicitly reads `<eventhistory>`; typed extraction
requests also route through it. Initial artifacts:
`target/gptlive-acceptance-056263578e/` and `target/gptlive-acceptance-6be4f38133/`.
These are fixture errors, not evidence of real-model failure or a production fix.

The first passing run (`target/gptlive-acceptance-4323d32388/`) checked database
survival after page reload, but visual inspection showed the deliberately empty,
disconnected cockpit. The final browser assertions now explicitly reconnect and
parse the last displayed assistant JSON, comparing it to persisted storage.
The stronger final run passed in both feature modes. No connection semantics were
changed or auto-connect added to conceal the initial test gap.

## Cleanup and boundaries

The runner stopped both owned application process trees and dropped its random
schema/account. An independent check on the dedicated MySQL instance verified
**zero remaining disposable schemas and accounts**, checked its data directory
against the owned repository target path, then shut down that helper server.
Evidence: `target/dm02-cleanup.json`; its process is no longer running.
Data files remain ignored under target for an explicit local restart; no recursive
cleanup or unrelated service/process termination was performed.

Gala stays open/deferred. Cutoff Inspection's previous prerequisite absence is now
resolved by this reusable local setup, but its own integrated acceptance has not
been run as part of DM-02 and remains open. No unrelated milestone was checked off.
No commits, pushes, deployments or separate project/cockpit modifications occurred.
GitHub issue creation was skipped because repo-local tracking records issues disabled.

## Remaining risks and next step

Scripted extraction does not establish interpretation accuracy for real briefs,
adversarial instructions or ambiguous safety declarations. The user-deferred
real-model gate must use a bounded synthetic corpus and explicitly configured test
credentials. Current ready means operator-confirmed configuration, not verified
physical safety, authenticated supervisor approval or dispatch authorization.

Next product increment: platform-specific safety requirements and authenticated
supervisor approval. Resume the deferred real-model interpretation gate when a
test configuration is deliberately supplied. Physical robot execution remains
outside both this validation milestone and the current prototype.
