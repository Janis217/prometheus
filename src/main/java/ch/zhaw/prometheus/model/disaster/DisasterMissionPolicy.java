package ch.zhaw.prometheus.model.disaster;

import ch.zhaw.prometheus.model.*;
import ch.zhaw.prometheus.model.behaviour.BehaviourPlan;
import ch.zhaw.prometheus.model.event.EventHistory;
import ch.zhaw.prometheus.model.policy.*;
import ch.zhaw.prometheus.spi.LanguageModelGateway;
import jakarta.persistence.*;

/** Emits the validated backend record verbatim; no second generative safety decision. */
@Entity
public class DisasterMissionPolicy extends NoOpPolicy {
    @ManyToOne(cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private Storage missionStorage;
    protected DisasterMissionPolicy() {}
    public DisasterMissionPolicy(Storage storage) { missionStorage = storage; }
    public Storage storage() { return missionStorage; }
    public void recordReview(com.google.gson.JsonObject mission, String key, com.google.gson.JsonObject audit) {
        missionStorage.put(DisasterMission.KEY, mission);
        missionStorage.put(key, audit);
    }
    @Override public BehaviourPlan onStart(State state, EventHistory events, PromptMessageAssembler assembler, LanguageModelGateway gateway) {
        if (missionStorage.containsKey(DisasterMissionSimulation.KEY))
            return BehaviourPlan.speechOnly(missionStorage.get(DisasterMissionSimulation.KEY).toString());
        return BehaviourPlan.speechOnly(DisasterMission.current(missionStorage).toString());
    }
    @Override public BehaviourPlan onRespond(State state, EventHistory events, PromptMessageAssembler assembler, LanguageModelGateway gateway) {
        return onStart(state, events, assembler, gateway);
    }
    @Override public void reset() {
        SavedMissionDetails.clear(missionStorage);
        DisasterMissionSimulation.clear(missionStorage);
        FireMissionExecution.clear(missionStorage);
        DisasterMission.reset(missionStorage);
    }
    @Override public String describe() { return "Disaster mission configuration: capture, platform checks, authenticated supervisor review. No robot execution."; }
}
