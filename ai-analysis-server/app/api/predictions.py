"""Advisory incident-analysis endpoints.

Predictions are advisory only: the platform requires human authorization
for severity changes, resolution and closure (see docs/architecture.md).
"""

from flask import current_app, jsonify, request

from app.api import api_bp
from app.schemas.prediction import IncidentAnalysisRequest
from app.services.model_registry import ModelRegistry
from app.services.prediction_service import predict_incident


@api_bp.post("/predictions/incident")
def predict_incident_advice():
    payload = IncidentAnalysisRequest.from_json(request.get_json(silent=True))
    registry = ModelRegistry.from_app(current_app)
    return jsonify(predict_incident(payload, registry)), 200
