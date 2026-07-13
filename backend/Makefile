.PHONY: dev db seed reset test lint fmt migrate

db:
	docker compose up -d db

dev: db
	uv run uvicorn app.main:app --reload --port 8000

seed:
	uv run python -m app.seed.run

reset:
	uv run python -m app.seed.run --reset

test:
	uv run pytest -q

lint:
	uv run ruff check app tests

fmt:
	uv run ruff format app tests

migrate:
	uv run alembic upgrade head
