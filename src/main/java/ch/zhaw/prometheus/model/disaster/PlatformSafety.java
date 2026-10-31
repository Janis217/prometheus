package ch.zhaw.prometheus.model.disaster;

import java.util.ArrayList;
import java.util.List;
import com.google.gson.JsonObject;
import ch.zhaw.prometheus.model.Storage;

/** Declarative demo requirements, not physical measurements or safety certification. */
public final class PlatformSafety {
    private PlatformSafety() {}

    public static JsonObject declarations(JsonObject input) {
        if (input.has("platformEvidence") && input.get("platformEvidence").isJsonObject())
            return input.getAsJsonObject("platformEvidence").deepCopy();
        if (input.has("platformSafety") && input.get("platformSafety").isJsonObject()) {
            var safety = input.getAsJsonObject("platformSafety");
            if (safety.has("declarations") && safety.get("declarations").isJsonObject())
                return safety.getAsJsonObject("declarations").deepCopy();
        }
        return new JsonObject();
    }

    public static JsonObject evaluate(JsonObject input, String embodiment) {
        var required = new ArrayList<>(List.of("communications", "safeStandoff", "platformSuitability"));
        required.addAll(switch (embodiment) {
            case "drone" -> List.of("flightClearance", "weatherEnvelope");
            case "ground robot" -> List.of("accessClearance", "terrainSuitability");
            case "dog robot" -> List.of("structuralClearance", "terrainSuitability");
            default -> List.of("supportedEmbodiment");
        });
        var supplied = declarations(input);
        var normalized = new JsonObject();
        var unresolved = new JsonObject();
        boolean failed = false;
        for (String key : required) {
            String value = DisasterMission.text(supplied, key);
            if (!List.of("confirmed", "failed").contains(value) || key.equals("supportedEmbodiment")) value = "unknown";
            normalized.addProperty(key, value);
            if (!value.equals("confirmed")) unresolved.addProperty(key, value.equals("failed") ? "failed" : "missing_or_unknown");
            failed |= value.equals("failed");
        }
        var result = new JsonObject();
        result.addProperty("source", "operator_declaration_not_sensor_proof");
        result.add("required", Storage.toJsonElement(required));
        result.add("declarations", normalized);
        result.add("unresolved", unresolved);
        result.addProperty("status", failed ? "failed" : unresolved.isEmpty() ? "satisfied" : "unresolved");
        return result;
    }

    public static void invalidate(JsonObject draft) {
        var declarations = declarations(draft);
        declarations.entrySet().forEach(entry -> {
            if (!DisasterMission.text(declarations, entry.getKey()).equals("failed")) entry.setValue(new com.google.gson.JsonPrimitive("unknown"));
        });
        draft.remove("platformSafety");
        draft.add("platformEvidence", declarations);
    }
}
