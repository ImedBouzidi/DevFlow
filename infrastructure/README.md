# Container stack

The Compose project builds and runs the complete local platform:

- Angular frontend served by Nginx
- API gateway, Eureka discovery, auth/register, and incident services
- Flask AI analysis API and its scikit-learn model artifacts
- PostgreSQL with separate `devflow_auth` and `devflow` databases
- Keycloak with the checked-in development realm import

## Start

From the repository root:

```bash
cp .env.example .env
docker compose -f infrastructure/docker-compose.yml config --quiet
docker compose -f infrastructure/docker-compose.yml up --build -d
docker compose -f infrastructure/docker-compose.yml ps
```

Open the app at <http://localhost:4200>. The gateway is at <http://localhost:9090>, Keycloak at <http://localhost:9091>, and Eureka at <http://localhost:8761>. PostgreSQL is published on port `5432` for local inspection. Service-to-service ports are not published.

To follow logs or stop the stack:

```bash
docker compose -f infrastructure/docker-compose.yml logs -f
docker compose -f infrastructure/docker-compose.yml down
```

PostgreSQL data is stored in the named `devflow-postgres-data` volume. The `postgres-bootstrap` one-shot service creates both application databases idempotently, including when the volume already existed before this stack was introduced.

## Configuration

Compose reads the repository-root `.env`. The defaults in `.env.example` are for local development only. The imported realm's confidential service-client secret and `KEYCLOAK_ADMIN_CLIENT_SECRET` must match. Replace development credentials and configure an external secret store before deployment.

The Angular production bundle is configured for Keycloak at `http://localhost:9091` and its imported OIDC client allows `http://localhost:4200`; changing those published ports requires updating the realm and frontend environment before building.

Spring services validate tokens against the public issuer `http://localhost:9091/realms/devflow` and fetch signing keys from Keycloak's internal Compose address. This keeps issuer validation consistent with tokens issued to the browser without routing container-to-container traffic through the host.

## CI

`Jenkinsfile` expects a Jenkins agent with Java 17, Maven, Node.js 22/npm, Python 3, and Docker Compose v2. It runs Maven tests, builds the Angular app, runs AI API tests, validates Compose, and builds every image. Docker daemon access is required for the image-build stage.
