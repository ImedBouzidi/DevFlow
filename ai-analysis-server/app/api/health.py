"""Liveness and readiness endpoints (public per platform security rules)."""

from flask import current_app, jsonify

from app.api import health_bp
from app.services.model_registry import ModelRegistry


@health_bp.get("/health")
def liveness():
    return jsonify({"status": "UP", "service": "ai-analysis-server"})


@health_bp.get("/ready")
def readiness():
    """Reports UP only when every model artifact loads successfully."""
    models = ModelRegistry.from_app(current_app).status()
    ready = all(models.values())
    return (
        jsonify({"status": "UP" if ready else "DOWN", "models": models}),
        200 if ready else 503,
    )
