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
import org.springframework.beans.factory.annotation.Value;
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
    public record Review(String mission, int reviewVersion, String safetyReference, boolean supervisorCredentialRequired,
            SavedMissionDetails.Saved savedMission) {}
    record Reviewer(UUID id, String name, boolean authenticated) {}
    public record Configuration(int expectedRevision, java.util.Map<String, String> fields,
            java.util.Map<String, String> platformEvidence, String robot, SavedMissionDetails.Input savedMission) {}
    private final MissionSupervisorRepository supervisors;
    private final AccessCodeRepository scopes;
    private final AgentRepository agents;
    private final AgentApplicationService agentService;
    private final TransactionTemplate transaction;
    private final boolean credentialRequired;

    public MissionReviewService(MissionSupervisorRepository supervisors, AccessCodeRepository scopes,
            AgentRepository agents, AgentApplicationService agentService, PlatformTransactionManager transactions,
            @Value("${prometheus.supervisor.credential-required:true}") boolean credentialRequired) {
        this.supervisors = supervisors; this.scopes = scopes; this.agents = agents;
        this.agentService = agentService; this.transaction = new TransactionTemplate(transactions);
        this.credentialRequired = credentialRequired;
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
            return review(mission, agent.getStorage());
        }));
    }

    /** Structured operator input uses the same validation and approval boundary as chat edits. */
    public Review configure(UUID id, String code, Configuration input) {
        if (input == null || input.fields() == null || input.platformEvidence() == null || input.robot() == null)
            throw failure(HttpStatus.BAD_REQUEST);
        SavedMissionDetails.Input selected;
        try { selected = input.savedMission() == null ? null : SavedMissionDetails.validate(input.savedMission()); }
        catch (RuntimeException invalid) { throw failure(HttpStatus.BAD_REQUEST); }
        var draft = new JsonObject();
        for (var entry : input.fields().entrySet()) {
            if (!DisasterMission.FIELDS.contains(entry.getKey()) || entry.getValue() == null || entry.getValue().length() > 300)
                throw failure(HttpStatus.BAD_REQUEST);
            draft.addProperty(entry.getKey(), entry.getValue().strip());
        }
        var evidence = new JsonObject();
        for (var entry : input.platformEvidence().entrySet()) {
            if (!List.of("communications", "safeStandoff", "platformSuitability", "accessClearance", "terrainSuitability",
                    "flightClearance", "weatherEnvelope", "structuralClearance").contains(entry.getKey())
                    || entry.getValue() == null || !List.of("confirmed", "failed", "unknown").contains(entry.getValue())) throw failure(HttpStatus.BAD_REQUEST);
            evidence.addProperty(entry.getKey(), entry.getValue());
        }
        draft.add("platformEvidence", evidence);
        return agentService.serialized(id, () -> transaction.execute(status -> {
            checkScope(id, code);
            var agent = agents.findById(id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND));
            if (!(agent.getCurrentState().ownPolicy() instanceof DisasterMissionPolicy policy)) throw failure(HttpStatus.NOT_FOUND);
            var previous = DisasterMission.current(policy.storage());
            if (input.expectedRevision() != previous.get("revision").getAsInt()
                    || policy.storage().containsKey(DisasterMissionSimulation.KEY)) throw failure(HttpStatus.CONFLICT);
            var evaluated = DisasterMission.evaluate(draft, input.expectedRevision() + 1, false);
            if (!input.robot().equals(DisasterMission.text(evaluated, "selectedEmbodiment"))
                    || DisasterMission.text(evaluated, "question").startsWith("Please shorten")) throw failure(HttpStatus.BAD_REQUEST);
            policy.storage().put(DisasterMission.KEY, evaluated);
            var existing = SavedMissionDetails.read(agent.getStorage());
            var details = selected != null ? selected : existing == null ? null : new SavedMissionDetails.Input(existing.name(), existing.room(), existing.simulationOptions());
            if(selected!=null && existing!=null && input.savedMission().simulationOptions()==null)
                details=new SavedMissionDetails.Input(selected.name(),selected.room(),existing.simulationOptions());
            if (details != null) SavedMissionDetails.write(policy.storage(), details, input.expectedRevision() + 1);
            agents.saveAndFlush(agent);
            return review(evaluated, agent.getStorage());
        }));
    }

    public Review decide(UUID id, String code, String token, Decision input) {
        if (input == null || input.requestId() == null || input.safetyReference() == null || input.decision() == null
                || !List.of("approve", "reject", "revoke").contains(input.decision())) throw failure(HttpStatus.BAD_REQUEST);
        return agentService.serialized(id, () -> transaction.execute(status -> {
            UUID scopeId = checkScope(id, code);
            var supervisor = authenticate(id, code, token);
            var agent = agents.findById(id).orElseThrow(() -> failure(HttpStatus.NOT_FOUND));
            var values = agent.getStorage(); var mission = mission(values);
            int version = version(values); String reference = safetyReference(mission);
            // Retries are idempotent only for exactly the same reviewer and request content.
            for (var entry : values.entrySet()) if (entry.getKey().startsWith(AUDIT)) {
                var audit = entry.getValue().getAsJsonObject();
                if (input.requestId().toString().equals(DisasterMission.text(audit, "requestId"))) {
                    if (!supervisor.id().toString().equals(DisasterMission.text(audit, "supervisorId"))
                            || !input.decision().equals(DisasterMission.text(audit, "decision"))
                            || input.revision() != audit.get("revision").getAsInt()
                            || input.reviewVersion() != audit.get("expectedVersion").getAsInt()
                            || !input.safetyReference().equals(DisasterMission.text(audit, "safetyReference"))) throw failure(HttpStatus.CONFLICT);
                    return review(mission, values);
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
            audit.addProperty("supervisorId", supervisor.id().toString());
            audit.addProperty("supervisorName", supervisor.name());
            audit.addProperty("authenticationMode", supervisor.authenticated() ? "credential" : "password_disabled_for_testing");
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
            return review(evaluated, agent.getStorage());
        }));
    }

    private UUID checkScope(UUID id, String code) {
        if (code == null || code.isBlank()) throw failure(HttpStatus.UNAUTHORIZED);
        var scope = scopes.findScope(code, id).filter(AccessCodeRepository.Scope::getEnabled)
                .orElseThrow(() -> failure(HttpStatus.UNAUTHORIZED));
        if (!scope.getLinked()) throw failure(HttpStatus.NOT_FOUND);
        return scope.getId();
    }
    Reviewer authenticate(UUID id, String code, String token) {
        UUID scopeId = checkScope(id, code);
        if (!credentialRequired) return new Reviewer(UUID.nameUUIDFromBytes(
                ("testing-supervisor:" + scopeId).getBytes(StandardCharsets.UTF_8)), "Testing supervisor (password disabled)", false);
        if (token == null || token.isBlank() || token.length() > 200) throw failure(HttpStatus.UNAUTHORIZED);
        var supervisor = supervisors.findByTokenDigest(digest(token)).filter(MissionSupervisor::isEnabled)
                .orElseThrow(() -> failure(HttpStatus.UNAUTHORIZED));
        if (!scopeId.equals(supervisor.getScopeId())) throw failure(HttpStatus.FORBIDDEN);
        return new Reviewer(supervisor.getId(), supervisor.getName(), true);
    }
    UUID scopeId(UUID id, String code) { return checkScope(id, code); }
    private Review review(JsonObject mission, java.util.Map<String, com.google.gson.JsonElement> values) {
        return new Review(mission.toString(), version(values), safetyReference(mission), credentialRequired, SavedMissionDetails.read(values));
    }
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
