<!-- refreshed: 2026-07-15 -->
# Architecture

**Analysis Date:** 2026-07-15

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI app (backend)                     │
│                     `backend/app/main.py`                    │
├──────────────────┬──────────────────┬───────────────────────┤
│  API Routers      │  Jobs/Scheduler  │  Security/Auth        │
│ `backend/app/api/` │ `backend/app/jobs/`│ `backend/app/security/`│
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Services layer                          │
│    `backend/app/services/` (onboarding, scoring, offers,      │
│     murabaha, repayment, monitoring, dashboard, audit)        │
└────────┬─────────────────────────────┬────────────────────--┘
         │                             │
         ▼                             ▼
┌────────────────────────┐   ┌────────────────────────────────┐
│  Provider abstraction   │   │  Scoring abstraction            │
│ `backend/app/providers/`│   │ `backend/app/scoring/`          │
│ (mock / lean open-bank) │   │ (stub / http / module→engine)   │
└────────┬────────────────┘   └────────┬───────────────────────┘
         │                             │
         │                             ▼
         │                   ┌────────────────────────────────┐
         │                   │  rafid-engine (pure Python lib)  │
         │                   │  `rafid-engine/rafid_engine/`    │
         │                   │  assess() / quote() — no DB/net  │
         │                   └────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────┐
│              SQLAlchemy async ORM + DB (Postgres/SQLite)      │
│     `backend/app/domain/models.py`, `backend/app/db.py`       │
└─────────────────────────────────────────────────────────────┘
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

**Overall:** Layered service architecture (FastAPI routers → services → ORM/providers/scoring), with two explicit **frozen seams** (Protocol-based abstraction boundaries) isolating swappable subsystems: open-banking data providers and credit scoring models. The credit-scoring "engine" (`rafid-engine`) is a separate, independently-testable pure-function Python package consumed in-process by the backend via an adapter (`app/scoring/saeed.py`).

**Key Characteristics:**
- Async-first: FastAPI + SQLAlchemy async ORM (`asyncpg` in prod, aiosqlite-compatible StaticPool for tests)
- Dependency injection via FastAPI `Depends` (`SessionDep`, `CurrentUser`, `CurrentMerchant`, `CurrentAdmin` in `backend/app/api/deps.py`)
- Provider pattern for external integrations (mock vs real Lean/Tarabut), selected by env var at factory boundary (`backend/app/providers/factory.py`)
- Strategy pattern for scoring backend (stub/http/module), selected by env var (`backend/app/scoring/factory.py`), cached via `@lru_cache`
- Background job (APScheduler) simulating time-driven settlement/repayment lifecycle, decoupled from request/response cycle
- rafid-engine is a pure function library (`assess`, `quote`) — no side effects, no I/O — called synchronously from within an async service

## Layers

**API layer (routers):**
- Purpose: HTTP request/response, auth enforcement, input validation via Pydantic schemas
- Location: `backend/app/api/routers/`
- Contains: One router per resource domain; thin — delegates to services
- Depends on: `app/api/deps.py` (auth deps), `app/services/*`, `app/schemas/*`
- Used by: External HTTP clients (frontend), OpenAPI/Swagger consumers

**Service layer:**
- Purpose: Business logic — orchestrates providers, scoring, DB writes, audit logging
- Location: `backend/app/services/`
- Contains: `onboarding.py` (connect/aggregate), `scoring.py` (run_assessment), `offers.py` (generate/accept/reject), `murabaha.py` (contract creation), `repayment.py` (apply repayments), `monitoring.py` (simulated-day tick), `dashboard.py` (aggregation reads), `audit.py` (audit log writes)
- Depends on: `app/providers/*`, `app/scoring/*`, `app/domain/models.py`, `app/db.py`
- Used by: Routers, jobs/scheduler

**Provider abstraction:**
- Purpose: Decouple open-banking/sales-platform data source from business logic
- Location: `backend/app/providers/`
- Contains: `base.py` (frozen `Protocol` + DTOs: `ConsentSession`, `ProviderToken`, `BankAccount`, `Transaction`, `SalesOrder`, `Settlement`), `mock.py` (synthetic data), `lean.py` (real Lean/Tarabut integration), `factory.py` (env-driven selection)
- Depends on: Nothing internal (pure interface + implementations)
- Used by: `app/services/onboarding.py`

