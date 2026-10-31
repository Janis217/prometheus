package ch.zhaw.prometheus.repositories;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ch.zhaw.prometheus.model.disaster.MissionSupervisor;

public interface MissionSupervisorRepository extends JpaRepository<MissionSupervisor, UUID> {
    Optional<MissionSupervisor> findByTokenDigest(String tokenDigest);
}
