# DevFlow AI Platform

Angular and Spring Boot services for DevFlow's incident-management platform, with Keycloak authentication and a Flask/scikit-learn analysis API.

## Services

- `frontend`: Angular application served by Nginx; proxies `/api` to the gateway.
- `api-gateway`: JWT-validating Spring Cloud Gateway on port `9090`.
- `discovery-server`: Eureka on port `8761`.
- `auth-register-service`: Keycloak-backed profile and user APIs on port `8082`.
- `incident-service`: PostgreSQL-backed incident API on port `8083`.
- `ai-analysis-server`: Flask predictions API on port `5000`.
- `postgres`: separate `devflow_auth` and `devflow` databases.
- `keycloak`: imported `devflow` realm on port `9091`.

## Run the complete stack

Requirements: Docker Engine and Docker Compose v2.

```bash
cp .env.example .env
docker compose -f infrastructure/docker-compose.yml up --build -d
docker compose -f infrastructure/docker-compose.yml ps
```

Open <http://localhost:4200>. Keycloak administration is at <http://localhost:9091/admin>, the gateway at <http://localhost:9090>, and Eureka at <http://localhost:8761>. Compose waits for healthy dependencies and provisions both databases, including when the existing PostgreSQL volume has already been initialized.

```bash
docker compose -f infrastructure/docker-compose.yml logs -f
docker compose -f infrastructure/docker-compose.yml down
```

Database data persists in the `devflow-postgres-data` volume. `down` does not remove that volume.

The checked-in realm, bootstrap users, and `.env.example` values are local-development defaults only. For deployments, replace all passwords/client secrets and use a secret manager. The frontend and realm are configured for `localhost:4200` and Keycloak `localhost:9091`; changing those ports requires updating the realm and frontend environment before image build.

## Build and tests

```bash
mvn -B clean verify
cd frontend && npm ci && npm run build
cd ../ai-analysis-server && python3 -m pip install -r requirements-dev.txt && python3 -m pytest -q
```

## Jenkins

The root [Jenkinsfile](Jenkinsfile) runs backend tests, Angular build, AI tests, Compose validation, and builds all container images. Its Jenkins agent needs Java 17, Maven, Node.js 22/npm, Python 3, Docker Compose v2, and permission to access the Docker daemon.

See [infrastructure/README.md](infrastructure/README.md) for service configuration and deployment notes.
