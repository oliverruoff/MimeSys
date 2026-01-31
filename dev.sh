#!/bin/bash
# Development startup script
echo "Starting 3D Home Digital Twin for local development..."
echo "=========================================="
echo ""
echo "Server will run at: http://localhost:8000"
echo "Hot reload is ENABLED - changes to Python files will auto-restart"
echo ""
echo "Tips:"
echo "- Hard refresh browser (Ctrl+Shift+R) to clear JavaScript cache"
echo "- Press Ctrl+C to stop the server"
echo ""
echo "=========================================="
echo ""

cd backend
python main.py
