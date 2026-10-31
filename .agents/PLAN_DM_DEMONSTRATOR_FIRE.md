# Plan: Fire-image demonstrator journey

Status: authorized deterministic simulator journey verified (2026-10-31).
Evidence: DM_INT_RESULTS.md addendum and DM05_RESULTS.md; real-model/physical gates open.

## Objective

Provide a concrete, repeatable demonstrator where PROMETHEUS orchestrates a
"fire image in room" mission from request to structured handoff.

## Scenario envelope

Mission intent: inspect a specified room for a fire indicator image and return
verifiable findings.

Execution mode: simulated executor first, with explicit labels indicating
simulated status.

## Baseline journey

1. Operator request
- "Search room R-204 for a fire indicator image."

2. PROMETHEUS configuration dialogue
- clarifies room boundaries, target definition, stop conditions,
  escalation preferences and safety constraints

3. Approval gate
- mission revision approved by authorized role

4. Simulated execution updates
- progress A complete
- pending B

5. Completion
- detected evidence package returned (image reference + location + confidence)
- handoff confirmation requested and recorded

## Challenging variant

Escalation branch:
- blocked corridor or uncertain detection causes escalation event
- operator chooses alternative area or abort
- final state captures decision branch and closure reason

## Required outputs

- Mission revision history
- Coordination event timeline
- Escalation decision trace
- Completion/handoff package

## Acceptance criteria

- Baseline and challenging variant both execute end-to-end.
- Escalation decision changes subsequent flow deterministically.
- Handoff package includes ownership-transfer status.

## Verification

- Focused automated journey tests
- One scripted operator demo path
- Evidence recorded in results milestone file when implemented

## Notes

This plan intentionally emphasizes interaction orchestration. Navigation quality
and physical search autonomy remain separate follow-up concerns.

## Reproducible rehearsal

Use-case IDs: UC-FIRE-01 ordinary, UC-FIRE-02 challenging. Setup, commands,
storage keys and non-claims: `../.doc/disaster-fire-demonstrator.md`.
Executable replay: `tests/disaster/replay_fire_simulation.py`.
The fixed R-204 configuration supplies boundaries, printed visual target, stop
conditions and constraints; arbitrary fire-image briefs are not interpreted.
Demo confirmation is not authenticated approval and never satisfies that baseline gate on its own.

Subsequent integrated implementation satisfies that baseline approval gate with
individual scope-bound credentials and passes an immutable approved mission to
the simulator adapter. See `../.doc/disaster-fire-adapter.md` for the current
verified procedure. The earlier command rehearsal still grants no authority.

Ordinary runs return synthetic evidence; challenging runs inject an obstacle and
resume after operator choice. A lost-link variant aborts with no invented finding.
Each run retains phase events and separate completion and handoff states, queried
through the existing scoped storage API. See `DM_INT_RESULTS.md` for actual runs.
