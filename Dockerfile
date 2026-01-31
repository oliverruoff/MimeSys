# Use Home Assistant base image or Python base for standalone
ARG BUILD_FROM=python:3.11-slim
FROM $BUILD_FROM

# Set shell (for Alpine-based images)
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install dependencies based on the base image
RUN if command -v apk > /dev/null; then \
      # Alpine-based (Home Assistant)
      apk add --no-cache python3 py3-pip gcc python3-dev musl-dev; \
    else \
      # Debian-based (standalone)
      apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*; \
    fi

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN if command -v pip3 > /dev/null; then \
      pip3 install --no-cache-dir -r requirements.txt; \
    else \
      pip install --no-cache-dir -r requirements.txt; \
    fi

# Copy application code from backend directory
COPY backend/ .

# Copy run script for Home Assistant addon
COPY run.sh /run.sh
RUN chmod a+x /run.sh

# Create necessary directories
RUN mkdir -p /data/saves

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/data

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/').read()" 2>/dev/null || \
        python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/').read()" || exit 1

# Run the application (use run.sh for addon, uvicorn for standalone)
CMD ["/run.sh"]
