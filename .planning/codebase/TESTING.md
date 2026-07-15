# Testing Patterns

**Analysis Date:** 2026-07-15

## Test Framework

Two independent pytest suites — one per Python package.

**backend (`backend/tests`):**
- Runner: `pytest>=8.2` + `pytest-asyncio>=0.23`, config in `backend/pyproject.toml`:
  ```toml
  [tool.pytest.ini_options]
  asyncio_mode = "auto"
  testpaths = ["tests"]
  ```
  `asyncio_mode = "auto"` means async `def test_...` functions run without needing `@pytest.mark.asyncio` decorators.
- HTTP client for API tests: `httpx.AsyncClient` + `httpx.ASGITransport` (no real network/server process).
- Dev deps declared under `[dependency-groups] dev` in `backend/pyproject.toml`: `pytest`, `pytest-asyncio`, `httpx`, `ruff`.

**rafid-engine (`rafid-engine/tests`):**
- Runner: `pytest>=7.4` (declared in `[project.optional-dependencies] dev`), config in `rafid-engine/pyproject.toml`:
  ```toml
  [tool.pytest.ini_options]
  testpaths = ["tests"]
  ```
- Pure synchronous unit tests — no async, no HTTP layer (library has no I/O).

**Run Commands:**
```bash
cd backend && uv run pytest          # backend suite (uses uv-managed venv incl. rafid-engine path dep)
cd rafid-engine && pytest            # engine suite standalone
```
No coverage tool (`pytest-cov`, `coverage.py`) configured in either package.

## Test File Organization

**Location:** Separate top-level `tests/` directory per package (not co-located with source).

**backend/tests/:**
```
tests/
├── __init__.py
├── conftest.py            # shared fixtures: client, seeded_users, login()
├── test_auth.py
├── test_happy_path.py     # end-to-end flow through the API
├── test_scoring_engine.py # SaeedModel adapter behind the CreditScoringModel seam
└── test_scoring_stub.py
```

**rafid-engine/tests/:**
```
tests/
├── test_smoke.py               # A1: fixture/contract/registry wiring
├── test_scoring.py
├── test_exposure.py
├── test_decision_confidence.py
├── test_explain.py
└── test_narration.py
```

**Naming:** `test_<unit_or_behavior>.py` at file level; test functions `test_<behavior_description>` in `snake_case`, descriptive full sentences (`test_healthy_merchant_approved_with_rich_decision`, `test_no_receivables_not_approved`, `test_engine_is_deterministic`).

## Test Structure

**backend — fixture-driven API tests** (`backend/tests/conftest.py`):
```python
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"   # set BEFORE any app import
os.environ["MONITOR_ENABLED"] = "false"

@pytest.fixture
async def client():
    await create_all()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    await drop_all()

@pytest.fixture
async def seeded_users(client):
    """A merchant with a known-good synthetic profile + a bank admin."""
    ...
    return profile
```
- Each test gets a fresh in-memory SQLite DB (`create_all()`/`drop_all()` per test via the `client` fixture) — full isolation, no shared state between tests.
- Env vars that affect import-time settings resolution are set at the top of `conftest.py`, above imports, with a comment explaining why (`app.db`/settings resolve at import time).
- Deterministic test data via `uuid.uuid5` (namespace + fixed email) so the synthetic profile generator (`app.seed.synthetic.profile_for`) always returns the same "healthy, non-risky" merchant for a given test.

**backend — unit tests for scoring adapter** (`backend/tests/test_scoring_engine.py`):
```python
def _features(**over) -> ScoringFeatures:
    today = date.today()
    base = dict(merchant_id="m_test", ...)
    base.update(over)
    return ScoringFeatures(**base)

def test_healthy_merchant_approved_with_rich_decision():
    d = SaeedModel().score(_features())
    assert d.approved
    ...
```
- Private `_features(**over)` factory builds a fully-populated baseline object; individual tests override only the fields relevant to that case via `**over` kwargs — avoids duplicating the whole fixture per test.
- No mocking framework used for pure-function/domain-object tests — construct real objects, call the real function, assert on the real result.

