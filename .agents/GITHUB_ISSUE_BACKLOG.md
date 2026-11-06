# GitHub Issue Backlog (repo-local draft)

This file is the canonical project-status reference for Codex while GitHub issues are disabled.

It must be kept synchronized with the repository's real milestone state: every milestone start, status change, verification result, and final completion must be reflected here. When repository issues are re-enabled, these entries can be mapped one-to-one into actual GitHub issues.

This file exists because the GitHub repository currently has issues disabled, so real GitHub issues cannot be created from this workspace until that setting is enabled.

Use these drafts as the canonical issue-ready backlog and create the actual GitHub issues once repository issues are re-enabled.

The checklist at the top is the high-level milestone tracker. Codex must keep it updated in every milestone task. Use `[x]` for completed work and `[ ]` for open or not-yet-started milestones.

## Milestone checklist (chronological)

- [x] Capability Awareness Completion
- [x] Core Agent Improvement
- [x] Disaster Mission Configuration
- [x] Generic Refinement
- [x] GPTLive
- [x] Need for Speed
- [x] Telemetry
- [x] Transcribe
- [x] Connection Lifecycle
- [ ] Gala Improvement
- [ ] Cutoff Inspection
- [x] DM-02: Disaster Mission End-to-End Validation (automated scope; model gate deferred)
- [ ] DM-02 gate: Real-model interpretation validation (deferred)
- [x] DM-UC: Use-case derivation systematics
- [x] DM-INT: Interaction lifecycle demonstrator (authorized deterministic simulation)
- [x] DM-03: Platform Safety Constraints
- [x] DM-04: Supervisor Approval
- [x] DM-05: Simulation Handoff (simulation software; operational model gate open)
- [ ] DM-06: Physical Embodiment Pilot
- [x] VT-01: One-task specification via dropdowns/text and capability contract
- [x] VT-02: Text simulation, injected perceptions and action outcomes (browser-local demo)
- [x] VT-03: Visual room builder (one-metre grid slots)
- [x] VT-04: Synchronized visual execution and smoke visibility (browser-local demo)
- [x] VT-05: Integrated structured-input demonstration and autonomous execution (bounded software acceptance)
- [x] VT-06: Reusable room scenarios and exportable run evidence
- [x] VT-07: Independently saved rooms, available before mission creation (browser-local library)
- [x] VT-08: Mission building and saving with a selected saved room
- [ ] VT-09: Run a saved mission with its room restored and displayed
- [ ] VT-10: Redesign mission inputs and connect them to simulation behaviour (details pending)

The checklist above is the summary view. The detailed milestone states and evidence follow below.

## Valerian task intake (2026-11-06)

VT-08 complete (2026-11-06): select/preview a saved room during mission review,
name the mission, and persist its room revision/snapshot with task configuration
in one scoped database transaction. Add named saved-mission listing/reopening;
retain old task-only creation. Passed 11 focused Java tests, 23 Node cases,
9 room/mission widget cases, 5 connection lifecycle cases and the real scoped
database/browser journey (two missions, full snapshot/reload, explicit room
update, library removal, stale/invalid rejection and chunked storage). Restarted
only the existing offline demo on port 49679, preserving its database/password
mode; port 8080 needs its own restart. Evidence: `VT08_RESULTS.md`.
Next is VT-09 integrated Run; VT-10 input semantics remain deferred.

VT-07 complete (2026-11-06): independent Rooms page using the existing builder,
with a browser-local named library and immutable saved revisions. Scope is
explicitly per origin/browser, independent of login and agent instances;
JSON import/export transfers layouts. Backend room synchronization is not
part of this increment. Passed 22 room Node cases and 13 browser cases; live
save/reload/reopen checks passed on ports 49679 and 8080, with no page errors.
Mobile screenshot inspected. Evidence: `VT07_RESULTS.md`. The subsequent VT-08
completion is recorded above; VT-09/10 remain planned.

New workflow intake (2026-11-06): the user accepts the room builder and requests
the next integration sequence: create/save a room independently, create/save a
mission using that room and the current mission information, then select/run the
saved mission with its room displayed again. Later, change mission inputs and
make their agreed meanings affect simulation. Recorded as planned VT-07–VT-10
with tasks, dependencies and acceptance criteria in
`PLAN_VALERIAN_TASK_SIMULATION.md`. Start next with VT-07; VT-10's exact fields
and effects await later user decisions. No implementation is claimed. Existing
VT-06 browser drafts per mission and JSON exports do not satisfy this new saved
room/mission workflow. Room storage location is an implementation decision to
resolve explicitly, not an already agreed backend requirement.

Supervisor testing mode update (2026-11-06): the user requested keeping supervisor
review while disabling password input for testing. Implemented reversible
`prometheus.supervisor.credential-required` (default true); current local runtime
is explicitly false. Review and simulator-start checks share the mode, the UI
hides the field based on backend metadata, and audits distinguish testing from
individual credential authentication. Access-code scope, mission completeness,
version checks and explicit decisions remain enforced. Passed 3 focused auth
unit tests, 4 existing mission tests, 9 widget browser cases and 1 real-backend
passwordless review/start case. Temporary test agent cleaned up; existing
credentials, missions and history retained. See `.doc/mission-supervisor-review.md`.

