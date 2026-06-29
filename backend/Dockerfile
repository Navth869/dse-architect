FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required by WeasyPrint, PyMuPDF and common build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
		build-essential \
		gcc \
		libcairo2 \
		libcairo2-dev \
		libpango-1.0-0 \
		libpango1.0-dev \
		libgdk-pixbuf-2.0-0 \
		libgdk-pixbuf-2.0-dev \
		shared-mime-info \
		libffi-dev \
		libjpeg-dev \
		fonts-dejavu-core \
		ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel \
	&& pip install --no-cache-dir -r /app/requirements.txt

# Copy application code
COPY . /app

EXPOSE 8000

# Use shell interpolation so APP_HOST/APP_PORT can be set at runtime via env
CMD ["sh", "-c", "uvicorn main:app --host ${APP_HOST:-0.0.0.0} --port ${APP_PORT:-8000}"]
