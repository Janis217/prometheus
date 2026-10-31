package fixtures.gptlive;

import java.util.List;
import com.google.gson.*;
import ch.zhaw.prometheus.model.policy.PromptMessage;

/** Deterministic extraction fixtures, not a language-understanding implementation. Test classpath only. */
public final class DisasterMissionFixture {
    private DisasterMissionFixture() {}
    public static JsonElement extract(List<PromptMessage> messages) {
        if (messages.stream().noneMatch(message -> message.getContent().contains("Extract a disaster inspection mission")))
            return new JsonObject();
        String input = messages.stream().map(PromptMessage::getContent)
            .filter(content -> content.startsWith("<eventhistory>")).findFirst().orElse("");
        if (input.contains("Start printed-indicator mission in R-204")) return JsonParser.parseString("""
                {"missionType":"fire_hotspot_inspection","objective":"Find printed fire indicator","location":"R-204","priority":"low"}
                """);
        if (input.contains("Configure printed-indicator mission") || input.contains("Confirm R-204 platform declarations")
                || input.contains("Reassess R-204 safety")) return JsonParser.parseString("""
                {"missionType":"fire_hotspot_inspection","objective":"Find printed fire indicator",
                "priority":"low","location":"R-204","environment":"indoor_flat",
                "risks":"printed image only; no actual fire","operatingConditions":"clear room; stop on hazard or lost link",
                "searchBoundary":"R-204 interior only","safetyAssessment":"safe",
                "platformEvidence":{"communications":"confirmed","safeStandoff":"confirmed",
                "platformSuitability":"confirmed","accessClearance":"confirmed","terrainSuitability":"confirmed"}}
                """);
        if (input.contains("Search for a missing person")) return JsonParser.parseString("""
                {"missionType":"missing_person_search","objective":"Find the missing person","priority":"high"}
                """);
        var mission = JsonParser.parseString("""
                {"missionType":"fire_hotspot_inspection","objective":"Map hotspots from the safe perimeter",
                "priority":"high","location":"North Warehouse","environment":"outdoor_open",
                "risks":"smoke; maintain standoff","operatingConditions":"clear visibility, low wind",
                "searchBoundary":"fenced north perimeter","safetyAssessment":"safe",
                "platformEvidence":{"communications":"confirmed","safeStandoff":"confirmed",
                "platformSuitability":"confirmed","flightClearance":"confirmed","weatherEnvelope":"confirmed"}}
                """).getAsJsonObject();
        if (input.contains("Enter the burning building")) mission.addProperty("safetyAssessment", "unsafe");
        else if (input.contains("Move the inspection to South Warehouse")) mission.addProperty("location", "South Warehouse");
        else if (!input.contains("Inspect hotspots at North Warehouse")) throw new IllegalArgumentException("Unscripted disaster fixture turn");
        return mission;
    }
}