VT-06 follow-up (2026-11-06): the user requested the next increment after
autonomous execution. Add per-mission browser save/load, portable validated room
JSON and run reports containing the original task/room, final state and event
timeline. Complete: nineteen Node cases, seven widget browser cases and one real
scoped backend/report journey passed. Its temporary backend agent was removed.
Scope remains structured task
input and local simulation, with no speech or provider dependency.

Initial intake queued VT-01 through VT-05; the user authorized implementation
in the subsequent turn. Scope, todos,
dependencies and acceptance criteria for each milestone are in
`PLAN_VALERIAN_TASK_SIMULATION.md`; the verbatim source is retained in
`inputs/2026-11-06-newValeriaTasks.txt`.

The primary contribution is human-machine specification of one task,
including sensing and behaviour capabilities. Text and visual room simulation
provide supporting validation. The new sequence is VT-01 -> VT-02 -> VT-03 ->
VT-04 -> VT-05, with contracts established before dependent implementation.
Prior DM software completions remain historical evidence, not acceptance of
these new requirements. The DM-02 real-model gate remains open; physical DM-06
is separate.

Implementation update (2026-11-06): VT-02/03/04 are complete for the bounded
browser-local software demo. VT-01 has a JSON/readable capability contract,
clarification projection, printed-target extraction guidance and revision-bound
room snapshot; actual spoken interpretation remains unverified. VT-05 has a
repeatable walkthrough and fixture scenarios; research interaction evaluation
remains open. Evidence: `VT_RESULTS.md`. Rooms/runs are per-window, reset on
reload/disconnect, and grant no authenticated or physical authority. The legacy
DM-05 adapter is retained separately. No provider configuration, commit or deployment.

User scope correction and acceptance (2026-11-06): task definition uses dropdowns
and text fields, with no speech-to-text or model interpretation. VT-01 and VT-05
are complete for that structured-input software scope: a real scoped form-save
journey persisted the task, then the robot executed autonomously through door
opening, approach, photo and report. Five widget browser cases and fourteen Node
tests passed, plus one real-backend Chrome acceptance case with its own temporary
agent cleaned up. Pause/resume/stop, revised-task invalidation and bounded smoke
search are verified. See `VT_RESULTS.md` and `.doc/valerian-room-simulation.md`.
This supersedes the verbal-gate statements above for VT only; historical DM-02
provider/hardware gates and human qualitative review remain separate.

Review policy (2026-10-30): retain completed entries and reconcile the next open
entry against its existing code, plan and results before implementing anything.
An unchecked entry may already have historical implementation evidence; it means
its backlog review is still open, not that its code is necessarily absent.
The user authorized consecutive milestone work on 2026-10-30 after the Generic
handoff; continue in order without committing, pushing or deploying. Checkboxes
record delivered software with explicit acceptance limits in each detailed entry.

Disaster roadmap update (2026-10-31): dozent feedback is now represented as
explicit planning milestones before execution-heavy increments. DM-UC and DM-INT
cover methodical use-case derivation plus mission interaction lifecycle coverage
(initiation, configuration, coordination, escalation, handoff). Their outputs
become required planning inputs for DM-03 through DM-06. The separate DM-02
model gate remains open and does not reopen completed automated scope.
DM-03/DM-04 development and fixture-driven simulator development may proceed
while that gate is deferred; operational handoff and physical pilot require it
to pass. Deferred Gala and Cutoff acceptance remain independent.
Planning entry point for this sequence: `.agents/PLAN_DM_IMPLEMENTATION_PLANNING.md`.

Dependency-order correction authorized by the user (2026-10-31): execute
DM-03 -> DM-04 -> DM-05 -> integrated DM-INT acceptance -> DM-06, following
the completed DM-UC and verified DM-INT rehearsal. The chronological checklist
and milestone IDs above remain stable; this explicit prerequisite order governs
execution. DM-INT completion is not a prerequisite for implementing DM-03/04/05.
Its existing contract/use-case artifacts are planning inputs, not a closure gate.
All acceptance criteria and provider/hardware gates remain unchanged. No open
milestone is completed merely by this correction. Evidence:
`.agents/DM_DEPENDENCY_ORDER_RESULTS.md`.

## 1. Capability Awareness Completion

Title: Complete Capability Awareness milestone

Status: closed

Summary:
- Finalize capability-awareness integration for core agents.
- Keep awareness gating, eligibility, and guard logic stable.
- Preserve existing agent behavior while adding explicit capability-awareness support.

Implementation work packages:
- [x] Capability eligibility and gating for core agent definitions.
- [x] Awareness-aware validation in the agent-selection and guard path.
- [x] Regression checks maintaining legacy behavior while the new awareness contract is enforced.
- [x] Resulted evidence captured in `.agents/CAPABILITY_AWARENESS_RESULTS.md`.

Evidence:
- Relevant results file: `.agents/CAPABILITY_AWARENESS_RESULTS.md`
- Verified through repo test and deployment evidence recorded in the milestone results.

