# VT-12: Clean mission workflow and dedicated simulation tab

Completed 2026-11-10, following the user's explicit interface description.

Behavior
- Default `/`, `/valerian/` and index.html show two choices: Start a mission and
  Create simulation room. Room creation opens the existing editor in a new tab.
- Start a mission uses an existing access session or asks for the code once.
  It creates a scoped mission instance and presents the existing dropdown/text
  wizard one question at a time. Compact mode exposes only supported simulation
  task/terrain choices. Technical summaries and settings are collapsed.
- Final step names the mission, selects a saved room and confirms declarations.
  Run simulation saves through the existing versioned scoped configuration API,
  then navigates a reserved new tab to the saved mission's player. Failed save
  closes that tab. A blocked popup leaves the form and saved task untouched.
- Player loads and validates the saved room/task together, displays the initial
  scene, and waits for Start. It shares the existing simulator and report schema.
  Pause/resume/stop, repeat and export remain available. Scene and each step are
  rendered from the same run events. Reload starts ready, never auto-running.
- Changed mission/safety/data invalidates a player on the scoped refresh. Missing,
  malformed, unsupported or unauthorized data cannot fall back to another room.
- URLs carry only mission IDs. Session credentials copy through a same-origin
  new tab; opener is then cleared. Direct links can request the access code.
- Existing full cockpit preserved as developer-cockpit.html. Its deep links and existing
  browser tests use that explicit path; no backend contract or Java change.
- Shortened standalone room-page guidance; longer notes are collapsed.

Verification
- node --test tests/js/disaster/*.test.mjs: 29 passed.
- Chrome Playwright mission-flow, mission-room-integration, room-workspace,
  room-library and valerian-lifecycle suites: 27 passed against port 8080.
- Follow-up mission-flow suite including added malformed-room checks and mobile
  setup screenshots: 3 passed. No Java changes in this increment; Java tests not rerun.
- Full real scoped journey: home -> room popup/save -> first-tab guided answers ->
  final room selection -> blocked-popup retry -> save and player popup -> explicit
  Start -> pause/resume -> completion -> export -> reload ready. Editing the saved
  mission invalidates the old player; new player Stop and revised options verified.
  Temporary agents deleted by test cleanup. No code/token in player URL; opener null.
- Negative player cases cover missing mission, invalid access, no saved room and
  incompatible room schema. Desktop/mobile home, setup and player do not overflow.
- Screenshots inspected: target/mission-home-desktop.png, mission-home-mobile.png,
  mission-setup-mobile.png, mission-player-desktop.png and mission-player-mobile.png.
- Static resources copied into the running server; no restart required.
- Sandboxed initial runner reported passes but hung at shutdown. Final escalated
  browser runs exited successfully with the above counts.

Limits and handoff
- Browser-local simulation; no automatic mid-run resume or hardware execution.
- Session access code may be requested in an independently opened tab/browser.
- Old cockpit-specific regression URLs migrated to cockpit.html. Targeted suites
  passed; unrelated speech/transcription suites were not rerun.
- GitHub issue creation skipped because repository issues are disabled. Local
  chronological checklist, plan, README, walkthrough and PROJECT.md synchronized.
- Next: user review of the clean entry/setup/player workflow. No commit created.


Follow-up: old entry still showing the embedded builder (2026-11-10)
- User reported all-in-one content and supplied an index.html?agentId=... address.
  Default old agentId links now start at the two-choice home instead of restoring
  setup. Explicit ?mission=... URLs still reopen saved mission setup.
- cockpit.html redirects to the clean home. Full development cockpit moved to
  developer-cockpit.html; its links and regression URLs were updated.
- Current script.js detects old cached cockpit markup at default addresses and
  navigates to index.html?view=missions, preventing the old embedded builder
  from reappearing after reload. Source and running static resources updated.
- Verified 5 mission-flow cases: clean home, old cockpit/agent bookmarks, simulated
  cached old HTML, full multi-tab Start flow, and invalid saved data/access.
  Also passed all 5 developer cockpit lifecycle cases after moving its route.
- No backend changes or data deletion. GitHub tracking remains repo-local because
  repository issues are disabled.


User refinement: preserve original Valerian for mission setup (2026-11-10)
- User accepts separate player styling but requests the original Valerian UI
  for dropdown/task setup, keeping camera and other components available later.
- Home stays two choices. Start a mission reuses access and creates/opens its
  scoped instance, then navigates the SAME tab into cockpit.html?setup=mission.
- This mode uses the full original Valerian shell and lifecycle. The mission
  widget presents guided setup, saved-room selection and Run simulation. Its
  embedded builder and legacy player are omitted/hidden. Details are collapsed.
- Reserve a popup synchronously before save; save errors close it, blocked popup
  leaves the task untouched. Successful save opens the existing simulation.html
  player. Existing saved missions can Run or Edit from the cockpit. Reload
  preserves agent identity and setup mode. Rooms links open new tabs.
- Main page no longer mounts a separate modern wizard/ready UI. The accepted
  simulation-player code and presentation were not changed in this refinement.
- Preserved the existing capability contract: current disaster mission profile
  does not declare visual sensing, so its camera UI remains hidden as in original
  Valerian. Camera components and other sensing capabilities remain implemented
  for supporting profiles; no camera-to-simulator behavior is claimed.
- Verification: 5 mission-flow cases passed, plus 12 room-workspace and 5 original
  lifecycle cases across focused runs. Final real multi-tab case passed again
  after a Bootstrap hidden-attribute override fix. It verifies the original
  sensing column/camera component, wizard, blocked-popup retry, separate player,
  explicit Start, pause/resume, export, reload, changed mission and Stop.
- Initial new assertion wrongly expected camera to be visible for an unsupported
  profile; corrected to verify component retention and sensing column visibility.
  Existing camera emission/lifecycle tests remained passing.
- Desktop/mobile setup and simulation screenshots generated; desktop setup
  inspected. Temporary test agent cleanup passed. No Java/backend change.
- Current README, walkthrough, PROJECT.md and local backlog updated. GitHub issue
  creation remains skipped because repository issues are disabled.


Follow-up: remove remaining builder from every cockpit (2026-11-10)
- User again requests no room builder in mission workspace, anticipating a more
  complex standalone room editor. Found a remaining conditional fallback in
  mountMissionReview: full/developer mode still mounted mountRoomWorkspace.
- Removed the builder import, placeholder DOM, mount, refresh and cleanup from
  mission-review.js entirely. Both modes now have no data-room controls and make
  no room-workspace.js request. No flag or missing room can re-enable the builder.
- Added Create simulation room link targeting the independent Rooms tab. Named
  saved missions can open the separate player from either cockpit. Task summaries
  no longer instruct operators to Generate a room below.
- Room editor component remains owned by room-library-page.js; player stays
  separate. Camera/sensing, task setup, backend scope and persisted data unchanged.
- Updated integration tests to launch the real player popup instead of inline
  controls. Real unbound-task test verifies room creation popup and no editor
  after task save/reload. Widget cases cover both separateSimulation true/false
  and assert zero builder module requests. Existing multi-tab Start flow passed.
- Verification: 22 Chrome browser cases (mission-flow, mission-room-integration,
  room-workspace) and 37 Node cases passed. Runtime static resources updated.
  No Java/backend change; Java checks not repeated. git diff --check passed.
- Corrected current walkthrough to remove obsolete inline-builder instructions.
  Historical inline-widget test helpers remain for bounded component regression;
  no production cockpit loads that component.
- GitHub issue creation skipped: repository issues are disabled; local backlog
  and current project status updated. Refresh the cockpit tab to load the change.
