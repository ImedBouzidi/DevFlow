FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=5000 \
    FLASK_ENV=production \
    MODEL_DIR=/app/ml-models \
    EAGER_LOAD_MODELS=true
WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --timeout=120 --retries=10 -r requirements.txt
COPY app ./app
COPY ml-models ./ml-models
COPY wsgi.py ./wsgi.py
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser
EXPOSE 5000
HEALTHCHECK --interval=20s --timeout=5s --start-period=90s --retries=6 \
  CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:5000/ready', timeout=4)"
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--threads", "4", "--timeout", "120", "wsgi:app"]
