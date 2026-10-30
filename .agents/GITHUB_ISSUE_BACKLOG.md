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
- [ ] DM-03: Platform Safety Constraints
- [ ] DM-04: Supervisor Approval
- [ ] DM-05: Simulation Handoff
- [ ] DM-06: Physical Embodiment Pilot

The checklist above is the summary view. The detailed milestone states and evidence follow below.

Review policy (2026-10-30): retain completed entries and reconcile the next open
entry against its existing code, plan and results before implementing anything.
An unchecked entry may already have historical implementation evidence; it means
its backlog review is still open, not that its code is necessarily absent.
The user authorized consecutive milestone work on 2026-10-30 after the Generic
handoff; continue in order without committing, pushing or deploying. Checkboxes
record delivered software with explicit acceptance limits in each detailed entry.

Disaster roadmap update (2026-10-30): DM-03 through DM-06 are planned future
increments, added at the user's request. Their entries define scope, dependencies
and acceptance; they do not claim implementation, test evidence or physical
readiness. Detailed implementation plans should be refined when each increment
starts, using the existing architecture. The separate DM-02 model gate remains
open and does not reopen its completed automated scope. DM-03/DM-04 development
and fixture-driven simulator development may proceed while that gate is deferred;
operational handoff and the physical pilot require it to pass. Deferred Gala and
Cutoff acceptance are independent of this disaster-specific sequence.

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

## 13. DM-03: Platform Safety Constraints

Status: open/planned; implementation not started.

Depends on: DM-02 automated scope. The deferred model trial is not a prerequisite
for implementing deterministic constraints and their tests.

Goal: make embodiment-specific safety requirements explicit and reviewable in the
existing mission record rather than treating a generic safety declaration as proof.

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
Planned evidence: .agents/DM03_RESULTS.md (create when implementation starts).
Next dependency: DM-04 consumes these explicit safety results.

## 14. DM-04: Supervisor Approval

Status: open/planned; implementation not started.

Depends on: DM-03 safety requirements and DM-02 scoped/persistence acceptance.

Goal: replace unauthenticated operator confirmation as the authorization gate
with an identifiable supervisor decision bound to the current mission revision.

Scope:
- Inspect existing authentication/access-control boundaries and choose the smallest
  repo-native supervisor identity/permission integration before implementing it.
- Require authenticated authority for approval; a shared demo access code or
  conversational `approve mission` message alone does not establish that authority.
- Record reviewer identity, mission revision, safety review reference, decision
  and time in a persistent, reviewable history with explicit rejection/revocation.
- Preserve scope isolation, reject stale decisions, and revoke approval on relevant
  mission changes. Keep ordinary operator capture/clarification available.

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
Planned evidence: .agents/DM04_RESULTS.md (create when implementation starts).
Next dependency: DM-05 consumes an approved immutable mission revision.

## 15. DM-05: Simulation Handoff

Status: open/planned; implementation not started.

Depends on: DM-03 and DM-04. The DM-02 model gate must pass before accepting
model-derived missions for operational handoff. Simulator development may use
explicit deterministic fixtures while that gate remains open.

Goal: hand one approved inspection mission to a simulator and inspect its lifecycle
without connecting or commanding physical hardware.

Scope:
- Choose one simulator and one narrow inspection scenario when implementation
  starts; add the smallest adapter through existing application/SPI boundaries.
- Handoff an immutable mission revision with authorization/safety references and
  an execution identity. Reject unapproved, stale or unsupported configurations.
- Map simulator acceptance, progress, completion, failure and cancellation into
  structured feedback, maintaining the separation of configuration and execution.
- Bound timeouts and handle duplicate/out-of-order feedback without duplicate starts
  or false completion. Keep the mission trace reviewable in the existing workflow.

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
Planned evidence: .agents/DM05_RESULTS.md (create when implementation starts).
Next dependency: DM-06 reuses the validated handoff contract for one chosen platform.

## 16. DM-06: Physical Embodiment Pilot

Status: open/planned; implementation not started.

Depends on: DM-05 simulator acceptance, DM-03 safety checks, DM-04 supervisor
authorization and a passed DM-02 real-model gate.

Goal: validate one bounded inspection task on one explicitly selected physical
platform under operator supervision in a controlled test area.

Scope:
- Select the platform, capabilities, test location, operational limits and responsible
  operator before integration; hardware availability is currently unconfirmed.
- Map only the agreed inspection behavior through a minimal platform adapter,
  retaining the approved mission revision and explicit start/stop authority.
- Define and verify preflight checks, emergency stop, communication-loss behavior
  and cancellation for that platform. Keep physical observations separate from
  model declarations and simulator results.
- Record the operator procedure, actual configuration, observed outcomes and deviations.

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
