# Disaster Mission Configuration: first milestone

Agent key: `core.disaster_mission_configuration`.

Current approval requires an individually issued, scope-bound supervisor credential
through the Valerian Mission supervisor review panel. `approve mission <revision>`
in chat does not approve. Provisioning and review API: [supervisor review](mission-supervisor-review.md).

DM-03 adds schema version 2 platformSafety: required checks, normalized operator
declarations, unresolved reasons and status. Drone checks are communications,
safeStandoff, platformSuitability, flightClearance and weatherEnvelope. Ground
robots replace the last two with accessClearance/terrainSuitability; dog robots
use structuralClearance/terrainSuitability. Each must be explicitly confirmed;
unknown, malformed, missing or failed declarations prevent readiness. A generic
safe statement supplies none of these checks. Declarations are not sensor proof.
Mission changes clear prior affirmative declarations; supplying new declarations
requires a subsequent safety reassessment before review. See `.agents/PLAN_DM03.md`.

For isolated database-backed integration and real-cockpit validation, see
[DM-02 validation](dm02-validation.md). The real-model trial remains a separate gate.

The Spring AgentDefinition uses the existing Core factory, a single state with a
user-utterance self-transition, and persistable Action/Policy classes. The mission
JSON record is stored under `disaster_mission` in the existing agent storage.
The record exposes the phases `mission_capture`, `safety_and_approval`, `blocked`
and `execution_ready`. Capture, situation checks and embodiment selection run for
each brief; they are not separate runtime states. Agent language, generated
questions and extracted mission text are English. Proper names and location
identifiers are preserved.

## Demo through the existing Valerian workflow

1. Allow the agent key for a demo access code through the existing admin workflow.
2. Use that access code to select and create the agent in Valerian.
3. Enter a brief, for example:

   "Map hotspots at the north warehouse, high priority. Open outdoor area; the
   search boundary is the fenced north perimeter. Smoke risk; observe only from
   a safe standoff. Clear visibility and low wind. Hazards and mitigations have
   been assessed; drone suitability and flight clearance are confirmed.
   Communications and stop-on-lost-link, safe standoff and operation within
   the drone weather envelope are explicitly confirmed."

4. Supply missing details requested in `question`. Changes to existing mission
   details require a fresh safety assessment in a subsequent turn.
5. Load the current mission in Mission supervisor review, inspect every condition
   and use a separately provisioned supervisor credential to Approve. Chat
   confirmation cannot grant approval. Rejected/stale/unsafe reviews stay unready.

The existing `/demo/agents`, `/acknowledge` and `/storage` endpoints are unchanged.
The JSON record is also emitted verbatim as `speech`; there is no additional
generative closing response and no robot execution.

## Scope and safety limits

- Mission types: `fire_hotspot_inspection`, `missing_person_search`, `rubble_assessment`.
- Required details: mission type, objective, priority, location, environment,
  risks, operating conditions, search boundary and safety assessment.
- Environments: `outdoor_open` selects `drone`, `indoor_flat` selects `ground robot`,
  and `indoor_rubble` selects `dog robot`; otherwise `unknown`. Humanoids are
  outside the initial inspection scope. Recommendations require suitability checks.
- Java validates required details, allowed categories, safety status and approval.
  Incomplete, unsafe or unconfirmed missions never receive `ready=true`.
- Each editing turn revokes approval. Changed mission details also invalidate
  the previous safety assessment. Extraction failures conservatively reset the
  configuration to incomplete.
- Existing storage allows 2048 characters per value. Oversized results are
  rejected and must be resubmitted as a shorter brief; safety details are not
  truncated.
- Approvals require an admin-issued reviewer identity/credential bound to the
  access scope and current revision/safety reference. Hazard assessments and clearance
  information come from model-assisted interpretation of operator declarations;
  they are not verified physical safety checks.

## Verification

Current focused commands and evidence are in `.agents/DM03_RESULTS.md`,
`.agents/DM04_RESULTS.md` and `.agents/DM05_RESULTS.md`. Use JDK 21. Unit guards,
committed MySQL reload, scoped authorization and Valerian browser journeys are
verified with deterministic extraction. Real-model interpretation and hardware
remain unverified. The initial implementation record is preserved separately in
`.agents/DISASTER_MISSION_RESULTS.md`.

Next: review the [integrated simulator demonstration](disaster-fire-adapter.md),
then address the explicitly deferred model gate and controlled physical pilot.
