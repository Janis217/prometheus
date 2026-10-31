package ch.zhaw.prometheus.application;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import com.google.gson.JsonObject;
import ch.zhaw.prometheus.model.disaster.*;
import ch.zhaw.prometheus.repositories.*;

/** Scope checks and revision CAS share the same serialized agent-turn boundary as edits. */
@Service
public class MissionReviewService {
    public static final String AUDIT = "disaster_mission_review.";
    public record Provision(UUID scopeId, String name) {}
    public record Credential(UUID id, UUID scopeId, String name, String token) {
        @Override public String toString() { return "Credential[id=" + id + ", scopeId=" + scopeId + ", token=<redacted>]"; }
    }
    public record Decision(UUID requestId, int revision, int reviewVersion, String safetyReference, String decision) {}
    public record Review(String mission, int reviewVersion, String safetyReference) {}
    private final MissionSupervisorRepository supervisors;
    private final AccessCodeRepository scopes;
    private final AgentRepository agents;
    private final AgentApplicationService agentService;
    private final TransactionTemplate transaction;

    public MissionReviewService(MissionSupervisorRepository supervisors, AccessCodeRepository scopes,
            AgentRepository agents, AgentApplicationService agentService, PlatformTransactionManager transactions) {
        this.supervisors = supervisors; this.scopes = scopes; this.agents = agents;
        this.agentService = agentService; this.transaction = new TransactionTemplate(transactions);
    }

    public Credential provision(Provision input) {
        if (input == null || input.scopeId() == null || input.name() == null || input.name().isBlank() || input.name().length() > 80)
            throw failure(HttpStatus.BAD_REQUEST);
        if (!scopes.existsByIdAndEnabledTrue(input.scopeId())) throw failure(HttpStatus.NOT_FOUND);
        byte[] random = new byte[32]; new SecureRandom().nextBytes(random);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        var saved = supervisors.save(new MissionSupervisor(input.scopeId(), input.name().strip(), digest(token)));
        return new Credential(saved.getId(), saved.getScopeId(), saved.getName(), token);
    }

