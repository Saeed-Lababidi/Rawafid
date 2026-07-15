# Codebase Structure

**Analysis Date:** 2026-07-15

## Directory Layout

```
Rawafid/
├── backend/                     # FastAPI service — API, DB, business logic
│   ├── app/
│   │   ├── api/
│   │   │   ├── routers/         # One router per resource (auth, merchants, connections, data, assessments, offers, contracts, alerts, admin, system)
│   │   │   └── deps.py          # Auth/session dependency injection
│   │   ├── domain/               # SQLAlchemy ORM models + enums
│   │   ├── jobs/                 # APScheduler monitoring agent
│   │   ├── providers/            # Open-banking/sales-platform provider abstraction (frozen seam)
│   │   ├── schemas/              # Pydantic request/response DTOs
│   │   ├── scoring/               # Credit scoring abstraction (frozen seam) + rafid-engine adapter
│   │   ├── security/              # JWT auth + Fernet encryption
│   │   ├── seed/                  # Synthetic demo-data generation
│   │   ├── services/              # Business logic orchestration
│   │   ├── config.py              # Env-driven Settings (pydantic-settings)
│   │   ├── db.py                  # Async SQLAlchemy engine/session/Base
│   │   └── main.py                # FastAPI app entrypoint
│   ├── alembic/                   # DB migrations
│   │   └── versions/
│   ├── tests/                     # pytest suite
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── Makefile
│   ├── pyproject.toml             # uv-managed Python deps
│   ├── uv.lock
│   └── FRONTEND_GUIDE.md          # Backend API contract for frontend integration
├── rafid-engine/                  # Standalone pure-Python credit scoring engine (in-process lib)
│   ├── rafid_engine/
│   │   ├── engine.py              # Public entrypoints: assess(), quote()
│   │   ├── scorecard.py           # 7-factor scoring
│   │   ├── decision.py            # Approve/review/decline rules
│   │   ├── confidence.py          # Confidence scoring
│   │   ├── exposure.py            # Max advance + repayment schedule pricing
│   │   ├── explain.py             # Bilingual (AR/EN) explanation builder
│   │   ├── narration.py           # Narrative text templates
│   │   ├── schema.py              # Pydantic contract types (MerchantFeatures, Decision, Offer, ...)
│   │   ├── config.py               # Engine version, thresholds, product config
│   │   └── registry.py
│   ├── datasets/                   # Reference/test datasets
│   ├── examples/                   # Standalone usage demos (e.g. gemini_adapter.py)
│   └── tests/                      # Engine-specific test suite
├── .claude/                        # GSD workflow tooling (agents, commands, skills)
├── .planning/                      # GSD planning artifacts (this document lives here)
├── Rafid App (standalone).html     # Hackathon prototype UI (source of layout/Arabic copy only)
├── index.html                      # Duplicate/served copy of the prototype
├── RAFID_FRONTEND_HANDOFF.md       # Frontend rebuild contract (prototype → production mapping)
└── README.md
```

## Directory Purposes

**`backend/app/api/routers/`:**
- Purpose: HTTP endpoint definitions, one file per resource domain
- Contains: FastAPI `APIRouter` instances; thin handlers delegating to `services/`
- Key files: `assessments.py` (scoring), `offers.py`, `contracts.py`, `connections.py` (open-banking consent), `data.py` (raw reads: accounts/transactions/sales/settlements), `admin.py` (bank_admin-only), `auth.py`, `merchants.py`, `alerts.py`, `system.py`

**`backend/app/services/`:**
- Purpose: Business logic — the only layer that should mix providers + scoring + DB writes
- Contains: `onboarding.py`, `scoring.py`, `offers.py`, `murabaha.py`, `repayment.py`, `monitoring.py`, `dashboard.py`, `audit.py`

**`backend/app/providers/`:**
- Purpose: External open-banking/sales-platform integration behind a frozen `Protocol`
- Contains: `base.py` (interface + DTOs), `mock.py` (synthetic/demo), `lean.py` (real Lean/Tarabut), `factory.py` (env-selected singleton)

**`backend/app/scoring/`:**
- Purpose: Credit scoring behind a frozen `Protocol`; feature engineering + backend selection
- Contains: `base.py` (interface + `ScoringFeatures`/`CreditDecision`), `features.py` (raw DB → `ScoringFeatures`), `stub.py`, `http.py`, `saeed.py` (rafid-engine adapter), `factory.py`

