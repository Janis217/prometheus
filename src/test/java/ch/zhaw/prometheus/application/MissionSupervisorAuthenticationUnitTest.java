package ch.zhaw.prometheus.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.test.util.ReflectionTestUtils;
import ch.zhaw.prometheus.repositories.*;
import ch.zhaw.prometheus.model.disaster.*;
import ch.zhaw.prometheus.agentdefs.core.DisasterMissionConfiguration;
import com.google.gson.*;

class MissionSupervisorAuthenticationUnitTest {
    private final MissionSupervisorRepository supervisors=mock(MissionSupervisorRepository.class);
    private final AccessCodeRepository scopes=mock(AccessCodeRepository.class);
    private final AgentRepository agents=mock(AgentRepository.class);
    private final AgentApplicationService agentService=mock(AgentApplicationService.class);
    private final UUID agentId=UUID.randomUUID(),scopeId=UUID.randomUUID();
    private final AccessCodeRepository.Scope scope=mock(AccessCodeRepository.Scope.class);
    private MissionReviewService service(boolean required){
        when(scopes.findScope("TEST",agentId)).thenReturn(Optional.of(scope));
        when(scope.getId()).thenReturn(scopeId);when(scope.getEnabled()).thenReturn(true);when(scope.getLinked()).thenReturn(true);
        when(agentService.serialized(eq(agentId),any())).thenAnswer(call->((java.util.function.Supplier<?>)call.getArgument(1)).get());
        return new MissionReviewService(supervisors,scopes,agents,agentService,mock(PlatformTransactionManager.class),required);
    }
    @Test void testModeOmitsPasswordButStillRequiresEnabledLinkedScope(){
        var service=service(false);
        var reviewer=service.authenticate(agentId,"TEST",null);
        assertFalse(reviewer.authenticated());assertTrue(reviewer.name().contains("password disabled"));
        assertEquals(reviewer.id(),service.authenticate(agentId,"TEST","").id());
        verifyNoInteractions(supervisors);
        when(scope.getEnabled()).thenReturn(false);
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,()->service.authenticate(agentId,"TEST",null)).getStatusCode());
        when(scope.getEnabled()).thenReturn(true);when(scope.getLinked()).thenReturn(false);
        assertEquals(HttpStatus.NOT_FOUND,assertThrows(ResponseStatusException.class,()->service.authenticate(agentId,"TEST",null)).getStatusCode());
        assertThrows(ResponseStatusException.class,()->service.authenticate(agentId,null,null));
    }
    @Test void enabledModeRequiresAValidIndividualCredentialAndMatchingScope(){
        var service=service(true);
        assertEquals(HttpStatus.UNAUTHORIZED,assertThrows(ResponseStatusException.class,()->service.authenticate(agentId,"TEST",null)).getStatusCode());
        var supervisor=new MissionSupervisor(scopeId,"Named supervisor","digest");
        UUID reviewerId=UUID.randomUUID();ReflectionTestUtils.setField(supervisor,"id",reviewerId);
        when(supervisors.findByTokenDigest(anyString())).thenReturn(Optional.of(supervisor));
        var identity=service.authenticate(agentId,"TEST","synthetic-unit-token");
        assertTrue(identity.authenticated());assertEquals(reviewerId,identity.id());
        supervisor.revoke();
        assertThrows(ResponseStatusException.class,()->service.authenticate(agentId,"TEST","synthetic-unit-token"));
        when(supervisors.findByTokenDigest(anyString())).thenReturn(Optional.of(new MissionSupervisor(UUID.randomUUID(),"Other scope","digest")));
        assertEquals(HttpStatus.FORBIDDEN,assertThrows(ResponseStatusException.class,()->service.authenticate(agentId,"TEST","synthetic-unit-token")).getStatusCode());
    }
    @Test void testModeKeepsReviewAuditAndRejectsIncompleteAndStaleApprovals(){
        var service=service(false);var agent=new DisasterMissionConfiguration().createAgent();
        when(agents.findById(agentId)).thenReturn(Optional.of(agent));
        var policy=(DisasterMissionPolicy)agent.getCurrentState().ownPolicy();
        var empty=service.read(agentId,"TEST");assertFalse(empty.supervisorCredentialRequired());
        var incomplete=new MissionReviewService.Decision(UUID.randomUUID(),0,0,empty.safetyReference(),"approve");
        assertEquals(HttpStatus.CONFLICT,assertThrows(ResponseStatusException.class,()->service.decide(agentId,"TEST",null,incomplete)).getStatusCode());
        var brief=JsonParser.parseString("""
                {"missionType":"fire_hotspot_inspection","objective":"Find printed fire indicator","priority":"low",
                "location":"R-204","environment":"indoor_flat","risks":"printed image only",
                "operatingConditions":"stop on hazard or lost link","searchBoundary":"R-204 interior only","safetyAssessment":"safe",
                "platformEvidence":{"communications":"confirmed","safeStandoff":"confirmed","platformSuitability":"confirmed","accessClearance":"confirmed","terrainSuitability":"confirmed"}}
                """).getAsJsonObject();
        policy.storage().put(DisasterMission.KEY,DisasterMission.evaluate(brief,1,false));
        var snapshot=service.read(agentId,"TEST");
        var decision=new MissionReviewService.Decision(UUID.randomUUID(),1,0,snapshot.safetyReference(),"approve");
        var approved=service.decide(agentId,"TEST",null,decision);
        assertTrue(JsonParser.parseString(approved.mission()).getAsJsonObject().get("ready").getAsBoolean());
        var audit=agent.getStorage().get(MissionReviewService.AUDIT+"1").getAsJsonObject();
        assertEquals("password_disabled_for_testing",audit.get("authenticationMode").getAsString());
        assertEquals(approved,service.decide(agentId,"TEST",null,decision));
        assertThrows(ResponseStatusException.class,()->service.decide(agentId,"TEST",null,new MissionReviewService.Decision(UUID.randomUUID(),1,0,snapshot.safetyReference(),"reject")));
    }
    @Test void taskAndRoomSaveTogetherAndRoomChangesInvalidateReviewWithoutLeakingScope(){
        var service=service(false);var agent=new DisasterMissionConfiguration().createAgent();
        when(agents.findById(agentId)).thenReturn(Optional.of(agent));
        var fields=Map.of("missionType","fire_hotspot_inspection","objective","Find printed fire indicator","priority","low",
                "location","R-204","environment","indoor_flat","risks","printed image only",
                "operatingConditions","stop on hazards","searchBoundary","R-204 interior only","safetyAssessment","safe");
        var evidence=Map.of("communications","confirmed","safeStandoff","confirmed","platformSuitability","confirmed","accessClearance","confirmed","terrainSuitability","confirmed");
        String layout="""
                {"format":"prometheus.room-scenario","version":1,"room":{"schemaVersion":1,"shape":"square","width":6,"height":6,
                "revision":0,"smoke":false,"robot":{"x":0,"y":0,"heading":1},"objects":[]}}
                """;
        var selection=new SavedMissionDetails.Room(UUID.randomUUID().toString(),1,"Training room",layout);
        var options=new SavedMissionDetails.SimulationOptions(1,"all","observation","avoid_closed",64);
        var details=new SavedMissionDetails.Input("Mission A",selection,options);
        var saved=service.configure(agentId,"TEST",new MissionReviewService.Configuration(0,fields,evidence,"ground robot",details));
        assertEquals("Mission A",saved.savedMission().name());assertEquals(1,saved.savedMission().configuredRevision());
        assertEquals(saved,service.read(agentId,"TEST"));
        assertEquals(options,saved.savedMission().simulationOptions());
        var approved=service.decide(agentId,"TEST",null,new MissionReviewService.Decision(UUID.randomUUID(),1,0,saved.safetyReference(),"approve"));
        assertTrue(JsonParser.parseString(approved.mission()).getAsJsonObject().get("ready").getAsBoolean());
        var changed=new SavedMissionDetails.Input("Mission A updated",new SavedMissionDetails.Room(selection.id(),2,"Training room",layout.replace("\"smoke\":false","\"smoke\":true")));
        var updated=service.configure(agentId,"TEST",new MissionReviewService.Configuration(1,fields,evidence,"ground robot",changed));
        assertEquals(2,updated.savedMission().configuredRevision());assertEquals(2,updated.savedMission().room().revision());
        assertEquals(options,updated.savedMission().simulationOptions());
        assertFalse(JsonParser.parseString(updated.mission()).getAsJsonObject().get("ready").getAsBoolean());
        assertThrows(ResponseStatusException.class,()->service.configure(agentId,"TEST",new MissionReviewService.Configuration(1,fields,evidence,"ground robot",details)));
        assertEquals(updated,service.read(agentId,"TEST"));
        var invalid=new SavedMissionDetails.Input("Invalid",new SavedMissionDetails.Room(selection.id(),3,"Training room","{}"));
        assertEquals(HttpStatus.BAD_REQUEST,assertThrows(ResponseStatusException.class,()->service.configure(agentId,"TEST",new MissionReviewService.Configuration(2,fields,evidence,"ground robot",invalid))).getStatusCode());
        assertEquals(updated,service.read(agentId,"TEST"));
        when(scope.getLinked()).thenReturn(false);
        assertThrows(ResponseStatusException.class,()->service.read(agentId,"TEST"));
        when(scope.getLinked()).thenReturn(true);
        // Legacy task-only clients retain the bound room rather than silently detaching it.
        assertEquals(selection.id(),service.configure(agentId,"TEST",new MissionReviewService.Configuration(2,fields,evidence,"ground robot",null)).savedMission().room().id());
        agent.getStorage().values().forEach(value->assertTrue(value.toString().length()<=2048));
        ((DisasterMissionPolicy)agent.getCurrentState().ownPolicy()).reset();
        assertNull(service.read(agentId,"TEST").savedMission());
    }
}
