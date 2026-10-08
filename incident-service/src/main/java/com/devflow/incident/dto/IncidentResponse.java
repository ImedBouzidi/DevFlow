package com.devflow.incident.dto;

import com.devflow.incident.domain.Incident;
import com.devflow.incident.domain.IncidentCategory;
import com.devflow.incident.domain.IncidentEnvironment;
import com.devflow.incident.domain.IncidentLabels;
import com.devflow.incident.domain.IncidentOrigin;
import com.devflow.incident.domain.IncidentSeverity;
import com.devflow.incident.domain.IncidentStatus;
import com.devflow.incident.domain.InitialContext;
import com.devflow.incident.domain.Resolution;

import java.time.OffsetDateTime;

public record IncidentResponse(
        Long id,
        String incidentId,
        String title,
        String description,
        IncidentStatus status,
        IncidentSeverity severity,
        IncidentCategory category,
        String service,
        IncidentEnvironment environment,
        IncidentOrigin origin,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime resolvedAt,
        InitialContext initialContext,
        Resolution resolution,
        IncidentLabels labels
) {
    public static IncidentResponse from(Incident incident) {
        return new IncidentResponse(
                incident.getId(),
                incident.getIncidentId(),
                incident.getTitle(),
                incident.getDescription(),
                incident.getStatus(),
                incident.getSeverity(),
                incident.getCategory(),
                incident.getService(),
                incident.getEnvironment(),
                incident.getOrigin(),
                incident.getCreatedAt(),
                incident.getUpdatedAt(),
                incident.getResolvedAt(),
                incident.getInitialContext(),
                incident.getResolution(),
                incident.getLabels()
        );
    }
}
