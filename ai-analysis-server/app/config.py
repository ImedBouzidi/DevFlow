"""Environment-based configuration for the AI analysis server."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_DIR = BASE_DIR / "ml-models"


class Config:
    """Base configuration shared by every environment."""

    ENV_NAME = "base"
    API_PREFIX = os.getenv("API_PREFIX", "/api/v1")

    MODEL_DIR = os.getenv("MODEL_DIR", str(DEFAULT_MODEL_DIR))
    SEVERITY_MODEL_FILE = os.getenv("SEVERITY_MODEL_FILE", "severity_model (1).joblib")
    CATEGORY_MODEL_FILE = os.getenv("CATEGORY_MODEL_FILE", "category_model (1).joblib")
    RESOLUTION_TIME_MODEL_FILE = os.getenv(
        "RESOLUTION_TIME_MODEL_FILE", "resolution_time_model (1).joblib"
    )

    # Load all model artifacts at startup instead of on first request.
    EAGER_LOAD_MODELS = os.getenv("EAGER_LOAD_MODELS", "false").lower() == "true"


class DevelopmentConfig(Config):
    ENV_NAME = "development"
    DEBUG = True


class TestingConfig(Config):
    ENV_NAME = "testing"
    TESTING = True


class ProductionConfig(Config):
    ENV_NAME = "production"


_CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str | None = None) -> type[Config]:
    key = (name or os.getenv("FLASK_ENV") or "development").lower()
    return _CONFIGS.get(key, DevelopmentConfig)
