def test_liveness(client):
    response = client.get("/health")

    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "UP"
    assert body["service"] == "ai-analysis-server"


def test_readiness_reports_model_status(client):
    response = client.get("/ready")

    assert response.status_code in (200, 503)
    body = response.get_json()
    assert set(body["models"]) == {"severity", "category", "resolution_time"}
