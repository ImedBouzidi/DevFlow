# Requirements traceability

This table records how the inspected source requirements map to the first implementation slice.

| Source requirement | Implementation in this repository | Status |
| --- | --- | --- |
| FR-01 Authentication and authorization | Keycloak realm, Angular PKCE flow, gateway JWT resource server, `ROLE_*` mapping, protected routes | Foundation complete |
| FR-02 Incident creation | Registration and incident-list UI placeholder | UI placeholder; API next |
| FR-03 Incident lifecycle | Dashboard/incident status vocabulary (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `BLOCKED`, `CANCELLED`, `REOPENED`) | Domain API next |
| FR-04 Assignment | `assignee` shown in UI | Domain API next |
| FR-05 AI incident analysis | AI insight cards and advisory copy in UI | AI service next |
| FR-06 Similar incident detection | Similar-incident preview in UI | Qdrant service next |
| FR-07 Knowledge-base search | Navigation placeholder | Knowledge service next |
| FR-08 AI investigation assistance | Investigation guidance represented in incident preview | AI service next |
| FR-09 Incident comments | Comment affordance in incident preview | Domain API next |
| FR-10 Incident resolution | Resolution/closure vocabulary in UI | Domain API next |
| FR-11 Incident closure | Status/closure model reserved | Domain API next |
| FR-12 Post-mortem generation | Navigation/UI concept reserved | Workflow service next |
| FR-13 Service monitoring | Platform health and service-health shell | Metrics integration next |
| FR-14 Automatic incident creation | Monitoring concept reserved in architecture | Adapter next |
| FR-15 Notifications | Notification affordance and event boundary in architecture | n8n/Kafka next |
| FR-16 Dashboard/reporting | Operations dashboard with KPIs, severity, service, and critical incident panels | UI complete with sample data |
| FR-17 User management | Keycloak users and `ROLE_SUPPORT` default registration | Administration APIs next |
| FR-18 Project/service management | Service vocabulary in UI/architecture | Administration APIs next |
| FR-19 Knowledge-base management | Navigation placeholder | Knowledge service next |
| NFR-01 Security | OIDC, JWT validation, RBAC, validation, no password persistence | Foundation complete |
| NFR-02 Availability | AI explicitly deferred so core incident operations remain independent | Architecture decision |
| NFR-03 Scalability | Independent Maven modules and Eureka/Gateway boundaries | Foundation complete |
| NFR-04 Observability | Actuator health on all Spring services | Foundation complete; Prometheus next |
| NFR-05 Maintainability | Clear auth, edge, discovery, and frontend boundaries | Foundation complete |
| NFR-06 Reliability | Registration compensation and future event/retry boundaries | Partial |
| NFR-07 Performance | Lazy-loaded standalone Angular routes; AI excluded from core path | Partial |

## Role model

| Role | Intended capability |
| --- | --- |
| `ROLE_SUPPORT` | Create, view, comment, and follow incidents |
| `ROLE_DEVELOPER` | Investigate, search, update technical fields, resolve |
| `ROLE_MANAGER` | Assign, monitor workload, validate resolution/closure |
| `ROLE_ADMIN` | Manage users, roles, projects, services, and knowledge |

The frontend exposes the current roles and protects the application shell. Fine-grained incident authorization belongs in the future incident service rather than being implied by navigation visibility.
