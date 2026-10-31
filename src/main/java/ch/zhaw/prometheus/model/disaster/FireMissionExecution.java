package ch.zhaw.prometheus.model.disaster;

import java.util.List;
import java.util.UUID;
import com.google.gson.JsonObject;
import ch.zhaw.prometheus.model.Storage;
import ch.zhaw.prometheus.spi.MissionExecutor.Feedback;

/** Persisted phase reducer for one synthetic approved room inspection; no physical authority. */
public final class FireMissionExecution {
    public static final String KEY = "disaster_execution";
    public static final String MISSION = KEY + ".mission";
    public static final String EVENT = KEY + ".event.";
    private static final List<String> ACTIVE = List.of("awaiting_acceptance", "coordination", "escalation");
    private FireMissionExecution() {}

    public static JsonObject current(Storage storage) { return storage.get(KEY).getAsJsonObject().deepCopy(); }
    public static void clear(Storage storage) {
        for (String key : List.copyOf(storage.toMap().keySet()))
            if (key.equals(KEY) || key.startsWith(KEY + ".")) storage.remove(key);
    }

    public static JsonObject start(Storage storage, JsonObject mission, int reviewVersion, String reference,
            UUID requestId, String variant, String supervisorId, long now) {
        if (!List.of("ordinary", "obstacle", "failure", "timeout").contains(variant)) throw new IllegalArgumentException("Unsupported simulation variant");
        if (!mission.get("ready").getAsBoolean() || !"supervisor_approved".equals(DisasterMission.text(mission, "approvalState"))
                || !"satisfied".equals(DisasterMission.text(mission.getAsJsonObject("platformSafety"), "status"))
                || !"fire_hotspot_inspection".equals(DisasterMission.text(mission, "missionType"))
                || !"R-204".equals(DisasterMission.text(mission, "location"))
                || !"indoor_flat".equals(DisasterMission.text(mission, "environment"))
                || !"Find printed fire indicator".equals(DisasterMission.text(mission, "objective"))
                || !"R-204 interior only".equals(DisasterMission.text(mission, "searchBoundary")))
            throw new IllegalArgumentException("Only the approved synthetic R-204 fire-image scenario is supported");
        if (storage.containsKey(KEY)) {
            var existing = current(storage);
            if (requestId.toString().equals(DisasterMission.text(existing, "requestId"))
                    && variant.equals(DisasterMission.text(existing, "variant"))
                    && reference.equals(DisasterMission.text(existing, "safetyReference"))
                    && reviewVersion == existing.get("reviewVersion").getAsInt()
                    && supervisorId.equals(DisasterMission.text(existing, "startedBy"))) return existing;
            throw new IllegalArgumentException("Reset before a new execution; existing run cannot be replaced");
        }
        var state = new JsonObject();
        state.addProperty("schemaVersion", 1); state.addProperty("simulation", true);
        state.addProperty("operationalReady", false); state.addProperty("adapter", "in_process_fire_image_fixture");
        state.addProperty("executionId", UUID.randomUUID().toString());
        state.addProperty("requestId", requestId.toString()); state.addProperty("startedBy", supervisorId);
        state.addProperty("revision", mission.get("revision").getAsInt()); state.addProperty("reviewVersion", reviewVersion);
        state.addProperty("safetyReference", reference); state.addProperty("variant", variant);
        state.addProperty("sequence", 0); state.addProperty("cursor", 0); state.addProperty("progressObserved", false);
        state.addProperty("phase", "awaiting_acceptance"); state.addProperty("handoff", "not_requested");
        state.addProperty("deadlineMillis", now + 300000);
        state.addProperty("useCase", variant.equals("ordinary") ? "UC-FIRE-01" : "UC-FIRE-02");
        bounded(mission); storage.put(MISSION, mission.deepCopy());
        return commit(storage, state, "start");
    }

    public static JsonObject expireOrInvalidate(Storage storage, JsonObject mission, int reviewVersion, String reference, long now) {
        var state = current(storage);
        if (!ACTIVE.contains(DisasterMission.text(state, "phase"))) return state;
        if (!mission.get("ready").getAsBoolean() || mission.get("revision").getAsInt() != state.get("revision").getAsInt()
                || reviewVersion != state.get("reviewVersion").getAsInt() || !reference.equals(DisasterMission.text(state, "safetyReference")))
            return finish(storage, state, "cancelled", "configuration_or_approval_changed");
        if (now >= state.get("deadlineMillis").getAsLong()) return finish(storage, state, "timed_out", "deadline_expired");
        return state;
    }

