"""DevFlow AI - AI Analysis Server.

Advisory incident-analysis service: severity, category and resolution-time
prediction backed by the trained scikit-learn pipelines in ``ml-models/``.
"""

import logging
import os

from flask import Flask

from app.config import get_config
from app.errors import register_error_handlers


def create_app(config_name: str | None = None) -> Flask:
    """Application factory."""
    configure_logging()

    app = Flask(__name__)
    app.config.from_object(get_config(config_name))

    from app.api import api_bp, health_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(api_bp, url_prefix=app.config["API_PREFIX"])

    register_error_handlers(app)

    app.logger.info(
        "ai-analysis-server initialised (env=%s, model_dir=%s)",
        app.config["ENV_NAME"],
        app.config["MODEL_DIR"],
    )
    return app


def configure_logging() -> None:
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )
