# VT-13: Function-call simulation output and execution boundary

Completed 2026-11-10 for the user-requested function semantics and future simulation foundation.

Outcome
- Each step records a version-1 call with ID, function, parameters, mode and trigger;
  a correlated response records status/code/data, retryability and actual before/
  after poses and phase. Legacy event fields remain available, derived from the result.
- Move includes compass direction, one-metre distance and from/to coordinates.
  Turn includes clockwise/90-degree heading change. Door calls include ID/pose and
  force=false. Photos/observations identify their target. Reports include mission
  identity/revision, recipient, findings/evidence, coverage and partial status.
- Function registry executes against current world state. Geometry is in
  room-world.js, contracts/formatting in simulation-actions.js, execution in
  simulation-action-executor.js, and planning/perception in room-simulation.js.
- Existing act API creates calls through the same executeAction dispatch used by
  autonomous steps. No eval, network actuator call or physical authorization added.
- Trusted synchronous beforeAction hooks can update the simulated world or return
  deterministic faults. Live collision checks can reject a previously valid plan;
  updated perception permits replanning. Stale object positions are forgotten when
  the robot observes their cell empty. Non-retryable execution failures stop the run.
- Findings retain capture-time positions/evidence independently of later movement.
  Report requests must match captured facts and actual coverage; replayed calls,
  invalid versions and unsupported movement parameters cannot execute side effects.
- Fetch/pick_up now explicitly return NOT_IMPLEMENTED without pretend success or
  world manipulation. Stop execution success is separate from partial/blocked mission outcome.
- Terminal message/data/phase are finalized before logging, replacing post-hoc event
  edits. Both timelines show function calls/results. Player offers compact calls,
  typed outcomes and expandable Result data. Exports add actionProtocolVersion:1
  and retain calls, responses and perceptionAfter; room file formats remain unchanged.

Verification
- node --test tests/js/disaster/*.test.mjs: 37 passed.
- Chrome Playwright mission-flow, mission-room-integration, room-library and
  room-workspace suites: 25 passed on local port 8080, access scope configured,
  PROMETHEUS_SKIP_WEBSERVER=true. Temporary real test agents removed.
- New unit cases cover all compass movement/rotation, typed door/wall/furniture
  failures, report parameters/capture snapshots, obstacle appearing at action boundary
  and successful reroute, actuator failure, terminal step limit consistency,
  invalid/replayed/fabricated calls and explicit manipulation placeholders.
- Browser coverage checks real function text, request/result correlation in export,
  report arguments, locked-door blocked code and expandable result data. Existing
  Valerian setup -> separate player -> Start/pause/resume/stop/export/reload flows pass.
- Initial browser run had 2 stale natural-language log assertions; updated to the
  new function-call contract and reran the final full 25-case suite successfully.
- Desktop successful/locked-door screenshots inspected; existing mobile overflow
  checks pass with the parameterized calls. Source files copied to the running
  server. No Java/backend change; Java tests not repeated. git diff --check passed.

Limits and next
- Simulation only; real hardware adapter and asynchronous actuation are not implemented.
- Current move/turn primitives remain one metre/clockwise 90 degrees. No new timed
  movement, moving-actor/floor-obstacle editor or scenario-file schema introduced.
- beforeAction is trusted synchronous scenario code, not user/imported executable text.
  Exports record actual actions/world outcomes but do not serialize callbacks.
- Next: user review, then agree concrete moving actors/obstacles/fault controls.
- GitHub issue creation skipped because repository issues are disabled; local plan,
  chronological backlog, README, walkthrough, contract and PROJECT.md updated.
