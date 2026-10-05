"""WSGI entrypoint for the AI analysis server.

Run for development with either:

    python wsgi.py
    flask --app wsgi run --debug

Serve in production with gunicorn:

    gunicorn "wsgi:app" --bind 0.0.0.0:5000
"""

import os

from dotenv import load_dotenv

load_dotenv()

from app import create_app  # noqa: E402

app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
