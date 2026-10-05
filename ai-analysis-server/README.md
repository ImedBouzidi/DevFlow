# AI Analysis Server

Flask microservice of the DevFlow AI platform providing **advisory** incident
analysis: severity, category and resolution-time prediction backed by the
trained scikit-learn pipelines in `ml-models/`.

Predictions are advisory only — the platform requires human authorization for
severity changes, resolution and closure, and AI failures must never block
incident creation (see `../docs/architecture.md`).

## Project structure

```text
ai-analysis-server/
├── app/
│   ├── __init__.py                # Application factory (create_app)
│   ├── config.py                  # Environment-based configuration
│   ├── errors.py                  # RFC 9457 problem-detail error handling
│   ├── api/
│   │   ├── __init__.py            # Blueprint registration
│   │   ├── health.py              # /health, /ready (public)
│   │   └── predictions.py         # /api/v1/predictions/incident
│   ├── schemas/
│   │   └── prediction.py          # Request payload validation
│   └── services/
│       ├── model_registry.py      # Lazy, thread-safe joblib loading/caching
│       └── prediction_service.py  # Feature assembly + model scoring
├── ml-models/                     # Trained joblib artifacts
├── tests/                         # pytest suite
├── wsgi.py                        # Entrypoint (flask / gunicorn)
├── requirements.txt
├── requirements-dev.txt
└── .env.example
```

## Setup

Requires Python 3.11+.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env
```

> Keep the installed scikit-learn version aligned with the version that
> trained the artifacts in `ml-models/`; mismatches can break unpickling.

## Run

```bash
python wsgi.py
# or
flask --app wsgi run --debug
# production
gunicorn "wsgi:app" --bind 0.0.0.0:5000
```

## Test

```bash
pytest
```

## API

| Method | Path                          | Description                              |
|--------|-------------------------------|------------------------------------------|
| GET    | `/health`                     | Liveness probe                           |
| GET    | `/ready`                      | Readiness; verifies model artifacts load |
| POST   | `/api/v1/predictions/incident` | Advisory severity/category/time advice   |

### Prediction request

```json
{
  "title": "Suspicious authentication failures",
  "description": "Monitoring detected INVALID_TOKEN on auth-service...",
  "service": "auth-service",
  "environment": "production",
  "origin": "MONITORING",
  "initial_context": {
    "error_code": "INVALID_TOKEN",
    "http_status": 504,
    "cpu_percent": 66.7,
    "memory_percent": 62.1,
    "latency_ms": 1416,
    "error_rate_percent": 1.43,
    "affected_users": 437,
    "is_business_hours": true,
    "is_weekend": true
  }
}
```

Only creation-time information is accepted, per the training dataset's
feature policy (`../devflow_incidents_training.json`). `initial_context` is
optional; errors are returned as RFC 9457 problem details.

### Prediction response

```json
{
  "severity": {"value": "MEDIUM", "confidence": 0.71},
  "category": {"value": "SECURITY", "confidence": 0.83},
  "resolution_time_hours": 2.5
}
```

`confidence` is included when the underlying pipeline supports
`predict_proba`.

## Configuration

All settings are environment-driven; see `.env.example`. Notable variables:

- `MODEL_DIR` — directory containing the joblib artifacts.
- `EAGER_LOAD_MODELS` — `true` to load all artifacts at startup instead of
  on first request.
- `API_PREFIX` — URL prefix for the API blueprint (default `/api/v1`).

## Next slices

- Eureka registration so the service resolves through the API gateway.
- Keycloak JWT validation once the gateway routes `/api/v1/**` here.
- Similar-incident retrieval / investigation suggestions (RAG integration).
