.PHONY: install test lint dev demo

install:
	pip install -e ".[dev]"
	cd backend && pip install -r requirements.txt

test:
	pytest tests/

lint:
	ruff check .
	mypy .

dev:
	docker compose up

demo:
	echo "Run scripted demo (Phase 5B)"
