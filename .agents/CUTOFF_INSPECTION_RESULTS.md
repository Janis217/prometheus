# Cutoff Inspection results

Date: 2026-10-30. Plan: [PLAN_CUTOFFINSPECTION.md](PLAN_CUTOFFINSPECTION.md).

## Status and scope

- [x] CI-01: bounded independent received-track recorder.
- [x] CI-02: one-session operator controls and correlated local exports.
- [ ] CI-03: isolated application/MySQL acceptance and final operator handoff gate.

Software is implemented and unit/browser/codec/package verified. The full backlog
entry remains open because the plan's isolated application/database gate has not
run. Physical cutoff diagnosis is also unverified. This is diagnostic capture,
not a fix for missing words. Gala stays open/deferred and does not block this work.

The user explicitly requested implementation in this existing dirty main checkout.
No branch switch, separate project, deployment-only Gala import, external cockpit
change, commit, push, production operation or backend schema/API change occurred.

## What changed

- `public/live/audio-recording.js`: optional native MediaRecorder over a clone of
  the actual received audio track. Default off; one-session consent; one retained
  clip; ten-minute/32-MiB requested limits; bounded chunk metadata; five-second
  finalization timeout. No microphone acquisition, audio routing or server upload.
- The Live client consumes consent on session start, observes received tracks and
  stops capture without awaiting finalization. Scope invalidation and access
  revocation discard content and fence old callbacks. Recorder cleanup owns only
  its cloned track. Track replacement closes rather than splices the recording.
- `public/live/recording-controls.js` and existing cockpit markup expose Arm,
  Stop recording, Download audio + telemetry, Discard and accessible status.
  Consent is not stored in preferences or reused for subsequent visitors.
- Existing JSON telemetry export now includes only a content-free recording
  manifest. A shared `performance/export.js` snapshot supplies paired downloads.
  Session handle, agent and generation prevent later-session substitution.
  Missing/evicted/early-export telemetry is marked incomplete. Actual MIME,
  bytes, times, limits and chunk receipt counts are recorded, not audio bytes,
  dialogue, device identifiers, credentials, raw errors or Blob URLs.
- Encoded chunks are never truncated or header-evicted. Overflow, recorder failure
  or missing final flush makes the clip unavailable. Stop recording leaves Live
  active; Stop Live still silences output and releases microphone/peer immediately.
- English README/operator guidance documents local spoken-content capture,
  approximate clock associations, interpretation limits and separate physical trial.
  Optional `PLAYWRIGHT_CHROMIUM_CHANNEL` supports the installed Chrome test browser
  without changing the default Playwright channel.

## Verification actually run

Working directory: repository root. Java checks use process-local
`JAVA_HOME=C:/Program Files/Java/jdk-21`; installed Maven is
`C:/Users/StartKlar/.m2/wrapper/dists/apache-maven-3.9.12/6068d197/bin/mvn.cmd`.

1. `npm.cmd run test:live:unit`: **76 passed**, no failures/skips.
   Log: `target/cutoff-live-standard.log`. Also passed the same Live files using
   `node --test --experimental-test-isolation=none tests/js/live/*.test.mjs`
   in the sandbox (`target/cutoff-live-unit.log`).
2. Final focused `node tests/js/live/audio-recording.test.mjs`: **7 passed**.
   Log: `target/cutoff-recording-unit.log`. Tests cover unsupported/off, one-session
   consent, clone ownership, final small chunks, idempotent Stop, overflow including
   final flush, timeout/duration, errors, stale callbacks, replacement, discard,
   session/generation matching, missing/dropped telemetry and download failure.
   The full Live command also includes **17 client tests**, including new recorder
   lifecycle coverage without delayed playback Stop or extra microphone capture.
3. Maven `-o -q -Dtest=ValerianClientStaticResourceContractTest test`:
   **14 passed**, no failures/errors/skips. Log: `target/cutoff-java-contract.log`.