**rafid-engine — contract/property tests** (`rafid-engine/tests/test_smoke.py`):
```python
FIXTURE = pathlib.Path(__file__).parent.parent / "datasets" / "merchant_alosaila.json"

def _load() -> MerchantFeatures:
    return MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))

def test_assess_returns_contract_complete_decision():
    d = assess(_load())
    assert isinstance(d, Decision)
    ...
    Decision.model_validate_json(d.model_dump_json())  # round-trip check
```
- Loads real JSON fixtures from `rafid-engine/datasets/` rather than inline dicts for realistic input shapes.
- Explicitly asserts JSON round-trip (`model_dump_json()` → `model_validate_json()`) to guarantee serialization contracts hold, since this is exactly how the backend consumes the engine.
- Invalid-input tests assert pydantic raises on contract violations:
  ```python
  def test_input_rejects_unknown_field():
      with pytest.raises(Exception):
          MerchantFeatures.model_validate({"merchant": {}, "bogus_field": 1})
  ```

## Mocking

No mocking library (`unittest.mock`, `pytest-mock`, `responses`) used in either suite. The architecture favors **real objects + isolated infrastructure** instead:
- Backend: real FastAPI app wired to a real (in-memory SQLite) DB per test, exercised through a real ASGI transport — not mocked at the HTTP layer.
- External data providers already have a `mock` provider variant selected via `backend/app/providers/factory.py` for deterministic synthetic data — this is a first-class provider implementation, not a test-only mock.
- Scoring engine tests call the real `SaeedModel`/`rafid_engine.assess` — no stubbed scoring output except via the dedicated `scoring/stub.py` implementation (itself a real, simple scoring model, tested in `test_scoring_stub.py`).

**What to mock:** Nothing observed — prefer real in-process implementations (in-memory DB, mock provider classes) over test-double mocking.

**What NOT to mock:** The scoring engine and DB layer are exercised for real in every test; do not introduce mock-based tests that bypass them unless testing pure error-path branching that's otherwise unreachable.

## Fixtures and Test Data

**Backend:**
- Deterministic per-merchant synthetic profiles from `app.seed.synthetic.profile_for(merchant_id)` — same UUID always produces the same profile, used both for seeding and for assertions.
- Auth: `login(client, email, password)` helper in `conftest.py` performs a real `/auth/login` POST and returns an `Authorization` header dict for use in subsequent authenticated requests.

**rafid-engine:**
- JSON fixture files under `rafid-engine/datasets/` (e.g. `merchant_alosaila.json`) loaded via `pathlib.Path` relative to the test file — realistic, versioned sample merchant data rather than synthesized-in-test dicts.

## Coverage

No coverage tool/threshold configured in either package (`pytest-cov` absent from dev deps). Coverage is not currently enforced or measured.

## Test Types

**Unit tests:**
- `backend/tests/test_scoring_engine.py`, `test_scoring_stub.py` — scoring model adapters in isolation, no HTTP/DB.
- `rafid-engine/tests/*` — pure library logic (scoring factors, exposure, confidence, narration, explanation), no I/O.

**Integration/API tests:**
- `backend/tests/test_auth.py`, `test_happy_path.py` — full request/response cycles through the real FastAPI app + in-memory DB via `httpx.AsyncClient`.

**E2E tests:** Not used — no browser/UI test framework present (frontend is static HTML with no test harness).

## Common Patterns

**Async testing (backend):**
```python
@pytest.fixture
async def client():
    ...
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    await drop_all()

async def test_something(client, seeded_users):
    headers = await login(client, TEST_MERCHANT_EMAIL)
    resp = await client.post("/assessments/run", headers=headers)
    assert resp.status_code == 201, resp.text
```
`asyncio_mode = "auto"` — no explicit `@pytest.mark.asyncio` needed.

**Error/status testing:**
```python
assert resp.status_code == 200, resp.text   # include body in assertion message for debuggability
```
Assertions consistently pass `resp.text` (or similar) as the assertion failure message so failures are self-explanatory in CI output.

**Deterministic engine testing:**
```python
def test_engine_is_deterministic():
    a = SaeedModel().score(_features())
    b = SaeedModel().score(_features())
    assert a.score == b.score
```

---

*Testing analysis: 2026-07-15*
