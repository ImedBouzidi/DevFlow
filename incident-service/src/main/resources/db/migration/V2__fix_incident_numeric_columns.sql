-- Fix historical schema created with NUMERIC columns so it matches the Double-based JPA model.
ALTER TABLE incidents
    ALTER COLUMN ctx_cpu_percent TYPE DOUBLE PRECISION USING ctx_cpu_percent::DOUBLE PRECISION,
    ALTER COLUMN ctx_memory_percent TYPE DOUBLE PRECISION USING ctx_memory_percent::DOUBLE PRECISION,
    ALTER COLUMN ctx_error_rate_percent TYPE DOUBLE PRECISION USING ctx_error_rate_percent::DOUBLE PRECISION,
    ALTER COLUMN res_resolution_time_hours TYPE DOUBLE PRECISION USING res_resolution_time_hours::DOUBLE PRECISION,
    ALTER COLUMN label_resolution_time_target_hours TYPE DOUBLE PRECISION USING label_resolution_time_target_hours::DOUBLE PRECISION;
