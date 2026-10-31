package ch.zhaw.prometheus.controllers;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ch.zhaw.prometheus.agentdefs.core.DisasterMissionConfiguration;
import ch.zhaw.prometheus.application.AccessCodeAdminService;
import ch.zhaw.prometheus.application.MissionReviewService;
import ch.zhaw.prometheus.repositories.AgentRepository;
import fixtures.gptlive.LiveSmokeConfiguration;

/** Separate committed requests, real MySQL, no enclosing test transaction. */
@SpringBootTest(properties = "prometheus.runtime.tick.enabled=false")
@AutoConfigureMockMvc @Import(LiveSmokeConfiguration.class)
class MissionReviewIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired AccessCodeAdminService admin;
    @Autowired AgentRepository agents;
    @Value("${prometheus.admin.token}") String adminToken;
    private static final String CODE = ScopedDemoController.ACCESS_CODE_HEADER;
    private static final String TOKEN = MissionReviewController.SUPERVISOR_HEADER;
    record Scope(String code, UUID id) {}
    private Scope scope() {
        String code = UUID.randomUUID().toString().substring(0, 5);
        var value = admin.createAccessCode(code, true);
        admin.replaceAllowedAgentTypes(value.getId(), List.of(DisasterMissionConfiguration.KEY));
        return new Scope(code, value.getId());
    }
    private JsonNode provision(Scope scope) throws Exception {
        return json.readTree(mvc.perform(post("/admin/disaster/supervisors")
                .header(AdminAccessCodeController.ADMIN_TOKEN_HEADER, adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(Map.of("scopeId", scope.id(), "name", "Synthetic reviewer"))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
    }
    private UUID create(Scope scope) throws Exception {
        return UUID.fromString(json.readTree(mvc.perform(post("/demo/agents").header(CODE, scope.code())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(Map.of("agentDefinitionKey", DisasterMissionConfiguration.KEY))))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asText());
    }
    private void say(UUID id, Scope scope, String text) throws Exception {
        mvc.perform(post("/demo/agents/" + id + "/acknowledge").header(CODE, scope.code()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("type", "obs.user_utterance", "actor", "operator", "kind", "observation", "payload", text))))
                .andExpect(status().isOk());
    }
    private JsonNode read(UUID id, Scope scope) throws Exception {
        return json.readTree(mvc.perform(get("/demo/agents/" + id + "/mission-review").header(CODE, scope.code()))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    private Map<String, Object> decision(JsonNode snapshot, String value) throws Exception {
        return Map.of("requestId", UUID.randomUUID(), "revision", json.readTree(snapshot.get("mission").asText()).get("revision").asInt(),
                "reviewVersion", snapshot.get("reviewVersion").asInt(), "safetyReference", snapshot.get("safetyReference").asText(), "decision", value);
    }
    private MvcResult decide(UUID id, Scope scope, String token, Map<String, Object> body, int statusCode) throws Exception {
        return mvc.perform(post("/demo/agents/" + id + "/mission-review").header(CODE, scope.code()).header(TOKEN, token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(body))).andExpect(status().is(statusCode)).andReturn();
    }
    private JsonNode mission(JsonNode review) throws Exception { return json.readTree(review.get("mission").asText()); }

    @Test void identityScopeAuditIdempotencyAndRevocationSurviveReload() throws Exception {
        Scope scope = scope(); UUID id = create(scope); var credential = provision(scope);
        mvc.perform(post("/admin/disaster/supervisors").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsBytes(Map.of("scopeId", scope.id(), "name", "Untrusted"))))
                .andExpect(status().isUnauthorized());
        mvc.perform(delete("/admin/disaster/supervisors/" + credential.get("id").asText())).andExpect(status().isUnauthorized());
        say(id, scope, "Inspect hotspots at North Warehouse");
        var snapshot = read(id, scope); var body = decision(snapshot, "approve");
        decide(id, scope, "", body, 401);
        decide(id, scope, provision(scope()).get("token").asText(), body, 403);
        say(id, scope, "approve mission 1"); assertFalse(mission(read(id, scope)).get("ready").asBoolean());
        decide(id, scope, credential.get("token").asText(), body, 200);
        decide(id, scope, credential.get("token").asText(), body, 200);
        var approved = read(id, scope); assertTrue(mission(approved).get("ready").asBoolean());
        assertEquals(1, approved.get("reviewVersion").asInt());
        var history = agents.findById(id).orElseThrow().getStorage().get(MissionReviewService.AUDIT + "1").getAsJsonObject();
        assertEquals(credential.get("id").asText(), history.get("supervisorId").getAsString());
        assertTrue(history.has("time")); assertFalse(history.toString().contains(credential.get("token").asText()));
        decide(id, scope, credential.get("token").asText(), decision(snapshot, "reject"), 409);
        var revoke = decision(approved, "revoke"); decide(id, scope, credential.get("token").asText(), revoke, 200);
        assertFalse(mission(read(id, scope)).get("ready").asBoolean());
        assertEquals("supervisor_revoked", mission(read(id, scope)).get("approvalState").asText());
        mvc.perform(delete("/admin/disaster/supervisors/" + credential.get("id").asText())
                .header(AdminAccessCodeController.ADMIN_TOKEN_HEADER, adminToken)).andExpect(status().isNoContent());
        decide(id, scope, credential.get("token").asText(), decision(read(id, scope), "approve"), 401);
        mvc.perform(get("/demo/agents/" + id + "/mission-review").header(CODE, scope().code())).andExpect(status().isNotFound());
    }

    @Test void incompleteUnsafeEditedAndDisabledScopeCannotBeApproved() throws Exception {
        for (String brief : List.of("Search for a missing person", "Enter the burning building", "Inspect hotspots at North Warehouse")) {
            Scope scope = scope(); UUID id = create(scope); var credential = provision(scope);
            say(id, scope, brief); var snapshot = read(id, scope);
            if (brief.startsWith("Inspect")) {
                say(id, scope, "Move the inspection to South Warehouse");
                decide(id, scope, credential.get("token").asText(), decision(snapshot, "approve"), 409);
                snapshot = read(id, scope);
            }
            decide(id, scope, credential.get("token").asText(), decision(snapshot, "approve"), 409);
            decide(id, scope, credential.get("token").asText(), decision(snapshot, "reject"), 200);
            assertFalse(mission(read(id, scope)).get("ready").asBoolean());
            assertEquals("supervisor_rejected", mission(read(id, scope)).get("approvalState").asText());
            var pending = decision(read(id, scope), "approve");
            mvc.perform(patch("/admin/access-codes/" + scope.id()).header(AdminAccessCodeController.ADMIN_TOKEN_HEADER, adminToken)
                    .contentType(MediaType.APPLICATION_JSON).content("{\"enabled\":false}")).andExpect(status().isOk());
            decide(id, scope, credential.get("token").asText(), pending, 401);
        }
    }

    @Test void concurrentConflictingDecisionsAcceptOnlyOneVersion() throws Exception {
        Scope scope = scope(); UUID id = create(scope); var token = provision(scope).get("token").asText();
        say(id, scope, "Inspect hotspots at North Warehouse"); var snapshot = read(id, scope);
        var first = decision(snapshot, "approve"); var second = decision(snapshot, "reject");
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            Callable<Integer> approve = () -> { start.await(); return mvc.perform(post("/demo/agents/" + id + "/mission-review")
                    .header(CODE, scope.code()).header(TOKEN, token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(first)))
                    .andReturn().getResponse().getStatus(); };
            Callable<Integer> reject = () -> { start.await(); return mvc.perform(post("/demo/agents/" + id + "/mission-review")
                    .header(CODE, scope.code()).header(TOKEN, token).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsBytes(second)))
                    .andReturn().getResponse().getStatus(); };
            var a = pool.submit(approve); var b = pool.submit(reject); start.countDown();
            assertEquals(List.of(200, 409), java.util.stream.Stream.of(a.get(30, TimeUnit.SECONDS), b.get(30, TimeUnit.SECONDS)).sorted().toList());
        }
        assertEquals(1, read(id, scope).get("reviewVersion").asInt());
    }
}
