VALID_PAYLOAD = {
    "title": "Suspicious authentication failures",
    "description": (
        "Monitoring detected INVALID_TOKEN on auth-service in production. "
        "Current error rate is 1.43%, average latency is 1416 ms."
    ),
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
        "is_business_hours": True,
        "is_weekend": True,
    },
}


def test_prediction_returns_advice(client):
    response = client.post("/api/v1/predictions/incident", json=VALID_PAYLOAD)

    assert response.status_code == 200
    body = response.get_json()
    assert body["severity"]["value"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert body["category"]["value"]
    assert body["resolution_time_hours"] >= 0


def test_prediction_accepts_missing_context(client):
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "initial_context"}

    response = client.post("/api/v1/predictions/incident", json=payload)

    assert response.status_code == 200


def test_prediction_rejects_non_object_body(client):
    response = client.post("/api/v1/predictions/incident", json=[1, 2, 3])

    assert response.status_code == 400
    body = response.get_json()
    assert body["title"] == "Validation Failed"


def test_prediction_requires_core_fields(client):
    response = client.post("/api/v1/predictions/incident", json={"title": "Disk full"})

    assert response.status_code == 400
    body = response.get_json()
    assert "description" in body["detail"]
    assert "service" in body["detail"]


def test_prediction_rejects_invalid_context(client):
    payload = {
        "title": "Disk full",
        "description": "Node reports 98% disk usage",
        "service": "api-gateway",
        "environment": "production",
        "origin": "MONITORING",
        "initial_context": "not-an-object",
    }

    response = client.post("/api/v1/predictions/incident", json=payload)

    assert response.status_code == 400
    assert "initial_context" in response.get_json()["detail"]
