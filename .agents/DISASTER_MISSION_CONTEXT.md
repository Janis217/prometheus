# Disaster Mission Configuration Context

## Purpose

This task introduces a first PROMETHEUS proof-of-concept for a disaster-management mission configuration interaction. The aim is not to build a generic chatbot, but a structured configuration workflow for physical AI tasking under emergency conditions.

The key design question is: how can a human operator turn a mission brief into a clear, inspectable, execution-ready task definition for a drone, dog robot, humanoid, or mobile ground platform?

## Why this fits PROMETHEUS

PROMETHEUS is already organized around:

- explicit state-machine control
- typed event and observation handling
- multimodal behavioral output
- inspectable task structure and runtime state
- scoped client/demo workflows via Valerian and access codes

This is a good match for a mission configuration agent because the task requires:

- gathering incomplete mission details
- narrowing relevant context
- selecting an appropriate embodiment
- validating safety and approval constraints
- producing an execution-ready mission object

## Core objective

Deliver a small but valuable first milestone that demonstrates a configuration interaction for disaster scenarios, with a stateful agent and a structured mission result.

The result should be suitable for a human supervisor to review before robot execution, not a free-form conversational response.

## Scope for the first milestone

Keep the first delivery intentionally small.

Prioritize these use cases:

1. Fire response / hotspot inspection
2. Missing-person search
3. Rubble or access-zone assessment

Optional follow-on use cases:

4. Flood or water rescue
5. Infrastructure inspection

## Design principle

The agent should behave like a mission configurator, not a generic advisor.

The workflow should be explicit and staged:

1. Mission capture
2. Situation checks
3. Embodiment selection
4. Safety and approval checks
5. Execution-ready mission configuration

The output should include, at minimum:

- mission type
- objective
- location or zone
- priority
- selected embodiment
- operational constraints
- required sensing
- required behavior
- first action
- approval state

## Minimal implementation target

Build a single first agent definition that demonstrates the pattern clearly.

Preferred architecture:

- one agent definition in the same style as the existing core demo definitions
- one mission-configuration state flow
- one structured final result object
- browser-based demo interaction through the existing Valerian workflow

Do not broaden into a full robot control system or general emergency operations platform in the first milestone.

## Relevant repository anchors

The implementation should be guided by these existing patterns:

- Agent definition lifecycle: [src/main/java/ch/zhaw/prometheus/agentdefs/AgentDefinition.java](../src/main/java/ch/zhaw/prometheus/agentdefs/AgentDefinition.java)
- Agent catalog pattern: [src/main/java/ch/zhaw/prometheus/agentdefs/core](../src/main/java/ch/zhaw/prometheus/agentdefs/core)
- Scoped demo API pattern: [src/main/java/ch/zhaw/prometheus/controllers/ScopedDemoController.java](../src/main/java/ch/zhaw/prometheus/controllers/ScopedDemoController.java)
- Product framing and runtime background: [README.md](../README.md)
- Current status and repo direction: [PROJECT.md](../PROJECT.md)

## Constraints

- Keep the first milestone narrow and testable.
- Reuse existing repo patterns instead of inventing parallel infrastructure.
- Prefer a small agent with clear states over a broad multi-agent emergency simulator.
- Treat human approval as explicit where safety matters.
- Do not claim robot execution or physical deployment unless it is explicitly part of the milestone validation.

## Acceptance focus

The first milestone is successful if it demonstrates:

- a concrete disaster-use-case agent exists
- mission details can be gathered and missing information requested
- a suitable physical AI embodiment can be recommended
- an execution-ready mission configuration can be produced
- the interaction is state-based and inspectable
- the first version remains intentionally small and limited

## Follow-up direction

Once the proof-of-concept is verified, the next iteration can extend:

- additional use cases
- richer environment sensing requirements
- stricter role and approval logic
- embodiment-specific execution constraints
- broader multimodal observation handling

But the first milestone should not overreach.
