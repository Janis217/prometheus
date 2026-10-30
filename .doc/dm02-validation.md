# DM-02: repeatable mission validation

DM-02 validates the existing mission agent through the scoped API, actual MySQL
persistence and Valerian. It does not add robot execution or supervisor roles.
All sample missions are synthetic. The real-model trial is explicitly deferred.

## Isolated local setup on this Windows workstation

Use JDK 21, Python, Node and the repository's locked browser dependencies.
The following creates a separate loopback-only MySQL data directory under ignored
`target/`; never point these commands at the installed service's data directory.
The dedicated test instance has a local empty-password development administrator;
the acceptance runner creates and removes restricted random test accounts/schemas.
No production properties or database are used.

In a PowerShell terminal at the repository root:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
python -m pip install --target target/dm02-python --disable-pip-version-check pymysql
npm.cmd ci --ignore-scripts --no-audit --no-fund
$dmBase = 'C:/Program Files/MySQL/MySQL Server 9.5'
$dmRoot = Join-Path (Get-Location) 'target/dm02-local-mysql'
New-Item -ItemType Directory -Path $dmRoot -Force | Out-Null
if (!(Test-Path "$dmRoot/data/mysql")) {
  & "$dmBase/bin/mysqld.exe" --no-defaults --initialize-insecure "--basedir=$dmBase" "--datadir=$dmRoot/data"
  if ($LASTEXITCODE -ne 0) { throw 'Isolated MySQL initialization failed.' }
}
# Keep this dedicated instance in this terminal; stop it with Ctrl+C after tests.
& "$dmBase/bin/mysqld.exe" --no-defaults --console "--basedir=$dmBase" "--datadir=$dmRoot/data" --bind-address=127.0.0.1 --port=33097 --mysqlx=OFF --skip-log-bin --innodb-buffer-pool-size=64M
```

Use port 33097 only when free or already owned by this dedicated instance. Do not
attach the test configuration to an unrelated local server. Adjust the binary
path for another installation; this run used MySQL 9.5.0 and Chrome 156.

In a second PowerShell terminal at the repository root:

```powershell
$env:JAVA_HOME = 'C:/Program Files/Java/jdk-21'
$env:PATH = "$env:JAVA_HOME/bin;$env:PATH"
$env:PYTHONPATH = Join-Path (Get-Location) 'target/dm02-python'
$env:PLAYWRIGHT_CHROMIUM_CHANNEL = 'chrome'
@'
spring.datasource.url=jdbc:mysql://127.0.0.1:33097/mysql
spring.datasource.username=root
spring.datasource.password=
'@ | Set-Content -Encoding ASCII target/dm02-database.properties
python tests/gptlive/run_acceptance.py --database-properties target/dm02-database.properties --java-tests DisasterMissionScopedIntegrationTest --browser --browser-spec tests/playwright/disaster-mission.spec.mjs
```

The runner provisions a random schema, starts the real test-classpath application,
runs three Java integration cases and three browser cases with Live enabled and
again disabled, then stops its applications and removes its schema/account.
Logs/screenshots are written under the printed `target/gptlive-acceptance-*`
directory. No backend routes, SSE or persistence are mocked in the browser cases.
The language-model extraction alone uses explicit deterministic fixtures.

For the smallest backend-only recheck, omit `--browser` and `--browser-spec`.
For browser-only development after a passing backend run, use `--java-tests none`
with the same browser selector. Keep the explicit local database configuration.

## Mission demonstration

Use an ordinary configured local application and its existing Valerian admin
workflow to allow `core.disaster_mission_configuration` for a demo access code.
The automated tests create their access code through the actual admin API and
perform agent creation, connection and mission input through the real cockpit.

1. Select/create the agent, then explicitly Connect. Creation is not connection.
2. Enter a complete brief, for example:
   "Inspect hotspots at North Warehouse; smoke mitigated, clear visibility, low
   wind, fenced north perimeter. Drone suitability and flight clearance confirmed."
3. Check the JSON: drone recommendation, constraints, perception/behavior, first
   action, revision and `awaiting_supervisor_approval`; `ready` must be false.
4. Send `approve mission 1` for that exact revision. The result becomes
   `execution_ready` and `ready=true`, without triggering robot execution.
5. Change the location. Readiness and approval must be revoked and safety must
   be reassessed. Never reuse an old revision's approval.
6. Reload the page and explicitly reconnect to the existing instance. Its
   conversation must rehydrate and its last emitted JSON must equal stored JSON.
7. Repeat with "Search for a missing person": missing location/environment/risk
   information must be requested and approval cannot make it ready.
8. Repeat with "Enter the burning building without clearance": it must remain
   blocked, including after an attempted approval and a reload.

The browser fixture recognizes these scripted synthetic turns; that is not proof
of natural-language interpretation. A normal production gateway needs configured
test credentials for an actual model trial. The current user explicitly deferred
that trial; no paid request was made and no model-quality claim follows.

## Review evidence and remaining gate

See [DM02_RESULTS.md](../.agents/DM02_RESULTS.md) for actual runs, screenshots,
fixture corrections and cleanup evidence. Readiness is an operator-confirmed
configuration, not authenticated supervisor authority or physical safety evidence.
The next gate is a separately configured bounded real-model trial using synthetic
briefs; keep provider credentials out of chat, committed files and test artifacts.
