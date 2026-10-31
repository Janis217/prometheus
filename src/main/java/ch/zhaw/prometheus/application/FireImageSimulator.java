package ch.zhaw.prometheus.application;

import org.springframework.stereotype.Component;
import ch.zhaw.prometheus.spi.MissionExecutor;

/** Scripted printed-indicator inspection, no sensors, network endpoints or movement. */
@Component
public class FireImageSimulator implements MissionExecutor {
    @Override public Feedback next(Mission mission, int sequence, int cursor, String variant) {
        var snapshot = com.google.gson.JsonParser.parseString(mission.missionJson()).getAsJsonObject();
        if (!"R-204".equals(ch.zhaw.prometheus.model.disaster.DisasterMission.text(snapshot, "location")))
            throw new IllegalArgumentException("Unsupported simulator snapshot");
        String kind = switch (cursor) {
            case 0 -> "accepted";
            case 1 -> "progress";
            case 2 -> switch (variant) {
                case "obstacle" -> "obstacle";
                case "failure" -> "failure";
                case "timeout" -> "timeout";
                default -> "complete";
            };
            case 3 -> "progress";
            default -> "complete";
        };
        return new Feedback(mission.executionId(), sequence, kind);
    }
}
