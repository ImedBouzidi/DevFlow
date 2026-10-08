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
public class InitialContext {

    @Column(name = "ctx_error_code", length = 100)
    private String errorCode;

    @Column(name = "ctx_http_status")
    private Integer httpStatus;

    @Column(name = "ctx_cpu_percent")
    private Double cpuPercent;

    @Column(name = "ctx_memory_percent")
    private Double memoryPercent;

    @Column(name = "ctx_latency_ms")
    private Integer latencyMs;

    @Column(name = "ctx_error_rate_percent")
    private Double errorRatePercent;

    @Column(name = "ctx_affected_users")
    private Integer affectedUsers;

    @Column(name = "ctx_is_business_hours")
    private Boolean isBusinessHours;

    @Column(name = "ctx_is_weekend")
    private Boolean isWeekend;
}
