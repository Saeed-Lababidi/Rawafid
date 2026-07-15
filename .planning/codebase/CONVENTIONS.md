# Coding Conventions

**Analysis Date:** 2026-07-15

## Scope

Two Python packages: `backend/app` (FastAPI service, `rafid-backend`) and `rafid-engine/rafid_engine` (standalone scoring library, consumed by backend via `uv.sources` path dependency). Frontend is static HTML (`index.html`, `Rafid App (standalone).html`) — no JS framework/build tooling detected.

## Naming Patterns

**Files:**
- Python: `snake_case.py` throughout — `backend/app/services/scoring.py`, `backend/app/scoring/saeed.py`.
- One file per router under `backend/app/api/routers/` named after the resource (`assessments.py`, `contracts.py`, `offers.py`).
- One file per domain concern under `services/` (`scoring.py`, `offers.py`, `murabaha.py`, `repayment.py`, `monitoring.py`, `dashboard.py`, `aggregation.py`, `audit.py`, `onboarding.py`).

**Functions:**
- `snake_case`, verb-first: `run_assessment`, `latest_assessment`, `build_features`, `get_scoring_model`, `get_current_user`, `require_role`.
- Async I/O functions always prefixed with `async def`; pure/sync helpers (e.g. `_uuid()`, `utcnow()`) stay sync.
- Private/internal helpers prefixed with `_` (e.g. `_uuid`, `_features` in tests).

**Variables:**
- `snake_case`. Domain IDs are `str` (hex UUID4), never `int`.
- Constants (`FIXTURE`, `TEST_MERCHANT_ID`, `PASSWORD`) are `UPPER_SNAKE_CASE` at module scope in tests/fixtures.

**Types/Classes:**
- `PascalCase` for SQLAlchemy models (`Merchant`, `CreditAssessment`, `MurabahaContract`), Pydantic schemas (`AssessmentOut`, `ScoringFeatures`), and enums (`UserRole`, `AuditAction`).
- Exception classes are domain-named + `Error` suffix: `ScoringError` (`backend/app/services/scoring.py`).
- FastAPI dependency aliases use `PascalCase` type aliases built from `Annotated[...]`: `SessionDep`, `CurrentUser`, `CurrentMerchant`, `CurrentAdmin` (`backend/app/api/deps.py`).

## Code Style

**Formatting/Linting:**
- `ruff` is the sole linter for `backend` (`backend/pyproject.toml`): `line-length = 100`, `target-version = "py312"`.
- Lint rule set: `select = ["E", "F", "I", "UP", "B"]`, with `B008` ignored explicitly to allow FastAPI's `Depends()` in default args.
- No separate formatter config found (no `.prettierrc`, no `black` config) — ruff handles both lint and import order (`I` ruleset).
- `rafid-engine` has no lint config of its own; it inherits none — keep it consistent with backend's ruff style when editing.

**Type hints:**
- Full type hints everywhere, using modern `X | None` union syntax (py3.10+), not `Optional[X]`.
- SQLAlchemy 2.0 typed ORM style: `Mapped[str]`, `mapped_column(...)` — see `backend/app/domain/models.py`.
- Pydantic v2 models throughout for schemas/features (`ScoringFeatures`, `MerchantFeatures`).

## Import Organization

**Order (ruff `I` / isort-style, observed in all files):**
1. stdlib (`uuid`, `datetime`, `pathlib`)
2. third-party (`fastapi`, `sqlalchemy`, `pydantic`, `pytest`, `httpx`)
3. local `app.*` / `rafid_engine.*` absolute imports

**Style:**
- Always absolute imports from the package root — `from app.domain.models import Merchant, User`, `from app.scoring.saeed import SaeedModel`.
- No relative imports (`from .foo`) observed.
- No path aliases; plain package-qualified imports.

## Error Handling

**Backend (FastAPI layer):**
- Domain/service layer raises plain Python exceptions with descriptive messages, e.g. `class ScoringError(Exception): pass` (`backend/app/services/scoring.py:11`) raised as `raise ScoringError("no aggregated sales data; connect platforms and aggregate first")`.
- Router layer catches domain exceptions and converts to `HTTPException` with explicit status codes, chaining the original exception with `from e`:
  ```python
  try:
      return await run_assessment(session, merchant, actor_user_id=user.id)
  except ScoringError as e:
      raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
  ```
  (`backend/app/api/routers/assessments.py:14-17`)
- Auth/deps layer (`backend/app/api/deps.py`) raises `HTTPException` directly for 401/403 cases (missing token, invalid role, missing merchant scope), also chained with `from e` when wrapping a `ValueError` from `decode_token`.
- 404s are inline checks, not exceptions from services: `if not assessment or assessment.merchant_id != merchant.id: raise HTTPException(404, "assessment not found")`.
- Never leak internal exception messages beyond service-defined text — messages passed to `HTTPException` are hand-authored, lowercase, no trailing punctuation.

**rafid-engine (library layer):**
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

**Size:** Small, single-purpose. Service functions do one unit of work (build features → score → persist → audit → commit) with each step delegated to a helper module rather than inlined.

**Parameters:** Explicit typed params, `session: AsyncSession` first for service functions operating on the DB; optional actor context passed as keyword with default (`actor_user_id: str | None = None`).

**Return Values:** Return domain/ORM objects or Pydantic models directly from services; routers return these straight through `response_model=...` for serialization — no manual `.dict()`/`.model_dump()` in routers.

## Module Design

**Layering (backend):**
- `api/routers/*` — HTTP layer only: parse request, call one service function, map exceptions to `HTTPException`, return ORM/schema object.
- `services/*` — business logic, transaction boundaries (`session.commit()` lives here, not in routers).
- `scoring/*` — pluggable scoring models behind a factory (`scoring/factory.py::get_scoring_model()`); `scoring/saeed.py::SaeedModel` adapts `rafid_engine` into the backend's `ScoringFeatures → CreditDecision` seam.
- `domain/*` — SQLAlchemy ORM models (`models.py`) and string-backed enums (`enums.py`).
- `schemas/*` — Pydantic request/response DTOs, separate from ORM models.
- `security/*` — auth/token/crypto helpers.
- `providers/*` — external data provider abstraction (mock + real, via `factory.py`).

**Exports:** No barrel/`__init__.py` re-export pattern observed — `__init__.py` files are empty markers; consumers import directly from the defining module (`from app.scoring.saeed import SaeedModel`).

**Extending the scoring model:** New scoring backends implement the same interface as `SaeedModel` in `backend/app/scoring/base.py`/`saeed.py`/`stub.py`/`http.py` and get registered in `backend/app/scoring/factory.py`.

---

*Convention analysis: 2026-07-15*
