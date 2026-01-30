#!/bin/bash

# Quick start script for 3D Home Digital Twin

set -e

echo "=========================================="
echo "3D Home Digital Twin - Quick Start"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Warning: docker-compose is not installed. Trying docker compose plugin..."
    if ! docker compose version &> /dev/null; then
        echo "Error: Neither docker-compose nor docker compose plugin found."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Create data directory
echo "Creating data directories..."
mkdir -p data/saves
mkdir -p backend/saves

# Build and start the container
echo ""
echo "Building and starting the container..."
$COMPOSE_CMD up -d --build

# Wait for the service to be ready
echo ""
echo "Waiting for the service to start..."
sleep 5

# Check if the service is running
if curl -s http://localhost:8000 > /dev/null; then
    echo ""
    echo "=========================================="
    echo "Success! The application is running."
    echo "=========================================="
    echo ""
    echo "Access the application:"
    echo "  - Web interface: http://localhost:8000"
    echo "  - Showcase view: http://localhost:8000/showcase"
    echo ""
    echo "Useful commands:"
    echo "  - View logs:     $COMPOSE_CMD logs -f"
    echo "  - Stop:          $COMPOSE_CMD down"
    echo "  - Restart:       $COMPOSE_CMD restart"
    echo "  - Update:        $COMPOSE_CMD pull && $COMPOSE_CMD up -d"
    echo ""
else
    echo ""
    echo "Warning: Service may not be ready yet."
    echo "Check logs with: $COMPOSE_CMD logs -f"
    echo ""
fi
