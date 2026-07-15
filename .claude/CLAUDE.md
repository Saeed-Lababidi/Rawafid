<!-- GSD:project-start source:PROJECT.md -->

## Project

**Rafid (رافد)**

Open-banking SME financing platform built for the AMAD hackathon (Open Banking track, فريق روافد). A merchant connects bank + sales-platform accounts via open-banking consent, the backend aggregates 90 days of data, **rafid-engine** scores creditworthiness with a transparent explainable model, and the merchant receives Sharia-compliant **Murabaha** cash against confirmed held receivables — repayment auto-collects via a background monitoring agent that also raises risk alerts. Bank underwriters get their own admin surface. This milestone: build the production **Next.js frontend** and take the whole system to a **fully live, free-hosted demo** before judging.

**Core Value:** A judge can experience the complete merchant loop live — connect accounts → explainable score reveal → Murabaha offer → a contract that visibly repays itself in real time — in a polished Arabic-first UI that looks professional and worth a fortune.

### Constraints

- **Timeline**: judging July 17, 2026 (~2 days) — integration first, polish second (handoff §7 build order)
- **Tech stack**: Next.js + TypeScript + Tailwind CSS (user decision); animation tooling deferred, lenis/anime.js candidates
- **Budget**: hosting must be 100% free — Vercel (frontend, existing project) + free backend host TBD (must support long-running FastAPI + APScheduler + Postgres)
- **Compliance framing**: Murabaha language only, demo-dataset disclaimer visible until licensed
- **Language/direction**: Arabic-first RTL with English toggle; IBM Plex Sans Arabic

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

## Languages

- Python 3.12+ - Backend API (`backend/app/`), requires >=3.12 per `backend/pyproject.toml`
- Python 3.10+ - Decision engine library `rafid-engine/rafid_engine/` (own pyproject, requires >=3.10)
- HTML/CSS/vanilla JS - Static frontend prototype: `index.html`, `Rafid App (standalone).html` (no build step, no framework detected)

## Runtime

- Python 3.12 (backend `rafid-backend`), Python 3.10+ (`rafid-engine`)
- ASGI server: Uvicorn (`uvicorn[standard]>=0.30`)
- `uv` (evidenced by `backend/uv.lock`, `[tool.uv]` config in `backend/pyproject.toml`)
- Lockfile: present — `backend/uv.lock`
- `rafid-engine` is consumed as a local path dependency: `[tool.uv.sources] rafid-engine = { path = "../rafid-engine" }`

## Frameworks

- FastAPI `>=0.115` - Web framework, app entrypoint `backend/app/main.py`
- SQLAlchemy `>=2.0` (async, via `sqlalchemy[asyncio]`) - ORM, `backend/app/db.py`
- Pydantic `>=2.7` / `pydantic-settings>=2.3` - Schemas & settings, `backend/app/config.py`, `backend/app/schemas/`
- Alembic `>=1.13` - DB migrations, `backend/alembic/`, `backend/alembic.ini`
- APScheduler `>=3.10,<4` - Background monitoring jobs, `backend/app/jobs/scheduler.py`
- pytest `>=8.2` + pytest-asyncio `>=0.23` (backend, `asyncio_mode = "auto"`), tests in `backend/tests/`
- pytest `>=7.4` (rafid-engine), tests in `rafid-engine/tests/`
- httpx `>=0.27` - test client for FastAPI, dev dependency group
- ruff `>=0.5` - Linting (`select = ["E","F","I","UP","B"]`, line-length 100, target py312), config in `backend/pyproject.toml`
- Docker / `backend/Dockerfile`, `backend/docker-compose.yml` - Containerized Postgres + API
- Makefile - `backend/Makefile` (dev task shortcuts)

## Key Dependencies