Remaining risk:
- real-provider answer quality and physical acoustic trials remain not run.

## 2. Core Agent Improvement

Title: Complete core-agent improvement milestone

Status: closed

Summary:
- Improve the core agent pattern and related validation.
- Preserve persona and interaction boundaries while tightening core behavior.

Implementation work packages:
- [x] Core agent-definition cleanup and contract alignment.
- [x] Persona and interaction-boundary tightening within the shared core pattern.
- [x] Validation/specification checks for runtime correctness and future-safe fallback behavior.
- [x] Results captured in `.agents/COREAGENTIMPROVEMENT_RESULTS.md`.

Evidence:
- Relevant results file: `.agents/COREAGENTIMPROVEMENT_RESULTS.md`
- Verification evidence recorded in the milestone results.

Remaining risk:
- broader regression coverage and real-provider validation remain follow-up work.

## 3. Disaster Mission Configuration

Title: Implement first disaster mission configuration agent

Status: closed

Summary:
- Add a repo-native disaster mission configuration agent.
- Capture mission details, ask for missing information, select a likely embodiment, and protect against unsafe approval.
- Produce a structured execution-ready mission record.

Implementation work packages:
- [x] Mission domain model and persistence for disaster mission state.
- [x] Mission action parsing and state transitions for missing-information, approval and reset flows.
- [x] Safety policy enforcement for unsafe or malformed mission updates.
- [x] Core agent definition and factory wiring for runtime creation.
- [x] Unit validation for success, missing-information, and unsafe guard scenarios.
- [x] Result evidence recorded in `.agents/DISASTER_MISSION_RESULTS.md`.

Evidence:
- Relevant results file: `.agents/DISASTER_MISSION_RESULTS.md`
- Rechecked against milestone guidance on 2026-10-30. Scope remains one Core
  definition, one configuration state and persisted mission phases using existing
  Valerian access-code/API integration.
- Focused Maven selector: `-Dtest=DisasterMissionConfigurationUnitTest test`;
  actual installed-Maven command and report path are in the results document.
- Result: 3 tests passed, 0 failures/errors/skips. Covers success, missing-information
  completion/reassessment, unsafe guards, edits, malformed extraction, size limits
  and reset. Model responses are mocked.

Remaining risk:
- real browser validation, strong supervisor approval flow, and richer safety evidence remain future work.
- database round trips and real model interpretation remain unverified;
  this milestone does not authorize or trigger physical execution.

## 4. Generic Refinement

Title: Reconcile and verify Generic multimodal refinement

Status: closed (2026-10-30 review; historical stages 208-213 already complete)

Summary:
- Existing implementation already supplies neutral task configuration, explicit
  draft acceptance/activation, ACT/WAIT/COMPLETE semantics, guarded cues,
  Live-session pause/fencing, content-free activity and saved-policy preview/apply.
- Reviewed the existing implementation instead of introducing replacement logic.
- Preserved historical rollout evidence and synchronized this previously stale entry.

Implementation work packages:
- [x] Review existing Generic task configuration and lifecycle semantics.
- [x] Validate draft acceptance, activation, cue gating and pause/fencing rules.
- [x] Recheck saved-policy preview/apply behavior and content-free activity constraints.
- [x] Re-run focused Java and Node verification for the refiner's actual scope.
- [x] Document evidence and remaining limits in `.agents/GENERIC_REFINEMENT_RESULTS.md`.

Evidence:
- Plan: `.agents/PLAN_GENERIC_REFINEMENT.md`.
- Results: `.agents/GENERIC_REFINEMENT_RESULTS.md`, including the dated recheck.
- JDK 21 focused Maven run: `-Dtest=GenericMultimodalTaskUnitTest,TaskLifecycleUnitTest test`:
  27 passed, 0 failures/errors/skips.
- `node tests/js/performance/activity.test.mjs`: 7 passed, 0 failures/skips.
- Logs: `target/generic-refinement-recheck.log` and
  `target/generic-refinement-activity-recheck.log`.
- Historical results document implementation, isolated database/browser acceptance,
  saved-instance migration, integration and deployment; these were not rerun now.

Remaining risks:
- This recheck uses mocked inference and does not establish physical audibility,
  camera effort, live latency, current deployment health or database acceptance.
- Initial JDK 25 run hit unsupported Byte Buddy instrumentation; JDK 21 passed.
- Node test-runner child spawning was sandbox-blocked; direct execution passed.

Next: review GPTLive plan/results and current implementation before changing code.

## 5. GPTLive

Status: closed for delivered software/offline acceptance (2026-10-30 recheck)

Scope: review `.agents/PLAN_GPTLIVE.md`, `.agents/GPTLIVE_RESULTS.md` and the
existing experimental Live implementation. Reconcile historical completed stages
and outstanding physical/provider gates; implement only a demonstrated gap.
Existing Live bridge, segmentation, scoped sessions and browser lifecycle are
implemented. Current focused verification: LiveTranscriptSegmenterUnitTest,
LiveContextDeliveryUnitTest and ScopedLiveSessionServiceUnitTest passed; browser
client unit file passed 16 tests. Exact commands/counts are in GPTLIVE_RESULTS.md.
Logs: target/backlog-gptlive-java.log and target/backlog-gptlive-node.log.
No new provider contract, data mutation or deployment. Physical audio, actual
provider quality and current release health remain unverified in this recheck.

