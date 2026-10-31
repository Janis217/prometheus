package ch.zhaw.prometheus.agentdefs.core;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import ch.zhaw.prometheus.model.Agent;
import ch.zhaw.prometheus.model.disaster.DisasterMission;
import ch.zhaw.prometheus.model.disaster.DisasterMissionSimulation;
import ch.zhaw.prometheus.model.event.Event;
import ch.zhaw.prometheus.model.policy.PolicyRuntime;
import ch.zhaw.prometheus.model.policy.PromptMessageAssembler;
import ch.zhaw.prometheus.spi.LanguageModelGateway;

/** UC-FIRE-01/02 rehearsal through the real core Agent action/policy, no provider calls. */
class DisasterMissionSimulationUnitTest {
    private final LanguageModelGateway gateway = mock(LanguageModelGateway.class);
    private final PolicyRuntime runtime = new PolicyRuntime(new PromptMessageAssembler(), gateway);
    private final Agent agent = new DisasterMissionConfiguration().createAgent();

    private JsonObject state() { return agent.getStorage().get(DisasterMissionSimulation.KEY).getAsJsonObject(); }
    private void say(String text) {
        agent.acknowledge(Event.observation(Event.TYPE_USER_UTTERANCE, "operator", text), runtime);
    }
    private void command(String action) {
        say("simulate fire " + action + " " + state().get("runId").getAsString() + " " + state().get("revision").getAsInt());
    }
    private void begin() { agent.start(runtime); say("simulate fire begin"); }
    private void running() { begin(); command("configure"); command("confirm"); command("start"); }

    @Test void ordinaryJourneyEmitsStructuredSimulationAndRequiresSeparateHandoff() {
        begin();
        assertEquals("configuration", state().get("phase").getAsString());
        assertTrue(state().get("missingInformation").getAsString().contains("target"));
        command("configure"); command("confirm"); command("start"); command("progress"); command("complete");
        assertEquals("completion_handoff", state().get("phase").getAsString());
        assertEquals("pending_demo_operator_acknowledgement", state().getAsJsonObject("result").get("responsibility").getAsString());
        command("handoff");
        assertEquals("closed", state().get("phase").getAsString());
        assertTrue(state().getAsJsonObject("result").get("evidence").getAsString().startsWith("simulation://"));
        assertFalse(state().get("operationalReady").getAsBoolean());
        assertFalse(agent.getStorage().get(DisasterMission.KEY).getAsJsonObject().get("ready").getAsBoolean());
        var output = agent.getCurrentState().ownPolicy().onRespond(agent.getCurrentState(), agent.getEventHistory(), runtime.promptMessageAssembler(), gateway);
        assertEquals(state(), JsonParser.parseString(output.getSpeech()));
        assertEquals(7, state().get("sequence").getAsInt());
        assertTrue(agent.getStorage().containsKey(DisasterMissionSimulation.KEY + ".event.7"));
        agent.getStorage().values().forEach(value -> assertTrue(value.toString().length() <= 2048));
        verifyNoInteractions(gateway);
    }

    @Test void obstacleRequiresDecisionAndFreshProgressBeforeCompletion() {
        running(); command("progress"); command("obstacle");
        assertEquals("escalation", state().get("phase").getAsString());
        command("complete"); assertTrue(state().has("lastRejection"));
        command("resume"); command("complete");
        assertEquals("coordination", state().get("phase").getAsString());
        assertFalse(state().has("result"));
        command("progress"); command("complete"); command("handoff");
        assertEquals("resume", state().get("decision").getAsString());
        assertEquals("closed", state().get("phase").getAsString());
        verifyNoInteractions(gateway);
    }

    @Test void lostLinkCannotResumeAndAbortNeverInventsEvidence() {
        running(); command("connection_loss"); command("resume");
        assertEquals("escalation", state().get("phase").getAsString());
        command("abort"); command("handoff");
        assertEquals("aborted", state().getAsJsonObject("result").get("outcome").getAsString());
        assertEquals("", state().getAsJsonObject("result").get("evidence").getAsString());
        command("complete"); assertEquals("closed", state().get("phase").getAsString());
    }

    @Test void staleTokensSkippedGatesAndOrdinaryApprovalCannotAdvanceRehearsal() {
        agent.start(runtime); say("simulate fire status"); say("simulate fire begin");
        String run = state().get("runId").getAsString();
        command("start"); assertEquals("configuration", state().get("phase").getAsString());
        command("configure");
        for (String text : List.of("simulate fire confirm " + run + " 0", "simulate fire confirm wrong 1",
                "approve mission 1", "simulate fire confirm", "simulate fire confirm " + run + " 1 extra")) {
            say(text); assertEquals("approval", state().get("phase").getAsString());
        }
        command("confirm"); command("start"); command("complete");
        assertEquals("coordination", state().get("phase").getAsString());
        say("simulate fire begin"); assertEquals(run, state().get("runId").getAsString());
        agent.reset();
        assertTrue(agent.getStorage().keySet().stream().noneMatch(key -> key.startsWith(DisasterMissionSimulation.KEY)));
        say("simulate fire begin");
        assertNotEquals(run, state().get("runId").getAsString());
        say("simulate fire configure " + run + " 0");
        assertEquals("configuration", state().get("phase").getAsString());
        verifyNoInteractions(gateway);
    }

    @Test void ambiguityAndTimeoutEscalateAndEventBoundStillAllowsAbortAndHandoff() {
        running();
        for (String trigger : List.of("ambiguity", "timeout")) {
            command(trigger); assertEquals(trigger, state().get("trigger").getAsString()); command("resume");
        }
        while (state().get("sequence").getAsInt() < 22) command("progress");
        command("progress"); assertTrue(state().has("lastRejection"));
        command("abort"); command("handoff");
        assertEquals("closed", state().get("phase").getAsString());
        assertEquals(24, state().get("sequence").getAsInt());
        agent.getStorage().values().forEach(value -> assertTrue(value.toString().length() <= 2048));
    }
}
