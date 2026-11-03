package ch.zhaw.prometheus.controllers;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ch.zhaw.prometheus.agentdefs.core.DisasterMissionConfiguration;
import ch.zhaw.prometheus.application.AccessCodeAdminService;
import ch.zhaw.prometheus.application.MissionReviewService;
import ch.zhaw.prometheus.model.disaster.FireMissionExecution;
import ch.zhaw.prometheus.repositories.AgentRepository;
import fixtures.gptlive.LiveSmokeConfiguration;

@SpringBootTest(properties = "prometheus.runtime.tick.enabled=false")
@AutoConfigureMockMvc @Import(LiveSmokeConfiguration.class)
class MissionExecutionIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AccessCodeAdminService admin;
    @Autowired MissionReviewService reviews;
    @Autowired AgentRepository agents;
    private static final String CODE = ScopedDemoController.ACCESS_CODE_HEADER;
    private static final String TOKEN = MissionReviewController.SUPERVISOR_HEADER;
    record Setup(UUID id, String code, String token) {}
    private JsonNode post(String path, Setup setup, Object body, int expected) throws Exception {
        var result = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path)
                .header(CODE, setup.code()).header(TOKEN, setup.token()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return result.isBlank() || expected >= 400 ? null : json.readTree(result);
    }
    private JsonNode get(String suffix, Setup setup) throws Exception {
        return json.readTree(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/demo/agents/" + setup.id() + suffix)
                .header(CODE, setup.code())).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    private void say(Setup setup, String text) throws Exception {
        post("/demo/agents/" + setup.id() + "/acknowledge", setup,
                Map.of("type", "obs.user_utterance", "actor", "operator", "kind", "observation", "payload", text), 200);
    }
    private Setup setup(String brief, boolean approve) throws Exception {
        String code = UUID.randomUUID().toString().substring(0, 5);
        var access = admin.createAccessCode(code, true);
        admin.replaceAllowedAgentTypes(access.getId(), List.of(DisasterMissionConfiguration.KEY));
        var credential = reviews.provision(new MissionReviewService.Provision(access.getId(), "Executor test supervisor"));
        var stub = new Setup(null, code, credential.token());
        var created = post("/demo/agents", stub, Map.of("agentDefinitionKey", DisasterMissionConfiguration.KEY), 201);
        var setup = new Setup(UUID.fromString(created.get("id").asText()), code, credential.token());
        say(setup, brief);
        if (approve) {
            var review = get("/mission-review", setup);
            post("/demo/agents/" + setup.id() + "/mission-review", setup, decision(review, "approve"), 200);
        }
        return setup;
    }
    private Map<String, Object> decision(JsonNode review, String value) throws Exception {
        return Map.of("requestId", UUID.randomUUID(), "revision", json.readTree(review.get("mission").asText()).get("revision").asInt(),
                "reviewVersion", review.get("reviewVersion").asInt(), "safetyReference", review.get("safetyReference").asText(), "decision", value);
    }
    private Map<String, Object> startBody(Setup setup, String variant) throws Exception {
        var review = get("/mission-review", setup);
        return Map.of("requestId", UUID.randomUUID(), "revision", json.readTree(review.get("mission").asText()).get("revision").asInt(),
                "reviewVersion", review.get("reviewVersion").asInt(), "safetyReference", review.get("safetyReference").asText(), "variant", variant);
    }
    private JsonNode update(Setup setup, JsonNode state, String action, int expected) throws Exception {
        return post("/demo/agents/" + setup.id() + "/mission-execution/updates", setup,
                Map.of("executionId", state.get("executionId").asText(), "expectedSequence", state.get("sequence").asInt(), "action", action), expected);
    }

    @Test void structuredConfigurationIsScopedVersionedAndNeverGrantsApproval() throws Exception {
        var setup = setup("Configure printed-indicator mission", true);
        var original = get("/mission-review", setup);
        int revision = json.readTree(original.get("mission").asText()).get("revision").asInt();
        var fields = new java.util.HashMap<String,String>(Map.of("missionType", "fire_hotspot_inspection", "objective", "Find printed fire indicator",
                "priority", "low", "location", "R-204", "environment", "indoor_flat", "risks", "printed image only; no actual fire",
                "operatingConditions", "clear room; stop on hazard or lost link", "searchBoundary", "R-204 interior only", "safetyAssessment", "safe"));
        var evidence = Map.of("communications", "confirmed", "safeStandoff", "confirmed", "platformSuitability", "confirmed",
                "accessClearance", "confirmed", "terrainSuitability", "confirmed");
        String path = "/demo/agents/" + setup.id() + "/mission-configuration";
        var body = Map.of("expectedRevision", revision, "fields", fields, "platformEvidence", evidence, "robot", "ground robot");
        mvc.perform(put(path).header(CODE, "WRONG").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isUnauthorized());
        mvc.perform(put(path).header(CODE, setup.code()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(
                Map.of("expectedRevision", revision, "fields", fields, "platformEvidence", evidence, "robot", "drone"))))
                .andExpect(status().isBadRequest());
        assertEquals(original, get("/mission-review", setup));
        mvc.perform(put(path).header(CODE, setup.code()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isOk());
        var saved = get("/mission-review", setup); var mission = json.readTree(saved.get("mission").asText());
        assertEquals(revision + 1, mission.get("revision").asInt()); assertFalse(mission.get("ready").asBoolean());
        assertEquals("awaiting_supervisor_approval", mission.get("approvalState").asText());
        assertEquals(original.get("reviewVersion"), saved.get("reviewVersion"));
        mvc.perform(put(path).header(CODE, setup.code()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
                .andExpect(status().isConflict());
        post("/demo/agents/" + setup.id() + "/mission-review", setup, decision(original, "approve"), 409);
        post("/demo/agents/" + setup.id() + "/mission-review", setup, decision(saved, "approve"), 200);
        assertTrue(json.readTree(get("/mission-review", setup).get("mission").asText()).get("ready").asBoolean());
        fields.put("safetyAssessment", "unknown");
        mvc.perform(put(path).header(CODE, setup.code()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(
                Map.of("expectedRevision", revision + 1, "fields", fields, "platformEvidence", Map.of(), "robot", "ground robot"))))
                .andExpect(status().isOk());
        post("/demo/agents/" + setup.id() + "/mission-review", setup, decision(get("/mission-review", setup), "approve"), 409);
    }

    @Test void allSimulatorVariantsCommitApprovedSnapshotFeedbackAndHandoff() throws Exception {
        for (String variant : List.of("ordinary", "obstacle", "failure", "timeout", "abort")) {
            var setup = setup("Configure printed-indicator mission", true);
            var body = startBody(setup, variant.equals("abort") ? "ordinary" : variant);
            String path = "/demo/agents/" + setup.id() + "/mission-execution";
            var state = post(path, setup, body, 200);
            assertEquals(state, post(path, setup, body, 200));
            state = update(setup, state, "step", 200);
            if (variant.equals("abort")) state = update(setup, state, "abort", 200);
            else {
                state = update(setup, state, "step", 200); state = update(setup, state, "step", 200);
                if (variant.equals("obstacle")) {
                    assertEquals("escalation", state.get("phase").asText());
                    state = update(setup, state, "resume", 200);
                    state = update(setup, state, "step", 200); state = update(setup, state, "step", 200);
                }
            }
            assertEquals("completion_handoff", state.get("phase").asText());
            state = update(setup, state, "handoff", 200);
            assertEquals("closed", state.get("phase").asText()); assertTrue(state.get("simulation").asBoolean());
            assertTrue(state.get("result").has("responsibilityScopeId"));
            assertFalse(state.get("operationalReady").asBoolean());
            if (!List.of("ordinary", "obstacle").contains(variant)) assertEquals("", state.get("result").get("evidence").asText());
            assertEquals(state, get("/mission-execution", setup));
            var storage = agents.findById(setup.id()).orElseThrow().getStorage();
            assertEquals(state.toString(), storage.get(FireMissionExecution.KEY).toString());
            assertEquals("R-204", storage.get(FireMissionExecution.MISSION).getAsJsonObject().get("location").getAsString());
            assertEquals(state.get("sequence").asInt(), storage.keySet().stream().filter(key -> key.startsWith(FireMissionExecution.EVENT)).count());
            storage.values().forEach(value -> assertTrue(value.toString().length() <= 2048));
        }
    }

    @Test void missingAuthorityUnsupportedMissionAndStaleFeedbackCannotStartOrAdvance() throws Exception {
        var incomplete = setup("Configure printed-indicator mission", false);
        post("/demo/agents/" + incomplete.id() + "/mission-execution", incomplete, startBody(incomplete, "ordinary"), 409);
        var unsupported = setup("Inspect hotspots at North Warehouse", true);
        post("/demo/agents/" + unsupported.id() + "/mission-execution", unsupported, startBody(unsupported, "ordinary"), 409);
        var setup = setup("Configure printed-indicator mission", true); var body = startBody(setup, "ordinary");
        String path = "/demo/agents/" + setup.id() + "/mission-execution";
        post(path, new Setup(setup.id(), setup.code(), ""), body, 401);
        var state = post(path, setup, body, 200); var old = state;
        state = update(setup, state, "step", 200); update(setup, old, "step", 409);
        assertEquals(state, get("/mission-execution", setup));
        post(path + "/updates", setup, Map.of("executionId", UUID.randomUUID(), "expectedSequence", state.get("sequence").asInt(), "action", "step"), 409);
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get(path).header(CODE, "WRONG")).andExpect(status().isUnauthorized());
    }

    @Test void changedOrRevokedApprovalCancelsAndImmutableSnapshotSurvivesUntilReset() throws Exception {
        for (boolean edit : List.of(true, false)) {
            var setup = setup("Configure printed-indicator mission", true);
            var state = post("/demo/agents/" + setup.id() + "/mission-execution", setup, startBody(setup, "ordinary"), 200);
            if (edit) say(setup, "Move the inspection to South Warehouse");
            else post("/demo/agents/" + setup.id() + "/mission-review", setup, decision(get("/mission-review", setup), "revoke"), 200);
            state = update(setup, state, "step", 200);
            assertEquals("cancelled", state.get("result").get("outcome").asText());
            assertEquals("", state.get("result").get("evidence").asText());
            assertEquals("R-204", agents.findById(setup.id()).orElseThrow().getStorage().get(FireMissionExecution.MISSION).getAsJsonObject().get("location").getAsString());
            update(setup, state, "step", 409);
            mvc.perform(delete("/demo/agents/" + setup.id() + "/reset").header(CODE, setup.code())).andExpect(status().isOk());
            assertFalse(agents.findById(setup.id()).orElseThrow().getStorage().containsKey(FireMissionExecution.KEY));
            update(setup, state, "step", 404);
        }
    }
}
