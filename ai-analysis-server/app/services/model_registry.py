"""Lazy, thread-safe loading of the trained joblib model artifacts."""

from __future__ import annotations

import logging
import threading
from pathlib import Path

import joblib
from flask import Flask, current_app

from app.errors import ModelUnavailableError

logger = logging.getLogger(__name__)

# Logical model name -> config key holding the artifact filename.
MODEL_CONFIG_KEYS = {
    "severity": "SEVERITY_MODEL_FILE",
    "category": "CATEGORY_MODEL_FILE",
    "resolution_time": "RESOLUTION_TIME_MODEL_FILE",
}


class ModelRegistry:
    """Loads and caches the prediction pipelines shipped in ``ml-models/``."""

    def __init__(self, model_dir: str, model_files: dict[str, str]) -> None:
        self._model_dir = Path(model_dir)
        self._model_files = dict(model_files)
        self._models: dict[str, object] = {}
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Access
    # ------------------------------------------------------------------
    def get(self, name: str):
        """Returns the named model, loading its artifact on first use."""
        if name not in self._model_files:
            raise KeyError(f"Unknown model: {name}")
        if name not in self._models:
            with self._lock:
                if name not in self._models:  # double-checked locking
                    self._models[name] = self._load(name)
        return self._models[name]

    def load_all(self) -> None:
        for name in self._model_files:
            self.get(name)

    def status(self) -> dict[str, bool]:
        """Attempts to load every model and reports per-model health."""
        result = {}
        for name in self._model_files:
            try:
                self.get(name)
            except ModelUnavailableError:
                result[name] = False
            else:
                result[name] = True
        return result

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------
    def _load(self, name: str):
        path = self._model_dir / self._model_files[name]
        if not path.is_file():
            logger.error("Model artifact missing: %s", path)
            raise ModelUnavailableError(f"Model artifact not found: {path.name}")
        try:
            model = joblib.load(path)
        except Exception as exc:  # joblib surfaces several exception types
            logger.exception("Failed to load model artifact %s", path)
            raise ModelUnavailableError(f"Failed to load model '{name}'.") from exc
        logger.info("Loaded model '%s' from %s", name, path)
        return model

    # ------------------------------------------------------------------
    # Flask integration
    # ------------------------------------------------------------------
    @classmethod
    def from_app(cls, app: Flask | None = None) -> "ModelRegistry":
        """Returns the registry bound to the app, creating it on first use."""
        app = app or current_app
        registry = app.extensions.get("model_registry")
        if registry is None:
            registry = cls(
                model_dir=app.config["MODEL_DIR"],
                model_files={
                    name: app.config[key] for name, key in MODEL_CONFIG_KEYS.items()
                },
            )
            app.extensions["model_registry"] = registry
            if app.config["EAGER_LOAD_MODELS"]:
                registry.load_all()
        return registry
