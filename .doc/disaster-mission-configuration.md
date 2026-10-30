# Disaster Mission Configuration: first milestone

Agent key: `core.disaster_mission_configuration`.

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
   been assessed; drone suitability and flight clearance are confirmed."

4. Supply missing details requested in `question`. Changes to existing mission
   details require a fresh safety assessment in a subsequent turn.
5. Review the entire record and its conditions. Only the exact message
   `approve mission <revision>` confirms the current revision.

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
- Approvals are operator confirmations within the existing access control,
  not authenticated supervisor role approvals. Hazard assessments and clearance
  information come from model-assisted interpretation of operator declarations;
  they are not verified physical safety checks.

## Verification

Focused command: `mvn -Dtest=DisasterMissionConfigurationUnitTest,AgentDefinitionRegistryUnitTest test`.
Three new workflow tests and six existing registry tests passed during initial implementation.
Workflow tests cover success with revision-bound approval and JSON output,
missing details, unsafe missions, edits, stale confirmations, extraction failures,
malformed output, storage limits and reset.
The language model is mocked in tests. Compilation used local JDK 25 with the
existing Java 21 compiler target. Browser behavior, database round trips and
actual model responses have not been tested.

Next useful extension: authenticated supervisor approvals and explicit,
platform-specific safety evidence, followed by browser and persistence tests.
