#!/bin/bash
set -e

echo "Seeding historical database..."
# Assuming PYTHONPATH is set to the project root, or we are running from a directory where simulation/ is accessible.
# In Docker, simulation/ is mapped to /app/simulation, and the working directory is /app.
# In local, PYTHONPATH is set.
python simulation/seed_history.py

echo "Starting Uvicorn server..."
# Using uvicorn directly if installed, otherwise python -m uvicorn
python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
