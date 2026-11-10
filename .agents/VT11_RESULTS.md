# VT-11: Cockpit Start readiness and recovery

Completed 2026-11-10 in response to the user's cockpit Start report.

Problem and reproduction
- A generated room enabled Start even with no task. Execution then rejected the
  missing specification. Existing status feedback was easy to miss and did not
  explain all disabled-button states. This reproduces one cause of the report;
  the user's exact browser-local room/tab state was not directly accessible.
- Added a regression before the fix: no mission + Generate incorrectly enabled
  Start. The expectation failed, confirming the defect.

Changes
- A readiness message beside Start explains task setup, missing information,
  unsupported task/terrain, blocked safety, generation, running and finished states.
- Start checks the actual task and room readiness before enabling or executing.
- Create or review task opens the existing wizard and scrolls to it. Layouts
  remain intact while task setup completes. Existing confirmation/save rules apply.
- Saved-room readiness also responds to blocked safety or missing-information
  updates even without a task revision change. Existing Run/reset behavior remains.
- Updated walkthrough and current project status; deployed the two changed
  static modules to the running server's target/classes resources.

Verification
- Chrome Playwright room-workspace.spec.mjs, room-library.spec.mjs and
  mission-room-integration.spec.mjs: 19 passed on port 8080, with
  PROMETHEUS_SKIP_WEBSERVER=true and the local room access scope configured.
- Includes missing-task recovery, generation invalidation after edits, incomplete/
  unsafe/unsupported task changes, autonomous completion and pause/timer regressions.
- New real-backend cockpit test creates an isolated task, follows the setup shortcut,
  saves demo answers, generates a room and crosses the real refresh interval before
  Start. The robot autonomously photographs/reports. Temporary agent removed.
- Existing saved-room save/reload/run/control journeys pass. No Java/backend
  code changed in this increment; Java tests were not repeated.
- git diff --check passed (line-ending notices only).

Limits and next steps
- Start is intended to work; a room alone is not a complete task. Only the existing
  printed fire-indicator/flat-indoor simulation is supported. Hardware/usability
  acceptance is not claimed. Refresh the existing Brave tab to load the fix.
- Next: user review; no new feature scope inferred from unrelated backlog items.
- GitHub issue creation skipped because repository issues are disabled; repo-local
  milestone backlog and current project status updated.