    public void revokeCredential(UUID id) {
        transaction.executeWithoutResult(status -> {
            var supervisor = supervisors.findById(id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND));
            supervisor.revoke(); supervisors.save(supervisor);
        });
    }

    public Review read(UUID id, String code) {
        return agentService.serialized(id, () -> transaction.execute(status -> {
            checkScope(id, code);
            var agent = agents.findById(id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND));
            var mission = mission(agent.getStorage());
            return new Review(mission.toString(), version(agent.getStorage()), safetyReference(mission));
        }));
    }

    public Review decide(UUID id, String code, String token, Decision input) {
        if (input == null || input.requestId() == null || input.safetyReference() == null || input.decision() == null
                || !List.of("approve", "reject", "revoke").contains(input.decision())) throw failure(HttpStatus.BAD_REQUEST);
        if (token == null || token.isBlank() || token.length() > 200) throw failure(HttpStatus.UNAUTHORIZED);
        return agentService.serialized(id, () -> transaction.execute(status -> {
            UUID scopeId = checkScope(id, code);
            var supervisor = supervisors.findByTokenDigest(digest(token)).filter(MissionSupervisor::isEnabled)
                    .orElseThrow(() -> failure(HttpStatus.UNAUTHORIZED));
            if (!supervisor.getScopeId().equals(scopeId)) throw failure(HttpStatus.FORBIDDEN);
            var agent = agents.findById(id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND));
            var values = agent.getStorage(); var mission = mission(values);
            int version = version(values); String reference = safetyReference(mission);
            // Retries are idempotent only for exactly the same reviewer and request content.
            for (var entry : values.entrySet()) if (entry.getKey().startsWith(AUDIT)) {
                var audit = entry.getValue().getAsJsonObject();
                if (input.requestId().toString().equals(DisasterMission.text(audit, "requestId"))) {
                    if (!supervisor.getId().toString().equals(DisasterMission.text(audit, "supervisorId"))
                            || !input.decision().equals(DisasterMission.text(audit, "decision"))
                            || input.revision() != audit.get("revision").getAsInt()
                            || input.reviewVersion() != audit.get("expectedVersion").getAsInt()
                            || !input.safetyReference().equals(DisasterMission.text(audit, "safetyReference"))) throw failure(HttpStatus.CONFLICT);
                    return new Review(mission.toString(), version, reference);
                }
            }
            if (input.revision() != mission.get("revision").getAsInt() || input.reviewVersion() != version
                    || !reference.equals(input.safetyReference())) throw failure(HttpStatus.CONFLICT);
            if (version >= 128 || values.containsKey(DisasterMissionSimulation.KEY)) throw failure(HttpStatus.CONFLICT);
            var evaluated = DisasterMission.evaluate(mission, input.revision(), input.decision().equals("approve"));
            if (input.decision().equals("approve") && !evaluated.get("ready").getAsBoolean()) throw failure(HttpStatus.CONFLICT);
            evaluated.addProperty("approvalState", switch (input.decision()) {
                case "approve" -> "supervisor_approved";
                case "reject" -> "supervisor_rejected";
                default -> "supervisor_revoked";
            });
            var audit = new JsonObject();
            audit.addProperty("requestId", input.requestId().toString());
            audit.addProperty("supervisorId", supervisor.getId().toString());
            audit.addProperty("supervisorName", supervisor.getName());
            audit.addProperty("scopeId", scopeId.toString());
            audit.addProperty("revision", input.revision());
            audit.addProperty("expectedVersion", version);
            audit.addProperty("safetyReference", reference);
            audit.addProperty("decision", input.decision());
            audit.addProperty("time", Instant.now().toString());
            // Use the existing policy's Storage reference; a detached Map is not a write interface.
            var policy = (DisasterMissionPolicy) agent.getCurrentState().ownPolicy();
            policy.recordReview(evaluated, AUDIT + (version + 1), audit);
            agents.saveAndFlush(agent);
            return new Review(evaluated.toString(), version + 1, reference);
        }));
    }

    private UUID checkScope(UUID id, String code) {
        if (code == null || code.isBlank()) throw failure(HttpStatus.UNAUTHORIZED);
        var scope = scopes.findScope(code, id).filter(AccessCodeRepository.Scope::getEnabled)
                .orElseThrow(() -> failure(HttpStatus.UNAUTHORIZED));
        if (!scope.getLinked()) throw failure(HttpStatus.NOT_FOUND);
        return scope.getId();
    }
    MissionSupervisor authenticate(UUID id, String code, String token) {
        UUID scopeId = checkScope(id, code);
        if (token == null || token.isBlank() || token.length() > 200) throw failure(HttpStatus.UNAUTHORIZED);
        var supervisor = supervisors.findByTokenDigest(digest(token)).filter(MissionSupervisor::isEnabled)
                .orElseThrow(() -> failure(HttpStatus.UNAUTHORIZED));
        if (!scopeId.equals(supervisor.getScopeId())) throw failure(HttpStatus.FORBIDDEN);
        return supervisor;
    }
    UUID scopeId(UUID id, String code) { return checkScope(id, code); }
    private static JsonObject mission(java.util.Map<String, com.google.gson.JsonElement> values) {
        if (!values.containsKey(DisasterMission.KEY)) throw failure(HttpStatus.NOT_FOUND);
        var stored = values.get(DisasterMission.KEY).getAsJsonObject();
        var evaluated = DisasterMission.evaluate(stored, stored.get("revision").getAsInt(),
                "supervisor_approved".equals(DisasterMission.text(stored, "approvalState")));
        evaluated.addProperty("approvalState", DisasterMission.text(stored, "approvalState"));
        return evaluated;
    }
    private static int version(java.util.Map<String, com.google.gson.JsonElement> values) {
        return (int) values.keySet().stream().filter(key -> key.startsWith(AUDIT)).count();
    }
    public static String safetyReference(JsonObject mission) {
        var canonical = new JsonObject();
        DisasterMission.FIELDS.forEach(key -> canonical.addProperty(key, DisasterMission.text(mission, key)));
        canonical.add("declarations", PlatformSafety.declarations(mission));
        return digest(canonical.toString());
    }
    private static String digest(String text) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    private static ResponseStatusException failure(HttpStatus status) { return new ResponseStatusException(status); }
}
