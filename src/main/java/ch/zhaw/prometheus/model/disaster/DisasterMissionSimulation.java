package ch.zhaw.prometheus.model.disaster;

import java.util.List;
import java.util.UUID;
import com.google.gson.JsonObject;
import ch.zhaw.prometheus.model.Storage;

/** Bounded fire-image interaction rehearsal. Never authorizes or contacts an executor. */
public final class DisasterMissionSimulation {
    public static final String KEY = "disaster_mission_simulation";
    private static final String TRACE = KEY + ".event.";
    private static final String PREFIX = "simulate fire";
    private static final int MAX_EVENTS = 24;

    private DisasterMissionSimulation() {}

    public static void clear(Storage storage) {
        for (String key : List.copyOf(storage.toMap().keySet())) {
            if (key.equals(KEY) || key.startsWith(TRACE)) storage.remove(key);
        }
    }

    /** Commands are explicit fixtures, not natural-language interpretation or trusted adapter events. */
    public static boolean handle(Storage storage, String input) {
        if (!input.startsWith(PREFIX)) {
            if (!storage.containsKey(KEY)) return false;
            return reject(storage, storage.get(KEY).getAsJsonObject().deepCopy(),
                    "Reset the agent before returning to ordinary mission configuration.");
        }
        String[] words = input.split("\\s+");
        JsonObject state = storage.containsKey(KEY) ? storage.get(KEY).getAsJsonObject().deepCopy() : initial();
        String action = words.length >= 3 ? words[2] : "";
        if (input.equals(PREFIX + " status")) {
            storage.put(KEY, state);
            return true;
        }
        if (input.equals(PREFIX + " begin")) {
            if (!DisasterMission.text(state, "phase").equals("not_started"))
                return reject(storage, state, "Reset the agent before beginning another rehearsal.");
            state = initial();
            state.addProperty("runId", UUID.randomUUID().toString());
            return commit(storage, state, "initiation", "configuration", "begin");
        }
        if (words.length != 5 || !words[0].equals("simulate") || !words[1].equals("fire")
                || !words[3].equals(DisasterMission.text(state, "runId"))
                || !words[4].equals(Integer.toString(state.get("revision").getAsInt()))
                || !storage.containsKey(KEY)) {
            return reject(storage, state, "Use: simulate fire <action> <runId> <current revision>; begin or status takes no token.");
        }
        if (state.get("sequence").getAsInt() >= MAX_EVENTS - 2
                && !List.of("abort", "handoff").contains(action))
            return reject(storage, state, "Rehearsal event limit reached; abort and acknowledge handoff, then reset.");

        String phase = DisasterMission.text(state, "phase");
        String next = switch (action) {
            case "configure" -> phase.equals("configuration") ? "approval" : "";
            case "confirm" -> phase.equals("approval") ? "confirmed" : "";
            case "start" -> phase.equals("confirmed") ? "coordination" : "";
            case "progress" -> phase.equals("coordination") ? "coordination" : "";
            case "obstacle", "ambiguity", "timeout", "connection_loss" -> phase.equals("coordination") ? "escalation" : "";
            case "resume" -> phase.equals("escalation")
                    && !DisasterMission.text(state, "trigger").equals("connection_loss") ? "coordination" : "";
            case "complete" -> phase.equals("coordination") && state.get("progressObserved").getAsBoolean()
                    ? "completion_handoff" : "";
            case "abort" -> List.of("approval", "confirmed", "coordination", "escalation").contains(phase)
                    ? "completion_handoff" : "";
            case "handoff" -> phase.equals("completion_handoff") ? "closed" : "";
            default -> "";
        };
        if (next.isEmpty()) return reject(storage, state, "Command not permitted in the current phase; lost-link runs must abort.");
        if (action.equals("configure")) {
            var configuration = new JsonObject();
            configuration.addProperty("target", "printed fire indicator, not actual fire");
            configuration.addProperty("location", "R-204, fixture marker A");
            configuration.addProperty("boundary", "R-204 interior only");
            configuration.addProperty("priority", "low");
            configuration.addProperty("embodiment", "simulated ground robot");
            configuration.addProperty("stopConditions", "new hazard, lost link, operator abort");
            configuration.addProperty("constraints", "no physical movement; synthetic evidence only");
            state.add("configuration", configuration);
            state.addProperty("revision", state.get("revision").getAsInt() + 1);
            state.addProperty("missingInformation", "");
        }
        if (action.equals("confirm")) state.addProperty("confirmation", "simulation_only_not_authorized");
        if (action.equals("progress")) state.addProperty("progressObserved", true);
        if (next.equals("escalation")) {
            state.addProperty("trigger", action);
            state.addProperty("pendingDecision", action.equals("connection_loss") ? "abort" : "resume_or_abort");
        }
        if (action.equals("resume") || action.equals("abort")) {
            state.addProperty("decision", action);
            state.addProperty("pendingDecision", "");
            // Earlier progress cannot complete a run after an unresolved interruption.
            state.addProperty("progressObserved", false);
        }
        if (next.equals("completion_handoff")) {
            var result = new JsonObject();
            result.addProperty("simulation", true);
            result.addProperty("outcome", action.equals("abort") ? "aborted" : "indicator_found");
            result.addProperty("evidence", action.equals("abort") ? "" : "simulation://fire/R-204/indicator");
            result.addProperty("location", "R-204, fixture marker A");
            result.addProperty("confidence", action.equals("abort") ? 0.0 : 1.0);
            result.addProperty("source", "deterministic_fixture_not_sensor");
            result.addProperty("closureReason", action.equals("abort") ? "operator_abort" : "fixture_inspection_complete");
            result.addProperty("responsibility", "pending_demo_operator_acknowledgement");
            state.add("result", result);
            state.addProperty("pendingDecision", "acknowledge_handoff");
        }
        if (action.equals("handoff")) {
            state.getAsJsonObject("result").addProperty("responsibility", "acknowledged_by_demo_operator_not_authenticated");
            state.addProperty("pendingDecision", "");
        }
        return commit(storage, state, phase, next, action);
    }

