package ch.zhaw.prometheus.spi;

import java.util.UUID;

/** Bounded execution feedback boundary. This milestone has only an in-process simulation implementation. */
public interface MissionExecutor {
    record Feedback(UUID executionId, int sequence, String kind) {}
    record Mission(UUID executionId, int revision, int reviewVersion, String safetyReference, String missionJson) {}
    Feedback next(Mission mission, int sequence, int cursor, String variant);
}
