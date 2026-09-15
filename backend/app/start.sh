#!/bin/bash
# Run from the repository root (imports use the `backend.` / `engine.` / `simulation.` packages).
set -e
cd "$(dirname "$0")/.."

echo "Seeding historical database..."
python simulation/seed_history.py

echo "Starting Uvicorn server..."
exec python -m uvicorn backend.app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
