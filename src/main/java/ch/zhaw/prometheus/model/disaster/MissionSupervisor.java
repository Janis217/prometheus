package ch.zhaw.prometheus.model.disaster;

import java.util.UUID;
import jakarta.persistence.*;

/** Admin-provisioned, individually identifiable demo reviewer; only a token digest is retained. */
@Entity
public class MissionSupervisor {
    @Id @GeneratedValue private UUID id;
    @Column(nullable = false) private UUID scopeId;
    @Column(nullable = false, length = 80) private String name;
    @Column(nullable = false, unique = true, length = 64) private String tokenDigest;
    @Column(nullable = false) private boolean enabled = true;
    protected MissionSupervisor() {}
    public MissionSupervisor(UUID scopeId, String name, String tokenDigest) {
        this.scopeId = scopeId; this.name = name; this.tokenDigest = tokenDigest;
    }
    public UUID getId() { return id; }
    public UUID getScopeId() { return scopeId; }
    public String getName() { return name; }
    public boolean isEnabled() { return enabled; }
    public void revoke() { enabled = false; }
}