- `rafid-engine` (local path package) - 7-factor explainable credit scoring engine, plugged in behind `CreditScoringModel` seam (`backend/app/scoring/factory.py`, `backend/app/scoring/saeed.py`)
- `asyncpg>=0.29` - Async Postgres driver (production DB)
- `aiosqlite>=0.20` - Async SQLite driver (likely used for local/dev/test DB)
- `python-jose[cryptography]>=3.3` - JWT signing/verification, `backend/app/security/auth.py`
- `passlib[bcrypt]==1.7.4` + `bcrypt==4.0.1` - Password hashing (pinned versions)
- `cryptography>=42` - Fernet symmetric encryption at rest, `backend/app/config.py` (`fernet()` method), `backend/app/security/crypto.py`
- `email-validator>=2.3.0` - Pydantic email validation
- PostgreSQL 16 (Alpine image) - `backend/docker-compose.yml` service `db`, exposed on host port 5433
- `greenlet>=3.0` - Required for SQLAlchemy async support

## Configuration

- `pydantic-settings` `Settings` class loads from `.env` file, `extra="ignore"` — `backend/app/config.py`
- `.env.example` present at `backend/.env.example` (template only; contents not read — treat as secret-adjacent)
- Key settings surfaced in `Settings`: `database_url`, `jwt_secret`, `fernet_key`, `provider` (mock|lean), `scoring_backend` (stub|module|http), `monitor_enabled`/`monitor_interval_seconds`, fee-schedule placeholders (`platform_fee_pct`, `success_fee_pct`, `murabaha_profit_pct`, `max_advance_ratio`, `offer_expiry_days`), `scoring_window_days`
- Dev-mode defaults are hardcoded fallbacks (e.g. `jwt_secret: str = "rafid-dev-secret-change-me"`, a stable dev Fernet key) — must be overridden via env vars for any non-dev deployment
- `backend/pyproject.toml` - dependencies, ruff config, pytest config, uv config
- `rafid-engine/pyproject.toml` - engine package config
- `backend/alembic.ini` + `backend/alembic/` - migration config/scripts

## Platform Requirements

- Python 3.12, `uv` package manager
- Docker (for local Postgres via `docker-compose.yml`, service `db` on port 5433)
- Alternatively `aiosqlite` suggests SQLite works for lightweight/local dev without Docker
- Containerized deployment via `backend/Dockerfile`
- `docker-compose.yml` has a `full` profile that also runs the `api` service (image built from `backend/Dockerfile`) alongside `db`, API on port 8000

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Scope

## Naming Patterns

- Python: `snake_case.py` throughout — `backend/app/services/scoring.py`, `backend/app/scoring/saeed.py`.
- One file per router under `backend/app/api/routers/` named after the resource (`assessments.py`, `contracts.py`, `offers.py`).
- One file per domain concern under `services/` (`scoring.py`, `offers.py`, `murabaha.py`, `repayment.py`, `monitoring.py`, `dashboard.py`, `aggregation.py`, `audit.py`, `onboarding.py`).
- `snake_case`, verb-first: `run_assessment`, `latest_assessment`, `build_features`, `get_scoring_model`, `get_current_user`, `require_role`.
- Async I/O functions always prefixed with `async def`; pure/sync helpers (e.g. `_uuid()`, `utcnow()`) stay sync.
- Private/internal helpers prefixed with `_` (e.g. `_uuid`, `_features` in tests).
- `snake_case`. Domain IDs are `str` (hex UUID4), never `int`.
- Constants (`FIXTURE`, `TEST_MERCHANT_ID`, `PASSWORD`) are `UPPER_SNAKE_CASE` at module scope in tests/fixtures.
- `PascalCase` for SQLAlchemy models (`Merchant`, `CreditAssessment`, `MurabahaContract`), Pydantic schemas (`AssessmentOut`, `ScoringFeatures`), and enums (`UserRole`, `AuditAction`).
- Exception classes are domain-named + `Error` suffix: `ScoringError` (`backend/app/services/scoring.py`).
- FastAPI dependency aliases use `PascalCase` type aliases built from `Annotated[...]`: `SessionDep`, `CurrentUser`, `CurrentMerchant`, `CurrentAdmin` (`backend/app/api/deps.py`).

