# Plan: DM-INT Interaction lifecycle demonstrator

Status: closed for the authorized deterministic simulator demonstrator (2026-10-31).
Current integrated evidence: DM_INT_RESULTS.md completion addendum; DM05_RESULTS.md.

## Goal

Demonstrate PROMETHEUS mission orchestration across the full interaction chain:
initiation, configuration, approval, coordination, escalation, completion and
handoff.

## Scope

First vertical slice uses the fire-image mission as the reference scenario.
Execution remains simulated or tightly controlled; the focus is interaction
quality and governance rather than navigation autonomy.

## Required interaction phases

1. Initiation
- capture mission intent and context trigger
- confirm scenario class and urgency

2. Configuration
- collect target object, area bounds, stop conditions, and constraints
- request missing details until mission is structurally complete

3. Approval
- require authorized mission approval for the current revision
- reject stale approval after mission-affecting edits

4. Coordination
- ingest execution progress updates from simulator/adapter
- expose current mission phase and pending operator decisions

5. Escalation
- trigger operator decision requests on blocked path, ambiguity, or timeout
- preserve decision trace and resulting branch

6. Completion/Handoff
- emit structured result package (evidence, location/status, closure decision)
- record responsibility transfer state and closure outcome

## Work packages

- Define mission lifecycle state contract for runtime updates.
- Define escalation event taxonomy and decision actions.
- Define completion/handoff schema and persistence behavior.
- Implement one ordinary and one challenging demonstrator journey.
- Add focused tests plus reproducible scripted walkthrough.

## Acceptance criteria

- All six phases are visible in one end-to-end journey.
- At least one escalation branch is exercised and resolved.
- Final result package and handoff state are persisted and queryable.
- Demonstrator can be rerun with deterministic fixtures.

## Verification

- Focused Java integration coverage for lifecycle transitions.
- Browser/API path validation via scoped demo flow.
- Replayable scripted run and evidence log.

## Dependencies

- DM-UC use-case IDs and coverage mapping
- DM-03/DM-04 constraints for safe/authorized progression
- DM-05 simulator handoff interface for progress events

## Out of scope

- Claiming full autonomous navigation quality.
- Multi-robot operations.
- Production rollout evidence.

## Runtime contract: independent rehearsal slice

UC-FIRE-01/02 reuse `core.disaster_mission_configuration`, its existing factory,
single-state transition, action, policy and scoped Storage. No new controller,
parallel runtime or generic orchestrator is added. `DisasterMissionSimulation`
is a bounded phase reducer selected by explicit `simulate fire` commands.
Reset is required to leave rehearsal; ordinary text cannot erase its trace.

| Input action | Required phase | Outcome |
| --- | --- | --- |
| begin | fresh/reset | initiation event -> configuration; missing fields listed |
| configure | configuration | fixed target, room/bounds, priority, stops and constraints -> approval; revision 0 -> 1 |
| confirm | approval | confirmed, explicitly simulation_only_not_authorized |
| start | confirmed | coordination; no executor contacted |
| progress | coordination | record fixture progress |
| obstacle, ambiguity, timeout | coordination | escalation; pending resume/abort |
| connection_loss | coordination | escalation; abort only |
| resume | escalation except lost link | coordination; fresh progress required |
| complete | coordination with fresh progress | completion_handoff with synthetic result, pending acknowledgement |
| abort | approval, confirmed, coordination, escalation | completion_handoff with aborted outcome, no evidence |
| handoff | completion_handoff | closed; unauthenticated demo acknowledgement |

Only `simulate fire begin` and `simulate fire status` are token-free. Other
commands use `simulate fire <action> <runId> <revision>`. Foreign run IDs,
stale revisions, malformed inputs and invalid ordering do not advance phase or
append events; `lastRejection` explains rejection. Reset generates a new runId
on next begin, fencing old commands. Status does not change phase or trace.

Persistence uses snapshot `disaster_mission_simulation` and separate
`disaster_mission_simulation.event.<sequence>` entries in existing Storage.
Events record simulation flag, runId, revision, sequence, from/to and action.
At most 24 transitions; the last two slots reserve abort/handoff. Reset removes
snapshot and trace. Each entry stays within the existing 2048-character bound.

Snapshot schema version 1 includes simulation=true, operationalReady=false,
authorization/adapter limitations, use-case IDs, intent, runId, revision, sequence,
phase, configuration, progressObserved, optional trigger/decision/pendingDecision
and result. Result contains simulation flag, outcome, evidence URI, location,
fixture confidence, source, closureReason and responsibility status. Its parent
binds it to runId/revision. Aborted runs have empty evidence; `simulation://`
is not an actual image. Fixture confidence is not perception quality.

Valerian displays JSON through existing speech/text output; the scoped storage
API queries the same persisted state. No dedicated mission UI is introduced.

## Remaining acceptance dependencies

The rehearsal does not satisfy the authorized-role approval requirement.
DM-03 safety evidence, DM-04 supervisor identity and the DM-05 trusted adapter
were dependencies. The user authorized implementing DM-03 -> DM-04 -> DM-05
before integrated DM-INT acceptance on 2026-10-31. The previous ordering cycle
is resolved; the dependencies and original acceptance criteria remain intact.
Those implementations and integrated checks now pass for the simulator scope;
see `../.doc/disaster-fire-adapter.md` for the current authorized journey. The
rehearsal contract above remains isolated and cannot authorize that adapter.
Timeout/lost-link commands inject synthetic events, not a
wall-clock watchdog or measured connection failure. Demo access codes and actor
labels do not establish supervisor authority.
