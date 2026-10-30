# Plan: Disaster Mission Configuration Prototype

## Goal

Implement a focused PROMETHEUS proof-of-concept for a disaster-management mission configuration interaction. The prototype should show how an operator can describe an emergency scenario, select an appropriate physical AI embodiment, and receive an execution-ready configuration for review.

## Non-goal

This is not a full robot control stack, not a broad emergency command system, and not a generic chatbot. The first milestone is intentionally narrow and demo-oriented.

## Use cases

### 1. Fire response / hotspot inspection
- Embodiment: drone or mobile inspection robot
- Key perception: smoke, heat, occlusions, dangerous zones
- Behavior: map hotspot, approach with safe standoff, identify visible hazards
- Human approval: keep high-risk movement approval explicit

### 2. Missing-person search
- Embodiment: drone with camera or ground rover depending terrain
- Key perception: route, shelter, open spaces, visibility, noise/signals
- Behavior: sweep search area, identify likely locations, report findings
- Human approval: search boundaries and escalation rules explicit

### 3. Rubble / access-zone assessment
- Embodiment: mobile robot or drone depending access conditions
- Key perception: blocked paths, unstable surfaces, narrow entrances
- Behavior: assess route safety, locate access point, estimate safety risk
- Human approval: route entry and structural risk require explicit sign-off

## Proposed interaction model

### State flow

1. mission_capture
   - collect mission summary and urgency
   - request missing context

2. situation_checks
   - evaluate environment, hazards, terrain, visibility
   - identify constraints and open questions

3. embodiment_selection
   - recommend drone, dog robot, humanoid, or ground robot
   - explain reason and trade-offs

4. safety_and_approval
   - identify safety gates
   - require explicit approval when necessary

5. execution_ready
   - produce structured mission configuration
   - return final execution-ready summary

## Required output

The final result should be structured and reviewable, for example:

```json
{
  "missionType": "fire_hotspot_inspection",
  "objective": "Identify the hottest safe access path and confirm hazard boundaries",
  "location": "north warehouse zone",
  "priority": "high",
  "selectedEmbodiment": "drone",
  "constraints": [
    "maintain safe standoff from smoke plume",
    "avoid unstable roof edges",
    "prefer visual confirmation before approach"
  ],
  "requiredPerception": [
    "thermal imaging",
    "visual obstacle detection",
    "air quality or smoke density"
  ],
  "requiredBehavior": [
    "route scan",
    "hotspot localization",
    "photo verification"
  ],
  "firstAction": "scan perimeter and identify safe entry corridor",
  "approvalState": "awaiting_supervisor_approval"
}
```

## Implementation strategy

### 1. Agent definition
Create a new agent definition following the existing pattern used in the core demo definitions.

### 2. Prompting strategy
Use a structured state-machine prompt that orients the agent around mission configuration instead of conversation alone.

Key emphasis:

- ask for missing information when required
- avoid claiming physical execution without approval
- reason from mission context, not abstract chat
- keep final output inspectable and machine-readable

### 3. Valerian integration
Use the existing Valerian access-code and scoped demo flow to test the interaction in the browser. This keeps the prototype aligned with the repo's current demonstration pattern.

## Files to inspect while implementing

- [src/main/java/ch/zhaw/prometheus/agentdefs/AgentDefinition.java](../src/main/java/ch/zhaw/prometheus/agentdefs/AgentDefinition.java)
- [src/main/java/ch/zhaw/prometheus/agentdefs/core](../src/main/java/ch/zhaw/prometheus/agentdefs/core)
- [src/main/java/ch/zhaw/prometheus/controllers/ScopedDemoController.java](../src/main/java/ch/zhaw/prometheus/controllers/ScopedDemoController.java)
- [README.md](../README.md)
- [PROJECT.md](../PROJECT.md)

## Verification plan

The first implementation should be checked with a minimal, high-value test set:

- one success workflow for a mission brief
- one path where required information is missing
- one refusal or guard path for unsafe mission configuration
- one structured output assertion for the final mission object

## Acceptance criteria

The milestone is done when:

- a concrete disaster mission agent exists
- the agent can capture a mission and ask for missing information
- it can recommend a suitable physical AI embodiment
- it can produce an execution-ready mission configuration
- the interaction remains inspectable and state-machine driven
- the scope remains intentionally small and demonstrable

## Handoff expectation

When the milestone is complete, the result should be reported with:

- what changed
- what was verified
- what remains unverified
- what should be extended next

The goal is to keep the first milestone crisp, reviewable, and aligned with the repo’s established workflow.
