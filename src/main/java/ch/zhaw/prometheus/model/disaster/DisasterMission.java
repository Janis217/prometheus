package ch.zhaw.prometheus.model.disaster;

import java.util.List;
import com.google.gson.*;
import ch.zhaw.prometheus.model.Storage;

/** Conservative demo planner. Safety declarations are operator supplied, not sensor evidence. */
public final class DisasterMission {
    public static final String KEY = "disaster_mission";
    public static final List<String> FIELDS = List.of("missionType", "objective", "priority", "location",
            "environment", "risks", "operatingConditions", "searchBoundary", "safetyAssessment");
    private DisasterMission() {}

    public static String text(JsonObject object, String key) {
        var value = object.get(key);
        return value != null && value.isJsonPrimitive() && value.getAsJsonPrimitive().isString()
                ? value.getAsString().strip() : "";
    }

    public static JsonObject current(Storage storage) {
        var stored = storage.get(KEY).getAsJsonObject().deepCopy();
        if (stored.has("schemaVersion") && stored.get("schemaVersion").getAsInt() >= 2
                && !"operator_confirmed".equals(text(stored, "approvalState"))) return stored;
        var result = evaluate(stored, stored.has("revision") ? stored.get("revision").getAsInt() : 0,
                "supervisor_approved".equals(text(stored, "approvalState")));
        if (List.of("supervisor_rejected", "supervisor_revoked").contains(text(stored, "approvalState")))
            result.addProperty("approvalState", text(stored, "approvalState"));
        return result;
    }

    public static void reset(Storage storage) { storage.put(KEY, evaluate(new JsonObject(), 0, false)); }

    public static JsonObject evaluate(JsonObject input, int revision, boolean approved) {
        var result = new JsonObject();
        var missing = new JsonArray();
        for (String field : FIELDS) {
            String value = text(input, field);
            result.addProperty(field, value);
            if (value.isBlank() || List.of("unknown", "unspecified").contains(value.toLowerCase(java.util.Locale.ROOT)))
                missing.add(field);
        }
        String type = text(result, "missionType"), environment = text(result, "environment");
        if (!List.of("fire_hotspot_inspection", "missing_person_search", "rubble_assessment").contains(type))
            addMissing(missing, "missionType");
        if (!List.of("low", "medium", "high", "critical").contains(text(result, "priority")))
            addMissing(missing, "priority");
        if (!List.of("outdoor_open", "indoor_flat", "indoor_rubble").contains(environment))
            addMissing(missing, "environment");
        String safety = text(result, "safetyAssessment");
        if (!List.of("safe", "unsafe").contains(safety)) addMissing(missing, "safetyAssessment");
        String embodiment = switch (environment) {
            case "outdoor_open" -> "drone";
            case "indoor_flat" -> "ground robot";
            case "indoor_rubble" -> "dog robot";
            default -> "unknown";
        };
        result.addProperty("selectedEmbodiment", embodiment);
        result.addProperty("embodimentReason", switch (embodiment) {
            case "drone" -> "Open outdoor area supports remote aerial inspection, subject to flight clearance.";
            case "ground robot" -> "Flat indoor access supports a wheeled inspection platform.";
            case "dog robot" -> "Uneven indoor rubble suggests a legged inspection platform, subject to structural clearance.";
            default -> "Clarify environment and access before selecting a platform.";
        });
        result.add("constraints", Storage.toJsonElement(List.of("Stay within boundary; no contact rescue or hazardous entry",
                "Stop on lost link, new hazards or changed conditions", "Supervisor review required")));
        result.add("requiredPerception", Storage.toJsonElement(text(result, "objective").contains("printed fire indicator")
                ? List.of("visual indicator detection", "visual obstacle detection") : type.equals("fire_hotspot_inspection")
                ? List.of("thermal imaging", "visual obstacle detection", "smoke monitoring")
                : List.of("visual obstacle detection", "terrain mapping", "person detection")));
        result.add("requiredBehavior", Storage.toJsonElement(List.of("perimeter survey", "map hazards", "report findings to supervisor")));
        var platform = PlatformSafety.evaluate(input, embodiment);
        result.add("platformSafety", platform);
        boolean platformSatisfied = "satisfied".equals(text(platform, "status"));
        boolean unsafe = safety.equals("unsafe") || "failed".equals(text(platform, "status"));
        if (!platformSatisfied) addMissing(missing, "platformSafety");
        boolean ready = !unsafe && missing.isEmpty() && approved;
        String phase = unsafe ? "blocked" : !missing.isEmpty() ? "mission_capture"
                : approved ? "execution_ready" : "safety_and_approval";
        result.addProperty("schemaVersion", 2);
        result.addProperty("revision", revision);
        result.addProperty("phase", phase);
        result.addProperty("ready", ready);
        result.addProperty("approvalState", unsafe ? "blocked" : !missing.isEmpty() ? "not_requested"
                : approved ? "supervisor_approved" : "awaiting_supervisor_approval");
        result.add("missingInformation", missing);
        result.addProperty("question", unsafe ? "Which hazards and protective measures must be clarified before reassessment?"
                : !missing.isEmpty() ? "Please provide or clarify: " + missing
                : approved ? "Configuration confirmed; no robot execution triggered."
                : "Please obtain authenticated supervisor review for revision " + revision);
        result.addProperty("firstAction", ready ? "Survey perimeter from the approved safe standoff; report before any entry"
                : "Hold position; clarify missing information and obtain approval");
        // Existing StorageEntry uses VARCHAR(2048); reject oversized briefs rather than truncate safety facts.
        if (result.toString().length() > 2048 && !input.entrySet().isEmpty()) {
            var compact = evaluate(new JsonObject(), revision, false);
            compact.addProperty("question", "Please shorten the mission details and resubmit the complete brief (storage limit: 2048 characters).");
            return compact;
        }
        return result;
    }

    private static void addMissing(JsonArray missing, String field) {
        if (!missing.contains(new JsonPrimitive(field))) missing.add(field);
    }
}
