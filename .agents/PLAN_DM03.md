# DM-03: Platform Safety Constraints

Status: closed for declarative software scope (2026-10-31); see DM03_RESULTS.md.
Use cases UC-FIRE-01/02; DR-02, DR-05.
Follow the existing backlog work packages; no new architecture or physical control.

## Requirement schema

Mission schema version 2 includes platformSafety with required keys, normalized
declarations, unresolved reasons, status and source. Extraction supplies
platformEvidence; backend code alone derives requirements and satisfaction.

Common keys: communications, safeStandoff, platformSuitability.
Drone adds flightClearance/weatherEnvelope. Ground robot adds
accessClearance/terrainSuitability. Dog robot adds
structuralClearance/terrainSuitability. Unsupported embodiments always block.

Declaration values are confirmed, failed or unknown. Missing, malformed,
conflicting or ambiguous values become unknown. Failed values block; unknown
values remain unresolved. A generic safetyAssessment=safe cannot fill any key.
Declarations are operator-supplied statements, not physical evidence or
certification. Concrete platform envelopes and measurements belong to DM-06.

## Revision and storage behavior

Every operator edit invalidates prior confirmation. Changes to mission facts
clear affirmative platform declarations and require reassessment. Changes to
declarations require renewed generic safety assessment. Legacy records lacking
the schema fail conservatively. Preserve the existing Storage entry bound;
oversized briefs fail closed without truncating safety facts.

## Verification and closure

Focused rules cover all three embodiments and missing/failed/malformed/unknown
requirements. Agent tests cover changes and approval guards. Real scoped MySQL
integration verifies emitted/stored JSON, detached reload and access isolation.
Record exact commands and failures in DM03_RESULTS.md before closing the backlog.
No real-model or physical validation is inferred. Next: DM-04 authenticated review.