**Scoring abstraction:**
- Purpose: Decouple credit-decision logic from request handling; allow swapping stub/http/rafid-engine
- Location: `backend/app/scoring/`
- Contains: `base.py` (frozen `Protocol` + `ScoringFeatures`/`CreditDecision` DTOs), `stub.py`, `http.py`, `saeed.py` (rafid-engine adapter), `features.py` (feature engineering from raw DB rows), `factory.py`
- Depends on: `rafid_engine` package (only `saeed.py`)
- Used by: `app/services/scoring.py`

**rafid-engine (external library, in-process):**
- Purpose: Pure, deterministic, explainable 7-factor credit scorecard + Murabaha offer pricing
- Location: `rafid-engine/rafid_engine/`
- Contains: `engine.py` (entrypoints `assess()`/`quote()`), `scorecard.py` (7-factor scoring), `confidence.py`, `decision.py` (approve/review/decline rules), `exposure.py` (max advance + repayment schedule pricing), `explain.py` (bilingual AR/EN narration), `narration.py`, `schema.py` (Pydantic contract types: `MerchantFeatures`, `Decision`, `Offer`, etc.), `config.py`, `registry.py`
- Depends on: Nothing from backend (standalone package, importable, no DB/network)
- Used by: `backend/app/scoring/saeed.py` only, when `SCORING_BACKEND=module`

**Domain layer:**
- Purpose: Persistent state — ORM entities mirroring the business domain
- Location: `backend/app/domain/models.py`, `backend/app/domain/enums.py`
- Contains: SQLAlchemy `Base` subclasses, string-enum vocab
- Depends on: `app/db.py` (`Base`)
- Used by: Services, routers (read paths)

## Data Flow

### Primary Request Path (assessment run)

1. `POST /assessments/run` hits router (`backend/app/api/routers/assessments.py:12`)
2. Router resolves `CurrentMerchant`/`CurrentUser` via auth deps (`backend/app/api/deps.py`)
3. Delegates to `run_assessment()` in `backend/app/services/scoring.py`
4. Service builds `ScoringFeatures` from persisted transactions/sales/settlements (feature engineering, `backend/app/scoring/features.py`)
5. Service calls `get_scoring_model().score(features)` — factory resolves stub/http/module backend (`backend/app/scoring/factory.py`)
6. If `module` backend: `SaeedModel.score()` maps flat `ScoringFeatures` → nested `MerchantFeatures`, calls `rafid_engine.assess()` (pure, `rafid-engine/rafid_engine/engine.py:42`), squashes rich `Decision` into `CreditDecision` and carries the full engine `Decision` on `engine_decision` field
7. Service persists `CreditAssessment` row (features + decision JSON snapshot) via `session`
8. Router returns `AssessmentDetailOut` (Pydantic schema)

### Onboarding / Aggregation Flow

1. Merchant starts consent: `POST /connections/{bank|sales}/consent/start` → `backend/app/services/onboarding.py` calls provider (`get_bank_provider()`/`get_sales_provider()`)
2. `POST /connections/consent/complete` exchanges auth code for `ProviderToken`, encrypted at rest via Fernet (`backend/app/security/crypto.py`) and stored on `Connection.token_encrypted`
3. `POST /merchants/me/aggregate` pulls transactions/sales/settlements from provider, writes `TransactionRow`/`SalesOrderRow`/`SettlementRow`, idempotent/incremental

### Monitoring Agent Flow (background, time-simulated)

1. APScheduler fires `_monitor_job()` every `MONITOR_INTERVAL_SECONDS` (default 15s) — `backend/app/jobs/scheduler.py`
2. Job opens its own DB session, calls `run_tick()` in `backend/app/services/monitoring.py`
3. Tick advances simulated day (`SystemState` key-value row), processes pending settlements → repayments applied to `RepaymentScheduleItem`/`Repayment`, raises `RiskAlert` rows on anomalies, closes contracts on payoff
4. Serialized by a lock to stay safe against concurrent manual trigger (`POST /admin/monitor/tick`)

**State Management:**
- All state server-side in relational DB (Postgres in dev/prod via `asyncpg`, SQLite `StaticPool` in tests)
- No client-side computation of financial figures — frontend polls REST endpoints, engine output treated as opaque
- Simulated clock persisted in `SystemState` table, not wall-clock derived

## Key Abstractions

**Frozen seam — `CreditScoringModel` Protocol:**
- Purpose: Decouple backend from concrete scoring implementation; `ScoringFeatures` input is additive-only once frozen
- Examples: `backend/app/scoring/base.py`, `backend/app/scoring/stub.py`, `backend/app/scoring/saeed.py`
- Pattern: `typing.Protocol` + Pydantic DTOs, factory-selected via `SCORING_BACKEND` env var

**Frozen seam — `OpenBankingProvider`/`SalesPlatformProvider` Protocols:**
- Purpose: Decouple backend from concrete open-banking integration (mock vs Lean/Tarabut)
- Examples: `backend/app/providers/base.py`, `backend/app/providers/mock.py`, `backend/app/providers/lean.py`
- Pattern: `typing.Protocol` + Pydantic DTOs, factory-selected via `PROVIDER` env var

**Pure function engine boundary (`assess`/`quote`):**
- Purpose: Isolate the credit decisioning algorithm as a testable, side-effect-free unit
- Examples: `rafid-engine/rafid_engine/engine.py`
- Pattern: Input `MerchantFeatures` → output `Decision`; `Decision` + requested amount → `Offer`. No DB/network calls inside.

**JSON snapshot persistence:**
- Purpose: Preserve full explainability payload (feature_contributions, reasons, engine_decision) verbatim for audit/frontend rendering
- Examples: `CreditAssessment.features`/`.decision` JSON columns (`backend/app/domain/models.py:153-154`)
- Pattern: Store Pydantic `.model_dump(mode="json")` output directly in a JSON column rather than normalizing into relational columns

## Entry Points

**FastAPI app:**
- Location: `backend/app/main.py`
- Triggers: `uvicorn app.main:app` (or equivalent ASGI server)
- Responsibilities: Router registration, CORS (open, `allow_origins=["*"]`), lifespan hook (create tables if `auto_create_tables`, start/stop APScheduler)

**Monitoring scheduler:**
- Location: `backend/app/jobs/scheduler.py` (`start_scheduler()`/`stop_scheduler()`), invoked from `main.py` lifespan
- Triggers: App startup (if `MONITOR_ENABLED=true`, default)
- Responsibilities: Periodic simulated-day tick advancing settlements/repayments/alerts

**Seed script:**
- Location: `backend/app/seed/run.py`
- Triggers: `make reset` (per handoff doc) or manual invocation
- Responsibilities: Populate DB with 20 synthetic merchants, pre-connected/aggregated demo data

**rafid-engine (library, not a standalone service):**
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

**What happens:** Earlier prototype computed fees/scores client-side (`amount*2.1%`, hand-picked score/850).
**Why it's wrong:** Diverges from server-authoritative Murabaha fee schedule and rafid-engine decision; risk of Sharia-compliance/accuracy drift, and duplicated business rules.
**Do this instead:** Always call `/offers/generate` and `/assessments/run`; treat `Decision`/`Offer` as opaque server data (see `RAFID_FRONTEND_HANDOFF.md` §4).

### Deriving "days remaining" from browser clock

**What happens:** Naively computing countdowns using `Date.now()` on the client.
**Why it's wrong:** Backend runs a simulated calendar (15s = 1 day via `backend/app/jobs/scheduler.py`); real time and simulated time diverge.
**Do this instead:** Render absolute dates from API responses; only `sim_date` from `POST /admin/monitor/tick` reflects simulated "now".

## Error Handling

**Strategy:** Service layer raises typed exceptions (e.g. `ScoringError` in `backend/app/services/scoring.py`); routers catch and translate to `HTTPException` with `{"detail": "..."}` body.

**Patterns:**
- `ScoringError` → `HTTPException(400, str(e))` (`backend/app/api/routers/assessments.py:16`)
- Auth failures → `HTTPException(401)` (missing/invalid token) or `HTTPException(403)` (role/ownership mismatch) in `backend/app/api/deps.py`
- Pydantic validation errors surface as FastAPI's default 422 responses

## Cross-Cutting Concerns

**Logging:** Standard library `logging`, configured at `INFO` in `backend/app/main.py`; named loggers per module (e.g. `logging.getLogger("rafid.monitor")` in `backend/app/jobs/scheduler.py`)

**Validation:** Pydantic models throughout — request/response schemas (`backend/app/schemas/`), scoring/provider DTOs (Protocol boundaries), rafid-engine's own `schema.py`

**Authentication:** JWT bearer tokens (`backend/app/security/auth.py`), roles (`merchant`/`bank_admin`) enforced via `require_role()` dependency factory (`backend/app/api/deps.py:36`); merchant scope always derived from token `sub`, never client-supplied ID

**Encryption at rest:** Fernet symmetric encryption for provider tokens before DB storage (`backend/app/security/crypto.py`, `Connection.token_encrypted`)

---

*Architecture analysis: 2026-07-15*
