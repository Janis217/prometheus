package ch.zhaw.prometheus.model.disaster;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import com.google.gson.*;
import ch.zhaw.prometheus.model.Storage;

/** Immutable room snapshot saved with a task; not an execution authorization. */
public final class SavedMissionDetails {
    public static final String KEY = "saved_mission";
    private static final String CHUNK = KEY + ".room.";
    public record Room(String id, int revision, String name, String configuration) {}
    public record Input(String name, Room room) {}
    public record Saved(String name, Room room, int configuredRevision) {}
    private SavedMissionDetails() {}

    public static Input validate(Input input) {
        if (input == null || input.room() == null) throw new IllegalArgumentException("Select a saved room.");
        var selected = input.room();
        if (selected.id() == null || !UUID.fromString(selected.id()).toString().equals(selected.id()) || selected.revision() < 1)
            throw new IllegalArgumentException("Invalid saved room identity.");
        var layout = validateConfiguration(selected.configuration());
        return new Input(name(input.name()), new Room(selected.id(), selected.revision(), name(selected.name()), layout));
    }
    private static String name(String value) {
        if (value == null || value.isBlank() || value.strip().length() > 80) throw new IllegalArgumentException("Invalid name.");
        return value.strip();
    }
    public static void write(Storage storage, Input input, int revision) {
        var validated = validate(input);
        // StorageEntry values are limited to 2048 characters. Canonical layout
        // chunks stay below that limit even after JSON string escaping.
        for (String key : storage.toMap().keySet()) if (key.startsWith(CHUNK)) storage.remove(key);
        String configuration = validated.room().configuration();
        int chunks = (configuration.length() + 799) / 800;
        var metadata = new JsonObject();
        metadata.addProperty("name", validated.name());
        metadata.addProperty("roomId", validated.room().id());
        metadata.addProperty("roomRevision", validated.room().revision());
        metadata.addProperty("roomName", validated.room().name());
        metadata.addProperty("configuredRevision", revision);
        metadata.addProperty("chunks", chunks);
        storage.put(KEY, metadata);
        for (int i = 0; i < chunks; i++) storage.put(CHUNK + i,
                new JsonPrimitive(configuration.substring(i * 800, Math.min(configuration.length(), (i + 1) * 800))));
    }
    public static Saved read(Map<String, JsonElement> storage) {
        if (!storage.containsKey(KEY)) return null;
        var meta = storage.get(KEY).getAsJsonObject();
        var text = new StringBuilder();
        int chunks = integer(meta, "chunks");
        if (chunks < 1 || chunks > 82) throw new IllegalArgumentException("Invalid saved room chunks.");
        for (int i = 0; i < chunks; i++) text.append(storage.get(CHUNK + i).getAsString());
        var input = validate(new Input(string(meta, "name"), new Room(string(meta, "roomId"),
                integer(meta, "roomRevision"), string(meta, "roomName"), text.toString())));
        return new Saved(input.name(), input.room(), integer(meta, "configuredRevision"));
    }
    public static void clear(Storage storage) {
        for (String key : storage.toMap().keySet()) if (key.equals(KEY) || key.startsWith(CHUNK)) storage.remove(key);
    }
    public static String validateConfiguration(String text) {
        if (text == null || text.getBytes(StandardCharsets.UTF_8).length > 65536) throw new IllegalArgumentException("Room exceeds 64 KB.");
        try {
            var document = JsonParser.parseString(text).getAsJsonObject();
            if (!string(document, "format").equals("prometheus.room-scenario") || integer(document, "version") != 1)
                throw new IllegalArgumentException("Unsupported room file.");
            var room = document.getAsJsonObject("room");
            String shape = string(room, "shape");
            int width = switch (shape) { case "square" -> 6; case "rectangle", "l_shaped" -> 8; default -> 0; };
            int height = switch (shape) { case "square" -> 6; case "rectangle" -> 5; case "l_shaped" -> 8; default -> 0; };
            if (width == 0 || integer(room, "schemaVersion") != 1 || integer(room, "width") != width || integer(room, "height") != height)
                throw new IllegalArgumentException("Invalid room geometry.");
            int revision = integer(room, "revision");
            if (revision < 0 || revision > 1000000) throw new IllegalArgumentException("Invalid layout revision.");
            var result = new JsonObject();
            result.addProperty("schemaVersion", 1); result.addProperty("shape", shape);
            result.addProperty("width", width); result.addProperty("height", height);
            result.addProperty("revision", revision); result.addProperty("smoke", bool(room, "smoke"));
            var robot = room.getAsJsonObject("robot");
            int rx = integer(robot, "x"), ry = integer(robot, "y"), heading = integer(robot, "heading");
            if (!inside(shape, width, height, rx, ry) || heading < 0 || heading > 3) throw new IllegalArgumentException("Invalid robot pose.");
            var pose = new JsonObject(); pose.addProperty("x", rx); pose.addProperty("y", ry); pose.addProperty("heading", heading);
            result.add("robot", pose);
            var objects = room.getAsJsonArray("objects");
            if (objects.size() > width * height) throw new IllegalArgumentException("Too many objects.");
            var ids = new HashSet<String>(); var slots = new HashSet<String>(); slots.add(rx + "," + ry);
            var clean = new JsonArray();
            for (var element : objects) {
                var object = element.getAsJsonObject();
                String type = string(object, "type"), id = string(object, "id");
                int x = integer(object, "x"), y = integer(object, "y");
                if (!Set.of("door", "window", "fire_picture", "picture", "chair", "table").contains(type)
                        || !inside(shape, width, height, x, y) || !slots.add(x + "," + y)
                        || !id.matches("object-[1-9][0-9]{0,6}") || Integer.parseInt(id.substring(7)) > revision || !ids.add(id))
                    throw new IllegalArgumentException("Invalid room object.");
                if (Set.of("door", "window", "fire_picture", "picture").contains(type)
                        && inside(shape,width,height,x-1,y) && inside(shape,width,height,x+1,y)
                        && inside(shape,width,height,x,y-1) && inside(shape,width,height,x,y+1))
                    throw new IllegalArgumentException("Wall object needs a boundary slot.");
                var item = new JsonObject(); item.addProperty("id", id); item.addProperty("type", type);
                item.addProperty("x", x); item.addProperty("y", y);
                if (type.equals("door")) { item.addProperty("locked", bool(object,"locked")); item.addProperty("open", bool(object,"open")); }
                clean.add(item);
            }
            result.add("objects", clean);
            var normalized = new JsonObject(); normalized.addProperty("format", "prometheus.room-scenario");
            normalized.addProperty("version", 1); normalized.add("room", result);
            return normalized.toString();
        } catch (RuntimeException invalid) { throw new IllegalArgumentException("Invalid room configuration.", invalid); }
    }
    private static boolean inside(String shape, int width, int height, int x, int y) {
        return x >= 0 && y >= 0 && x < width && y < height && !(shape.equals("l_shaped") && x >= 4 && y >= 4);
    }
    private static String string(JsonObject object, String key) {
        var value = object.getAsJsonPrimitive(key);
        if (value == null || !value.isString()) throw new IllegalArgumentException("Expected string.");
        return value.getAsString();
    }
    private static int integer(JsonObject object, String key) {
        var value = object.getAsJsonPrimitive(key);
        if (value == null || !value.isNumber()) throw new IllegalArgumentException("Expected integer.");
        return value.getAsBigDecimal().intValueExact();
    }
    private static boolean bool(JsonObject object, String key) {
        var value = object.getAsJsonPrimitive(key);
        if (value == null || !value.isBoolean()) throw new IllegalArgumentException("Expected boolean.");
        return value.getAsBoolean();
    }
}