## Code Style

- `ruff` is the sole linter for `backend` (`backend/pyproject.toml`): `line-length = 100`, `target-version = "py312"`.
- Lint rule set: `select = ["E", "F", "I", "UP", "B"]`, with `B008` ignored explicitly to allow FastAPI's `Depends()` in default args.
- No separate formatter config found (no `.prettierrc`, no `black` config) — ruff handles both lint and import order (`I` ruleset).
- `rafid-engine` has no lint config of its own; it inherits none — keep it consistent with backend's ruff style when editing.
- Full type hints everywhere, using modern `X | None` union syntax (py3.10+), not `Optional[X]`.
- SQLAlchemy 2.0 typed ORM style: `Mapped[str]`, `mapped_column(...)` — see `backend/app/domain/models.py`.
- Pydantic v2 models throughout for schemas/features (`ScoringFeatures`, `MerchantFeatures`).

## Import Organization

- Always absolute imports from the package root — `from app.domain.models import Merchant, User`, `from app.scoring.saeed import SaeedModel`.
- No relative imports (`from .foo`) observed.
- No path aliases; plain package-qualified imports.

## Error Handling

- Domain/service layer raises plain Python exceptions with descriptive messages, e.g. `class ScoringError(Exception): pass` (`backend/app/services/scoring.py:11`) raised as `raise ScoringError("no aggregated sales data; connect platforms and aggregate first")`.
- Router layer catches domain exceptions and converts to `HTTPException` with explicit status codes, chaining the original exception with `from e`:
- Auth/deps layer (`backend/app/api/deps.py`) raises `HTTPException` directly for 401/403 cases (missing token, invalid role, missing merchant scope), also chained with `from e` when wrapping a `ValueError` from `decode_token`.
- 404s are inline checks, not exceptions from services: `if not assessment or assessment.merchant_id != merchant.id: raise HTTPException(404, "assessment not found")`.
- Never leak internal exception messages beyond service-defined text — messages passed to `HTTPException` are hand-authored, lowercase, no trailing punctuation.
- Pydantic validation errors are the primary error surface (`model_validate` raises on unknown fields / out-of-range values, enforced by `extra="forbid"`-style contracts — see `test_input_rejects_unknown_field`).
- No custom exception hierarchy in the engine; it fails fast via pydantic.

## Logging

- No structured logging framework detected (no `logging.getLogger`, no `structlog`) in the sampled files. Treat this as an open gap — see CONCERNS if logging is added, prefer stdlib `logging` scoped per module.

## Comments

- Sparse, high-value comments explaining *why*, not *what* — e.g. `# merchant scope always comes from the token, never from client input` (`backend/app/api/deps.py:48`), `# simulated KYC — always "verified" for the MVP` (`backend/app/domain/models.py:49`).
- Column-level comments on ORM models annotate the source enum type when the column stores a stringified enum: `role: Mapped[str] = mapped_column(String(20))  # UserRole`.
- Module/function docstrings used for non-obvious business logic and test-file intent (see `rafid-engine/tests/test_smoke.py` module docstring explaining what the A1 smoke suite proves).
- No JSDoc; no TSDoc (no JS/TS source).

## Function Design

## Module Design

- `api/routers/*` — HTTP layer only: parse request, call one service function, map exceptions to `HTTPException`, return ORM/schema object.
- `services/*` — business logic, transaction boundaries (`session.commit()` lives here, not in routers).
- `scoring/*` — pluggable scoring models behind a factory (`scoring/factory.py::get_scoring_model()`); `scoring/saeed.py::SaeedModel` adapts `rafid_engine` into the backend's `ScoringFeatures → CreditDecision` seam.
- `domain/*` — SQLAlchemy ORM models (`models.py`) and string-backed enums (`enums.py`).
- `schemas/*` — Pydantic request/response DTOs, separate from ORM models.
- `security/*` — auth/token/crypto helpers.
- `providers/*` — external data provider abstraction (mock + real, via `factory.py`).

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

