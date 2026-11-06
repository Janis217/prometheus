package ch.zhaw.prometheus.application;

import java.util.UUID;
import java.util.function.Function;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import ch.zhaw.prometheus.model.disaster.*;
import ch.zhaw.prometheus.repositories.AgentRepository;
import ch.zhaw.prometheus.spi.MissionExecutor;

@Service
public class MissionExecutionService {
    public record Start(UUID requestId, int revision, int reviewVersion, String safetyReference, String variant) {}
    public record Update(UUID executionId, int expectedSequence, String action) {}
    private final AgentApplicationService agentService;
    private final MissionReviewService reviews;
    private final AgentRepository agents;
    private final MissionExecutor executor;
    private final TransactionTemplate transaction;
    public MissionExecutionService(AgentApplicationService agentService, MissionReviewService reviews,
            AgentRepository agents, MissionExecutor executor, PlatformTransactionManager transactions) {
        this.agentService = agentService; this.reviews = reviews; this.agents = agents;
        this.executor = executor; this.transaction = new TransactionTemplate(transactions);
    }

    public String start(UUID id, String code, String token, Start input) {
        if (input == null || input.requestId() == null || input.variant() == null || input.safetyReference() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return turn(id, code, policy -> {
            var reviewer = reviews.authenticate(id, code, token);
            var review = reviews.read(id, code);
            if (input.revision() != JsonParser.parseString(review.mission()).getAsJsonObject().get("revision").getAsInt()
                    || input.reviewVersion() != review.reviewVersion() || !input.safetyReference().equals(review.safetyReference())
                    || policy.storage().containsKey(DisasterMissionSimulation.KEY)) throw new IllegalArgumentException("Stale or rehearsal-only mission");
            return FireMissionExecution.start(policy.storage(), JsonParser.parseString(review.mission()).getAsJsonObject(),
                    review.reviewVersion(), review.safetyReference(), input.requestId(), input.variant(), reviewer.id().toString(), System.currentTimeMillis());
        });
    }

    public String read(UUID id, String code) {
        return turn(id, code, policy -> refresh(id, code, policy));
    }

    public String update(UUID id, String code, Update input) {
        if (input == null || input.executionId() == null || input.action() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return turn(id, code, policy -> {
            if (!policy.storage().containsKey(FireMissionExecution.KEY)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            FireMissionExecution.require(FireMissionExecution.current(policy.storage()), input.executionId(), input.expectedSequence());
            var state = refresh(id, code, policy);
            if (state.get("sequence").getAsInt() != input.expectedSequence()) return state;
            if (!input.action().equals("step"))
                return FireMissionExecution.decide(policy.storage(), input.executionId(), input.expectedSequence(), input.action(), reviews.scopeId(id, code).toString());
            var mission = policy.storage().get(FireMissionExecution.MISSION).toString();
            var snapshot = new MissionExecutor.Mission(input.executionId(), state.get("revision").getAsInt(),
                    state.get("reviewVersion").getAsInt(), DisasterMission.text(state, "safetyReference"), mission);
            var feedback = executor.next(snapshot, state.get("sequence").getAsInt() + 1,
                    state.get("cursor").getAsInt(), DisasterMission.text(state, "variant"));
            return FireMissionExecution.feedback(policy.storage(), feedback);
        });
    }

    private JsonObject refresh(UUID id, String code, DisasterMissionPolicy policy) {
        if (!policy.storage().containsKey(FireMissionExecution.KEY)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        var review = reviews.read(id, code);
        return FireMissionExecution.expireOrInvalidate(policy.storage(), JsonParser.parseString(review.mission()).getAsJsonObject(),
                review.reviewVersion(), review.safetyReference(), System.currentTimeMillis());
    }

    private String turn(UUID id, String code, Function<DisasterMissionPolicy, JsonObject> work) {
        return agentService.serialized(id, () -> transaction.execute(status -> {
            reviews.read(id, code); // Recheck enabled scope and visibility inside this serialized transaction.
            var agent = agents.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            if (!(agent.getCurrentState().ownPolicy() instanceof DisasterMissionPolicy policy))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            try {
                var result = work.apply(policy); agents.saveAndFlush(agent); return result.toString();
            } catch (IllegalArgumentException conflict) { throw new ResponseStatusException(HttpStatus.CONFLICT); }
        }));
    }
}
