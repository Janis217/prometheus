# Codex Starter Prompt: Disaster Mission Configuration

You are working inside the existing PROMETHEUS repository.

Do not create a separate project. Keep the work inside this repo and follow the established project patterns.

## Required context to read first

1. `.agents/CODEX.md`
2. `.agents/DISASTER_MISSION_CONTEXT.md`
3. `.agents/PLAN_DISASTER_MISSION.md`
4. `messageinabottle.txt`
5. `src/main/java/ch/zhaw/prometheus/agentdefs/AgentDefinition.java`
6. `src/main/java/ch/zhaw/prometheus/agentdefs/core/FacialExpressionSensitivity.java`
7. `src/main/java/ch/zhaw/prometheus/agentdefs/core/ValerianCoreAgentFactory.java`
8. `src/main/java/ch/zhaw/prometheus/controllers/ScopedDemoController.java`
9. `README.md`
10. `PROJECT.md`

## Goal

Implement the first PROMETHEUS disaster mission configuration prototype as a narrow, reviewable milestone.

This must remain a small, state-machine-driven configuration interaction for disaster response and not become a broad emergency control system or generic chatbot.

## Target outcome

Create a new core agent that can:

- capture a mission brief
- ask for missing critical information
- choose a likely physical AI embodiment
- define constraints, required perception, required behavior, and first action
- block unsafe or incomplete missions until approval or clarification is available
- emit a structured, inspectable final mission result

## Scope constraints

- stay inside the existing repo
- use the existing core agent definition pattern
- follow the repo’s current Valerian/demo flow
- avoid unrelated architecture changes
- avoid broad refactors
- prefer a compact milestone over a big system design

## Required task flow

1. Inspect the existing patterns and current repo context.
2. Identify the nearest existing single-state core agent implementation.
3. Implement the smallest coherent change that satisfies the milestone.
4. Add the minimum high-value tests:
   - success path
   - missing-info path
   - unsafe or guard path
5. Verify with a focused test command.
6. Update the project documentation and milestone audit trail if needed.
7. Report:
   - what changed
   - what was actually verified
   - remaining risks or unverified areas
   - what should happen next

## Verification command

Use the smallest relevant verification command, likely:

```bash
./mvnw -q -Dtest=DisasterMissionConfigurationUnitTest test
```

If the repo or test naming differs, adapt to the nearest existing pattern, but keep the verification focused.

## Acceptance criteria

The milestone is successful when:

- a concrete disaster mission agent exists
- the agent can capture a mission and ask for missing information
- it can recommend a suitable embodiment
- it can produce an execution-ready mission configuration
- the interaction stays inspectable and state-machine driven
- the scope remains intentionally narrow and demonstrable

## Important reminder

Before proposing or making changes, give a concise mental model and identify the specific existing patterns, files, and tests that should guide the work.

Then implement the smallest coherent change and verify it with targeted tests.

When the milestone is complete, stop after the handoff so the user can review and commit.
