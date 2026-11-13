# Simulation action contract

The room simulator uses version-1 function-call data and a simulation executor.
The planner requests an action; the executor checks the live world and produces
its actual result. No function-call string is evaluated or sent to hardware.

## Function parameters

| Function | Parameters |
|---|---|
| `observe` | position, heading, visibility, rangeMeters (null for clear-air line of sight) |
| `move` | direction, distanceMeters, from, to |
| `turn` | direction, angleDegrees, fromHeading, toHeading |
| `open_door` | doorId, position, force (false) |
| `take_photo` | targetId, position, subject |
| `record_observation` | targetId, position, subject |
| `fetch`, `pick_up` | objectId, position |
| `report_findings` | missionId, missionRevision, recipient, findings, coverage, partial |
| `stop` | reason |

Coordinates use a one-metre grid, origin at the upper left: east increases x,
south increases y. Directions are north/east/south/west. Current movement is one
metre in the current heading; current turns are clockwise 90 degrees. Other
movement/rotation parameters reject with INVALID_ARGUMENT rather than silently
executing a different action. Target IDs and poses come from observed state.

Each report finding includes objectId, type, captured position and evidence
(type plus a simulated photo ID when applicable). Capture records are snapshots;
later object movement cannot change evidence positions. Reports validate their
mission identity, findings and actual search coverage. The recipient is a logical
simulation parameter; no supervisor message or physical action is sent.

`fetch` and `pick_up` validate the target but return NOT_IMPLEMENTED without
moving objects. This explicitly replaces their former pretend-success text.

## Request and response

```json
{
  "schemaVersion": 1,
  "id": "action-2",
  "function": "move",
  "parameters": {
    "direction": "east", "distanceMeters": 1,
    "from": {"x": 0, "y": 0}, "to": {"x": 1, "y": 0}
  },
  "mode": "simulation",
  "trigger": "simulation_tick"
}
```

```json
{
  "schemaVersion": 1, "requestId": "action-2", "mode": "simulation",
  "status": "blocked", "code": "OBSTACLE_BLOCKED",
  "message": "Wall, furniture or closed door blocks movement.",
  "data": {
    "attemptedPosition": {"x": 1, "y": 0},
    "obstacle": {"id": "object-1", "type": "chair", "position": {"x": 1, "y": 0}},
    "distanceMovedMeters": 0
  },
  "retryable": true,
  "poseBefore": {"x": 0, "y": 0, "heading": 1},
  "poseAfter": {"x": 0, "y": 0, "heading": 1},
  "phaseAfter": "running"
}
```

Statuses are succeeded, blocked, failed and not_implemented. Codes include OK,
DOOR_LOCKED, DOOR_CLOSED, WALL_BLOCKED, OBSTACLE_BLOCKED, OUT_OF_REACH,
TARGET_NOT_VISIBLE, TARGET_MOVED, POSE_CHANGED, DOOR_POLICY, EVIDENCE_POLICY,
NO_FINDINGS, INVALID_ARGUMENT, EXECUTOR_ERROR and NOT_IMPLEMENTED.
Non-retryable failures end the run as failed. Blocked actions can replan or retry
within the existing step bound. Missing evidence is a retryable failure.

A successful `stop` can end the mission as blocked/partial/not_found; execution
success and mission outcome are distinct. Its code explains why (OPERATOR_STOP,
STEP_LIMIT, SEARCH_EXHAUSTED, DOOR_LOCKED or DOOR_POLICY). Report partial coverage
is explicit in both parameters and result. Terminal phase/result/message are
settled before recording the event; later code does not rewrite the log.

Each event retains legacy action/success/reason/result/pose fields and adds call,
response and perceptionAfter. The same event drives the room and both timelines.
Run reports remain version 1 with additive `actionProtocolVersion: 1`, preserving
initial/final world state and the complete call/result trace. Function callbacks
are not serialized. IDs are ordered within a run; repeats restart their sequence.

## Extension boundary for later scenarios

### Saved obstacle moves

In the room builder, expand **Scheduled obstacle moves**, select a chair/table,
choose **Before action** (1–512), and enter a destination x/y. **Add move** adds
it to the room; save the named room and bind that revision to a mission as usual.
The coordinates are the same one-metre grid shown by slot labels. A room supports
up to 32 moves. Remove a move in this panel; removing furniture removes its moves.

