"""Error types and handlers producing RFC 9457 problem-detail responses.

The Spring services already speak RFC 9457, so this service does the same
to keep gateway contracts uniform.
"""

from http import HTTPStatus

from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    """Application error rendered as an RFC 9457 problem detail."""

    status = HTTPStatus.INTERNAL_SERVER_ERROR
    title = "Internal Server Error"

    def __init__(self, detail: str | None = None, *, status=None, title=None):
        super().__init__(detail or self.title)
        self.detail = detail or self.title
        if status is not None:
            self.status = HTTPStatus(status)
        if title is not None:
            self.title = title


class ValidationError(ApiError):
    status = HTTPStatus.BAD_REQUEST
    title = "Validation Failed"


class ModelUnavailableError(ApiError):
    status = HTTPStatus.SERVICE_UNAVAILABLE
    title = "Model Unavailable"


class PredictionError(ApiError):
    status = HTTPStatus.INTERNAL_SERVER_ERROR
    title = "Prediction Failed"


def problem_response(error: ApiError):
    body = {
        "type": "about:blank",
        "title": error.title,
        "status": int(error.status),
        "detail": error.detail,
    }
    response = jsonify(body)
    response.status_code = int(error.status)
    response.mimetype = "application/problem+json"
    return response


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return problem_response(error)

    @app.errorhandler(HTTPException)
    def handle_http_error(error: HTTPException):
        return problem_response(
            ApiError(error.description, status=error.code, title=error.name)
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        app.logger.exception("Unhandled error")
        return problem_response(ApiError("An unexpected error occurred."))
