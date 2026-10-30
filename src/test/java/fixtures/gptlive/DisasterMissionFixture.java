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
        if (input.contains("Search for a missing person")) return JsonParser.parseString("""
                {"missionType":"missing_person_search","objective":"Find the missing person","priority":"high"}
                """);
        var mission = JsonParser.parseString("""
                {"missionType":"fire_hotspot_inspection","objective":"Map hotspots from the safe perimeter",
                "priority":"high","location":"North Warehouse","environment":"outdoor_open",
                "risks":"smoke; maintain standoff","operatingConditions":"clear visibility, low wind",
                "searchBoundary":"fenced north perimeter","safetyAssessment":"safe"}
                """).getAsJsonObject();
        if (input.contains("Enter the burning building")) mission.addProperty("safetyAssessment", "unsafe");
        else if (input.contains("Move the inspection to South Warehouse")) mission.addProperty("location", "South Warehouse");
        else if (!input.contains("Inspect hotspots at North Warehouse")) throw new IllegalArgumentException("Unscripted disaster fixture turn");
        return mission;
    }
}
