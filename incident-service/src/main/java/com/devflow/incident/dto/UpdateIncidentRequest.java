package com.devflow.incident.dto;

import com.devflow.incident.domain.IncidentCategory;
import com.devflow.incident.domain.IncidentEnvironment;
import com.devflow.incident.domain.IncidentLabels;
import com.devflow.incident.domain.IncidentSeverity;
import com.devflow.incident.domain.Resolution;

public record UpdateIncidentRequest(
        String title,
        String description,
        IncidentSeverity severity,
        IncidentCategory category,
        String service,
        IncidentEnvironment environment,
        Resolution resolution,
        IncidentLabels labels
) {}
