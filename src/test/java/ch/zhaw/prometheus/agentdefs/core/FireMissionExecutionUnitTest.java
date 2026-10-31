package ch.zhaw.prometheus.agentdefs.core;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import com.google.gson.JsonObject;
import ch.zhaw.prometheus.application.FireImageSimulator;
import ch.zhaw.prometheus.application.MissionReviewService;
import ch.zhaw.prometheus.model.Storage;
import ch.zhaw.prometheus.model.disaster.*;
import ch.zhaw.prometheus.spi.MissionExecutor;

class FireMissionExecutionUnitTest {
    private final Storage storage = new Storage();
    private JsonObject mission() {
        var input = new JsonObject();
        for (String field : DisasterMission.FIELDS) input.addProperty(field, "declared");
        input.addProperty("missionType", "fire_hotspot_inspection"); input.addProperty("objective", "Find printed fire indicator");
        input.addProperty("location", "R-204"); input.addProperty("searchBoundary", "R-204 interior only");
        input.addProperty("environment", "indoor_flat"); input.addProperty("priority", "low"); input.addProperty("safetyAssessment", "safe");
        var evidence = new JsonObject();
        for (String key : List.of("communications", "safeStandoff", "platformSuitability", "accessClearance", "terrainSuitability"))
            evidence.addProperty(key, "confirmed");
        input.add("platformEvidence", evidence); return DisasterMission.evaluate(input, 1, true);
    }
    private JsonObject start(String variant) {
        var mission = mission();
        return FireMissionExecution.start(storage, mission, 1, MissionReviewService.safetyReference(mission), UUID.randomUUID(), variant, "fixture_supervisor", 1000);
    }
    private JsonObject state() { return FireMissionExecution.current(storage); }
    private JsonObject step() {
        var state = state();
        return FireMissionExecution.feedback(storage, new FireImageSimulator().next(
                new MissionExecutor.Mission(UUID.fromString(state.get("executionId").getAsString()), 1, 1,
                        state.get("safetyReference").getAsString(), storage.get(FireMissionExecution.MISSION).toString()),
                state.get("sequence").getAsInt() + 1, state.get("cursor").getAsInt(), state.get("variant").getAsString()));
    }
    private void decide(String action) {
        var state = state(); FireMissionExecution.decide(storage, UUID.fromString(state.get("executionId").getAsString()), state.get("sequence").getAsInt(), action, "fixture_scope");
    }

    @Test void ordinaryAndObstacleCompleteWithImmutableRevisionAndSeparateHandoff() {
        for (String variant : List.of("ordinary", "obstacle")) {
            FireMissionExecution.clear(storage); start(variant); step(); step(); step();
            if (variant.equals("obstacle")) {
                assertEquals("escalation", state().get("phase").getAsString());
                assertThrows(IllegalArgumentException.class, this::step);
                decide("resume"); step(); step();
            }
            assertEquals("completion_handoff", state().get("phase").getAsString());
            assertEquals("completed", state().getAsJsonObject("result").get("outcome").getAsString());
            assertTrue(state().getAsJsonObject("result").get("evidence").getAsString().startsWith("simulation://"));
            assertEquals(mission(), storage.get(FireMissionExecution.MISSION));
            decide("handoff"); assertEquals("closed", state().get("phase").getAsString());
            storage.toMap().values().forEach(value -> assertTrue(value.toString().length() <= 2048));
        }
    }

    @Test void failureTimeoutAndAbortNeverInventEvidenceOrCompleteAgain() {
        for (String variant : List.of("failure", "timeout", "ordinary")) {
            FireMissionExecution.clear(storage); start(variant); step();
            if (variant.equals("ordinary")) decide("abort"); else { step(); step(); }
            assertEquals("", state().getAsJsonObject("result").get("evidence").getAsString());
            assertThrows(IllegalArgumentException.class, this::step);
            decide("handoff"); assertEquals("closed", state().get("phase").getAsString());
        }
    }

    @Test void duplicatesOutOfOrderForeignIdsAndRepeatedStartCannotDuplicateEffects() {
        var state = start("ordinary");
        assertEquals(state, FireMissionExecution.start(storage, mission(), 1, MissionReviewService.safetyReference(mission()),
                UUID.fromString(state.get("requestId").getAsString()), "ordinary", "fixture_supervisor", 2000));
        var id = UUID.fromString(state.get("executionId").getAsString());
        assertThrows(IllegalArgumentException.class, () -> FireMissionExecution.feedback(storage, new MissionExecutor.Feedback(id, 3, "complete")));
        assertThrows(IllegalArgumentException.class, () -> FireMissionExecution.feedback(storage, new MissionExecutor.Feedback(UUID.randomUUID(), 2, "accepted")));
        var accepted = step();
        assertEquals(accepted, FireMissionExecution.feedback(storage, new MissionExecutor.Feedback(id, 2, "accepted")));
        assertEquals(2, state().get("sequence").getAsInt());
        assertThrows(IllegalArgumentException.class, () -> FireMissionExecution.start(storage, mission(), 1, "different", UUID.randomUUID(), "ordinary", "fixture_supervisor", 2000));
    }

    @Test void changedApprovalAndDeadlineCancelPendingExecutionAndLateFeedbackIsFenced() {
        start("ordinary");
        var stopped = FireMissionExecution.expireOrInvalidate(storage, mission(), 2, MissionReviewService.safetyReference(mission()), 2000);
        assertEquals("cancelled", stopped.getAsJsonObject("result").get("outcome").getAsString());
        assertThrows(IllegalArgumentException.class, this::step);
        FireMissionExecution.clear(storage); start("ordinary");
        var expired = FireMissionExecution.expireOrInvalidate(storage, mission(), 1, MissionReviewService.safetyReference(mission()), 301000);
        assertEquals("timed_out", expired.getAsJsonObject("result").get("outcome").getAsString());
        var unsafe = mission(); unsafe.addProperty("ready", false);
        FireMissionExecution.clear(storage);
        assertThrows(IllegalArgumentException.class, () -> FireMissionExecution.start(storage, unsafe, 1, "ref", UUID.randomUUID(), "ordinary", "fixture_supervisor", 0));
    }
}
