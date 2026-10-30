# Codex Preparation Checklist for Disaster Mission Configuration

## Prepared inputs

- `.agents/CODEX.md` — reusable engineering and completion rules
- `.agents/DISASTER_MISSION_CONTEXT.md` — project-specific mission rationale and constraints
- `.agents/PLAN_DISASTER_MISSION.md` — use cases, state flow, expected output, acceptance criteria
- `.agents/messageinabottle.txt` — direct end-user milestone brief and execution constraints
- `README.md` — repo setup and runtime framing
- `PROJECT.md` — current repo status and implementation context
- `src/main/java/ch/zhaw/prometheus/agentdefs/core/ValerianCoreAgentFactory.java` — existing single-state core-pattern reference
- `src/main/java/ch/zhaw/prometheus/agentdefs/AgentDefinition.java` — core agent contract
- `src/main/java/ch/zhaw/prometheus/controllers/ScopedDemoController.java` — access-code/demo integration pattern

## Prepared target

- implement the first disaster mission configuration prototype in the existing repo
- keep it narrow and state-machine driven
- align with current Valerian and core-agent conventions

## Prepared constraints

- no separate project
- no broad emergency system
- no generic chatbot behavior
- no unrelated architecture changes
- no large refactor before the milestone is complete
- keep implementation reviewable and small

## Prepared verification

- focused test set for success, missing-info, and unsafe/guard path
- expected test command: `./mvnw -q -Dtest=DisasterMissionConfigurationUnitTest test`

## Prepared completion requirement

Codex must report:

- what changed
- what was actually verified
- remaining risks or unverified areas
- what extension should happen next

This is the exact operational basis for the next implementation step.