    private static JsonObject initial() {
        var state = new JsonObject();
        state.addProperty("schemaVersion", 1);
        state.addProperty("simulation", true);
        state.addProperty("operationalReady", false);
        state.addProperty("authorization", "deferred_DM04");
        state.addProperty("adapter", "fixture_commands_not_DM05");
        state.addProperty("intent", "Inspect R-204 for a printed fire indicator; operator-requested rehearsal");
        state.add("useCases", Storage.toJsonElement(List.of("UC-FIRE-01", "UC-FIRE-02")));
        state.addProperty("runId", "");
        state.addProperty("revision", 0);
        state.addProperty("sequence", 0);
        state.addProperty("phase", "not_started");
        state.addProperty("progressObserved", false);
        state.addProperty("missingInformation", "target, area bounds, stop conditions, constraints; use configure for the fixed R-204 fixture");
        return state;
    }

    private static boolean reject(Storage storage, JsonObject state, String reason) {
        state.addProperty("lastRejection", reason);
        storage.put(KEY, state);
        return true;
    }

    private static boolean commit(Storage storage, JsonObject state, String previous, String next, String action) {
        state.remove("lastRejection");
        int sequence = state.get("sequence").getAsInt() + 1;
        state.addProperty("sequence", sequence);
        state.addProperty("phase", next);
        var event = new JsonObject();
        event.addProperty("simulation", true);
        event.addProperty("runId", DisasterMission.text(state, "runId"));
        event.addProperty("revision", state.get("revision").getAsInt());
        event.addProperty("sequence", sequence);
        event.addProperty("from", previous);
        event.addProperty("to", next);
        event.addProperty("action", action);
        // Existing StorageEntry is VARCHAR(2048); bounded snapshots and per-event entries avoid a migration.
        if (state.toString().length() > 2048) throw new IllegalStateException("Simulation snapshot exceeds storage bound");
        storage.put(TRACE + sequence, event);
        storage.put(KEY, state);
        return true;
    }
}
