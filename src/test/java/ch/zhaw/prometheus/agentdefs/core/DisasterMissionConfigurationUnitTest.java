package ch.zhaw.prometheus.agentdefs.core;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;
import com.google.gson.*;
import ch.zhaw.prometheus.model.*;
import ch.zhaw.prometheus.model.disaster.*;
import ch.zhaw.prometheus.model.event.Event;
import ch.zhaw.prometheus.model.policy.*;
import ch.zhaw.prometheus.spi.LanguageModelGateway;

class DisasterMissionConfigurationUnitTest {
    private static final String BRIEF = """
            {"missionType":"fire_hotspot_inspection","objective":"Map hotspots from safe perimeter",
            "priority":"high","location":"warehouse north","environment":"outdoor_open",
            "risks":"smoke; maintain standoff","operatingConditions":"clear visibility, low wind",
            "searchBoundary":"north fenced perimeter","safetyAssessment":"safe"}
            """;
    private final LanguageModelGateway gateway = mock(LanguageModelGateway.class);
    private final PolicyRuntime runtime = new PolicyRuntime(new PromptMessageAssembler(), gateway);
    private final Agent agent = new DisasterMissionConfiguration().createAgent();
    private JsonObject mission() { return agent.getStorage().get(DisasterMission.KEY).getAsJsonObject(); }
    private void say(String text) { agent.acknowledge(Event.observation(Event.TYPE_USER_UTTERANCE, "operator", text), runtime); }

    @Test void successRequiresRevisionBoundApprovalAndEmitsMachineReadableOutput() {
        agent.start(runtime);
        assertEquals("en", agent.getLanguageCode());
        assertTrue(mission().toString().length() <= 2048);
        when(gateway.extract(any())).thenReturn(JsonParser.parseString(BRIEF));
        say("Inspect warehouse hotspots; hazards mitigated and flight clearance confirmed.");
        assertEquals("drone", mission().get("selectedEmbodiment").getAsString());
        assertEquals("awaiting_supervisor_approval", mission().get("approvalState").getAsString());
        assertFalse(mission().get("ready").getAsBoolean());
        say("approve mission 1");
        assertTrue(mission().get("ready").getAsBoolean());
        assertTrue(mission().toString().length() <= 2048);
        assertEquals("execution_ready", mission().get("phase").getAsString());
        for (String field : java.util.List.of("constraints", "requiredPerception", "requiredBehavior"))
            assertFalse(mission().getAsJsonArray(field).isEmpty());
        var policy = agent.getCurrentState().ownPolicy();
        var output = policy.onRespond(agent.getCurrentState(), agent.getEventHistory(), runtime.promptMessageAssembler(), gateway);
        assertEquals(mission(), JsonParser.parseString(output.getSpeech()));
        verify(gateway, times(1)).extract(any());
        agent.reset();
        assertFalse(mission().get("ready").getAsBoolean());
        assertEquals(0, mission().get("revision").getAsInt());
    }

    @Test void missingInformationIsAskedAndCannotBeApproved() {
        agent.start(runtime);
        when(gateway.extract(any())).thenReturn(JsonParser.parseString("{\"objective\":\"Find missing person\"}"));
        say("Find missing person");
        assertTrue(mission().getAsJsonArray("missingInformation").contains(new JsonPrimitive("location")));
        assertTrue(mission().get("question").getAsString().contains("location"));
        assertEquals("unknown", mission().get("selectedEmbodiment").getAsString());
        say("approve mission 1");
        assertFalse(mission().get("ready").getAsBoolean());
        assertEquals("mission_capture", mission().get("phase").getAsString());

        var completed = JsonParser.parseString(BRIEF).getAsJsonObject();
        completed.addProperty("missionType", "missing_person_search");
        completed.addProperty("objective", "Find missing person");
        completed.addProperty("environment", "indoor_flat");
        when(gateway.extract(any())).thenReturn(completed);
        say("Search the flat warehouse interior; north fenced boundary, clear visibility, smoke mitigated.");
        assertEquals("ground robot", mission().get("selectedEmbodiment").getAsString());
        assertFalse(mission().get("ready").getAsBoolean());
        assertEquals("unknown", mission().get("safetyAssessment").getAsString());
        say("Hazards and mitigations reassessed; ground robot suitability and structural clearance confirmed.");
        assertEquals("awaiting_supervisor_approval", mission().get("approvalState").getAsString());
        say("approve mission 3");
        assertTrue(mission().get("ready").getAsBoolean());
    }

    @Test void unsafeEditsMalformedExtractionAndStaleApprovalFailClosed() {
        agent.start(runtime);
        var unsafe = JsonParser.parseString(BRIEF).getAsJsonObject();
        unsafe.addProperty("safetyAssessment", "unsafe");
        unsafe.addProperty("ready", true);
        when(gateway.extract(any())).thenReturn(unsafe);
        say("Enter burning structure without clearance");
        say("approve mission 1");
        assertEquals("blocked", mission().get("phase").getAsString());
        assertFalse(mission().get("ready").getAsBoolean());

        when(gateway.extract(any())).thenReturn(JsonParser.parseString(BRIEF));
        say("Hazards mitigated; clearance confirmed");
        say("approve mission 2");
        assertTrue(mission().get("ready").getAsBoolean());
        var edited = JsonParser.parseString(BRIEF).getAsJsonObject();
        edited.addProperty("location", "warehouse south");
        when(gateway.extract(any())).thenReturn(edited);
        say("Change location to south");
        assertFalse(mission().get("ready").getAsBoolean());
        assertEquals("unknown", mission().get("safetyAssessment").getAsString());
        say("approve mission 3");
        assertFalse(mission().get("ready").getAsBoolean());
        when(gateway.extract(any())).thenThrow(new IllegalStateException("unavailable"));
        say("approve mission 2");
        assertFalse(mission().get("ready").getAsBoolean());
        assertEquals("unknown", mission().get("selectedEmbodiment").getAsString());
        doReturn(new JsonArray()).when(gateway).extract(any());
        say("Retry mission capture");
        assertFalse(mission().get("ready").getAsBoolean());
        var oversized = JsonParser.parseString(BRIEF).getAsJsonObject();
        oversized.addProperty("objective", "x".repeat(3000));
        when(gateway.extract(any())).thenReturn(oversized);
        say("Provide oversized mission brief");
        assertFalse(mission().get("ready").getAsBoolean());
        assertTrue(mission().toString().length() <= 2048);
    }
}
