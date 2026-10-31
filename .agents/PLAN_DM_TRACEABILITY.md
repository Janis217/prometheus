# Plan: Disaster mission traceability map

Status: active traceability baseline (2026-10-31); design evidence in `DM_UC_RESULTS.md`.

## Purpose

Bind dozent expectations to concrete milestones, use cases, tests and evidence
artifacts so progress remains auditable.

## Traceability units

- Requirement IDs: DR-01 ... DR-05
- Use-case IDs: UC-FIRE-*, UC-SEARCH-*, UC-ROUTE-*
- Milestone IDs: DM-UC, DM-INT, DM-03 ... DM-06
- Evidence IDs: EV-*

## Requirement baseline

- DR-01: documented use-case derivation method
- DR-02: mission initiation/configuration demonstrability
- DR-03: runtime coordination and escalation interaction
- DR-04: completion and handoff interaction evidence
- DR-05: bounded demonstrator with explicit scope limits

## Mapping template

For each requirement:
- requirement ID and wording
- mapped use-case IDs
- mapped milestone work packages
- verification artifacts/tests
- residual risks

## Initial alignment snapshot

- DR-02: partially satisfied via existing mission configuration milestones
- DR-01/DR-03/DR-04: not yet fully satisfied; primary focus of new planning
- DR-05: partially satisfied by scoped prototype approach, needs explicit
  matrix-driven boundary documentation

## Acceptance criteria

- Every open requirement maps to at least one active milestone package.
- Every closed milestone references at least one requirement ID.
- No claim appears in backlog without mapped evidence target.

## Update policy

Update this file whenever backlog milestone status changes, and before any
results file marks a dozent-facing interaction requirement as closed.

## Derived use cases and milestone consumers

The catalog and 126-cell matrix live in `PLAN_DM_USECASE_SYSTEMATICS.md` and
`dm-usecase-matrix.json`; they are the design baseline, not runtime evidence.

| Use-case IDs | DM-INT | DM-03 | DM-04 | DM-05 | DM-06 |
| --- | --- | --- | --- | --- | --- |
| UC-FIRE-01, UC-FIRE-02 | First ordinary/escalation fire-image journeys | Ground-platform boundary/stop/capability evidence | Revision-bound authorized review | Approved simulator adapter | One supervised platform, if available |
| UC-ROUTE-01, UC-ROUTE-02 | Deferred route/partial-route interaction requirements | Localization/frame/access requirements | Bounds and partial-result review | Deferred route adapter scenario | Deferred hardware route trial |
| UC-SEARCH-01, UC-SEARCH-02 | Deferred candidate/ambiguity interaction requirements | Detection suitability/visibility/standoff | Target/boundary/identity review | Deferred synthetic candidate scenario | Deferred privacy-reviewed search trial |

The latter two rows are future consumers; DM-03 through DM-06 retain their narrow
fire-first acceptance. These mappings do not expand those milestone scopes.

| Requirement | Use cases | Work packages / evidence target | Current evidence / residual risk |
| --- | --- | --- | --- |
| DR-01 systematic derivation | All six IDs above | DM-UC procedure, matrix, catalog, exclusions, traceability | `DM_UC_RESULTS.md`; structural checker, not independent lecturer sign-off |
| DR-02 initiation/configuration | UC-FIRE-01; deferred UC-ROUTE-01, UC-SEARCH-01 | DM-INT state/messages and ordinary journey; DM-03 constraints; DM-04 approval | Existing `DM02_RESULTS.md` fixture evidence; lifecycle/provider quality separate |
| DR-03 coordination/escalation | UC-FIRE-02; deferred UC-ROUTE-02, UC-SEARCH-02 | DM-INT escalation loop and challenging journey; DM-05 execution feedback | `DM_INT_RESULTS.md` addendum records verified authorized simulation; no physical execution |
| DR-04 completion/handoff | UC-FIRE-01, UC-FIRE-02; deferred route/search pairs | DM-INT completion schema, persistence and tests; DM-05 immutable execution identity | Simulation ownership acknowledgement must not imply real responsibility transfer |
| DR-05 bounded demonstrator | UC-FIRE-01, UC-FIRE-02 | DM-UC exclusions; DM-INT walkthrough; DM-06 physical evidence only later | `PLAN_DM_SCOPE_AND_RISKS.md`; model and physical gates open |

DM-INT package IDs are `state_and_messages`, `escalation_loop`,
`completion_and_handoff`, `ordinary_and_challenging_journey`, and
`tests_and_walkthrough`. Their use-case mapping is machine-readable in the matrix.
Completion states must be updated from actual result files, not from this map.

## Evidence reconciliation (2026-10-31)

DR-01 is satisfied for the bounded derivation/documentation scope by
`DM_UC_RESULTS.md`; independent human acceptance is not claimed. DR-05 has an
explicit scope/risk baseline but team acceptance remains open. DR-02 through
DR-04 have authorized deterministic simulator evidence in the DM_INT_RESULTS.md
completion addendum. Operational handoff, provider quality and physical evidence
remain separate open gates; no broader closure is implied.

DM-03 declarative platform requirements have unit/scoped/browser evidence in
`DM03_RESULTS.md` (DR-02/DR-05). This adds explicit checks and unresolved reasons,
not physical safety evidence. DM-04 authorization is verified in DM04_RESULTS.md;
integrated simulator acceptance is verified in DM05_RESULTS.md and DM_INT_RESULTS.md.

Integrated completion: DR-02/DR-03/DR-04 now have bounded deterministic,
authenticated simulator evidence in DM04_RESULTS.md, DM05_RESULTS.md and the
DM_INT_RESULTS.md addendum (34 unit/client, 11 integration, 18 browser checks).
DR-05's scope and non-claims remain explicit; team/lecturer review is pending.
This supersedes earlier pending implementation statements, not the open provider,
physical or human-review gates. No real operational responsibility transfer claimed.
