package ch.zhaw.prometheus.agentdefs.core;

import org.springframework.stereotype.Component;
import ch.zhaw.prometheus.agentdefs.*;
import ch.zhaw.prometheus.model.Agent;

@Component
public class DisasterMissionConfiguration implements AgentDefinition {
    public static final String KEY = "core.disaster_mission_configuration";
    @Override public String key() { return KEY; }
    @Override public String languageCode() { return LANGUAGE_ENGLISH; }
    public static Agent createAgentDefinition() { return ValerianCoreAgentFactory.disasterMissionConfiguration(); }
    @Override public Agent createAgent() { return applyDefinitionMetadata(createAgentDefinition()); }
    @Override public AgentCreationResult createInstance(AgentCreationContext context) {
        Agent agent = createAgent();
        return AgentCreationResult.started(agent, agent.start(context.runtime()));
    }
}
