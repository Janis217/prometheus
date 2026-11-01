# Manual Valerian fire-image test

This guide starts the existing offline test harness for manual use. No OpenAI
key, paid provider, camera or robot is needed. Text interpretation and executor
findings are fixed synthetic fixtures. Copy the sample inputs exactly; arbitrary
conversation is not supported by this offline provider.

## 1. Start the dedicated test database

On this workstation, open PowerShell in the repository:

```powershell
Set-Location C:\WI-Projekt\wiproject_disaster_robot\prometheus
$dmBase = 'C:/Program Files/MySQL/MySQL Server 9.5'
$dmRoot = Join-Path (Get-Location) 'target/dm02-local-mysql'
if (Get-NetTCPConnection -LocalPort 33097 -State Listen -ErrorAction SilentlyContinue) {
  throw 'Port 33097 is already occupied; check which instance owns it before continuing.'
}
New-Item -ItemType Directory -Path $dmRoot -Force | Out-Null
if (!(Test-Path "$dmRoot/data/mysql")) {
  & "$dmBase/bin/mysqld.exe" --no-defaults --initialize-insecure "--basedir=$dmBase" "--datadir=$dmRoot/data"
  if ($LASTEXITCODE -ne 0) { throw 'Isolated MySQL initialization failed.' }
}
& "$dmBase/bin/mysqld.exe" --no-defaults --console "--basedir=$dmBase" "--datadir=$dmRoot/data" --bind-address=127.0.0.1 --port=33097 --mysqlx=OFF --skip-log-bin --innodb-buffer-pool-size=64M
```

Leave this terminal open. It runs only the dedicated loopback development
instance; it does not use the installed service's database directory. MySQL must
be installed at that path; adjust for another workstation. The local isolated
development administrator has an empty password. The harness creates and removes
its own random schema and restricted account.

## 2. Start the manual offline application

Open a second PowerShell window in the same repository:

```powershell
Set-Location C:\WI-Projekt\wiproject_disaster_robot\prometheus
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
# Already installed on this workstation; run once if the folder is missing:
# python -m pip install --target target/dm02-python --disable-pip-version-check pymysql
@'
spring.datasource.url=jdbc:mysql://127.0.0.1:33097/mysql
spring.datasource.username=root
spring.datasource.password=
'@ | Set-Content -Encoding ASCII target/dm02-database.properties
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --manual
```

Wait for `Manual offline demo: http://127.0.0.1:<port>/valerian/`. Compilation
may take a moment. Open exactly the printed URL; its port changes per run.
Do not press Enter in this terminal yet. The process stays open for your test.
It does not run automated browser/Java tests and cannot combine with paid mode.

The terminal prints a path ending in `manual-access.json`. It contains the
temporary supervisor credential. In a third PowerShell window, use the exact path
printed by your run to copy that value:

```powershell
$manual = Get-Content 'C:/.../manual-access.json' -Raw | ConvertFrom-Json
$manual.supervisorToken | Set-Clipboard
```

Do not paste this credential into chat, source files or the mission text box.
It belongs only in Valerian's Supervisor credential field. The file stays under
ignored target; its credentials cease to work when the disposable database is removed.

## 3. Connect the agent

1. In the printed Valerian page, enter access code `DM001` and submit.
2. Open the configuration drawer (upper-right configuration button).
3. Select Disaster Mission Configuration (`core.disaster_mission_configuration`).
4. Create a new instance; select it if needed and click Connect.
5. Confirm Connected to ... is shown, then close the drawer.
6. Stay on Text. Do not enable microphone, GPT-Live or camera.

## 4. Capture and configure the mission

Send each text separately, waiting for the JSON response before the next:

```text
Start printed-indicator mission in R-204
```

Expected: ready=false, phase=mission_capture; missingInformation includes
searchBoundary. The agent must ask for missing facts.

```text
Configure printed-indicator mission: inspect only R-204 interior, low urgency, no actual fire, flat terrain; stop on hazards or lost link.
```

