# Windows setup: Valerian and room simulation

## Build and save rooms before a mission

VT-07 is now available: open `/valerian/rooms.html` on the server you are using
(for example `http://127.0.0.1:49679/valerian/rooms.html` for the existing demo).
There are also links on the access screen and cockpit header. No login or agent
is needed: build a layout, enter a room name, and Save new room. Select/Open a
saved room to edit it, Save new revision to retain its history, or New room to
start another layout. Rooms survive reload in that browser at that exact address.
Use JSON export/import to transfer a layout between ports/browsers or to a friend.
VT-08 now lets you select these rooms when reviewing a task in Valerian: enter a
Mission name, choose a Saved room, confirm and save. Use Saved missions / Open
saved mission to restore its task and room preview. The mission and room snapshot
are stored in the server database; later browser-library edits do not change them.
Use Start a new mission before creating a second mission to retain the first.
Running saved missions with their rooms restored is next (VT-09).

The offline demo on port 49679 was restarted for VT-08, retaining its database
and password mode. A separately running app on port 8080 needs its own restart
to load the new Java API; if it reports that the saved-room update is missing,
stop that app with Ctrl+C and run `.\mvnw.cmd spring-boot:run` again.

## Existing demo versus a new local installation

Before installing anything, check whether the manual offline demo is already
running. In the follow-up session on 2026-11-06,
`http://127.0.0.1:49679/valerian/index.html` was a working demo with access code
**DM001**, ten existing instances, and the room-builder JavaScript available.
Its port is temporary and can change on the next demo run. ROOM1 is not valid
there. Use DM001, select a Disaster Mission Configuration instance in the
heartbeat drawer, Connect, then look in Mission workspace for the room builder.

The separately started application at `http://localhost:8080/valerian/` uses
**ROOM1** and the local `prometheus` database configured below. They are separate
application sessions with separate database scopes; codes and instances do not
transfer between them. `localhost` versus `127.0.0.1`, and `index.html` versus
the directory URL, do not explain the missing builder; the different server
ports and connection state do.

The manual demo also uses MySQL, provisioned through its harness. Installing and
creating a second database was unnecessary for using that already-running demo.
The full instructions below remain useful for a fresh independent installation.
When helping this user or a friend, first establish which running server they
intend to use. See [manual demo startup](valerian-manual-fire-test.md).

## Handoff recorded on 2026-11-06

The user confirmed creating the local Valerian access code **ROOM1** after
following the admin setup below. Use that code when helping them reconnect.
The assigned agent type is `core.disaster_mission_configuration`.
The code belongs to this installation's database; it is not a built-in default
and will not exist automatically in a friend's new database.

No MySQL password or admin token is recorded here. Ask the owner to use their
configured values locally. The user reported completing the access-code setup;
this conversation did not independently verify a completed room simulation.

Follow-up diagnosis: ROOM1 initially accepted login but `/demo/session` returned
an empty agent-type list and no instances. The assignment had not been saved.
This was corrected through the local admin API, preserving existing assignments,
and a scoped instance was created successfully:
`efe36c29-6527-4325-aafd-9274208f4b07` (**Disaster Mission Configuration**).
Refresh Valerian/re-enter ROOM1 to reload its allowed types, then select this
instance and Connect. The instance ID is specific to this local database.

The room builder lives inside Valerian's **Mission workspace**, not on a separate
page. Its files are `src/main/resources/public/valerian/room-workspace.js`,
`room-simulation.js`, and `room-artifacts.js`; `mission-review.js` mounts it.
At the start of this troubleshooting session these additions were local,
uncommitted changes. A friend needs a checkout/build containing them.

## 1. Install Java 21

In PowerShell:

```powershell
winget install --id Microsoft.OpenJDK.21 -e
```

Close and reopen PowerShell, then check:

```powershell
java -version
```

If Maven reports that JAVA_HOME is not defined correctly, locate the installed
JDK and set it for the current terminal:

```powershell
$jdk = Get-ChildItem 'C:\Program Files\Microsoft' -Directory -Filter 'jdk-21*' |
    Select-Object -First 1
if (-not $jdk) { throw 'Java 21 JDK not found; check the installation location.' }
$env:JAVA_HOME = $jdk.FullName
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
```

JAVA_HOME points to the JDK directory, without `\bin`. These assignments apply
only to the current terminal. For later terminals, set the same JAVA_HOME in
Windows Environment Variables and add `%JAVA_HOME%\bin` to Path.

## 2. Install and configure local MySQL

