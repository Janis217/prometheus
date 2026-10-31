# Scoped supervisor review

DM-04 uses individually issued supervisor credentials, separate from demo access
codes and the existing admin token. The admin assigns an identifiable reviewer
name and exactly one access scope. This is a local demo trust model, not enterprise
IAM or external verification of a person's identity.

## Provision and revoke

With the existing configured admin header `X-Prometheus-Admin-Token`, POST
`/admin/disaster/supervisors` with JSON `{ "scopeId": "<access-code UUID>",
"name": "<assigned reviewer name>" }`. The response returns id/scopeId/name/token.
Deliver the token privately to that reviewer; plaintext is returned once, only
its SHA-256 digest is stored. Do not log tokens or put them in URLs or source files.
DELETE `/admin/disaster/supervisors/<id>` with the admin header disables future
decisions from that credential. Revoking an earlier mission approval is a separate
audited review decision; disabling a credential does not erase historical decisions.

## Valerian review

Create/connect the existing Disaster Mission Configuration agent. Capture a
complete mission and explicitly confirm each required platform condition. Open
Mission supervisor review in the Text panel, Load current mission, review the
fields and declared safety checks, then enter the separate supervisor credential
and choose Approve, Reject or Revoke approval. Chat text/access codes cannot grant
approval. The token is cleared after the decision, disconnect or agent change;
it is never written to browser storage. Invalid/stale requests require reloading.

No robot execution follows approval. The panel displays backend JSON and review
status; it does not add a general user/role-management interface.

## Scoped API

GET `/demo/agents/<id>/mission-review` requires `X-Prometheus-Access-Code` and
returns mission (serialized JSON), reviewVersion and safetyReference (SHA-256 of
canonical mission facts and required declarations). POST to the same URL also
requires `X-Prometheus-Supervisor-Token` with:

```json
{
  "requestId": "<new UUID>",
  "revision": 1,
  "reviewVersion": 0,
  "safetyReference": "<reference from GET>",
  "decision": "approve"
}
```

Missing/disabled credentials return 401, a credential in another scope 403,
invisible agents 404, and stale/unsafe/conflicting requests 409. Decisions are
approve/reject/revoke. Exact retries are idempotent; request IDs cannot be reused
with changed content or another identity. ReviewVersion serializes decisions for
the same revision, including revocation and reapproval. All relevant edits revoke
mission readiness and require fresh review.

Audits are queryable through existing scoped Storage as
`disaster_mission_review.<version>`: request ID, reviewer UUID/name, scope UUID,
revision, expected version, safety reference, decision, UTC timestamp. History
survives Reset; at 128 decisions the instance fails closed and must be replaced.
Only generated test credentials are used by automated checks.

The locking boundary is the repository's single-process agent-turn serialiser
plus committed database transactions; multi-instance distributed authorization
is not verified. Declaration quality, provider interpretation and physical safety
remain separate gates. See `.agents/DM04_RESULTS.md` for exact evidence.
