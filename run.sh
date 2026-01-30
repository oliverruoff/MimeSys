#!/usr/bin/with-contenv bashio

# Get configuration
DATA_DIR=$(bashio::config 'data_dir')

# Set data directory
if [ -n "$DATA_DIR" ]; then
    export DATA_DIR="$DATA_DIR"
else
    export DATA_DIR="/data"
fi

# Create data directory if it doesn't exist
mkdir -p "$DATA_DIR/saves"

# Print configuration
bashio::log.info "Starting 3D Home Digital Twin..."
bashio::log.info "Data directory: $DATA_DIR"

# Start the application
cd /app
exec uvicorn main:app --host 0.0.0.0 --port 8000
