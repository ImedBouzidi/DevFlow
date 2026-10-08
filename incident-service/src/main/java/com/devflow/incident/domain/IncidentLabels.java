package com.devflow.incident.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * ML prediction targets stored alongside each incident.
 * These mirror the JSON `labels` block and are used by the ai-analysis-server
 * for training severity / category / resolution-time models.
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IncidentLabels {

    @Enumerated(EnumType.STRING)
    @Column(name = "label_severity_target", length = 20)
    private IncidentSeverity severityTarget;

    @Enumerated(EnumType.STRING)
    @Column(name = "label_category_target", length = 30)
    private IncidentCategory categoryTarget;

    @Column(name = "label_resolution_time_target_hours")
    private Double resolutionTimeTargetHours;
}
