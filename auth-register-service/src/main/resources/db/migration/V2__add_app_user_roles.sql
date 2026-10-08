CREATE TABLE app_user_roles (
    user_id UUID NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL,
    PRIMARY KEY (user_id, role),
    CONSTRAINT ck_app_user_roles_role CHECK (role IN ('ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_DEVELOPER', 'ROLE_SUPPORT'))
);

INSERT INTO app_user_roles (user_id, role)
SELECT id, role FROM app_users;

CREATE INDEX idx_app_user_roles_role ON app_user_roles (role);