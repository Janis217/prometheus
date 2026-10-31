# Plan: DM-UC Use-case derivation systematics

Status: closed for bounded derivation scope (2026-10-31); see `DM_UC_RESULTS.md`.

## Goal

Define and document a reproducible method to derive disaster-mission use cases
from explicit scope assumptions instead of ad-hoc ideation.

## Why this milestone exists

Dozent feedback requests a clear derivation system and demonstrable interaction
coverage. The current repo has solid mission configuration foundations, but the
methodical derivation and coverage argument are not yet explicit artifacts.

## Inputs

- `.agents/GITHUB_ISSUE_BACKLOG.md` (current milestone state)
- `.agents/PLAN_DISASTER_MISSION.md` and `.agents/PLAN_DM02.md`
- `.agents/DM02_RESULTS.md` and `.agents/DISASTER_MISSION_RESULTS.md`
- Dozent guidance on interaction-centered demonstrators

## Derivation method

Use a 3-axis matrix:

1. Scenarios
- fire indication investigation
- person/animal search
- route documentation in uncertain environment

2. Interaction phases
- initiation
- configuration
- approval
- coordination
- escalation
- completion/handoff

3. Deviations
- missing information
- unclear objective
- capability gap
- obstacle/blocking event
- connection loss
- operator abort

Process:

1. Select scenario candidates within semester scope.
2. For each scenario, map mandatory phase outcomes.
3. Add one ordinary path and one challenging path.
4. Apply deviations and keep only meaningful intersections.
5. Assign traceability IDs and priorities.
6. Mark out-of-scope intersections with rationale.

## Deliverables

- Matrix artifact with selected intersections
- Prioritized use-case list with IDs
- Scope and non-goal statement
- Traceability links into DM-INT through DM-06

## Acceptance criteria

- Another team member can reproduce the same selection process.
- Every prioritized use case has a phase mapping and deviation mapping.
- Exclusions are explicit and justified.
- Backlog milestones reference the resulting IDs.

## Verification

- Internal consistency review across matrix, use-case list and backlog.
- Cross-check that each DM-INT work package maps to at least one use-case ID.

## Out of scope

- Claiming complete coverage of all disaster operations.
- Hardware control, certification, or production dispatch.

## Planned output references

- `.agents/PLAN_DM_TRACEABILITY.md`
- `.agents/PLAN_DM_INTERACTION_LIFECYCLE.md`
- `.agents/PLAN_DM_DEMONSTRATOR_FIRE.md`

## Selection procedure and bounded coverage

The scenario candidates are the three student proposals above. Rubble assessment
remains a legacy configurator option, not a fourth demonstrator. The observation
unit is a single mission, one operator, one executor and one responsibility
recipient. Search includes person/animal descriptions or reference images as
requirements only; it does not imply implemented identification.

1. Enumerate all three scenarios, all six phases and the ordinary path plus all
   six deviations: 126 cells. Do not silently omit a cell.
2. Select the ordinary path for every phase. Select deviations only at the
   phases listed below, where they change an interaction outcome. Mark other
   cells excluded and state why; a deviation can be detected at one phase and
   handled at the next without becoming a new use case.
3. Group selected ordinary cells into one baseline use case per scenario, and
   selected deviation cells into one challenging variant per scenario. The
   variant is a family of independently replayable branches, not six faults
   injected into the same run.
4. Prioritize fire P0 (bounded visual target and existing inspection foundation),
   route P1 (trace/report contract), search P2 (identity ambiguity and privacy).
   This tie-break rule is fixed for this semester; hardware availability does
   not silently change selection or imply readiness.
5. Assign the stable IDs in the catalog below. Map all to DM-INT through DM-06,
   with fire first; route/search delivery is explicitly deferred, not delivered
   by the fire milestone. Record implementation and evidence separately.

| Deviation | Selected phases | Exclusion rationale at other phases |
| --- | --- | --- |
| missing_information | initiation, configuration, approval | Capture/review owns missing configuration; runtime findings use escalation. |
| unclear_objective | initiation, configuration, approval, escalation | Resolve target ambiguity before ordinary progress or final closure. |
| capability_gap | configuration, approval, coordination, escalation | Capability checking follows capture and must be resolved before closure. |
| obstacle | coordination, escalation, completion_handoff | No movement before execution; report unresolved blockage at closure. |
| connection_loss | coordination, escalation, completion_handoff | Execution-link loss requires an active run; initial access failures are harness concerns. |
| operator_abort | approval, coordination, escalation, completion_handoff | During capture a draft is discarded/reset; it is not an active-run abort. |

The machine-readable matrix is
[`dm-usecase-matrix.json`](dm-usecase-matrix.json). Each cell records its ID,
selection/exclusion, rationale and owning use case. Excluded means no separate
interaction at that intersection, not that the hazard may be ignored.

## Prioritized use-case catalog

| ID | Priority | Intent and ordinary outcome | Challenging variant / deviation mapping | Delivery |
| --- | --- | --- | --- | --- |
| UC-FIRE-01 | P0 | Configure a bounded room inspection for a printed fire indicator; review, coordinate, return synthetic image/location, acknowledge handoff. | ordinary | First simulator-first slice; no real fire or heat detection claim. |
| UC-FIRE-02 | P0 | Retain the same mission identity while clarification, escalation or abort changes the branch. | All six deviations, using the selected phase cells above. | First demonstrator exercises obstacle/resume and abort; other branches need distinct evidence. |
| UC-ROUTE-01 | P1 | Configure bounded route recording; coordinate trace collection and hand off route plus coordinate-frame/coverage limits. | ordinary | Requirements only; deferred after the fire slice. |
| UC-ROUTE-02 | P1 | Resolve missing bounds/frame, uncertain endpoint, absent localization, blocked route, lost link or abort; report partial route explicitly. | All six deviations. | Requirements only; deferred. |
| UC-SEARCH-01 | P2 | Configure person/animal search from description/reference; coordinate candidates and hand off candidate evidence/location for human confirmation. | ordinary | Requirements only; deferred. No verified identity claim. |
| UC-SEARCH-02 | P2 | Clarify target/bounds, reject missing sensing, escalate ambiguous candidate/blockage/lost link or abort, return unresolved status. | All six deviations. | Requirements only; deferred; privacy and consent review required before real subject data. |

Every catalog entry covers all six phases; challenging entries inherit the
baseline phases and add only their selected deviation cells. Completeness is
limited to these scenario/phase/deviation axes. Multi-robot rescue, contact
rescue, navigation quality, real fire response, medical decisions, biometric
identification and certification are excluded from this increment.

## Reproduction and review

Run `python tests/disaster/check_usecase_traceability.py` from the repository
root. It checks the full Cartesian product, unique IDs, the exact selection
rule, catalog coverage, milestone links and all DM-INT work-package mappings.
This is structural design evidence, not empirical validation, lecturer approval
or a claim that an independent reviewer has reproduced the analysis. A teammate
can reproduce selection by following steps 1–5 and comparing the JSON cells.
