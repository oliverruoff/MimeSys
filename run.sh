#!/usr/bin/env bashset -e

echo "=== 3D Home Digital Twin Startup ==="
echo "Current directory: $(pwd)"
echo "Python version: $(python3 --version 2>&1 || python --version 2>&1 || echo 'Python not found')"

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
echo "Creating data directory: $DATA_DIR/saves"
mkdir -p "$DATA_DIR/saves" || echo "Warning: Could not create data directory"

# Verify static files exist
if [ -d "/app/static" ]; then
    echo "✓ Static directory found at /app/static"
    ls -la /app/static/ 2>&1 | head -10 || echo "Could not list static directory"
else
    echo "✗ ERROR: Static directory not found!"
    ls -la /app/ 2>&1 | head -20
    exit 1
fi

# Check if main.py exists
if [ -f "/app/main.py" ]; then
    echo "✓ main.py found"
else
    echo "✗ ERROR: main.py not found!"
    ls -la /app/*.py 2>&1 || echo "No Python files found"
    exit 1
fi

# Check Python packages
echo "Checking installed packages..."
if command -v pip3 > /dev/null; then
    pip3 list 2>&1 | grep -E "(fastapi|uvicorn|pydantic)" || echo "Warning: Some packages might be missing"
elif command -v pip > /dev/null; then
    pip list 2>&1 | grep -E "(fastapi|uvicorn|pydantic)" || echo "Warning: Some packages might be missing"
fi

# Start the application
cd /app
echo "Starting uvicorn on 0.0.0.0:8000..."
echo "Command: uvicorn main:app --host 0.0.0.0 --port 8000"

if command -v python3 > /dev/null; then
    exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
elif command -v python > /dev/null; then
    exec python -m uvicorn main:app --host 0.0.0.0 --port 8000
else
    echo "ERROR: Python not found!"
    exit 1
fi