Implementation work packages:
- [x] Live bridge and transcript-segmentation logic.
- [x] Scoped session and claim ownership behavior for incoming transcript and context updates.
- [x] Browser lifecycle and context-delivery validation in the active Live flow.
- [x] Focused Java and Node acceptance checks recorded in `.agents/GPTLIVE_RESULTS.md`.

## 6. Need for Speed

Status: closed for delivered software/offline acceptance (2026-10-30 recheck)

Scope: `.agents/PLAN_NEEDFORSPEED.md` and `.agents/NEEDFORSPEED_RESULTS.md`.
Distinguish implemented optimizations/offline acceptance from measured live
quality, latency and device gates. Existing routing, parallel guards and speech
delivery timing passed 11 Java tests; canonical playback passed 5 Node tests.
Commands and evidence: NEEDFORSPEED_RESULTS.md, target/backlog-speed-java.log,
target/backlog-speed-node.log. No measured end-to-end latency target or current
device/provider/deployment acceptance is claimed. No runtime rewrite was needed.

Implementation work packages:
- [x] Routing and parallel-guard optimization path.
- [x] Speech delivery timing improvements and playback consistency checks.
- [x] Java and Node acceptance verification for the actual implemented optimization scope.
- [x] Historical and current evidence recorded in `.agents/NEEDFORSPEED_RESULTS.md`.

## 7. Telemetry

Status: closed for delivered software/offline acceptance (2026-10-30 recheck)

Scope: `.agents/PLAN_TELEMETRY.md` and `.agents/TELEMETRY_RESULTS.md`.
Reconcile existing reporting/footer/export and historical acceptance evidence.
Current focused recheck passed 7 Java activity/timing tests and 6 Node diagnostic
export/privacy tests. Commands and logs are recorded in TELEMETRY_RESULTS.md.
Existing integrated acceptance/rollout is historical; no current database/browser,
release-health or physical audio acceptance is implied. No runtime rewrite needed.

Implementation work packages:
- [x] Reporting/export and footer instrumentation review.
- [x] Privacy and diagnostic integrity checks for telemetry output.
- [x] Java and Node verification of the actual telemetry surface.
- [x] Results retained in `.agents/TELEMETRY_RESULTS.md`.

## 8. Transcribe

Status: closed for delivered software/automated migration (2026-10-30 recheck)

Scope: `.agents/PLAN_TRANSCRIBE.md` and `.agents/TRANSCRIBE_SMOKE_RESULTS.md`.
Preserve canonical speech/transcript ownership; distinguish automated migration
evidence from real acoustic acceptance. Current focused run passed 15 Java
settings/architecture tests and 4 Node ingress tests. Commands/evidence are in
TRANSCRIBE_SMOKE_RESULTS.md. No runtime rewrite was needed. The acoustic matrix
remains NOT RUN; database/browser end-to-end and provider quality were not rerun.

Implementation work packages:
- [x] Canonical speech/transcript ownership and settings review.
- [x] Migration-safe ingress and configuration checks.
- [x] Java/Node smoke verification and evidence capture.
- [x] Remaining acoustic/provider validation explicitly recorded as not run.

## 9. Connection Lifecycle

Status: closed for delivered software/automated acceptance (2026-10-30 recheck)

Scope: existing implementation and `.agents/CONNECTION_LIFECYCLE_RESULTS.md`.
Inspect scoped connection/media cleanup and late-event fences before identifying
any gap. Existing scoped creation/SSE transaction changes and historical
classroom acceptance are recorded in CONNECTION_LIFECYCLE_RESULTS.md. Current
recheck passed 11 SSE hardening tests and 2 browser-media ownership/cleanup unit
tests. It does not repeat MySQL pool/concurrency or actual browser classroom
acceptance, provider throughput or current production load. No runtime rewrite.

Implementation work packages:
- [x] Scoped connection/media lifecycle and cleanup logic.
- [x] SSE transaction and late-event fencing review.
- [x] Browser-media ownership and cleanup validation.
- [x] Automated acceptance evidence documented in `.agents/CONNECTION_LIFECYCLE_RESULTS.md`.

## 10. Gala Improvement

Status: open/deferred (shared foundation verified; deployment scope unavailable)

Scope: `.agents/GALAIMPROVEMENT_RESULTS.md` and referenced plans/code.
Respect shared-framework versus deployment-specific catalog/persona boundaries.
Current main checkout contains shared GI foundations, but not
`.agents/PLAN_GALAIMPROVEMENT.md`, Gala definitions or Gala-specific test suites.
Only main/origin/main refs are present. The results explicitly refer full Gala
acceptance to the absent agents branch. Do not invent a new deployment catalog or
mark the entire milestone complete from shared tests.

