.PHONY: install test test-frontend lint seed backend frontend dev demo

PY ?= python

install:
	pip install -e ".[dev]"
	pip install -r backend/requirements.txt
	cd frontend && npm install

# Engine + API tests (44). Uses an isolated temp DB for the API layer.
test:
	pytest tests/

test-frontend:
	cd frontend && npx vitest run

lint:
	ruff check .
	mypy .

# 86,400 historical ticks (24 h @ 1 s) into backend/app/db/sovereign.db
seed:
	$(PY) simulation/seed_history.py

# FastAPI + 10 Hz engine on :8000 (run from the repo root — packages are backend.*, engine.*, simulation.*)
backend:
	$(PY) -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev

dev:
	docker compose up --build

# Trigger the scripted congestion scenario against a running backend
demo:
	curl -s -X POST localhost:8000/api/demo/trigger/grid_congestion
