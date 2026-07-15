# Technology Stack

**Analysis Date:** 2026-07-15

## Languages

**Primary:**
- Python 3.12+ - Backend API (`backend/app/`), requires >=3.12 per `backend/pyproject.toml`
- Python 3.10+ - Decision engine library `rafid-engine/rafid_engine/` (own pyproject, requires >=3.10)

**Secondary:**
- HTML/CSS/vanilla JS - Static frontend prototype: `index.html`, `Rafid App (standalone).html` (no build step, no framework detected)

## Runtime

**Environment:**
- Python 3.12 (backend `rafid-backend`), Python 3.10+ (`rafid-engine`)
- ASGI server: Uvicorn (`uvicorn[standard]>=0.30`)

**Package Manager:**
- `uv` (evidenced by `backend/uv.lock`, `[tool.uv]` config in `backend/pyproject.toml`)
- Lockfile: present — `backend/uv.lock`
- `rafid-engine` is consumed as a local path dependency: `[tool.uv.sources] rafid-engine = { path = "../rafid-engine" }`

## Frameworks

**Core:**
- FastAPI `>=0.115` - Web framework, app entrypoint `backend/app/main.py`
- SQLAlchemy `>=2.0` (async, via `sqlalchemy[asyncio]`) - ORM, `backend/app/db.py`
- Pydantic `>=2.7` / `pydantic-settings>=2.3` - Schemas & settings, `backend/app/config.py`, `backend/app/schemas/`
- Alembic `>=1.13` - DB migrations, `backend/alembic/`, `backend/alembic.ini`
- APScheduler `>=3.10,<4` - Background monitoring jobs, `backend/app/jobs/scheduler.py`

**Testing:**
- pytest `>=8.2` + pytest-asyncio `>=0.23` (backend, `asyncio_mode = "auto"`), tests in `backend/tests/`
- pytest `>=7.4` (rafid-engine), tests in `rafid-engine/tests/`
- httpx `>=0.27` - test client for FastAPI, dev dependency group

**Build/Dev:**
- ruff `>=0.5` - Linting (`select = ["E","F","I","UP","B"]`, line-length 100, target py312), config in `backend/pyproject.toml`
- Docker / `backend/Dockerfile`, `backend/docker-compose.yml` - Containerized Postgres + API
- Makefile - `backend/Makefile` (dev task shortcuts)

## Key Dependencies

**Critical:**
- `rafid-engine` (local path package) - 7-factor explainable credit scoring engine, plugged in behind `CreditScoringModel` seam (`backend/app/scoring/factory.py`, `backend/app/scoring/saeed.py`)
- `asyncpg>=0.29` - Async Postgres driver (production DB)
- `aiosqlite>=0.20` - Async SQLite driver (likely used for local/dev/test DB)
- `python-jose[cryptography]>=3.3` - JWT signing/verification, `backend/app/security/auth.py`
- `passlib[bcrypt]==1.7.4` + `bcrypt==4.0.1` - Password hashing (pinned versions)
- `cryptography>=42` - Fernet symmetric encryption at rest, `backend/app/config.py` (`fernet()` method), `backend/app/security/crypto.py`
- `email-validator>=2.3.0` - Pydantic email validation

**Infrastructure:**
- PostgreSQL 16 (Alpine image) - `backend/docker-compose.yml` service `db`, exposed on host port 5433
- `greenlet>=3.0` - Required for SQLAlchemy async support

## Configuration

**Environment:**
- `pydantic-settings` `Settings` class loads from `.env` file, `extra="ignore"` — `backend/app/config.py`
- `.env.example` present at `backend/.env.example` (template only; contents not read — treat as secret-adjacent)
- Key settings surfaced in `Settings`: `database_url`, `jwt_secret`, `fernet_key`, `provider` (mock|lean), `scoring_backend` (stub|module|http), `monitor_enabled`/`monitor_interval_seconds`, fee-schedule placeholders (`platform_fee_pct`, `success_fee_pct`, `murabaha_profit_pct`, `max_advance_ratio`, `offer_expiry_days`), `scoring_window_days`
- Dev-mode defaults are hardcoded fallbacks (e.g. `jwt_secret: str = "rafid-dev-secret-change-me"`, a stable dev Fernet key) — must be overridden via env vars for any non-dev deployment

**Build:**
- `backend/pyproject.toml` - dependencies, ruff config, pytest config, uv config
- `rafid-engine/pyproject.toml` - engine package config
- `backend/alembic.ini` + `backend/alembic/` - migration config/scripts

## Platform Requirements

**Development:**
- Python 3.12, `uv` package manager
- Docker (for local Postgres via `docker-compose.yml`, service `db` on port 5433)
- Alternatively `aiosqlite` suggests SQLite works for lightweight/local dev without Docker

**Production:**
- Containerized deployment via `backend/Dockerfile`
- `docker-compose.yml` has a `full` profile that also runs the `api` service (image built from `backend/Dockerfile`) alongside `db`, API on port 8000

---

*Stack analysis: 2026-07-15*