2026-10-30 recheck passed 14 Java tests: TaskFirstActionUnitTest (4),
TaskResponseUnitTest (7), LiveShortReplyContextUnitTest (3). Log:
target/backlog-gala-java.log. Exact command and limits: GALAIMPROVEMENT_RESULTS.md.
Remaining: obtain the intended Gala plan/branch for full acceptance. The user
explicitly deferred this external dependency on 2026-10-30 and authorized
independent shared Cutoff Inspection in the current checkout.

## 11. Cutoff Inspection

Status: open/partially verified (CI-01/CI-02 delivered; CI-03 app acceptance pending)

Plan: `.agents/PLAN_CUTOFFINSPECTION.md`.
Results: `.agents/CUTOFF_INSPECTION_RESULTS.md`.

- [x] CI-01: native received-track clone recording, one-session consent, bounded
  content, final flush, failure isolation, discard/revocation and resource ownership.
- [x] CI-02: English controls and paired audio/metadata downloads; ordinary
  Telemetry stays content-free and session/generation associations are explicit.
- [ ] CI-03: full isolated application/MySQL acceptance and final handoff gate.

Verification: 76 Live Node tests, 14 Java client contracts, packaging and diff
checks passed. 27 distinct browser cases have passing evidence across broad and
focused runs (initial failures and fixes are retained in results). Native Chrome
WebM/Opus decoding verified a late tone and silent tail in the actual export.
Desktop light/mobile dark controls were visually inspected.

The initial integrated attempt lacked local prerequisites. DM-02 subsequently
provided workspace-local PyMySQL and a dedicated loopback MySQL setup documented
in .doc/dm02-validation.md. Cutoff's own CI-03 was not run in DM-02; its checkbox
stays open. Restart the dedicated helper and run CI-03 with
--database-properties target/dm02-database.properties, then the operator trial.
No Cutoff database/provider/physical acceptance or cutoff-fix claim is made.
The user authorized proceeding independently of deferred Gala on 2026-10-30.
Implement within this dirty main checkout as requested; do not switch branches,
publish, touch deployment-only definitions or modify a separate cockpit repository.

## 12. DM-02: Disaster Mission End-to-End Validation

Status: closed for automated scope (2026-10-30); real-model gate explicitly deferred by user

Scope: isolated local MySQL setup, scoped mission success/missing/unsafe journeys,
JSON and reload verification, a Valerian browser demo and a bounded opt-in real
model interpretation trial. Reuse existing acceptance/application patterns.
No robot execution, supervisor-role authorization or deployment in this milestone.
Gala and Cutoff acceptance remain independent; no production database is a test target.
Plan: `.agents/PLAN_DM02.md`; evidence: `.agents/DM02_RESULTS.md`.

Verification: 3 scoped Java integration tests plus 6 real Valerian/MySQL browser
cases passed (three scenarios with Live enabled and disabled); packaging and
diff checks passed. Emitted JSON equals stored JSON and rehydrated conversation
after explicit reconnect. Approval invalidation, reset and access scope checked.
Final artifacts: target/gptlive-acceptance-55fe662028/ and target/dm02-cleanup.json.
Owned applications/schema/accounts were removed and the dedicated server stopped.

- [x] Automated persistence/API/browser acceptance and repeatable demo.
- [ ] Real-model interpretation: deferred by user; no paid request or quality claim.

Remaining: model interpretation, authenticated supervisor authority and physical
safety are not validated. Next product increment: platform-specific safety and
supervisor approval. Deferred Gala/Cutoff entries remain independently open.

## DM-02 gate: Real-model interpretation validation

Status: open/deferred by user; no real-provider trial executed.

Depends on: DM-02 automated acceptance and deliberately configured test-provider
credentials/model. Retains its DM-02 identity rather than inventing a new milestone.

Scope:
- Freeze a small synthetic corpus for complete, incomplete and unsafe briefs,
  including an edit invalidating approval and ambiguous safety information.
- Run a bounded, explicit real-model trial through the existing extraction and
  Java validation path; record the actual model/configuration and request count.
- Keep secrets and personal mission data out of committed evidence. Establish a
  request/cost cap before execution; no automatic retry-until-pass.

Implementation work packages:
- [ ] Freeze and review interpretation corpus with expected extraction outcomes.
- [ ] Execute bounded real-model trial with explicit request/cost cap.
- [ ] Re-run guard checks for unsafe/incomplete/stale approval outcomes.
- [ ] Record interpretation failures/limits in `.agents/DM02_RESULTS.md`.

Acceptance:
- Required facts and unknowns match the corpus; the model cannot grant approval.
- Unsafe/incomplete results remain blocked by backend guards; an edit revokes the
  old approval. Malformed/failed extraction remains fail-closed.
- Record all failures and remaining interpretation limits in DM02_RESULTS.md;
  a transport-success response alone is not a passing interpretation trial.

Verification: planned bounded provider trial plus focused guard regression tests.
No new evidence or billing is claimed by this planning update.
Gate: must pass before operational handoff/physical pilot; fixture-only simulator
development and deterministic safety/authorization work may proceed independently.

## 13. DM-UC: Use-case derivation systematics

Status: closed (2026-10-31); bounded design scope verified, human review pending.

Depends on: existing Disaster Mission configuration evidence and dozent feedback.

