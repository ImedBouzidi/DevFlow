# DevFlow AI web app

Angular 19 standalone frontend for the DevFlow AI incident and engineering-operations platform.

## Run

From the repository root, start the local Keycloak/PostgreSQL infrastructure and the Spring services first. Then:

```bash
cd frontend
npm install
npm start
```

The development server runs on `http://localhost:4200` and proxies `/api` requests to `http://localhost:8080` through `proxy.conf.json`.

## Commands

```bash
npm run build
npm run test
npm run test:ci
```

The application uses standalone components, functional route guards, lazy-loaded feature routes, reactive forms, and `keycloak-js` Authorization Code + PKCE. Environment values live in `src/environments/`; replace the production Keycloak URL and client ID for a deployed environment.

The dashboard and incident detail content are representative UI fixtures until the incident-management API is added. This avoids presenting mock data as live operational data.
