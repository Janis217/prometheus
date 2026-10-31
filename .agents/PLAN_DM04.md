# DM-04: Supervisor Approval

Status: closed for bounded demo authorization scope (2026-10-31); see DM04_RESULTS.md.
UC-FIRE-01/02; DR-02, DR-03, DR-04.

## Minimal identity integration

Reuse the existing configured admin-token boundary only to issue/revoke individual
supervisor credentials. Each credential has a generated supervisor UUID, an
admin-assigned reviewer name and one AccessCode scope UUID. Generate 256-bit random
tokens, return plaintext once and retain only SHA-256 digests. Reviewer identity
comes from this server record, never request actor/name fields or chat text.
This is bounded demo authorization, not organization-wide IAM or verified legal identity.

## Review contract

GET /demo/agents/{id}/mission-review uses the existing access-code header and
returns mission JSON, reviewVersion and safetyReference. POST additionally requires
X-Prometheus-Supervisor-Token and requestId/revision/reviewVersion/safetyReference/
decision (approve, reject, revoke). Only enabled, scope-matching credentials may
decide. Approval requires all mission/safety checks; chat confirmation never grants it.

Use the existing agent-turn serialiser and a committed transaction for each decision.
Compare revision, safety digest and reviewVersion. Exact request retries are
idempotent; different content under the same requestId conflicts. Conflicting
concurrent decisions cannot overwrite the first accepted version. This follows
the existing single-process runtime boundary, not a new distributed lock protocol.

Audit each decision separately in existing bounded Storage entries, retaining
identity/scope, revision, safety reference, decision and timestamp. Keep review
history across reset; mission edits remove approval through the existing action.
Bound history at 128 decisions, failing closed thereafter (create a new instance).

## UI and verification

Add a compact review panel to the existing Valerian Text interaction, loading the
current revision before decisions. Tokens are never written to browser storage
and are cleared after decisions and scope changes. Provisioning uses admin API;
no new general identity-management UI.

Focused API/MySQL tests cover credentials, scope, incomplete/unsafe rejection,
stale/CAS/idempotent decisions, reject/revoke, edits and reload. A real Valerian
journey exercises review and storage persistence with deterministic extraction.
Exact commands, failures and non-claims belong in DM04_RESULTS.md before closure.
No provider or hardware validation is inferred. DM-05 is next.
