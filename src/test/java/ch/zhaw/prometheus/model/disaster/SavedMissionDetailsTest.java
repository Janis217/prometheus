package ch.zhaw.prometheus.model.disaster;

import static org.junit.jupiter.api.Assertions.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import com.google.gson.*;
import ch.zhaw.prometheus.model.Storage;

class SavedMissionDetailsTest {
    private JsonObject room() {
        return JsonParser.parseString("""
          {"format":"prometheus.room-scenario","version":1,"room":{"schemaVersion":1,"shape":"l_shaped",
          "width":8,"height":8,"revision":3,"smoke":true,"robot":{"x":0,"y":1,"heading":3},"objects":[
          {"id":"object-1","type":"door","x":1,"y":0,"locked":true,"open":false},
          {"id":"object-2","type":"fire_picture","x":5,"y":0},
          {"id":"object-3","type":"table","x":2,"y":2}]}}
          """).getAsJsonObject();
    }
    private SavedMissionDetails.Input details(JsonObject document) {
        return new SavedMissionDetails.Input("Mission A",new SavedMissionDetails.Room(UUID.randomUUID().toString(),2,"Room A",document.toString()));
    }
    @Test void savedSnapshotRoundTripsWithinStorageLimitsAndReplacesAllOldChunks() {
        var storage=new Storage();var document=room();var input=details(document);
        document.addProperty("supervisorToken","discard");
        SavedMissionDetails.write(storage,input,4);
        var restored=SavedMissionDetails.read(storage.toMap());
        assertEquals(4,restored.configuredRevision());assertEquals(input.name(),restored.name());
        assertEquals(input.room().id(),restored.room().id());assertEquals(2,restored.room().revision());
        assertEquals(room(),JsonParser.parseString(restored.room().configuration()));
        storage.toMap().values().forEach(value->assertTrue(value.toString().length()<=2048));
        var shorter=room();shorter.getAsJsonObject("room").getAsJsonArray("objects").remove(2);
        SavedMissionDetails.write(storage,details(shorter),5);
        assertEquals(2,JsonParser.parseString(SavedMissionDetails.read(storage.toMap()).room().configuration()).getAsJsonObject().getAsJsonObject("room").getAsJsonArray("objects").size());
        SavedMissionDetails.clear(storage);assertNull(SavedMissionDetails.read(storage.toMap()));assertTrue(storage.toMap().isEmpty());
    }
    @Test void geometryCollisionsWrongTypesAndInvalidNamesAreRejectedBeforeWriting() {
        for(String field:new String[]{"width","height","schemaVersion","revision"}) {
            var bad=room();bad.getAsJsonObject("room").addProperty(field,-1);
            assertThrows(IllegalArgumentException.class,()->SavedMissionDetails.validate(details(bad)));
        }
        var robotBad=room();robotBad.getAsJsonObject("room").getAsJsonObject("robot").addProperty("heading",4);
        assertThrows(IllegalArgumentException.class,()->SavedMissionDetails.validate(details(robotBad)));
        var bad=room();bad.getAsJsonObject("room").addProperty("smoke","true");
        var wrongType=bad;assertThrows(IllegalArgumentException.class,()->SavedMissionDetails.validate(details(wrongType)));
        var collision=room();collision.getAsJsonObject("room").getAsJsonArray("objects").get(0).getAsJsonObject().addProperty("x",0);
        collision.getAsJsonObject("room").getAsJsonArray("objects").get(0).getAsJsonObject().addProperty("y",1);
        assertThrows(IllegalArgumentException.class,()->SavedMissionDetails.validate(details(collision)));
        var input=details(room());
        assertThrows(IllegalArgumentException.class,()->SavedMissionDetails.validate(new SavedMissionDetails.Input(" ",input.room())));
        assertThrows(IllegalArgumentException.class,()->SavedMissionDetails.validateConfiguration(" ".repeat(65537)));
    }
    @Test void unknownAuthorityFieldsAreStrippedAndLShapeWallSlotsAreSupported() {
        var document=room();document.addProperty("supervisorToken","discard");
        document.getAsJsonObject("room").addProperty("ready",true);
        document.getAsJsonObject("room").getAsJsonObject("robot").addProperty("credential","discard");
        assertEquals(room(),JsonParser.parseString(SavedMissionDetails.validateConfiguration(document.toString())));
        var corner=room();var door=corner.getAsJsonObject("room").getAsJsonArray("objects").get(0).getAsJsonObject();
        door.addProperty("x",3);door.addProperty("y",5);
        assertDoesNotThrow(()->SavedMissionDetails.validateConfiguration(corner.toString()));
        door.addProperty("x",2);
        assertThrows(IllegalArgumentException.class,()->SavedMissionDetails.validateConfiguration(corner.toString()));
    }
}
