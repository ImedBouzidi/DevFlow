package com.devflow.incident.dto;

import com.devflow.incident.domain.IncidentCategory;
import com.devflow.incident.domain.IncidentEnvironment;
import com.devflow.incident.domain.IncidentLabels;
import com.devflow.incident.domain.IncidentOrigin;
import com.devflow.incident.domain.IncidentSeverity;
import com.devflow.incident.domain.InitialContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateIncidentRequest(

        @NotBlank @Size(max = 255)
        String title,

        String description,

        @NotNull
        IncidentSeverity severity,

        @NotNull
        IncidentCategory category,

        @NotBlank @Size(max = 100)
        String service,

        @NotNull
        IncidentEnvironment environment,

        @NotNull
        IncidentOrigin origin,

        @Valid
        InitialContextRequest initialContext,

        IncidentLabels labels
) {
    public record InitialContextRequest(
            String errorCode,
            Integer httpStatus,
            Double cpuPercent,
            Double memoryPercent,
            Integer latencyMs,
            Double errorRatePercent,
            Integer affectedUsers,
            Boolean isBusinessHours,
            Boolean isWeekend
    ) {}
}
