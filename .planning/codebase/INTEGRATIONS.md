# External Integrations

**Analysis Date:** 2026-07-15

## APIs & External Services

**Open Banking / Sales Data Aggregation:**
- Lean / Tarabut (open-banking aggregator) - post-hackathon integration seam, NOT implemented yet
  - Stub client: `backend/app/providers/lean.py` — `LeanProvider` and `TarabutSalesProvider` classes, every method raises `NotImplementedError("LeanProvider is a post-hackathon seam; set PROVIDER=mock for the MVP")`
  - Selected via `PROVIDER` env var / `Settings.provider` (`mock` | `lean`), `backend/app/config.py`
  - Active MVP implementation is the mock provider: `backend/app/providers/mock.py`
  - Provider selection: `backend/app/providers/factory.py`
  - Interface contract: `backend/app/providers/base.py` (`BankAccount`, `ConsentSession`, `ProviderToken`, `SalesOrder`, `Settlement`, `Transaction`)
  - Auth: none configured yet (seam unimplemented)

**Credit Scoring:**
- In-process engine `rafid-engine` (local package, not a network API) - transparent 7-factor explainable decision engine, `rafid-engine/rafid_engine/`
  - Plugged into backend via `backend/app/scoring/saeed.py` (`SaeedModel`), selected when `scoring_backend = "module"`
  - Alternative backends: `backend/app/scoring/stub.py` (`StubScoringModel`, default), `backend/app/scoring/http.py` (`HttpScoringModel` — calls an external scoring HTTP endpoint when `scoring_backend = "http"`)
  - Selection logic: `backend/app/scoring/factory.py`
  - Feature extraction: `backend/app/scoring/features.py`

## Data Storage

**Databases:**
- PostgreSQL 16 (primary/production) - `backend/docker-compose.yml` service `db`, connection via `asyncpg`
  - Connection string: `Settings.database_url` (env var, default `postgresql+asyncpg://rafid:rafid@localhost:5433/rafid`), `backend/app/config.py`
  - ORM/client: SQLAlchemy async (`sqlalchemy[asyncio]`), models in `backend/app/domain/models.py`, session/engine setup `backend/app/db.py`
  - Migrations: Alembic, `backend/alembic/`
- SQLite (dev/test fallback likely) - `aiosqlite` dependency present; DB is swappable via `database_url`

**File Storage:**
- Not detected — no cloud storage SDK (S3/GCS/Azure Blob) found in dependencies

**Caching:**
- None detected — no Redis/Memcached dependency

## Authentication & Identity

**Auth Provider:**
- Custom - JWT-based auth implemented in-house
  - Implementation: `backend/app/security/auth.py` using `python-jose[cryptography]` for JWT signing/verification, `passlib[bcrypt]`/`bcrypt` for password hashing
  - Settings: `jwt_secret`, `jwt_algorithm` (HS256), `access_token_ttl_minutes` (30), `refresh_token_ttl_days` (7) — `backend/app/config.py`
  - Encryption at rest for sensitive fields (e.g. provider tokens): Fernet symmetric encryption, `fernet_key` setting, `backend/app/security/crypto.py`
  - Auth endpoints: `backend/app/api/routers/auth.py`, schemas `backend/app/schemas/auth.py`
  - Dev-only defaults exist for `jwt_secret` and `fernet_key` — must be overridden in real deployments

## Monitoring & Observability

**Error Tracking:**
- None detected — no Sentry/Datadog/similar SDK in dependencies

**Logs:**
- Python standard `logging` module, configured at `INFO` level in `backend/app/main.py` (`logging.basicConfig(level=logging.INFO)`)

**Internal Monitoring Agent:**
- APScheduler-driven background job simulating time-based monitoring (repayments, settlements, alerts) — `backend/app/jobs/scheduler.py`, `backend/app/services/monitoring.py`
- Controlled via `monitor_enabled` / `monitor_interval_seconds` settings (1 tick = 1 simulated day)

## CI/CD & Deployment

**Hosting:**
- Not detected (no deployment platform config, e.g. no `vercel.json`, `fly.toml`, `render.yaml`, or CI workflow files found)

**CI Pipeline:**
- None detected — no `.github/workflows/` found

**Containerization:**
- Docker: `backend/Dockerfile` (API image)
- Docker Compose: `backend/docker-compose.yml` — `db` (Postgres 16) service always runs; `api` service gated behind `profiles: ["full"]`

## Environment Configuration

**Required env vars (from `Settings` in `backend/app/config.py`):**
- `DATABASE_URL` - Postgres/SQLite connection string
- `JWT_SECRET`, `JWT_ALGORITHM`, `ACCESS_TOKEN_TTL_MINUTES`, `REFRESH_TOKEN_TTL_DAYS`
- `FERNET_KEY` - encryption-at-rest key
- `PROVIDER` - `mock` | `lean` (open-banking provider seam)
- `SCORING_BACKEND` - `stub` | `module` | `http`
- `MONITOR_ENABLED`, `MONITOR_INTERVAL_SECONDS`
- Fee-schedule placeholders: `PLATFORM_FEE_PCT`, `SUCCESS_FEE_PCT`, `MURABAHA_PROFIT_PCT`, `MAX_ADVANCE_RATIO`, `OFFER_EXPIRY_DAYS`
- `SCORING_WINDOW_DAYS`

**Secrets location:**
- `.env` file (loaded by `pydantic-settings`), template at `backend/.env.example` (existence noted only; contents not read per policy)
- Never committed `.env` — `backend/.gitignore` present

## Webhooks & Callbacks

**Incoming:**
- None detected — no webhook receiver endpoints found in `backend/app/api/routers/`

**Outgoing:**
- None detected — open-banking provider calls are stubbed/unimplemented (`backend/app/providers/lean.py`); `HttpScoringModel` (`backend/app/scoring/http.py`) is the only outbound HTTP call path, targeting a configurable external scoring service (opt-in via `scoring_backend = "http"`)

---

*Integration audit: 2026-07-15*
