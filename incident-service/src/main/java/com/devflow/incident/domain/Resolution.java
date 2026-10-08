package com.devflow.incident.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Resolution {

    @Column(name = "res_root_cause", length = 500)
    private String rootCause;

    @Column(name = "res_action", length = 500)
    private String action;

    @Column(name = "res_resolution_time_hours")
    private Double resolutionTimeHours;
}