```text

```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| FastAPI app entrypoint | Wires routers, CORS, lifespan (DB create, scheduler start/stop) | `backend/app/main.py` |
| Settings | Env-driven config, abstraction-seam toggles (`provider`, `scoring_backend`, `monitor_enabled`) | `backend/app/config.py` |
| API deps | Auth extraction, role guards (`CurrentUser`, `CurrentMerchant`, `CurrentAdmin`) | `backend/app/api/deps.py` |
| Routers | HTTP surface, one file per resource (auth, merchants, connections, data, assessments, offers, contracts, alerts, admin, system) | `backend/app/api/routers/*.py` |
| Services | Business logic — onboarding/aggregation, scoring orchestration, offer generation, Murabaha contract creation, repayment application, monitoring tick, dashboard aggregation, audit logging | `backend/app/services/*.py` |
| Provider abstraction | Open-banking + sales-platform data fetch, mock and Lean/Tarabut implementations behind a frozen `Protocol` | `backend/app/providers/base.py`, `backend/app/providers/mock.py`, `backend/app/providers/lean.py`, `backend/app/providers/factory.py` |
| Scoring abstraction | Credit scoring behind a frozen `Protocol` seam; stub/http/module(rafid-engine) implementations | `backend/app/scoring/base.py`, `backend/app/scoring/stub.py`, `backend/app/scoring/http.py`, `backend/app/scoring/saeed.py`, `backend/app/scoring/factory.py` |
| rafid-engine | Pure, deterministic 7-factor explainable credit scorecard + offer quoting; no DB/network | `rafid-engine/rafid_engine/engine.py` (entrypoint `assess()`, `quote()`) |
| Domain models | SQLAlchemy ORM entities (User, Merchant, Connection, Consent, transactions/sales/settlements rows, CreditAssessment, FinancingOffer, MurabahaContract, RepaymentScheduleItem, Repayment, RiskAlert, AuditLog, SystemState) | `backend/app/domain/models.py` |
| Enums | Shared string-enum vocab (roles, statuses, alert types) | `backend/app/domain/enums.py` |
| Schemas | Pydantic request/response DTOs, separate from ORM models | `backend/app/schemas/*.py` |
| Security | JWT issuance/validation, password hashing, Fernet encryption-at-rest for provider tokens | `backend/app/security/auth.py`, `backend/app/security/crypto.py` |
| Jobs/Scheduler | APScheduler-driven monitoring agent — 1 tick = 1 simulated day, advances settlements/repayments/alerts | `backend/app/jobs/scheduler.py` → `backend/app/services/monitoring.py` |
| Seed | Synthetic demo data generation (20 merchants, pre-connected/aggregated) | `backend/app/seed/synthetic.py`, `backend/app/seed/run.py` |
| DB session/engine | Async SQLAlchemy engine + session factory, SQLite (tests) vs Postgres (dev/prod) | `backend/app/db.py` |
| Alembic migrations | Schema migration scripts | `backend/alembic/versions/` |

## Pattern Overview

- Async-first: FastAPI + SQLAlchemy async ORM (`asyncpg` in prod, aiosqlite-compatible StaticPool for tests)
- Dependency injection via FastAPI `Depends` (`SessionDep`, `CurrentUser`, `CurrentMerchant`, `CurrentAdmin` in `backend/app/api/deps.py`)
- Provider pattern for external integrations (mock vs real Lean/Tarabut), selected by env var at factory boundary (`backend/app/providers/factory.py`)
- Strategy pattern for scoring backend (stub/http/module), selected by env var (`backend/app/scoring/factory.py`), cached via `@lru_cache`
- Background job (APScheduler) simulating time-driven settlement/repayment lifecycle, decoupled from request/response cycle
- rafid-engine is a pure function library (`assess`, `quote`) — no side effects, no I/O — called synchronously from within an async service