4. Playwright on loopback static server, actual installed **Chrome 156** on Windows:
   27 distinct cases have passing evidence across the broad run and focused fixes:

   ```powershell
   python -m http.server 8097 --bind 127.0.0.1 --directory src/main/resources/public
   $env:PROMETHEUS_SKIP_WEBSERVER = 'true'
   $env:PROMETHEUS_BASE_URL = 'http://127.0.0.1:8097'
   $env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
   npx.cmd playwright test --config=playwright.config.mjs tests/playwright/valerian-gptlive.spec.mjs tests/playwright/valerian-lifecycle.spec.mjs
   npx.cmd playwright test --config=playwright.config.mjs tests/playwright/valerian-gptlive.spec.mjs --grep 'received audio recording consent'
   npx.cmd playwright test --config=playwright.config.mjs tests/playwright/valerian-gptlive.spec.mjs --grep 'received audio real MediaRecorder' --output=target/cutoff-codec-results
   ```

   The broad run passed 25/27; its two failures were test-flow clicks blocked by
   the transitioning Diagnostics drawer. The tests now wait for the transition,
   use the explicit Close control, and wait for it to hide. Both then passed
   (`target/cutoff-browser-consent-final.log`). Broad log:
   `target/cutoff-browser-regression.log`. Four focused recording cases previously
   passed before adding explicit agent-switch coverage; later focused logs retain
   the intervening failures rather than presenting them as green runs.

   Coverage includes recording default-off, unsupported/error, final flush gating,
   no automatic re-arming, download pair, agent-switch/logout cleanup, ordinary
   Live/media/caption behavior, feature-disabled compatibility, Text/Continuous
   lifecycle, existing footer/Telemetry and desktop/mobile light/dark layouts.
   Backend and ordinary media are mocked in these browser journeys, not real HTTP
   application/MySQL acceptance. Desktop light and mobile dark recording screenshots
   were visually inspected and fit without horizontal overflow.
5. Native MediaRecorder test uses a test-only synthetic oscillator, not a microphone.
   A late 880-Hz tone is scheduled only after the first encoded timeslice arrives.
   It downloads through the production export helper, decodes the resulting Blob
   and checks late tone energy plus a silent tail. Final run: **1 passed**,
   WebM/Opus, 2 chunks, 9,991 bytes; late RMS 0.214 and tail RMS approximately
   0.00000245. These values describe this synthetic run only, not physical audio.
   Evidence: `target/cutoff-codec-final.log` and
   `target/cutoff-codec-results/valerian-gptlive-received--f03ba-a-late-tone-and-silent-tail/native-codec-evidence.json`.
6. Final Maven `-o -q -DskipTests package` passed after dependencies were cached.
   Log: `target/cutoff-package-final.log`. JAR inspection confirmed the recorder,
   controls and export module under `BOOT-INF/classes/public/`.
7. `git diff --check` passed.

## Failed attempts and limits

- Initial Chrome tests caught a genuine browser timer receiver bug: storing bare
  setTimeout/clearTimeout as instance methods causes illegal invocation. Default
  timer factories now call those functions through wrappers. This was corrected,
  not bypassed. Log: `target/cutoff-browser-initial-failure.log`.
- The first native test incorrectly assumed encoder startup was a sample-exact
  wall-clock offset. The replacement schedules the tone after a real first chunk
  and inspects decoded samples approximately, consistent with the timing contract.
  Prior failure: `target/cutoff-browser-timing-fixture-failure.log`.
- Node/Playwright child spawning was sandbox-blocked. Approved execution ran the
  normal commands. npm downloaded locked existing dependencies; packaging downloaded
  a missing Maven plugin. No application dependency/version change was introduced.
- The required integrated command was attempted:

  ```powershell
  python tests/gptlive/run_acceptance.py --database-properties src/main/resources/application-test.properties --java-tests LiveCockpitSmokeIntegrationTest --browser --live-only
  ```

  It failed before provisioning/import with `ModuleNotFoundError: pymysql`.
  `src/main/resources/application-test.properties` is also absent. Log:
  `target/cutoff-integrated-preflight.log`. No production credentials were used,
  no database was contacted and no application instance was started.
- Browser codec acceptance covers Chrome/WebM/Opus only. Other supported container
  choices and browsers need their own trials. Recorder timeslices and time limits
  are best effort; retained bytes are strictly bounded. Memory pressure and
  background tab throttling can affect capture. Physical device audibility,
  real remote-provider output and cutoff root cause remain unverified.
- `tests/gptlive/GALA.md`, Gala deployment definitions and the standalone Valerian
  repository are absent/outside scope. Shared operator instructions are in README
  and the original plan's operator-trial section, without inventing Gala content.

## Next step

Update from DM-02 (2026-10-30): workspace-local PyMySQL and a dedicated loopback
MySQL setup are now available; see .doc/dm02-validation.md. That milestone verified
its own mission journeys and stopped the helper cleanly. Cutoff CI-03 remains
unrun; after restarting the dedicated helper, select
`--database-properties target/dm02-database.properties` for its existing command.
The original prerequisite failure below remains historical evidence.

Provide a loopback-only test database configuration and install PyMySQL, then run
the existing isolated acceptance command above; record its actual result before
checking off CI-03/the top-level Cutoff Inspection milestone. Then run one bounded
consenting-adult physical trial from the plan, matching the marked occurrence to
the paired clip/telemetry. Do not treat successful recording as a cutoff fix.
Gala remains independently deferred pending its actual plan/implementation.

Recorder lifecycle reference checked during implementation:
[W3C MediaStream Recording](https://www.w3.org/TR/mediastream-recording/).
