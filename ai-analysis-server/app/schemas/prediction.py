"""Validation for the incident-analysis request payload.

Fields mirror the creation-time feature policy of the training dataset
(``devflow_incidents_training.json``): only information known when an
incident is created may be used for prediction.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.errors import ValidationError

_REQUIRED_FIELDS = ("title", "description", "service", "environment", "origin")


@dataclass(frozen=True)
class IncidentContext:
    """Optional telemetry snapshot attached to a freshly created incident."""

    error_code: str | None = None
    http_status: int | None = None
    cpu_percent: float | None = None
    memory_percent: float | None = None
    latency_ms: float | None = None
    error_rate_percent: float | None = None
    affected_users: int | None = None
    is_business_hours: bool | None = None
    is_weekend: bool | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "IncidentContext":
        known = {name: data.get(name) for name in cls.__dataclass_fields__}
        return cls(**known)


@dataclass(frozen=True)
class IncidentAnalysisRequest:
    title: str
    description: str
    service: str
    environment: str
    origin: str
    initial_context: IncidentContext = field(default_factory=IncidentContext)

    @classmethod
    def from_json(cls, payload: dict[str, Any] | None) -> "IncidentAnalysisRequest":
        if not isinstance(payload, dict):
            raise ValidationError("Request body must be a JSON object.")

        missing = [f for f in _REQUIRED_FIELDS if not _is_non_empty_str(payload.get(f))]
        if missing:
            raise ValidationError(
                "Missing or empty required field(s): " + ", ".join(missing)
            )

        context = payload.get("initial_context") or {}
        if not isinstance(context, dict):
            raise ValidationError("'initial_context' must be a JSON object.")

        return cls(
            title=payload["title"].strip(),
            description=payload["description"].strip(),
            service=payload["service"].strip(),
            environment=payload["environment"].strip(),
            origin=payload["origin"].strip(),
            initial_context=IncidentContext.from_dict(context),
        )


def _is_non_empty_str(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())
