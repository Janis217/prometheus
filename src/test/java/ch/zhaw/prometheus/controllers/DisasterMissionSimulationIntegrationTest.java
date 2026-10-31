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
import ch.zhaw.prometheus.model.disaster.DisasterMissionSimulation;
import ch.zhaw.prometheus.repositories.AgentRepository;
import fixtures.gptlive.LiveSmokeConfiguration;

/** Real scoped transactions and detached JPA reload; execution is only a command-driven fixture. */
@SpringBootTest(properties = "prometheus.runtime.tick.enabled=false")
@AutoConfigureMockMvc
@Import(LiveSmokeConfiguration.class)
class DisasterMissionSimulationIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AccessCodeAdminService admin;
    @Autowired AgentRepository agents;
    private static final String HEADER = ScopedDemoController.ACCESS_CODE_HEADER;

    private String code() {
        String code = UUID.randomUUID().toString().substring(0, 5);
        var access = admin.createAccessCode(code, true);
        admin.replaceAllowedAgentTypes(access.getId(), List.of(DisasterMissionConfiguration.KEY));
        return code;
    }
    private JsonNode post(String path, String code, Object body) throws Exception {
        return json.readTree(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(path)
            .header(HEADER, code).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body)))
            .andExpect(status().is2xxSuccessful()).andReturn().getResponse().getContentAsString());
    }
    private String create(String code) throws Exception {
        return post("/demo/agents", code, Map.of("agentDefinitionKey", DisasterMissionConfiguration.KEY)).get("id").asText();
    }
    private JsonNode say(String id, String code, String input) throws Exception {
        var response = post("/demo/agents/" + id + "/acknowledge", code,
                Map.of("type", "obs.user_utterance", "actor", "operator", "kind", "observation", "payload", input));
        var state = json.readTree(json.readTree(response.get("responseEvent").get("payload").asText()).get("speech").asText());
        var storage = agents.findById(UUID.fromString(id)).orElseThrow().getStorage();
        assertEquals(state.toString(), storage.get(DisasterMissionSimulation.KEY).toString());
        storage.values().forEach(value -> assertTrue(value.toString().length() <= 2048));
        return state;
    }
    private JsonNode command(String id, String code, JsonNode state, String action) throws Exception {
        return say(id, code, "simulate fire " + action + " " + state.get("runId").asText() + " " + state.get("revision").asInt());
    }

    @Test void ordinaryAndObstacleJourneysCommitTimelineAndOwnershipAcknowledgement() throws Exception {
        for (boolean obstacle : List.of(false, true)) {
            String code = code(), id = create(code);
            var state = say(id, code, "simulate fire begin");
            for (String action : List.of("configure", "confirm", "start", "progress")) state = command(id, code, state, action);
            if (obstacle) {
                state = command(id, code, state, "obstacle");
                assertEquals("escalation", state.get("phase").asText());
                state = command(id, code, state, "complete");
                assertTrue(state.has("lastRejection"));
                state = command(id, code, state, "resume");
                state = command(id, code, state, "progress");
            }
            state = command(id, code, state, "complete");
            assertTrue(state.get("result").get("responsibility").asText().startsWith("pending"));
            state = command(id, code, state, "handoff");
            assertEquals("closed", state.get("phase").asText());
            assertFalse(state.get("operationalReady").asBoolean());
            var storage = agents.findById(UUID.fromString(id)).orElseThrow().getStorage();
            for (int sequence = 1; sequence <= state.get("sequence").asInt(); sequence++)
                assertTrue(storage.containsKey(DisasterMissionSimulation.KEY + ".event." + sequence));
            mvc.perform(get("/demo/agents/" + id + "/storage").header(HEADER, code())).andExpect(status().isNotFound());
        }
    }

    @Test void staleCommandAndLostLinkStayBlockedAndResetRemovesOnlyRehearsal() throws Exception {
        String code = code(), id = create(code);
        var state = say(id, code, "simulate fire begin");
        state = command(id, code, state, "configure");
        var rejected = say(id, code, "simulate fire confirm " + state.get("runId").asText() + " 0");
        assertEquals("approval", rejected.get("phase").asText());
        for (String action : List.of("confirm", "start", "connection_loss", "resume")) state = command(id, code, state, action);
        assertEquals("escalation", state.get("phase").asText());
        for (String action : List.of("abort", "handoff")) state = command(id, code, state, action);
        assertEquals("aborted", state.get("result").get("outcome").asText());
        assertEquals("", state.get("result").get("evidence").asText());
        mvc.perform(delete("/demo/agents/" + id + "/reset").header(HEADER, code)).andExpect(status().isOk());
        assertTrue(agents.findById(UUID.fromString(id)).orElseThrow().getStorage().keySet().stream()
                .noneMatch(key -> key.startsWith(DisasterMissionSimulation.KEY)));
    }
}
