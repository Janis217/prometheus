# Disaster mission implementation planning package

Status: active planning bundle (2026-10-31)

This file is the entry point for the dozent-aligned planning package.

## Latest input: Valerian task specification and room simulator (2026-11-06)

The user's new inputs are tracked as VT-01 through VT-05 in the canonical backlog.
VT-01 through VT-06 browser-local software is verified for the user's corrected
scope: dropdown/text specification followed by autonomous simulation, without
speech or inference. See `VT_RESULTS.md` for evidence and boundaries.
VT-06 adds reusable saved/imported rooms and downloadable simulation-run evidence.
See `PLAN_VALERIAN_TASK_SIMULATION.md` for requirements, dependency order,
todos and acceptance criteria, and `inputs/2026-11-06-newValeriaTasks.txt` for
the verbatim source. The user's later explicit structured-input correction
supersedes the source's verbal wording. This demo sequence uses one-task structured
specification is the contribution; configurable text/visual simulation validates
it. The earlier execution order below describes the DM roadmap and does not
require physical DM-06 work before this simulator sequence.

## Planning objectives

- make use-case derivation systematic and reviewable
- prioritize interaction orchestration around missions
- keep execution/autonomy expansion bounded and staged
- maintain traceable evidence and closure criteria

## Planning documents

1. Use-case systematics
- `.agents/PLAN_DM_USECASE_SYSTEMATICS.md`

2. Interaction lifecycle
- `.agents/PLAN_DM_INTERACTION_LIFECYCLE.md`

3. First demonstrator journey (fire-image)
- `.agents/PLAN_DM_DEMONSTRATOR_FIRE.md`

4. Requirement-to-milestone traceability
- `.agents/PLAN_DM_TRACEABILITY.md`

5. Scope boundaries and risks
- `.agents/PLAN_DM_SCOPE_AND_RISKS.md`

6. Evidence and closure protocol
- `.agents/PLAN_DM_EVIDENCE_PROTOCOL.md`

## Backlog linkage

Backlog milestones consuming this package:
- DM-UC
- DM-INT
- DM-03
- DM-04
- DM-05
- DM-06

Reference: `.agents/GITHUB_ISSUE_BACKLOG.md`

## Suggested execution order

1. Complete DM-UC planning deliverables.
2. Confirm DM-INT lifecycle contract and fire demonstrator script.
3. Implement and verify DM-03, then DM-04 for deterministic safety/approval controls.
4. Implement and verify DM-05 simulator handoff, retaining its real-model gate.
5. Integrate those prerequisites and verify full DM-INT acceptance before closure.
6. Run DM-06 physical pilot only after DM-05, integrated DM-INT and DM-02 model gate.

## Execution status and dependency decision

2026-10-31: DM-UC design artifacts passed their structural consistency check;
see `DM_UC_RESULTS.md`. DM-INT independent rehearsal and subsequent integrated
authorized simulator work are verified in `DM_INT_RESULTS.md`.

The user authorized the dependency-order correction on 2026-10-31. DM-INT's
existing contract informs prerequisite implementation; its completion no longer
gates DM-03/DM-04/DM-05. Those prerequisites were implemented sequentially and
DM-INT closed after integrated simulator acceptance. This resolves the cycle without removing
any safety, authorization, adapter, provider or hardware requirement.

Simulated confirmation remains distinct from authenticated approval; fixture
commands remain distinct from the DM-05 adapter. All unfinished milestones stay
open. The provider trial remains explicitly deferred until separately configured
and authorized; no billing or hardware availability is inferred from this order
correction. Full-project completion cannot be guaranteed without these external
prerequisites and the missing Gala material. Human scope review remains pending.
Evidence: `DM_DEPENDENCY_ORDER_RESULTS.md`.

Current execution update: DM-03 declarative checks, DM-04 demo supervisor
authorization, DM-05 simulation software and integrated DM-INT are now verified;
see their result files. The original acceptance boundaries are retained. DM-05
does not accept operational handoff while the DM-02 provider gate remains open.
DM-06 still requires actual hardware/operator readiness and its prerequisite gates.

## Non-claims

This planning package does not claim provider validation, physical readiness,
or completion of deferred Gala/Cutoff gates.
