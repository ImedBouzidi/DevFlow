-- ============================================================
-- V1: Create incidents table
-- ============================================================

CREATE TABLE incidents
(
    -- Primary key
    id          BIGSERIAL PRIMARY KEY,
    incident_id VARCHAR(20)  NOT NULL UNIQUE,

    -- Core fields
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      VARCHAR(20)  NOT NULL,
    severity    VARCHAR(20)  NOT NULL,
    category    VARCHAR(30)  NOT NULL,
    service     VARCHAR(100) NOT NULL,
    environment VARCHAR(20)  NOT NULL,
    origin      VARCHAR(20)  NOT NULL,

    -- Timestamps
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    -- Initial context (embedded)
    ctx_error_code         VARCHAR(100),
    ctx_http_status        INT,
    ctx_cpu_percent        DOUBLE PRECISION,
    ctx_memory_percent     DOUBLE PRECISION,
    ctx_latency_ms         INT,
    ctx_error_rate_percent DOUBLE PRECISION,
    ctx_affected_users     INT,
    ctx_is_business_hours  BOOLEAN,
    ctx_is_weekend         BOOLEAN,

    -- Resolution (embedded)
    res_root_cause             VARCHAR(500),
    res_action                 VARCHAR(500),
    res_resolution_time_hours  DOUBLE PRECISION,

    -- ML labels (embedded)
    label_severity_target              VARCHAR(20),
    label_category_target              VARCHAR(30),
    label_resolution_time_target_hours DOUBLE PRECISION
);

-- Indexes for common filter queries
CREATE INDEX idx_incidents_status      ON incidents (status);
CREATE INDEX idx_incidents_severity    ON incidents (severity);
CREATE INDEX idx_incidents_category    ON incidents (category);
CREATE INDEX idx_incidents_environment ON incidents (environment);
CREATE INDEX idx_incidents_service     ON incidents (service);
CREATE INDEX idx_incidents_created_at  ON incidents (created_at DESC);