Download [MySQL Community Server 8.4 LTS for Windows](https://dev.mysql.com/downloads/mysql/8.4.html?os=3).
Choose **Windows (x86, 64-bit), MSI Installer**. During configuration, keep port
3306, choose a root password, and configure the server as a Windows service
that starts automatically. Finish configuration and start the service.

Connect from PowerShell (adjust the installation directory if necessary):

```powershell
& 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe' -u root -p
```

Enter the chosen MySQL password at the prompt. In the MySQL console:

```sql
CREATE DATABASE IF NOT EXISTS prometheus CHARACTER SET utf8mb4;
exit;
```

The database is created manually; application tables are created/updated by
Hibernate with `spring.jpa.hibernate.ddl-auto=update` from the template.

## 3. Configure the application

Open PowerShell in the repository root. The original user's checkout is at
`C:\Users\mikej\Documents\A-daten\zhaw\WI\prometheus`; a friend uses their own
checkout directory.

For a new installation, copy the template only if the local file is absent:

```powershell
if (-not (Test-Path 'src/main/resources/application.properties')) {
    Copy-Item src/main/resources/application.properties.template src/main/resources/application.properties
}
notepad src/main/resources/application.properties
```

Set the following, replacing both placeholders with your own local values:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/prometheus?useSSL=false&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
spring.jpa.hibernate.ddl-auto=update
prometheus.admin.token=YOUR_CHOSEN_ADMIN_TOKEN
server.port=8080
```

The MySQL password authenticates an existing database account. The admin token
is a separate value you choose for Valerian Access Management. Neither is the
Valerian access code. Local `application.properties` is ignored by Git.
Do not activate the `prod` profile to work around missing local configuration;
it can select production database settings.

The form-based room simulator does not require an inference provider.
Speech/model features require separate OpenAI configuration; see README Local
Setup and `src/main/resources/openai.properties.template`.

## 4. Start the server

From the repository root:

```powershell
.\mvnw.cmd spring-boot:run
```

Keep that terminal running. Wait for Spring Boot to report successful startup,
then open http://localhost:8080/valerian/. Stop the app with Ctrl+C when finished.
Restart it after changing application properties.

## 5. Create the access code on a fresh database

1. Open http://localhost:8080/valerian-admin/.
2. Enter the admin token configured in `prometheus.admin.token`.
3. Create the five-character access code **ROOM1** (or choose another code for
   a separate installation).
4. Select the code, assign `core.disaster_mission_configuration`, and click
   **Save Assignments**. Ensure the code is enabled.
5. Open http://localhost:8080/valerian/ and enter **ROOM1**.

On the user's existing installation, ROOM1 has already been created according
to their confirmation. Reuse it rather than creating it again. Codes and agent
instances persist in the database across normal server restarts.

## 6. Open and run the room builder

1. After entering the access code, open the right-hand drawer using the
   heartbeat button. Select `core.disaster_mission_configuration`.
2. Create an agent instance if none exists, select it, and click **Connect**.
3. In **Mission workspace**, click **Create task** or **Load R-204 demo**.
   Review/complete the fields and save. For this simulator choose
   **Find printed fire indicator** and **Flat indoor terrain**, and complete
   the required boundary, hazard and safety declarations.
4. Review **Task specification and capabilities**. Resolve missing details;
   incomplete or unsupported tasks cannot start this simulator.
5. Scroll to **Room simulation builder**, choose square, rectangle or L-shaped,
   and place objects and the robot in valid slots. Set the starting direction
   and optional smoke.
6. Click **Generate room**, then **Start autonomous simulation**. Watch the
   robot search and report synthetic findings; use Pause/Resume as needed.

This is a browser-local simulation with synthetic perception, movement and
photos. It does not control a physical robot. The separate **Legacy R-204
scripted simulation** controls are a different workflow.

Use **Save room in browser** / **Load saved room** for a draft in the same
browser and mission instance, or export/import room JSON to transfer a layout
to a friend. Browser drafts are not synchronized by the server. Active runs
and unsaved layouts reset on reload/disconnect. See the
[full simulation walkthrough](valerian-room-simulation.md).

## Errors encountered in this session

| Symptom | Cause and next step |
| --- | --- |
| Browser says the site cannot be reached | No server was listening on port 8080. Start the application and wait for successful startup. |
| JAVA_HOME is not defined correctly | Java was unavailable in the terminal. Install Java 21, reopen the terminal, and set JAVA_HOME to its JDK directory if needed. |
| DataSource URL is not specified / failed to determine a suitable driver class | No local application.properties was loaded and no profile was active. Create local configuration with the MySQL URL and credentials; this error alone does not mean the MySQL dependency is missing. |
| Unknown database prometheus | Create the empty database in MySQL. |
| Connection refused to MySQL | Check that the MySQL service is running and the configured host/port are correct. |
| Access denied for database user | Check the configured MySQL account/password and its database permissions. |
| Valerian asks for an access code | Use ROOM1 on this user's installation; on a fresh database create and assign it through Valerian Access Management first. |
| Normal cockpit but no agent types and Create disabled | Check ROOM1's saved agent-type assignment in the admin page. After saving it, refresh/re-enter the access code: the cockpit loads types at session entry. This was the confirmed cause on this user's installation. |
| Room builder is missing | Confirm connection to the disaster mission agent and that the running build includes the new room workspace files; restart after updating source and refresh the browser. |

The first three errors and the empty agent-type list were observed during this
conversation. Other rows are troubleshooting guidance.
