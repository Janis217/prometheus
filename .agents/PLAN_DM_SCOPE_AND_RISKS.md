# Plan: Disaster mission scope, assumptions, risks

Status: planned (2026-10-31)

## Scope policy

Primary value for this project stage is mission interaction orchestration.
Autonomous mobility is relevant but not the first acceptance gate.

## In-scope

- mission initiation and configuration dialogue quality
- deterministic approval and revision gating
- runtime coordination updates and escalation handling
- completion and handoff representation
- simulator-first demonstrator evidence

## Out of scope for current increment

- production deployment operations
- complete autonomous search/navigation performance claims
- multi-robot coordination
- safety certification claims

## Assumptions

- simulator or fixture-driven execution signals are available
- scoped test infrastructure remains usable
- human operator can provide escalation decisions during demos

## Key risks

1. Mobility capability mismatch with selected embodiment
- mitigation: keep executor simulated until adapter readiness is proven

2. Over-expansion of scenario space
- mitigation: matrix-based prioritization and explicit out-of-scope list

3. Ambiguous authority for approval/handoff
- mitigation: DM-04 authorization gate before operational handoff

4. Evidence drift between docs and implementation
- mitigation: traceability IDs and mandatory backlog updates per milestone

5. Real-model behavior variance
- mitigation: maintain deterministic fixtures and bounded provider gate

## Exit criteria for this planning package

- scope boundaries accepted by team
- risk list linked into backlog milestones
- each open risk has an owner milestone or explicit defer reason

## Ownership and open dependencies (2026-10-31)

| Risk/dependency | Owner / disposition |
| --- | --- |
| Mobility/platform capability mismatch | DM-03 declares requirements; DM-05 adapter; DM-06 hardware trial. Simulation may proceed without mobility. |
| Scenario over-expansion | DM-UC matrix selects fire P0, route P1, search P2. Route/search are requirements only. Rubble is a legacy configurator option, not a new demonstrator. |
| Approval and handoff authority | DM-04; no demo access code, actor label or confirmation phrase is authenticated supervisor authority. |
| Evidence drift | Each milestone results file plus traceability checker; update before closure. |
| Model variability | User-deferred DM-02 gate; no provider-quality claim from deterministic commands/fixtures. |
| DM-INT dependency cycle | Resolved by user-authorized order correction on 2026-10-31. DM-03/DM-04/DM-05 simulation software and integrated DM-INT verification now pass; provider/physical gates and acceptance boundaries remain intact. |
| Search privacy/identity uncertainty | Deferred search extension; synthetic descriptions/images only until data and consent boundaries are reviewed. |
| Team acceptance of planning bounds | Human review remains pending; structural checks do not establish team/lecturer approval. |

No new real-world search, fire-response or route-mapping capability follows from
the catalog. A printed fire indicator is a visual demonstration target, not a
validated detector of heat, smoke or actual fire.
