# QA-01 results and continuation handoff

Status: IN PROGRESS, 2026-11-10. User requested whole-tool tests, then explicitly
asked to save remaining work before context/token exhaustion. Do not mark complete
until the final browser results below have been inspected.

## Confirmed results

- JavaScript: `npm test` passed 191 tests (including two new simulator failure cases).
- Java: full suite passed 702 tests, zero failures/errors/skips. Evidence:
  `target/gptlive-acceptance-546597d4f2/java.log`. That run's browser stage used
  obsolete reload assertions and failed 11 cases; this is not the final browser result.
- Corrected legacy mission browser specs passed 14 tests with Live=true and
  another 14 with Live=false: `target/gptlive-acceptance-a7dd2ec87a/`.
  Runner exited 0 and removed its owned app/schema/account.
- Local password-free supervisor and standalone imported-room journey passed
  2 browser tests against port 8080; only their owned agent was removed.
- Python runner guard tests passed 3 tests: `python -B tests/gptlive/test_acceptance_runner.py`.
- Secondary surfaces: 2 tests passed with Live=true and 2 with Live=false;
  `target/gptlive-acceptance-abc7211609/`, runner exited 0 and cleaned up.
- `git diff --check` passed (only line-ending notices).
- Prior broad browser baseline: 115 passed, 11 stale reload assertions failed,
  1 expected password-mode skip. Corrected reload cases passed in isolation above.

## Changes made for QA

Added standard npm unit/mission-flow commands and `.doc/testing.md`.
Added recovery tests for revoked access, transient server failure, safety revision,
invalid login and failed-save popup cleanup. Added action tests for moved targets
and throwing executor hooks. Rewrote obsolete inline-room integration for the
separate room library/player. Updated static Java contracts for cockpit.html.
Fixed isolated runner auth defaults and seeded RM014 scope for real room journeys.
Excluded the independently hosted PHP participant spec from the Spring config.
Updated legacy browser tests to respect restored connections after reload.
Added read-only access-management session and missing-agent listener tests.
No production behavior fix was needed during this QA pass so far.

## Active runs: inspect these first next turn

1. Complete corrected browser sweep: unified exec session **42929**;
   artifacts `target/gptlive-acceptance-fec51f2169/`.
   Live=true began with 127 tests before secondary-surfaces.spec.mjs was added.
   Live=false may discover 129 tests, including the new file. Expected one
   password-free-mode skip in each authenticated fixture run. Do not assume pass.
2. New secondary-surface tests in both Live modes: session **60571**;
   artifacts `target/gptlive-acceptance-abc7211609/`.
   Covers invalid/valid admin login, reload restore, forget token, and listener
   refusing to open media without an agent. PASSED 2 tests in each mode, exit 0,
   owned resources removed. No further action required.
3. Earlier baseline session **93746** had Java success but old browser failures;
   exited 1 for known browser failures; owned resources were removed.

Poll sessions with write_stdin or inspect log tails. Runners own their generated
schemas/accounts and automatically remove them in finally; do not kill arbitrary
Java/MySQL processes. The user's running app is separate on port 8080.
If sessions cannot be resumed after a new session, inspect artifacts and processes
before rerunning. Do not print local properties, tokens, or datasource secrets.

## Remaining work

- Inspect both active runs, diagnose/fix any new failures and rerun only affected
  coverage; repeat broad sweep only if changes justify it.
- Record final passed/skipped counts per Live mode, not guessed totals.
- `git diff --check` passed at handoff; inspect QA-specific diffs and repeat if edited.
- Finish this evidence file and `.agents/PLAN_TOOL_QA.md`, close QA-01 in local
  backlog, and update current PROJECT status once acceptance actually passes.
- Deliver concise user summary of tests, fixes, and material limits.
- Do not commit or discard pre-existing changes; many implementation changes
  from earlier turns remain dirty/untracked.

## Reproducible commands and boundaries

See `.doc/testing.md`. Full browser rerun uses PowerShell:

```powershell
$env:PYTHONPATH=(Resolve-Path target/test-python).Path
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
python tests/gptlive/run_acceptance.py --database-properties src/main/resources/application.properties --java-tests none --browser --browser-spec tests/playwright
```

PyMySQL was installed only into target/test-python. Use the isolated runner,
never run destructive backend fixtures against the user's database.
The final Java XML directory contains one stale 3-test TaskSpecificationProbeTest
report; naively summing all XML yields 705. The actual full Maven run is 702;
filter report timestamps against that java.log or use the run log.
No paid providers or physical hardware trials were performed. Camera/microphone,
real provider audio quality, and the auxiliary PHP site remain separate checks.
The multilateral reports page is a static mock display, not live reporting.
GitHub issues are disabled; local backlog is authoritative.