Action numbering includes the initial observation (action 1), manual actions and
failed actions. To move a chair into the first planned movement, use action 2.
Moves execute after planning but before the action's live-world checks. Each move
is a deterministic relocation, not continuous animation or a physical trajectory.
Moves at the same action execute in saved list order; an object can appear only
once per action. Occupied destinations, including the robot, block the relocation
and leave furniture unchanged. Stop never applies a scheduled move. Moves beyond
the end of a run remain unexecuted; they are retained in its initial configuration.

The optional version-1 room field `obstacleMoves` contains entries such as
`{"action":2,"objectId":"object-1","x":1,"y":0}`. Imports, library saves and
run startup validate object identity, bounds, action numbers and duplicate pairs.
Old room files without schedules keep their existing behavior. Changes to saved
rooms require the existing explicit revision save/rebinding workflow.

Events with scheduled moves add `worldChanges` containing object ID, action,
from/to positions, applied/blocked status and reason. Both timelines display the
change; run exports preserve it alongside the original schedule and final world.
The original layout is immutable and each new run starts its schedule afresh.

### Programmatic hooks

### Saved obstacle moves

In the room builder, expand **Scheduled obstacle moves**, select a chair/table,
choose **Before action** (1–512), and enter a destination x/y. **Add move** adds
it to the room; save the named room and bind that revision to a mission as usual.
The coordinates are the same one-metre grid shown by slot labels. A room supports
up to 32 moves. Remove a move in this panel; removing furniture removes its moves.

Action numbering includes the initial observation (action 1), manual actions and
failed actions. To move a chair into the first planned movement, use action 2.
Moves execute after planning but before the action's live-world checks. Each move
is a deterministic relocation, not continuous animation or a physical trajectory.
Moves at the same action execute in saved list order; an object can appear only
once per action. Occupied destinations, including the robot, block the relocation
and leave furniture unchanged. Stop never applies a scheduled move. Moves beyond
the end of a run remain unexecuted; they are retained in its initial configuration.

The optional version-1 room field `obstacleMoves` contains entries such as
`{"action":2,"objectId":"object-1","x":1,"y":0}`. Imports, library saves and
run startup validate object identity, bounds, action numbers and duplicate pairs.
Old room files without schedules keep their existing behavior. Changes to saved
rooms require the existing explicit revision save/rebinding workflow.

Events with scheduled moves add `worldChanges` containing object ID, action,
from/to positions, applied/blocked status and reason. Both timelines display the
change; run exports preserve it alongside the original schedule and final world.
The original layout is immutable and each new run starts its schedule afresh.

### Programmatic hooks

- `room-world.js`: geometry, collision and visibility.
- `simulation-actions.js`: call creation, schema/ID validation and text formatting.
- `simulation-action-executor.js`: function registry, preconditions and effects.
- `room-simulation.js`: perception memory, planner and run orchestration.

`executeAction(run, request)` dispatches explicit calls. Existing `act(...)` is
kept as a wrapper that creates a request, so both manual and autonomous actions
use the same executor. Replayed/out-of-sequence calls and unknown versions reject
before executing effects.

For trusted scenario code, startSimulation accepts a synchronous beforeAction
hook. It can update live world obstacles or return a deterministic simulated
fault. It cannot supply arbitrary successful effects. The executor then checks
the updated world, so a previously planned move can fail without advancing pose.
The planner consumes updated observations and can find another route.

```js
let moved = false;
const run = startSimulation(room, specification, {
  beforeAction({request, world}) {
    if (request.function === 'move' && !moved) {
      const chair = world.objects.find(object => object.type === 'chair');
      chair.x = 1;
      chair.y = 0;
      moved = true;
    }
  }
});
```

A fault hook can return `{status:'failed', code:'ACTUATOR_FAULT',
message:'Simulated wheel fault.', retryable:false}`. Hooks are trusted JavaScript,
not imported/evaluated scenario strings. Invalid/throwing hooks record an
EXECUTOR_ERROR. Use runDocument for serializable evidence rather than cloning the
run object containing the hook.

Floor-obstacle placement, timed moving actors, asynchronous movement/physics,
scenario-file schemas for those features and real hardware adapters are later
work. Existing saved room formats and mission configuration are unchanged.
