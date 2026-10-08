package com.devflow.incident.controller;

import com.devflow.incident.domain.IncidentCategory;
import com.devflow.incident.domain.IncidentEnvironment;
import com.devflow.incident.domain.IncidentSeverity;
import com.devflow.incident.domain.IncidentStatus;
import com.devflow.incident.dto.CreateIncidentRequest;
import com.devflow.incident.dto.IncidentResponse;
import com.devflow.incident.dto.UpdateIncidentRequest;
import com.devflow.incident.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/incidents")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService service;

    // ── List / search ─────────────────────────────────────────────────────────

    @GetMapping
    public Page<IncidentResponse> list(
            @RequestParam(required = false) IncidentStatus status,
            @RequestParam(required = false) IncidentSeverity severity,
            @RequestParam(required = false) IncidentCategory category,
            @RequestParam(required = false) IncidentEnvironment environment,
            @RequestParam(required = false) String serviceName,
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        if (status != null)       return service.findByStatus(status, pageable);
        if (severity != null)     return service.findBySeverity(severity, pageable);
        if (category != null)     return service.findByCategory(category, pageable);
        if (environment != null)  return service.findByEnvironment(environment, pageable);
        if (serviceName != null)  return service.findByService(serviceName, pageable);
        return service.findAll(pageable);
    }

    // ── Single incident ───────────────────────────────────────────────────────

    @GetMapping("/{incidentId}")
    public IncidentResponse getById(@PathVariable String incidentId) {
        return service.findByIncidentId(incidentId);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentResponse create(@Valid @RequestBody CreateIncidentRequest request) {
        return service.create(request);
    }

    // ── Update (partial patch) ────────────────────────────────────────────────

    @PutMapping("/{incidentId}")
    public IncidentResponse update(
            @PathVariable String incidentId,
            @RequestBody UpdateIncidentRequest request
    ) {
        return service.update(incidentId, request);
    }

    // ── Status transitions ────────────────────────────────────────────────────

    @PatchMapping("/{incidentId}/in-progress")
    public IncidentResponse markInProgress(@PathVariable String incidentId) {
        return service.markInProgress(incidentId);
    }

    @PatchMapping("/{incidentId}/close")
    public IncidentResponse close(@PathVariable String incidentId) {
        return service.close(incidentId);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @DeleteMapping("/{incidentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String incidentId) {
        service.delete(incidentId);
    }
}