Goal: establish a reproducible and reviewable method that derives mission
interaction use cases with bounded scope rather than ad-hoc scenario selection.

Scope:
- Define a three-axis matrix for derivation:
  scenarios (fire indication, person/animal search, route documentation),
  interaction phases (initiation, configuration, approval, coordination,
  escalation, completion/handoff), and deviations (missing info, unclear target,
  capability gap, obstacle, connection loss, operator abort).
- Derive a bounded baseline set of use cases from matrix coverage, including
  at least one ordinary and one challenging case per selected scenario.
- Record explicit in-scope and out-of-scope boundaries for this semester scope,
  including mobility as a risk/dependency instead of a prerequisite blocker.
- Define traceability IDs so every derived use case can map to implementation
  milestones, tests and demonstrator evidence.

Out of scope: proving absolute completeness for all disaster operations,
robot-control execution and production deployment readiness.

Implementation work packages:
- [x] Write the derivation procedure and coverage criteria in a dedicated plan.
- [x] Build the matrix with scenario/phase/deviation intersections.
- [x] Derive prioritized use cases and challenging variants from matrix coverage.
- [x] Define exclusions, assumptions and open dependencies.
- [x] Publish traceability IDs consumed by DM-INT through DM-06.

Acceptance:
- The method is reproducible by another team member without oral context.
- Every prioritized use case has a traceability ID and phase coverage mapping.
- Scope boundaries and intentionally unimplemented areas are explicit.

Verification: document review plus consistency check against backlog milestones.
Plan: `.agents/PLAN_DM_USECASE_SYSTEMATICS.md`.
Evidence: `.agents/DM_UC_RESULTS.md`. Ran
`python tests/disaster/check_usecase_traceability.py`: exit 0, 126 unique cells,
six use cases, all five DM-INT packages and DR-01..DR-05 mappings checked.
No independent teammate reproduction or team/lecturer approval is claimed.

Use-case consumers for DM-INT through DM-06: UC-FIRE-01 and UC-FIRE-02 are
the first slice; UC-ROUTE-01, UC-ROUTE-02, UC-SEARCH-01 and UC-SEARCH-02 are
deferred requirements. The matrix and traceability map preserve these IDs
without expanding the fire-first implementation scope of later milestones.

## 14. DM-INT: Interaction lifecycle demonstrator

Status: closed for the authorized deterministic simulator demonstrator (2026-10-31).
Real-model quality, operational handoff and physical readiness are not claimed.

Dependency correction authorized 2026-10-31: implement DM-03/DM-04/DM-05 before
full DM-INT acceptance. The former completion-first cycle is resolved by order,
not reduced scope. Simulation rehearsal cannot establish authenticated approval
or operational handoff. Original simulator-demonstrator criteria are now verified
after implementing DM-03/DM-04/DM-05; the model and physical gates remain separate.

Depends on: DM-UC output and current DM-02 automated acceptance baseline.

Goal: deliver a full mission interaction flow demonstrator that emphasizes
coordination, escalation and completion/handoff around execution, matching
dozent priorities before deep autonomy investment.

Use cases: UC-FIRE-01 ordinary and UC-FIRE-02 challenging; DR-02 through DR-05.

Scope:
- Use the fire-image-in-room scenario as the first vertical demonstrator.
- Cover end-to-end interaction phases:
  initiation -> configuration -> approval -> coordination -> escalation ->
  completion/handoff.
- Use a simulated executor/handoff adapter first; preserve deterministic
  execution states and avoid claiming physical autonomy.
- Ensure progress, escalation decisions and final handoff artifacts are visible
  in persisted mission output and UI/API responses.

Out of scope: autonomous exploration quality claims, broad mission families,
and unsupervised physical dispatch.

Implementation work packages:
- [x] Define state and message contract for coordination updates.
- [x] Define escalation triggers and operator decision loops.
- [x] Define completion package (result evidence, location/status, responsibility handoff).
- [x] Implement one demonstrator journey with ordinary and challenging variants.
  Integrated platform checks, individually authenticated approval and local adapter verified.
- [x] Add focused tests and scripted demo steps for repeatability.
  Unit, committed API/MySQL, Valerian ordinary/obstacle and replay acceptance pass.

Acceptance:
- One demonstrator journey runs through all six interaction phases.
- At least one escalation path is exercised and resolved by operator decision.
- Completion/handoff emits structured evidence and ownership transfer state.

Verification: focused integration/browser tests plus reproducible scripted demo.
Plan: `.agents/PLAN_DM_INTERACTION_LIFECYCLE.md` and `.agents/PLAN_DM_DEMONSTRATOR_FIRE.md`.
Evidence: `.agents/DM_INT_RESULTS.md`; runtime contract and executable walkthrough
are linked from the existing lifecycle/fire plans. All simulation outputs are
labeled; no provider, hardware, supervisor authorization or operational handoff
validation is claimed by the earlier rehearsal. Integrated completion evidence:
DM_INT_RESULTS.md addendum, DM03_RESULTS.md, DM04_RESULTS.md and DM05_RESULTS.md.
Final run passed 34 focused unit/client checks, 11 integration tests and 18 browser
cases, plus packaging. New adapter UI/replay guide: .doc/disaster-fire-adapter.md.
Manual follow-up: .doc/valerian-manual-fire-test.md and the existing runner's
--manual option keep the offline demo open for human testing. Startup/provisioning,
capture/review/obstacle replay and Enter cleanup verified; evidence in DM_INT_RESULTS.md.
Synthetic execution is labelled; operational handoff still requires the separate
deferred real-model gate and physical pilot acceptance where applicable.