**`backend/app/domain/`:**
- Purpose: Persistent data model
- Contains: `models.py` (all SQLAlchemy `Base` subclasses), `enums.py` (string-enum vocab shared across app)

**`backend/app/schemas/`:**
- Purpose: API request/response shape, decoupled from ORM models
- Contains: `auth.py`, `admin.py`, `common.py`, `financing.py`

**`backend/app/security/`:**
- Purpose: JWT issuance/validation, password hashing, encryption at rest
- Contains: `auth.py`, `crypto.py`

**`backend/app/jobs/`:**
- Purpose: Background/scheduled work
- Contains: `scheduler.py` (APScheduler monitoring agent, 1 tick = 1 simulated day)

**`backend/app/seed/`:**
- Purpose: Demo data bootstrap
- Contains: `synthetic.py` (data generation), `run.py` (entrypoint, wired to `make reset`)

**`backend/alembic/versions/`:**
- Purpose: Incremental DB schema migrations
- Generated: Yes (via `alembic revision`)
- Committed: Yes

**`backend/tests/`:**
- Purpose: pytest suite — auth, happy-path integration, scoring (stub + engine)
- Contains: `conftest.py` (fixtures), `test_auth.py`, `test_happy_path.py`, `test_scoring_engine.py`, `test_scoring_stub.py`

**`rafid-engine/rafid_engine/`:**
- Purpose: Standalone, pure-function credit scoring library — no DB/network, importable independent of the backend
- Contains: Engine pipeline modules (scorecard, confidence, decision, exposure, explain) + Pydantic schema contracts

**`rafid-engine/tests/`:**
- Purpose: Engine unit/pipeline tests, independent of backend test suite

**`rafid-engine/datasets/`:**
- Purpose: Reference merchant feature datasets used by tests/examples

