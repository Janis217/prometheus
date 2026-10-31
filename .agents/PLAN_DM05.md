# DM-05: Simulation Handoff

Status: closed for simulation software (2026-10-31); see DM05_RESULTS.md.
Operational/model gate remains open. UC-FIRE-01/02; DR-03/DR-04/DR-05.

## Selected adapter and scope

One local in-process FireImageSimulator implements MissionExecutor. It consumes
immutable serialized mission JSON, execution UUID, revision, review version and
safety reference. It produces accepted/progress/obstacle/complete/failure/timeout
fixture feedback. No network, physical endpoint or sensor is contacted. Exactly
the printed-indicator R-204/indoor-flat scenario is supported.

## Application and state contract

Scoped GET/POST /demo/agents/{id}/mission-execution and POST .../updates reuse
scope checks and serialized committed turns. Start additionally requires enabled
scope-bound supervisor authority, current revision/review version/reference and
satisfied safety checks. Rehearsal confirmations are ineligible. Start request IDs
are idempotent; a different run cannot overwrite an execution. Reset clears
execution/history; new IDs fence late feedback. Review audits survive reset.

Snapshots, immutable mission and events use bounded Storage. Phases:
awaiting_acceptance, coordination, escalation, completion_handoff, closed.
Operator decisions resume within unchanged bounds, abort or acknowledge handoff.
Changing bounds requires new capture/review. Completion requires progress;
failure/cancel/timeout never invents evidence. Handoff is a separately recorded
access-scoped operator acknowledgement, not supervisor/legal identity attestation.

Feedback binds execution ID and next sequence. Duplicates cannot reapply effects;
foreign/out-of-order input cannot complete another run. Updates use expectedSequence;
old versions conflict without double execution. Approval/configuration changes
cancel active runs on the next read/update. A persisted five-minute deadline
expires on polling/update, not a background watchdog. This inert simulator does
not provide physical communication-loss protection. Maximum 16 transitions,
reserving terminal/handoff capacity; 2048 characters per entry, no broad migration.

## Verification and closure

Focused reducer/adapter tests cover all outcomes, duplicates/order/foreign IDs,
deadlines and immutable snapshots. Scoped MySQL tests cover authorization,
persistence, changed/revoked approval and reload. A repeatable Valerian/API
journey exposes review, progress, escalation, outcome and handoff. Record commands
and evidence in DM05_RESULTS.md and integrated DM_INT_RESULTS.md before closure.
Keep the DM-02 model gate open; no operational/physical claim follows from fixtures.
