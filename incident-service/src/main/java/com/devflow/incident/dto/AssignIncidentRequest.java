package com.devflow.incident.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AssignIncidentRequest(
        @NotBlank @Size(max = 100)
        String developerUsername
) {}