## 15. DM-03: Platform Safety Constraints

Status: closed for declarative software scope (2026-10-31); no physical proof claimed.

Depends on: DM-02 automated scope. The deferred model trial is not a prerequisite
for implementing deterministic constraints and their tests.

Goal: make embodiment-specific safety requirements explicit and reviewable in the
existing mission record rather than treating a generic safety declaration as proof.

Use cases: UC-FIRE-01/UC-FIRE-02 first; route/search are deferred requirement
consumers in `PLAN_DM_TRACEABILITY.md`, not additional acceptance scenarios.

Scope:
- Start with the inspection embodiments currently recommended by the agent:
  drone, ground robot and dog robot; unsupported/unknown suitability stays blocked.
- Define a small platform requirement set, such as flight/standoff conditions for
  a drone and access/terrain/structural conditions for ground platforms. Agree the
  concrete fields against the selected use cases when this milestone starts.
- Separate required evidence, supplied declarations and unresolved checks in the
  structured mission output. Missing or conflicting evidence prevents readiness.
- Reuse the existing agent action/policy/storage path and invalidate prior review
  when the embodiment, conditions or relevant evidence changes.

Implementation work packages:
- [x] Define embodiment requirement schema and unresolved-check semantics.
- [x] Implement requirement evaluation and fail-closed readiness guards.
- [x] Invalidate prior safety review on relevant mission changes.
- [x] Persist/reload requirement status in scoped mission output.
- [x] Add focused rule/guard and persistence verification tests.

Out of scope: platform control, automatic certification of physical safety,
authenticated supervisor roles, extra mission families or a generic rule engine.

Acceptance:
- A complete synthetic mission for each supported embodiment satisfies its declared
  requirements; a missing/failed requirement and unknown embodiment remain blocked.
- Changes invalidate the previous safety review/approval for that revision.
- Requirements and unresolved reasons survive persistence/reload and are visible
  through the existing scoped output; legacy mission records fail conservatively.

Verification: focused Java rule/guard tests and one scoped persistence/output
recheck. No physical-safety claim follows from fixture evidence.
Evidence: .agents/DM03_RESULTS.md. 12 focused unit, 3 scoped Java integration
and 6 Valerian browser checks passed; exact commands and retained failure noted.
All model outputs are fixtures; declarations are not sensor proof or certification.
Next dependency: DM-04 consumes these explicit safety results.

## 16. DM-04: Supervisor Approval

Status: closed for bounded demo authorization scope (2026-10-31).

Depends on: DM-03 safety requirements and DM-02 scoped/persistence acceptance.

Goal: replace unauthenticated operator confirmation as the authorization gate
with an identifiable supervisor decision bound to the current mission revision.

Use cases: UC-FIRE-01/UC-FIRE-02; replace simulation confirmation with actual
authorized review, retaining the use-case traceability baseline.

Scope:
- Inspect existing authentication/access-control boundaries and choose the smallest
  repo-native supervisor identity/permission integration before implementing it.
- Require authenticated authority for approval; a shared demo access code or
  conversational `approve mission` message alone does not establish that authority.
- Record reviewer identity, mission revision, safety review reference, decision
  and time in a persistent, reviewable history with explicit rejection/revocation.
- Preserve scope isolation, reject stale decisions, and revoke approval on relevant
  mission changes. Keep ordinary operator capture/clarification available.

Implementation work packages:
- [x] Select minimal supervisor identity and permission integration point.
- [x] Implement revision-bound supervisor approval and rejection flow.
- [x] Add revocation and stale-decision protections.
- [x] Persist auditable approval history with identity and timestamp.
- [x] Add scoped API/database plus Valerian authorization journey checks.

Out of scope: an organization-wide IAM system, physical dispatch or simulator control.

Acceptance:
- A permitted supervisor can approve only a complete mission with satisfied safety
  checks for the current revision. Approval alone cannot override a safety failure.
- Missing identity/permission, cross-scope access, stale revision and revoked access
  cannot approve; repeated requests are safe and do not duplicate decisions.
- Rejection, revocation and edits produce the expected backend status and survive
  reload. Conflicting concurrent decisions cannot authorize an obsolete revision.

Verification: focused authorization/revision tests, scoped API/database integration
and one Valerian review journey. Provider wording cannot establish authorization.
Evidence: .agents/DM04_RESULTS.md. 12 unit, 8 committed integration, 12 browser
and 18 CORS/static-client checks passed. Individual admin-provisioned, scope-bound
reviewer credentials and single-process CAS are verified; enterprise identity,
distributed operation, provider quality and physical safety are not claimed.
Next dependency: DM-05 consumes an approved immutable mission revision.