```text
Confirm R-204 platform declarations: communications stop, safe standoff, platform suitability, access clearance and terrain suitability confirmed.
```

```text
Reassess R-204 safety: all declared conditions reviewed; hazards mitigated and platform clearance confirmed.
```

Expected after the final message: location=R-204, selectedEmbodiment=ground robot,
platformSafety.status=satisfied, approvalState=awaiting_supervisor_approval,
ready=false. The initial sequence normally produces revision 4. New declarations
require a later safety reassessment; capture alone never grants approval.

Optional check: send `approve mission 4` (use the actual current revision).
The mission must remain unready; chat cannot supply supervisor authority.

## 5. Authenticate and approve

1. Open Mission supervisor review below the Text controls.
2. Click Load current mission and inspect the fields/platform checks.
3. Paste the temporary supervisor token into Supervisor credential.
4. Click Approve.

Expected: Recorded: approve, approvalState=supervisor_approved, ready=true.
The credential field clears. This is configuration approval; nothing has executed.

## 6. Ordinary simulator journey

1. Select Ordinary under Simulation variant.
2. Paste the supervisor token into Supervisor credential again.
3. Click Start simulation. Expected: awaiting_acceptance; simulation=true,
   operationalReady=false and an executionId. The credential field clears again.
4. Click Next simulation update once: coordination (adapter accepted).
5. Click it again: coordination with progressObserved=true.
6. Click it a third time: completion_handoff, result.outcome=completed,
   synthetic evidence starting with simulation:// and handoff still pending.
7. Click Acknowledge handoff: phase=closed, handoff=acknowledged_by_scoped_operator,
   result includes responsibilityScopeId.

Complete the run within five minutes of Start simulation. The persisted deadline
is checked on reads/updates; exceeding it yields a timed-out result rather than a
finding. This is a local inert simulator, not a physical safety watchdog.

## 7. Persistence check

Reload the page, explicitly reconnect the same instance, reopen Mission supervisor
review and click Load current mission. Expected: the same executionId and closed
result. Use the storage view to inspect disaster_execution, its immutable .mission
snapshot and .event.* entries. Save wanted screenshots/JSON before resetting or
stopping the harness; the whole test database is disposable.

## 8. Challenging branch

Create/connect a fresh instance and repeat capture, declaration, assessment and
approval. Choose Blocked path instead of Ordinary before Start simulation.

| Action | Expected result |
| --- | --- |
| Next update twice | acceptance, then progress |
| Next update a third time | escalation with pending resume/abort decision |
| Resume within bounds | coordination; bounds unchanged |
| Next update once | fresh progress |
| Next update again | completion_handoff |
| Acknowledge handoff | closed |

Alternative: choose Abort simulation during escalation, then acknowledge handoff.
Expected: cancelled outcome, empty evidence; it must not claim the indicator was found.
Use a fresh instance for each run. Failure/Timeout fixture variants can also be tested.

## 9. Stop and record observations

Save brief notes: observed phase per step, confusing questions/buttons, failure
messages, final executionId and screenshot/JSON without credentials. Judge whether
the initiation/configuration/approval/coordination/escalation/handoff interactions
are understandable; model language quality and robot execution are not tested.

Press Enter in the application terminal (window 2). It stops its application and
removes only its disposable database/account. Then stop the dedicated MySQL server
in window 1 with Ctrl+C. Keep production/deployment configuration untouched.

## Verification of this guide

The --manual branch was started and held open, provisioning succeeded, the four
offline inputs and authenticated approval were exercised through actual scoped HTTP,
then replay_fire_adapter.py completed the obstacle/handoff branch. Enter performed
application/schema/account cleanup. Artifact: target/manual-demo-proof.json;
startup/compile artifacts: target/gptlive-acceptance-b5a4e8fb0b/. GUI journeys are
covered by the prior DM-INT evidence; this guide does not claim a new human usability
review or provider/hardware validation.
