# syntax=docker/dockerfile:1

# Multi-arch slim Python base
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# System deps (psycopg2-binary, bcrypt wheels should usually suffice; keep libpq/build tools minimal)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       libpq-dev \
       curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Install dependencies first for better layer caching
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . ./

# Expose FastAPI port
EXPOSE 10000

# The app reads env vars at runtime (DATABASE_URL, SECRET_KEY, FRONTEND_URL, OPENAI_API_KEY, etc.)
# Render maps external traffic to the exposed port for Docker services.

# Use Render's PORT if provided (defaults to 10000)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]


