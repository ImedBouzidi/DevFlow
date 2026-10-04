CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    keycloak_user_id VARCHAR(36) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(32) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_app_users_role CHECK (role IN ('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DEVELOPER', 'ROLE_SUPPORT'))
);

CREATE INDEX idx_app_users_role ON app_users (role);
CREATE INDEX idx_app_users_enabled ON app_users (enabled);
