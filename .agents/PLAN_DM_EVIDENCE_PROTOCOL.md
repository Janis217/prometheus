# Plan: Disaster mission evidence protocol

Status: planned (2026-10-31)

## Goal

Standardize what counts as accepted evidence for milestone closure.

## Evidence classes

1. Design evidence
- approved plan updates
- traceability and scope mappings

2. Automated verification evidence
- focused unit/integration test output
- deterministic replay artifacts

3. Demonstrator evidence
- scripted run logs
- persisted mission outputs and state transitions
- operator decision traces for escalations/handoff

4. Deferred evidence
- explicit records for not-run gates (for example real-model or physical trials)

## Closure rules

- Closed milestone requires: scope statement + checked work packages + evidence links.
- Open/deferred milestone requires: clear blocker/defer rationale and next gate.
- No closure based only on narrative claims.

## Reporting format

Each results file must include:
- what changed
- what was verified
- what remains unverified
- explicit non-claims
- links to logs/artifacts

## Anti-patterns to avoid

- counting mocked-path success as provider/hardware validation
- omitting failed attempts and only reporting final pass
- mixing simulated and physical evidence without labels

## Ownership

Backlog update and evidence synchronization are mandatory before moving to the
next milestone in the sequence.
