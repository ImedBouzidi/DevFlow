package com.devflow.incident.service;

import com.devflow.incident.domain.Incident;
import com.devflow.incident.domain.IncidentCategory;
import com.devflow.incident.domain.IncidentEnvironment;
import com.devflow.incident.domain.IncidentSeverity;
import com.devflow.incident.domain.IncidentStatus;
import com.devflow.incident.domain.InitialContext;
import com.devflow.incident.dto.CreateIncidentRequest;
import com.devflow.incident.dto.IncidentResponse;
import com.devflow.incident.dto.UpdateIncidentRequest;
import com.devflow.incident.exception.IncidentNotFoundException;
import com.devflow.incident.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class IncidentService {

    private final IncidentRepository repository;

    // Simple in-memory counter for human-friendly IDs.
    // In production this would come from a DB sequence or an external ID service.
    private final AtomicLong counter = new AtomicLong(0);

    // ── Queries ──────────────────────────────────────────────────────────────

    public Page<IncidentResponse> findAll(Pageable pageable) {
        return repository.findAll(pageable).map(IncidentResponse::from);
    }

    public IncidentResponse findByIncidentId(String incidentId) {
        return IncidentResponse.from(getOrThrow(incidentId));
    }

    public Page<IncidentResponse> findByStatus(IncidentStatus status, Pageable pageable) {
        return repository.findByStatus(status, pageable).map(IncidentResponse::from);
    }

    public Page<IncidentResponse> findBySeverity(IncidentSeverity severity, Pageable pageable) {
        return repository.findBySeverity(severity, pageable).map(IncidentResponse::from);
    }

    public Page<IncidentResponse> findByCategory(IncidentCategory category, Pageable pageable) {
        return repository.findByCategory(category, pageable).map(IncidentResponse::from);
    }

    public Page<IncidentResponse> findByEnvironment(IncidentEnvironment environment, Pageable pageable) {
        return repository.findByEnvironment(environment, pageable).map(IncidentResponse::from);
    }

    public Page<IncidentResponse> findByService(String service, Pageable pageable) {
        return repository.findByService(service, pageable).map(IncidentResponse::from);
    }

    // ── Mutations ─────────────────────────────────────────────────────────────

    @Transactional
    public IncidentResponse create(CreateIncidentRequest req) {
        // Initialise counter from DB count on first call
        if (counter.get() == 0) {
            counter.set(repository.count());
        }
        String incidentId = "INC-%06d".formatted(counter.incrementAndGet());

        InitialContext ctx = null;
        if (req.initialContext() != null) {
            var r = req.initialContext();
            ctx = InitialContext.builder()
                    .errorCode(r.errorCode())
                    .httpStatus(r.httpStatus())
                    .cpuPercent(r.cpuPercent())
                    .memoryPercent(r.memoryPercent())
                    .latencyMs(r.latencyMs())
                    .errorRatePercent(r.errorRatePercent())
                    .affectedUsers(r.affectedUsers())
                    .isBusinessHours(r.isBusinessHours())
                    .isWeekend(r.isWeekend())
                    .build();
        }

        Incident incident = Incident.builder()
                .incidentId(incidentId)
                .title(req.title())
                .description(req.description())
                .status(IncidentStatus.OPEN)
                .severity(req.severity())
                .category(req.category())
                .service(req.service())
                .environment(req.environment())
                .origin(req.origin())
                .initialContext(ctx)
                .labels(req.labels())
                .build();

        return IncidentResponse.from(repository.save(incident));
    }

    @Transactional
    public IncidentResponse update(String incidentId, UpdateIncidentRequest req) {
        Incident incident = getOrThrow(incidentId);

        if (req.title() != null)        incident.setTitle(req.title());
        if (req.description() != null)  incident.setDescription(req.description());
        if (req.severity() != null)     incident.setSeverity(req.severity());
        if (req.category() != null)     incident.setCategory(req.category());
        if (req.service() != null)      incident.setService(req.service());
        if (req.environment() != null)  incident.setEnvironment(req.environment());
        if (req.resolution() != null)   incident.setResolution(req.resolution());
        if (req.labels() != null)       incident.setLabels(req.labels());

        return IncidentResponse.from(repository.save(incident));
    }

    @Transactional
    public IncidentResponse close(String incidentId) {
        Incident incident = getOrThrow(incidentId);
        incident.setStatus(IncidentStatus.CLOSED);
        incident.setResolvedAt(OffsetDateTime.now());
        return IncidentResponse.from(repository.save(incident));
    }

    @Transactional
    public IncidentResponse markInProgress(String incidentId) {
        Incident incident = getOrThrow(incidentId);
        incident.setStatus(IncidentStatus.IN_PROGRESS);
        return IncidentResponse.from(repository.save(incident));
    }

    @Transactional
    public void delete(String incidentId) {
        Incident incident = getOrThrow(incidentId);
        repository.delete(incident);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Incident getOrThrow(String incidentId) {
        return repository.findByIncidentId(incidentId)
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));
    }
}
