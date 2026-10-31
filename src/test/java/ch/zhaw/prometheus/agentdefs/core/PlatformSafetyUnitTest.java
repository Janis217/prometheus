package ch.zhaw.prometheus.agentdefs.core;

import static org.junit.jupiter.api.Assertions.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.google.gson.JsonObject;
import ch.zhaw.prometheus.model.Storage;
import ch.zhaw.prometheus.model.disaster.DisasterMission;
import ch.zhaw.prometheus.model.disaster.PlatformSafety;

class PlatformSafetyUnitTest {
    private JsonObject brief(String environment) {
        var input = new JsonObject();
        for (String field : DisasterMission.FIELDS) input.addProperty(field, "declared");
        input.addProperty("missionType", "fire_hotspot_inspection");
        input.addProperty("priority", "high");
        input.addProperty("environment", environment);
        input.addProperty("safetyAssessment", "safe");
        return input;
    }
    private void confirm(JsonObject input) {
        var evaluated = DisasterMission.evaluate(input, 1, false);
        var evidence = new JsonObject();
        for (var requirement : evaluated.getAsJsonObject("platformSafety").getAsJsonArray("required"))
            evidence.addProperty(requirement.getAsString(), "confirmed");
        input.add("platformEvidence", evidence);
    }

    @Test void everySupportedPlatformNeedsAllItsOwnRequirementsAndRoundTrips() {
        for (String environment : List.of("outdoor_open", "indoor_flat", "indoor_rubble")) {
            var input = brief(environment); confirm(input);
            var mission = DisasterMission.evaluate(input, 1, true);
            assertTrue(mission.get("ready").getAsBoolean(), mission.toString());
            var safety = mission.getAsJsonObject("platformSafety");
            assertEquals(5, safety.getAsJsonArray("required").size());
            assertEquals("satisfied", safety.get("status").getAsString());
            assertTrue(safety.getAsJsonObject("unresolved").isEmpty());
            assertTrue(mission.toString().length() <= 2048);
            assertEquals(mission, DisasterMission.evaluate(mission, 1, true));
        }
    }

    @Test void missingFailedMalformedAndUnknownDeclarationsCannotBeOverriddenByApproval() {
        var input = brief("outdoor_open"); confirm(input);
        var evidence = input.getAsJsonObject("platformEvidence");
        for (var requirement : List.copyOf(evidence.keySet())) {
            for (String value : List.of("unknown", "failed", "confirmed and failed", "true", "")) {
                var invalid = input.deepCopy();
                invalid.getAsJsonObject("platformEvidence").addProperty(requirement, value);
                var mission = DisasterMission.evaluate(invalid, 2, true);
                assertFalse(mission.get("ready").getAsBoolean());
                assertTrue(mission.getAsJsonObject("platformSafety").getAsJsonObject("unresolved").has(requirement));
                if (value.equals("failed")) assertEquals("blocked", mission.get("phase").getAsString());
            }
        }
        evidence.addProperty("flightClearance", true);
        assertFalse(DisasterMission.evaluate(input, 2, true).get("ready").getAsBoolean());
        input.addProperty("environment", "unknown"); confirm(input);
        assertFalse(DisasterMission.evaluate(input, 2, true).get("ready").getAsBoolean());
    }

    @Test void legacyReadyFlagAndChangedConfigurationNeverSupplySafetyEvidence() {
        var legacy = brief("outdoor_open");
        legacy.addProperty("ready", true); legacy.addProperty("schemaVersion", 1); legacy.addProperty("revision", 4);
        var storage = new Storage(); storage.put(DisasterMission.KEY, legacy);
        assertFalse(DisasterMission.current(storage).get("ready").getAsBoolean());
        assertEquals("unresolved", DisasterMission.current(storage).getAsJsonObject("platformSafety").get("status").getAsString());
        confirm(legacy); PlatformSafety.invalidate(legacy);
        assertFalse(DisasterMission.evaluate(legacy, 5, true).get("ready").getAsBoolean());
    }
}
