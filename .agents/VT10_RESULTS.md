# VT-10: Executable saved-mission instructions

Completed 2026-11-10 for the four controls approved by the user.

Changes
- Task review retains mission identity/room and existing safety/capability fields.
  Adds search goal, evidence type, door policy and autonomous action budget.
- Version-1 simulationOptions persist with saved metadata in the same scoped
  configuration transaction. Validation rejects unsupported options and fractional
  or out-of-range budgets; storage remains within existing entry limits.
- Edits increment task revision and invalidate approval. Omitted legacy controls
  resolve to first/photo/open_unlocked/512. Older clients preserve existing controls.
- Simulator searches first/all reachable findings, records photo or observation
  evidence, opens or avoids doors and stops with partial results at the step limit.
  Existing visibility and room snapshot isolation remain intact.
- Readable review and run JSON show instructions; exports distinguish finding IDs
  from photo IDs. All-goal constrained coverage reports partial rather than full success.

Verification
- node --test tests/js/disaster/*.test.mjs: 29 passed.
- Maven SavedMissionDetailsTest,MissionSupervisorAuthenticationUnitTest: 8 passed.
- Chrome Playwright room-workspace.spec.mjs and room-library.spec.mjs: 14 passed.
- Chrome mission-room-integration.spec.mjs with local access scope on port 8080:
  2 passed. Includes real room/mission save, reload, selection, repeat/reset,
  paired first-photo/all-observation/one-step-partial reports and rejected invalid
  requests with unchanged storage. Temporary test agents deleted.
- Unit paired-door runs verify open versus avoid route/action differences. Unit
  coverage includes constrained partial/blocked results and legacy default behavior.
- Local Spring app restarted to load backend changes and serves updated resources.
- Initial browser run reported both cases passed but hung during runner shutdown;
  rerunning with PROMETHEUS_SKIP_WEBSERVER=true against the running app exited
  successfully with both cases passed. No app changes were needed for cleanup.

Limits and next steps
- Browser-local demo only; no hardware/provider or human usability claim. Existing
  free-text context does not become executable instructions. No auto-resume after reload.
- All-goal coverage is reachable observed space, not omniscient target counting.
- Step budget counts autonomous actions; initial observe, terminal stop and manual
  demo injections are outside it. Defaults remain capped at 512.
- GitHub issue creation skipped: repository issues remain disabled; local backlog updated.
- Next: user review of task configuration and simulation behavior.