## 17. DM-05: Simulation Handoff

Status: closed for simulation software (2026-10-31); operational/model gate remains
open. No operational handoff is accepted by this milestone evidence.

Depends on: DM-03 and DM-04. The DM-02 model gate must pass before accepting
model-derived missions for operational handoff. Simulator development may use
explicit deterministic fixtures while that gate remains open.

Goal: hand one approved inspection mission to a simulator and inspect its lifecycle
without connecting or commanding physical hardware.

Use cases: UC-FIRE-01/UC-FIRE-02; the DM-INT command rehearsal is not this
trusted adapter or its acceptance evidence.

Scope:
- Choose one simulator and one narrow inspection scenario when implementation
  starts; add the smallest adapter through existing application/SPI boundaries.
- Handoff an immutable mission revision with authorization/safety references and
  an execution identity. Reject unapproved, stale or unsupported configurations.
- Map simulator acceptance, progress, completion, failure and cancellation into
  structured feedback, maintaining the separation of configuration and execution.
- Bound timeouts and handle duplicate/out-of-order feedback without duplicate starts
  or false completion. Keep the mission trace reviewable in the existing workflow.

Implementation work packages:
- [x] Select simulator and define adapter contract for one inspection scenario.
- [x] Implement immutable revision handoff with execution identity.
- [x] Map progress/failure/cancel/timeout feedback into mission trace events.
- [x] Add idempotency and out-of-order feedback protections.
- [x] Add reproducible simulator acceptance journey and verification tests.

Out of scope: multiple simulator backends, autonomous rescue operations, a broad
robot-control platform or any physical execution.

Acceptance:
- One approved synthetic mission runs through the chosen simulator and produces
  traceable feedback for the same revision and execution identity.
- Rejection, timeout, failure, cancellation and repeated submission are handled
  deterministically. Late feedback cannot complete a different or cancelled run.
- No physical endpoint is contacted; simulated results are labeled as simulated.
- Deferred interpretation gate is passed before operational handoff is accepted.

Verification: focused adapter/lifecycle tests and one reproducible simulator journey
with captured structured output. Simulator selection/setup remains an open choice.
Evidence: .agents/DM05_RESULTS.md. Local in-process FireImageSimulator chosen;
34 focused unit/client checks, 11 scoped integration tests, 18 browser/replay
cases and packaging passed. All five software work packages complete. Model
interpretation remains the separate deferred DM-02 gate; the acceptance condition
above is retained and no operational/physical handoff is claimed. Deadlines are
checked on read/update; this is not a physical watchdog. Handoff records a scope,
not legal human responsibility. Artifacts: target/gptlive-acceptance-c84c63a264/.
Next dependency: DM-06 reuses the validated handoff contract for one chosen platform.

## 18. DM-06: Physical Embodiment Pilot

Status: open/planned; implementation not started.

Depends on: DM-05 simulator acceptance, DM-03 safety checks, DM-04 supervisor
authorization and a passed DM-02 real-model gate.

Goal: validate one bounded inspection task on one explicitly selected physical
platform under operator supervision in a controlled test area.

Use cases: UC-FIRE-01/UC-FIRE-02 only after simulator, safety, authorization and
model gates; route/search physical trials are deferred extensions.

Scope:
- Select the platform, capabilities, test location, operational limits and responsible
  operator before integration; hardware availability is currently unconfirmed.
- Map only the agreed inspection behavior through a minimal platform adapter,
  retaining the approved mission revision and explicit start/stop authority.
- Define and verify preflight checks, emergency stop, communication-loss behavior
  and cancellation for that platform. Keep physical observations separate from
  model declarations and simulator results.
- Record the operator procedure, actual configuration, observed outcomes and deviations.

Implementation work packages:
- [ ] Finalize hardware platform envelope, operator procedure and test boundaries.
- [ ] Implement minimal platform adapter for agreed inspection behavior only.
- [ ] Verify preflight, emergency stop, communication-loss and cancel flows.
- [ ] Execute supervised pilot and capture observed physical evidence.
- [ ] Record deviations and closure decision in `.agents/DM06_RESULTS.md`.

Out of scope: unsupervised disaster deployment, contact rescue, multiple platforms,
general navigation autonomy or safety certification claims.

Acceptance:
- The selected platform completes the bounded task and its physical observations
  can be traced to the approved mission/revision and execution record.
- Stop/emergency stop, communication loss and invalid/stale authorization are
  exercised with the operator; observed behavior matches the agreed limits.
- Actual hardware evidence is recorded separately from automated test evidence;
  missing hardware or an unperformed physical trial leaves this milestone open.

Verification: focused adapter regressions followed by an explicit supervised
physical trial. Platform-specific acceptance is defined before any movement.
Planned evidence: .agents/DM06_RESULTS.md (create when implementation starts).

## Repo-local issue tracking

This backlog is intentionally repo-local because GitHub issues are currently disabled for the repository. The entries above track completed reviews and remaining milestone work in the requested chronological order.

When the repository re-enables issues, these draft entries should be imported as actual GitHub issues and then closed with the corresponding milestone evidence.
