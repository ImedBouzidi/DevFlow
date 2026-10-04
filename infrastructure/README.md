# Local infrastructure

This compose project provides the dependencies used by the initial DevFlow platform:

- PostgreSQL on `localhost:5432` for the auth/register service.
- Keycloak on `localhost:8081` with the `devflow` realm and OIDC clients preconfigured.

```bash
cp .env.example .env
docker compose up -d
docker compose ps
```

The imported client secret is a **local-development default only**. Replace the realm client configuration and `KEYCLOAK_ADMIN_CLIENT_SECRET` together outside local development.

Useful endpoints:

- Keycloak administration: <http://localhost:8081/admin>
- DevFlow realm: <http://localhost:8081/realms/devflow>
- Health: <http://localhost:8081/health/ready>
