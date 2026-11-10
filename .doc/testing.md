# Testing PROMETHEUS

## JavaScript units

```powershell
npm test
```

This runs the room simulator, mission/room contracts, speech, transcription,
Live media/sensing and performance units through Node's test runner.

## Full offline backend and browser acceptance

Use the isolation runner for integration/browser suites that provision access
codes or clean database records. It creates a generated local schema and account,
overrides provider URLs/credentials, disables runtime ticks, starts fixture apps
on loopback ports, and removes only its owned resources. It never uses the
configured application schema as the test target.

The runner requires local MySQL administration and Python PyMySQL. To keep its
Python dependency in this workspace:

```powershell
python -m pip install --target target/test-python PyMySQL
$env:PYTHONPATH=(Resolve-Path target/test-python).Path
$env:PLAYWRIGHT_CHROMIUM_CHANNEL='chrome'
python tests/gptlive/run_acceptance.py --database-properties src/main/resources/application.properties --java-tests all --browser --browser-spec tests/playwright
```

A separate ignored administrative properties file can be passed instead. Do not
put credentials in command arguments. Only localhost database hosts are accepted.
The runner uses password-required supervisor acceptance by default, independently
of the running demo's password-free setting. Explicit environment overrides are
supported for dedicated password-free tests. The browser runner provisions its
own RM014 mission/room access scope in the disposable schema.

Run only the backend with `--java-tests all` (omit `--browser`), or only browser
acceptance with `--java-tests none --browser --browser-spec tests/playwright`.
The app is tested with Live enabled and disabled; physical media/provider
boundaries are deterministic fixtures. No paid provider flags are needed.

Artifacts are under `target/gptlive-acceptance-<id>`: java.log, app-true/false.log,
browser-true/false.log and browser screenshots/traces. These are local ignored
artifacts. Java XML results also appear in `target/surefire-reports`.

## Focused main workflow

`npm run test:mission:flow` selects the guided setup/player tests and recovery
cases. For real scoped journeys, run it through the isolated runner's repeatable
`--browser-spec` selection. Existing direct local-demo tests may alternatively use
an explicitly supplied PROMETHEUS_ROOM_ACCESS_CODE and only their owned agents.

Recovery coverage includes rejected login, failed-save popup cleanup, revoked
access, server loss/reconnect, changed safety and explicit non-autostart reload.
Function-contract units cover moving targets, live obstructions, replanning,
actuator faults, malformed/replayed calls and captured evidence integrity.

## Other surfaces and verification limits

The auxiliary PHP participant site has a different server and configuration:
`playwright.participate.config.mjs`. The main Spring Playwright config excludes
its test, so it cannot accidentally run against the Valerian home page.

Offline acceptance verifies software contracts and controlled failure paths.
Real microphone/camera quality, hardware execution and paid-provider behavior
require separate explicit trials; automated fixture success does not establish
them. The local demo's password-free supervisor mode is checked separately from
the default authenticated acceptance mode.
