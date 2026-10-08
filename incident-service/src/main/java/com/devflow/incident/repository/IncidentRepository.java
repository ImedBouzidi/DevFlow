package com.devflow.incident.repository;

import com.devflow.incident.domain.Incident;
import com.devflow.incident.domain.IncidentCategory;
import com.devflow.incident.domain.IncidentEnvironment;
import com.devflow.incident.domain.IncidentSeverity;
import com.devflow.incident.domain.IncidentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {

    Optional<Incident> findByIncidentId(String incidentId);

    Page<Incident> findByStatus(IncidentStatus status, Pageable pageable);

    Page<Incident> findBySeverity(IncidentSeverity severity, Pageable pageable);

    Page<Incident> findByCategory(IncidentCategory category, Pageable pageable);

    Page<Incident> findByEnvironment(IncidentEnvironment environment, Pageable pageable);

    Page<Incident> findByService(String service, Pageable pageable);

    long countByStatus(IncidentStatus status);

    long countBySeverity(IncidentSeverity severity);
}