    public static JsonObject feedback(Storage storage, Feedback feedback) {
        var state = current(storage);
        if (!feedback.executionId().toString().equals(DisasterMission.text(state, "executionId"))) throw new IllegalArgumentException("Foreign execution");
        int sequence = state.get("sequence").getAsInt();
        if (feedback.sequence() == sequence && feedback.kind().equals(DisasterMission.text(state, "lastAction"))) return state;
        if (feedback.sequence() != sequence + 1) throw new IllegalArgumentException("Out-of-order feedback");
        String phase = DisasterMission.text(state, "phase");
        if (feedback.kind().equals("accepted") && phase.equals("awaiting_acceptance")) state.addProperty("phase", "coordination");
        else if (feedback.kind().equals("progress") && phase.equals("coordination")) state.addProperty("progressObserved", true);
        else if (feedback.kind().equals("obstacle") && phase.equals("coordination")) {
            state.addProperty("phase", "escalation"); state.addProperty("pendingDecision", "resume_within_same_bounds_or_abort");
            state.addProperty("progressObserved", false);
        } else if (feedback.kind().equals("complete") && phase.equals("coordination") && state.get("progressObserved").getAsBoolean())
            return finish(storage, state, "completed", "simulated_indicator_found");
        else if (List.of("failure", "timeout").contains(feedback.kind()) && ACTIVE.contains(phase))
            return finish(storage, state, feedback.kind().equals("timeout") ? "timed_out" : "failed", "simulator_" + feedback.kind());
        else throw new IllegalArgumentException("Feedback not permitted in this phase");
        state.addProperty("cursor", state.get("cursor").getAsInt() + 1);
        return commit(storage, state, feedback.kind());
    }

    public static JsonObject decide(Storage storage, UUID id, int expectedSequence, String action, String operatorScopeId) {
        var state = current(storage); require(state, id, expectedSequence);
        state.addProperty("operatorScopeId", operatorScopeId);
        String phase = DisasterMission.text(state, "phase");
        if ("abort".equals(action) && ACTIVE.contains(phase)) return finish(storage, state, "cancelled", "operator_abort");
        if ("resume".equals(action) && phase.equals("escalation")) {
            state.addProperty("phase", "coordination"); state.addProperty("pendingDecision", "");
        } else if ("handoff".equals(action) && phase.equals("completion_handoff")) {
            state.addProperty("phase", "closed"); state.addProperty("handoff", "acknowledged_by_scoped_operator");
            state.getAsJsonObject("result").addProperty("responsibilityScopeId", operatorScopeId);
        } else throw new IllegalArgumentException("Decision not permitted");
        return commit(storage, state, action);
    }

    public static void require(JsonObject state, UUID id, int expectedSequence) {
        if (!id.toString().equals(DisasterMission.text(state, "executionId")) || state.get("sequence").getAsInt() != expectedSequence)
            throw new IllegalArgumentException("Stale execution version");
    }

    private static JsonObject finish(Storage storage, JsonObject state, String outcome, String reason) {
        var result = new JsonObject();
        result.addProperty("simulation", true); result.addProperty("outcome", outcome);
        result.addProperty("evidence", outcome.equals("completed") ? "simulation://fire/R-204/indicator" : "");
        result.addProperty("location", "R-204 fixture marker A"); result.addProperty("closureReason", reason);
        result.addProperty("confidence", outcome.equals("completed") ? 1.0 : 0.0);
        result.addProperty("source", "deterministic_fixture_not_sensor");
        state.add("result", result); state.addProperty("phase", "completion_handoff");
        state.addProperty("pendingDecision", "acknowledge_handoff"); state.addProperty("handoff", "pending_scoped_operator");
        return commit(storage, state, outcome.equals("completed") ? "complete" : outcome);
    }

    private static JsonObject commit(Storage storage, JsonObject state, String action) {
        int sequence = state.get("sequence").getAsInt() + 1;
        if (sequence > 16) throw new IllegalArgumentException("Execution transition bound exceeded");
        if (sequence > 14 && !List.of("cancelled", "complete", "failed", "timed_out", "handoff").contains(action))
            throw new IllegalArgumentException("Execution bound reached; abort and handoff");
        state.addProperty("sequence", sequence); state.addProperty("lastAction", action);
        var event = state.deepCopy(); event.remove("result");
        bounded(state); bounded(event);
        storage.put(EVENT + sequence, event); storage.put(KEY, state);
        return state;
    }
    private static void bounded(JsonObject value) {
        if (value.toString().length() > 2048) throw new IllegalArgumentException("Execution storage bound exceeded");
    }
}