**`.claude/`:**
- Purpose: GSD (Getting-Stuff-Done) workflow tooling — commands, agents, skills, workflow definitions
- Generated: Partially (installed by GSD tooling)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning artifacts (roadmaps, phase plans, codebase maps — this file's home)
- Committed: Yes

## Key File Locations

**Entry Points:**
- `backend/app/main.py`: FastAPI app, router registration, lifespan (DB create + scheduler start/stop)
- `backend/app/jobs/scheduler.py`: `start_scheduler()`/`stop_scheduler()`, called from `main.py`
- `backend/app/seed/run.py`: Demo data seeding entrypoint (`make reset`)
- `rafid-engine/rafid_engine/__init__.py`: Public exports (`assess`, `MerchantFeatures`)

**Configuration:**
- `backend/app/config.py`: `Settings` (pydantic-settings, env-driven) — DB URL, JWT secret, provider/scoring backend toggles, fee schedule, monitor interval
- `backend/.env` (not committed, referenced by `SettingsConfigDict(env_file=".env")`)
- `backend/alembic.ini`: Migration config
- `backend/pyproject.toml`: Python deps (uv-managed), `backend/uv.lock` for reproducible installs
- `backend/docker-compose.yml`, `backend/Dockerfile`: Local Postgres + service containerization
- `backend/Makefile`: Dev shortcuts (`make reset`, etc.)

**Core Logic:**
- `backend/app/services/scoring.py`: `run_assessment()` — orchestrates feature build + scoring model call + persistence
- `backend/app/scoring/saeed.py`: Adapter squashing rafid-engine's rich `Decision` into backend's `CreditDecision`
- `rafid-engine/rafid_engine/engine.py`: `assess()`/`quote()` — the engine's entire integration surface
- `backend/app/services/monitoring.py`: `run_tick()` — simulated-day settlement/repayment/alert progression
- `backend/app/domain/models.py`: All persisted entities in one file

**Testing:**
- `backend/tests/conftest.py`: Shared pytest fixtures (likely DB session, test client)
- `backend/tests/test_happy_path.py`: End-to-end integration flow
- `backend/tests/test_scoring_engine.py`: Tests `SaeedModel`/rafid-engine integration path
- `rafid-engine/tests/`: Engine-internal unit tests

## Naming Conventions

**Files:**
- Python: `snake_case.py` throughout (e.g. `credit_assessment`, `run.py`, `factory.py`)
- One router/service/provider/model file per resource/concern — avoid mixing unrelated resources in one file
- Test files: `test_<subject>.py` (pytest discovery convention)

**Directories:**
- Layer-named plural nouns: `routers/`, `services/`, `providers/`, `schemas/`, `versions/`
- `app/` is the Python package root for the backend (`app.main`, `app.config`, etc.)
- `rafid_engine/` (underscored) is the importable package name; `rafid-engine/` (hyphenated) is the repo directory containing it — standard Python packaging convention

**Classes/Types:**
- SQLAlchemy ORM classes: `PascalCase` matching domain nouns (`Merchant`, `CreditAssessment`, `FinancingOffer`, `MurabahaContract`) — DB-row suffix `Row` used for raw synced data (`BankAccountRow`, `TransactionRow`, `SalesOrderRow`, `SettlementRow`) to distinguish from provider DTOs of similar name
- Pydantic DTOs: `PascalCase`, often suffixed `Out` for response schemas (`AssessmentOut`, `AssessmentDetailOut`, `ContractOut`) per `RAFID_FRONTEND_HANDOFF.md` §4
- Protocol interfaces: `PascalCase` noun describing the capability (`CreditScoringModel`, `OpenBankingProvider`, `SalesPlatformProvider`)

## Where to Add New Code

**New API endpoint (existing resource):**
- Add handler to the matching file in `backend/app/api/routers/`
- Add/extend schema in `backend/app/schemas/`
- Add business logic to matching `backend/app/services/*.py` — routers stay thin

**New API resource:**
- New file in `backend/app/api/routers/<resource>.py`
- Register in `backend/app/main.py` via `app.include_router(...)`
- New schema file in `backend/app/schemas/` if needed
- New service file in `backend/app/services/` for orchestration logic

**New DB entity:**
- Add SQLAlchemy class to `backend/app/domain/models.py`
- Generate Alembic migration: `alembic revision --autogenerate` → review output in `backend/alembic/versions/`

**New provider (open-banking/sales-platform):**
- Implement `OpenBankingProvider`/`SalesPlatformProvider` Protocol in a new file under `backend/app/providers/`
- Wire into `backend/app/providers/factory.py` behind an env-var branch
- Do not change `base.py` DTOs except additively — this is a frozen seam

**New scoring backend:**
- Implement `CreditScoringModel` Protocol in a new file under `backend/app/scoring/`
- Wire into `backend/app/scoring/factory.py` behind `SCORING_BACKEND` branch
- Do not change `ScoringFeatures`/`CreditDecision` in `base.py` except additively — this is a frozen seam

**Changes to rafid-engine scoring logic:**
- Edit within `rafid-engine/rafid_engine/` (scorecard/decision/exposure/explain modules)
- Keep `assess()`/`quote()` signatures pure (no DB/network) — see `rafid-engine/rafid_engine/engine.py`
- Add/extend tests in `rafid-engine/tests/`
- Backend-facing changes route through `backend/app/scoring/saeed.py` adapter only

**Utilities:**
- Shared feature engineering: `backend/app/scoring/features.py`
- Shared auth/crypto helpers: `backend/app/security/`

**Tests:**
- Backend: `backend/tests/test_<subject>.py`, using fixtures from `backend/tests/conftest.py`
- Engine: `rafid-engine/tests/`

## Special Directories

**`backend/alembic/versions/`:**
- Purpose: Immutable history of schema migrations
- Generated: Yes (via Alembic autogenerate, human-reviewed)
- Committed: Yes

**`.claude/gsd-core/`:**
- Purpose: GSD workflow engine internals (templates, workflows, references) — not application code
- Generated: Installed by GSD tooling
- Committed: Yes

**`.planning/codebase/`:**
- Purpose: Generated codebase-mapping documents (this file and siblings) consumed by GSD planning commands
- Generated: Yes (by `/gsd-map-codebase`)
- Committed: Yes

**`Rafid App (standalone).html` / `index.html`:**
- Purpose: Hackathon prototype UI — reference for screen layout and Arabic copy ONLY; data shapes are stale/invented (see `RAFID_FRONTEND_HANDOFF.md` §3)
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-07-15*
