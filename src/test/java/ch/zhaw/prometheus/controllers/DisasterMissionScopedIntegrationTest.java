package ch.zhaw.prometheus.controllers;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.*;
import ch.zhaw.prometheus.agentdefs.core.DisasterMissionConfiguration;
import ch.zhaw.prometheus.application.AccessCodeAdminService;
import ch.zhaw.prometheus.model.disaster.DisasterMission;
import ch.zhaw.prometheus.repositories.AgentRepository;
import fixtures.gptlive.LiveSmokeConfiguration;

/** No enclosing transaction: each scoped request commits; repository reads reload detached graphs. */
@SpringBootTest(properties = "prometheus.runtime.tick.enabled=false")
@AutoConfigureMockMvc
@Import(LiveSmokeConfiguration.class)
class DisasterMissionScopedIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AccessCodeAdminService admin;
    @Autowired AgentRepository agents;
    @Autowired ch.zhaw.prometheus.repositories.AccessCodeRepository accessCodes;
    @org.springframework.beans.factory.annotation.Value("${prometheus.admin.token}") String adminToken;
    private static final String HEADER = ScopedDemoController.ACCESS_CODE_HEADER;

    private String code() {
        String code = UUID.randomUUID().toString().replace("-", "").substring(0, 5);
        var access = admin.createAccessCode(code, true);
        admin.replaceAllowedAgentTypes(access.getId(), List.of(DisasterMissionConfiguration.KEY));
        return code;
    }
    private JsonNode post(String url, String code, Object body) throws Exception {
        return json.readTree(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url)
            .header(HEADER, code).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
            .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString());
    }
    private UUID create(String code) throws Exception {
        return UUID.fromString(post("/demo/agents", code, Map.of("agentDefinitionKey", DisasterMissionConfiguration.KEY)).get("id").asText());
    }
    private JsonNode say(UUID id, String code, String text) throws Exception {
        var response = post("/demo/agents/" + id + "/acknowledge", code,
            Map.of("type", "obs.user_utterance", "actor", "operator", "kind", "observation", "payload", text));
        var plan = json.readTree(response.get("responseEvent").get("payload").asText());
        return json.readTree(plan.get("speech").asText());
    }
    private JsonNode stored(UUID id, String code) throws Exception {
        var entries = json.readTree(mvc.perform(get("/demo/agents/" + id + "/storage").header(HEADER, code))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (var entry : entries) if (entry.get("key").asText().equals(DisasterMission.KEY)) return json.readTree(entry.get("value").asText());
        throw new AssertionError("Missing persisted mission");
    }
    @Test void successCommitsReloadsAndEmitsTheSameMissionWithoutLeakingAccess() throws Exception {
        String code = code(); UUID id = create(code);
        var draft = say(id, code, "Inspect hotspots at North Warehouse; hazards mitigated, drone suitability and flight clearance confirmed.");
        assertEquals("drone", draft.get("selectedEmbodiment").asText()); assertFalse(draft.get("ready").asBoolean());
        assertEquals("satisfied", draft.get("platformSafety").get("status").asText());
        assertEquals(5, draft.get("platformSafety").get("required").size());
        assertEquals(draft, stored(id, code));
        var ready = say(id, code, "approve mission 1");
        assertFalse(ready.get("ready").asBoolean());
        var scopeId = accessCodes.findByCode(code).orElseThrow().getId();
        var credential = json.readTree(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/admin/disaster/supervisors")
                .header(AdminAccessCodeController.ADMIN_TOKEN_HEADER, adminToken).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("scopeId", scopeId, "name", "DM fixture reviewer"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        var review = json.readTree(mvc.perform(get("/demo/agents/" + id + "/mission-review").header(HEADER, code))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        ready = json.readTree(json.readTree(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/demo/agents/" + id + "/mission-review")
                .header(HEADER, code).header(MissionReviewController.SUPERVISOR_HEADER, credential.get("token").asText())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(Map.of("requestId", UUID.randomUUID(), "revision", 1,
                        "reviewVersion", review.get("reviewVersion").asInt(), "safetyReference", review.get("safetyReference").asText(), "decision", "approve"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).get("mission").asText());
        assertTrue(ready.get("ready").asBoolean()); assertEquals(ready, stored(id, code));
        // Reload the full JPA graph, including the custom policy and action, outside a transaction.
        var reloaded = agents.findById(id).orElseThrow();
        assertEquals(ready.toString(), reloaded.getStorage().get(DisasterMission.KEY).toString());
        assertEquals("en", reloaded.getLanguageCode());
        mvc.perform(get("/demo/agents/" + id + "/storage").header(HEADER, code())).andExpect(status().isNotFound());
        var changed = say(id, code, "Move the inspection to South Warehouse");
        assertFalse(changed.get("ready").asBoolean()); assertEquals("unknown", changed.get("safetyAssessment").asText());
        assertEquals("unresolved", changed.get("platformSafety").get("status").asText());
        assertEquals(changed, stored(id, code));
    }
    @Test void missingDetailsRemainIncompleteAfterApprovalAndReload() throws Exception {
        String code = code(); UUID id = create(code);
        var incomplete = say(id, code, "Search for a missing person");
        assertEquals("missing_person_search", incomplete.get("missionType").asText());
        assertTrue(incomplete.get("question").asText().contains("location"));
        assertEquals("unknown", incomplete.get("selectedEmbodiment").asText());
        var result = say(id, code, "approve mission 1");
        assertFalse(result.get("ready").asBoolean()); assertEquals("mission_capture", result.get("phase").asText());
        assertEquals(result, stored(id, code));
    }
    @Test void unsafeMissionCannotBecomeReadyAndResetClearsApproval() throws Exception {
        String code = code(); UUID id = create(code);
        say(id, code, "Enter the burning building without clearance");
        var blocked = say(id, code, "approve mission 1");
        assertFalse(blocked.get("ready").asBoolean()); assertEquals("blocked", blocked.get("phase").asText());
        assertEquals(blocked, stored(id, code));
        mvc.perform(delete("/demo/agents/" + id + "/reset").header(HEADER, code)).andExpect(status().isOk());
        var reset = stored(id, code); assertEquals(0, reset.get("revision").asInt()); assertFalse(reset.get("ready").asBoolean());
    }
}
