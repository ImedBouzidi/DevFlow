# DevFlow AI Platform

DevFlow AI is an intelligent incident and engineering-operations platform. The source documents describe incident intake, lifecycle management, AI-assisted investigation, similar-incident retrieval, knowledge-base RAG, notifications, monitoring, dashboards, and role-based access.

This repository implements the requested first platform slice:

- **Angular 19 standalone web app** with Keycloak Authorization Code + PKCE, reactive login/registration flows, protected routes, and responsive operations/incident screens based on the supplied mockups.
- **Spring Boot 3.5.16 / Spring Cloud 2025.0.3** services:
  - `discovery-server` — Eureka Server.
  - `api-gateway` — reactive Spring Cloud Gateway and OAuth2 resource server.
  - `auth-register-service` — Keycloak-backed registration and current-user API backed by PostgreSQL/Flyway.
- **Local infrastructure** for PostgreSQL and Keycloak, including a development realm and sample users.

> The dashboard and incident screens currently use clearly marked representative UI data. The incident-management write/API service, AI analysis, vector search, Kafka workflows, and n8n integrations are intentionally the next vertical slices.

## Repository layout

```text
devflow-platform/
├── api-gateway/                  # Spring Cloud Gateway + Keycloak JWT validation
├── auth-register-service/        # Registration, current user, Keycloak Admin API, PostgreSQL
├── discovery-server/             # Eureka Server
├── frontend/                     # Angular 19 standalone application
├── infrastructure/
│   ├── docker-compose.yml        # PostgreSQL + Keycloak
│   └── keycloak/devflow-realm.json
├── docs/                         # Architecture and requirements traceability
├── Makefile
└── pom.xml
```

## Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 20.11+ (the repository includes `.nvmrc`)
- Docker with Compose v2

## Run locally

### 1. Start infrastructure

```bash
cp infrastructure/.env.example infrastructure/.env
docker compose -f infrastructure/docker-compose.yml up -d
```

Keycloak and PostgreSQL are then available at:

- Keycloak administration: <http://localhost:8081/admin>
- DevFlow realm: <http://localhost:8081/realms/devflow>
- PostgreSQL: `localhost:5432`, database `devflow`

The imported development service-account secret is `devflow-local-change-me`. It is only for local development; rotate it and use an external secret store outside local development.

If a local port is already occupied, set `POSTGRES_PORT`/`KEYCLOAK_PORT` in `infrastructure/.env` and provide the matching `DB_URL` and `KEYCLOAK_ADMIN_BASE_URL`/`KEYCLOAK_ISSUER_URI` to the Spring services.

### 2. Start Eureka

In terminal 1:

```bash
mvn -pl discovery-server spring-boot:run
```

Eureka dashboard: <http://localhost:8761>

### 3. Start the gateway and auth service

Load the local environment in terminals 2 and 3:

```bash
set -a
source infrastructure/.env
set +a
```

Terminal 2:

```bash
mvn -pl api-gateway spring-boot:run
```

Terminal 3:

```bash
mvn -pl auth-register-service spring-boot:run
```

The gateway listens on `http://localhost:8080`; the auth service listens directly on `http://localhost:8082`.

### 4. Start Angular

```bash
cd frontend
npm install
npm start
```

Open <http://localhost:4200>. The Angular dev server proxies `/api` to the gateway.

### Development users

The imported Keycloak realm contains these local-only users. All use `Devflow123!`:

| Username | Role |
| --- | --- |
| `admin` | `ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_DEVELOPER`, `ROLE_SUPPORT` |
| `manager` | `ROLE_MANAGER`, `ROLE_DEVELOPER` |
| `developer` | `ROLE_DEVELOPER` |
| `support` | `ROLE_SUPPORT` |

Users created through the DevFlow registration form are created in Keycloak and PostgreSQL with the default `ROLE_SUPPORT`. Keycloak will require a permanent password update for newly registered users.

## Useful commands

```bash
# Build and test all Maven modules
mvn clean verify

# Build and test the frontend
cd frontend
npm run build
npm run test:ci
```

Convenience targets are also available from the project root:

```bash
make infra-up
make infra-logs
make discovery
make api-gateway
make auth-service
make frontend
make verify
```

Stop dependencies with:

```bash
docker compose -f infrastructure/docker-compose.yml down
```

## API surface

The gateway routes the auth API to the Eureka service ID `AUTH-REGISTER-SERVICE`:

| Method | Path | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Public | Create a Keycloak + PostgreSQL support account |
| `GET` | `/api/auth/me` | Keycloak bearer token | Return the current local user profile |
| `GET` | `/actuator/health` | Public | Service health |

Registration validates strong passwords and returns RFC 9457-style problem details for validation, conflicts, and identity-provider failures. If PostgreSQL persistence fails after Keycloak creation, the service attempts a compensating Keycloak deletion. Passwords are never persisted in the application database.

Login is intentionally **not** implemented as a password endpoint in the application. The browser uses Keycloak's Authorization Code + PKCE flow, and the gateway validates the resulting JWT using the configured Keycloak issuer.

## Configuration

The most important environment variables are:

| Variable | Default | Used by |
| --- | --- | --- |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | none | auth/register service; required for Keycloak Admin API |
| `KEYCLOAK_ADMIN_BASE_URL` | `http://localhost:8081` | auth/register service |
| `KEYCLOAK_ISSUER_URI` | `http://localhost:8081/realms/devflow` | gateway and auth/register service |
| `DB_URL` | `jdbc:postgresql://localhost:5432/devflow` | auth/register service |
| `DB_USERNAME` / `DB_PASSWORD` | `devflow` / `devflow` | auth/register service |
| `EUREKA_SERVICE_URL` | `http://localhost:8761/eureka/` | gateway and auth/register service |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:4200` | gateway and auth/register service |

Frontend endpoints are compile-time environment values in `frontend/src/environments/`. Change the Keycloak URL and client ID before deploying to another environment.

## Verification

The current implementation has been checked with:

- `mvn clean verify` (Maven modules and unit tests)
- `npm run build` (Angular production build)
- `npm run test:ci` (Angular Chrome Headless test)

The Angular build uses Angular 19.2.x and the backend uses Spring Boot 3.5.x as requested. The original technology-stack image mentioned React/FastAPI; this project intentionally follows the explicit Angular 19/Spring Boot 3.5 implementation request.

## Next implementation slices

1. Add `incident-service` with lifecycle, comments, assignment, resolution, closure, and audit APIs.
2. Add Kafka event contracts and an n8n notification adapter.
3. Add the AI analysis service and Qdrant-backed similar-incident/knowledge-base retrieval.
4. Add Prometheus/Actuator metrics and a service-health view.
5. Add deployment manifests and CI/CD after the application contracts stabilize.
