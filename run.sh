#!/usr/bin/env bash
set -e

# Check if running in Home Assistant addon environment
if command -v bashio > /dev/null 2>&1; then
    # Home Assistant addon mode
    DATA_DIR=$(bashio::config 'data_dir' 2>/dev/null || echo "/data")
    bashio::log.info "Starting 3D Home Digital Twin (Home Assistant Addon)..."
    bashio::log.info "Data directory: $DATA_DIR"
else
    # Standalone mode
    DATA_DIR="${DATA_DIR:-/data}"
    echo "Starting 3D Home Digital Twin (Standalone)..."
    echo "Data directory: $DATA_DIR"
fi

# Set data directory
export DATA_DIR="$DATA_DIR"

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR/saves"

# Verify static files exist
if [ -d "/app/static" ]; then
    echo "Static directory found at /app/static"
    ls -la /app/static/ || echo "Could not list static directory"
else
    echo "ERROR: Static directory not found!"
fi

# Start the application
cd /app
echo "Starting uvicorn on 0.0.0.0:8000..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