## Layers

- Purpose: HTTP request/response, auth enforcement, input validation via Pydantic schemas
- Location: `backend/app/api/routers/`
- Contains: One router per resource domain; thin — delegates to services
- Depends on: `app/api/deps.py` (auth deps), `app/services/*`, `app/schemas/*`
- Used by: External HTTP clients (frontend), OpenAPI/Swagger consumers
- Purpose: Business logic — orchestrates providers, scoring, DB writes, audit logging
- Location: `backend/app/services/`
- Contains: `onboarding.py` (connect/aggregate), `scoring.py` (run_assessment), `offers.py` (generate/accept/reject), `murabaha.py` (contract creation), `repayment.py` (apply repayments), `monitoring.py` (simulated-day tick), `dashboard.py` (aggregation reads), `audit.py` (audit log writes)
- Depends on: `app/providers/*`, `app/scoring/*`, `app/domain/models.py`, `app/db.py`
- Used by: Routers, jobs/scheduler
- Purpose: Decouple open-banking/sales-platform data source from business logic
- Location: `backend/app/providers/`
- Contains: `base.py` (frozen `Protocol` + DTOs: `ConsentSession`, `ProviderToken`, `BankAccount`, `Transaction`, `SalesOrder`, `Settlement`), `mock.py` (synthetic data), `lean.py` (real Lean/Tarabut integration), `factory.py` (env-driven selection)
- Depends on: Nothing internal (pure interface + implementations)
- Used by: `app/services/onboarding.py`
- Purpose: Decouple credit-decision logic from request handling; allow swapping stub/http/rafid-engine
- Location: `backend/app/scoring/`
- Contains: `base.py` (frozen `Protocol` + `ScoringFeatures`/`CreditDecision` DTOs), `stub.py`, `http.py`, `saeed.py` (rafid-engine adapter), `features.py` (feature engineering from raw DB rows), `factory.py`
- Depends on: `rafid_engine` package (only `saeed.py`)
- Used by: `app/services/scoring.py`
- Purpose: Pure, deterministic, explainable 7-factor credit scorecard + Murabaha offer pricing
- Location: `rafid-engine/rafid_engine/`
- Contains: `engine.py` (entrypoints `assess()`/`quote()`), `scorecard.py` (7-factor scoring), `confidence.py`, `decision.py` (approve/review/decline rules), `exposure.py` (max advance + repayment schedule pricing), `explain.py` (bilingual AR/EN narration), `narration.py`, `schema.py` (Pydantic contract types: `MerchantFeatures`, `Decision`, `Offer`, etc.), `config.py`, `registry.py`
- Depends on: Nothing from backend (standalone package, importable, no DB/network)
- Used by: `backend/app/scoring/saeed.py` only, when `SCORING_BACKEND=module`
- Purpose: Persistent state — ORM entities mirroring the business domain
- Location: `backend/app/domain/models.py`, `backend/app/domain/enums.py`
- Contains: SQLAlchemy `Base` subclasses, string-enum vocab
- Depends on: `app/db.py` (`Base`)
- Used by: Services, routers (read paths)

## Data Flow

### Primary Request Path (assessment run)

### Onboarding / Aggregation Flow

### Monitoring Agent Flow (background, time-simulated)

- All state server-side in relational DB (Postgres in dev/prod via `asyncpg`, SQLite `StaticPool` in tests)
- No client-side computation of financial figures — frontend polls REST endpoints, engine output treated as opaque
- Simulated clock persisted in `SystemState` table, not wall-clock derived

## Key Abstractions

