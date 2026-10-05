"""HTTP API blueprints."""

from flask import Blueprint

api_bp = Blueprint("api", __name__)
health_bp = Blueprint("health", __name__)

# Import route modules so their handlers register on the blueprints.
from app.api import health, predictions  # noqa: E402,F401