- Purpose: Decouple backend from concrete scoring implementation; `ScoringFeatures` input is additive-only once frozen
- Examples: `backend/app/scoring/base.py`, `backend/app/scoring/stub.py`, `backend/app/scoring/saeed.py`
- Pattern: `typing.Protocol` + Pydantic DTOs, factory-selected via `SCORING_BACKEND` env var
- Purpose: Decouple backend from concrete open-banking integration (mock vs Lean/Tarabut)
- Examples: `backend/app/providers/base.py`, `backend/app/providers/mock.py`, `backend/app/providers/lean.py`
- Pattern: `typing.Protocol` + Pydantic DTOs, factory-selected via `PROVIDER` env var
- Purpose: Isolate the credit decisioning algorithm as a testable, side-effect-free unit
- Examples: `rafid-engine/rafid_engine/engine.py`
- Pattern: Input `MerchantFeatures` → output `Decision`; `Decision` + requested amount → `Offer`. No DB/network calls inside.
- Purpose: Preserve full explainability payload (feature_contributions, reasons, engine_decision) verbatim for audit/frontend rendering
- Examples: `CreditAssessment.features`/`.decision` JSON columns (`backend/app/domain/models.py:153-154`)
- Pattern: Store Pydantic `.model_dump(mode="json")` output directly in a JSON column rather than normalizing into relational columns

## Entry Points

- Location: `backend/app/main.py`
- Triggers: `uvicorn app.main:app` (or equivalent ASGI server)
- Responsibilities: Router registration, CORS (open, `allow_origins=["*"]`), lifespan hook (create tables if `auto_create_tables`, start/stop APScheduler)
- Location: `backend/app/jobs/scheduler.py` (`start_scheduler()`/`stop_scheduler()`), invoked from `main.py` lifespan
- Triggers: App startup (if `MONITOR_ENABLED=true`, default)
- Responsibilities: Periodic simulated-day tick advancing settlements/repayments/alerts
- Location: `backend/app/seed/run.py`
- Triggers: `make reset` (per handoff doc) or manual invocation
- Responsibilities: Populate DB with 20 synthetic merchants, pre-connected/aggregated demo data
- Location: `rafid-engine/rafid_engine/__init__.py` (exports `assess`, `MerchantFeatures`)
- Triggers: Imported by `backend/app/scoring/saeed.py` when `SCORING_BACKEND=module`
- Responsibilities: None outside function calls — no server, no CLI entrypoint in prod path (examples dir has a standalone Gemini adapter demo)

## Architectural Constraints

- **Threading:** Single-process async event loop (FastAPI/uvicorn + asyncio). APScheduler's `AsyncIOScheduler` runs jobs on the same event loop, not separate threads.
- **Global state:** `@lru_cache`-memoized singletons for `get_settings()`, `get_scoring_model()`, `get_bank_provider()`, `get_sales_provider()` (module-level caches, effectively process-lifetime singletons). `scheduler` module-level `AsyncIOScheduler` instance in `backend/app/jobs/scheduler.py`.
- **Simulated clock:** Business logic must never use wall-clock time for "days remaining" — simulated date lives in `SystemState` DB row, advanced only by monitoring ticks. Violating this breaks the demo's time model.
- **Frozen-seam DTOs:** `ScoringFeatures`, `CreditDecision`, provider DTOs are additive-only once frozen — do not remove/rename fields without coordinating both sides of the seam (backend feature engineering vs `rafid-engine`/provider implementations).
- **rafid-engine has no I/O:** must stay pure — no DB session, no network client, no logging side-effects beyond return values — to remain independently testable and swappable.

## Anti-Patterns

### Client-side financial computation

### Deriving "days remaining" from browser clock

## Error Handling

- `ScoringError` → `HTTPException(400, str(e))` (`backend/app/api/routers/assessments.py:16`)
- Auth failures → `HTTPException(401)` (missing/invalid token) or `HTTPException(403)` (role/ownership mismatch) in `backend/app/api/deps.py`
- Pydantic validation errors surface as FastAPI's default 422 responses

## Cross-Cutting Concerns

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
