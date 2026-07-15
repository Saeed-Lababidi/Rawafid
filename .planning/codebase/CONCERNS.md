# Codebase Concerns

**Analysis Date:** 2026-07-15

## Tech Debt

**Open-banking / sales aggregator providers unimplemented:**
- Issue: `LeanProvider` and `TarabutSalesProvider` are pure stubs — every method raises `NotImplementedError`
- Files: `backend/app/providers/lean.py`
- Impact: `PROVIDER=lean` config option is non-functional; system only works with `PROVIDER=mock` (`backend/app/providers/mock.py`). Cannot go to production without real integration.
- Fix approach: Implement real Lean/Tarabut API calls behind the same `base.py` interface (`backend/app/providers/base.py`) — seam already exists by design.

**HTTP scoring backend unimplemented:**
- Issue: `scoring_backend: str = "http"` option in config raises `NotImplementedError`
- Files: `backend/app/scoring/http.py`
- Impact: Only `stub` and `module` scoring backends work; cannot call an external scoring microservice.
- Fix approach: Implement HTTP client calling out to hosted scoring service if/when needed.

**Fee schedule uses placeholder values:**
- Issue: Fee percentages hardcoded as defaults, explicitly marked unconfirmed
- Files: `backend/app/config.py` (lines ~35-39: `platform_fee_pct`, `success_fee_pct`, `murabaha_profit_pct`, `max_advance_ratio`, `offer_expiry_days`)
- Impact: Business-critical financial terms are guesses ("PLACEHOLDERS until confirmed (plan §18)"); wrong numbers in production could misprice every Murabaha contract.
- Fix approach: Confirm actual fee schedule with business stakeholders and set via environment config, remove hardcoded defaults or clearly gate behind explicit confirmation.

**Repayment allocation across settlements returns empty lists silently:**
- Files: `backend/app/services/repayment.py` (lines 39, 56 — `return []`)
- Impact: Silent no-ops when there are no active contracts or no due items; could mask logic errors during debugging since no error/log is raised.
- Fix approach: Add debug-level logging when returning early so a "no active contracts" case is distinguishable from "everything applied."

## Known Bugs

Not detected via static scan (no explicit TODO/FIXME/HACK/XXX markers found in `backend/app` or `rafid-engine/rafid_engine`). No bug tracker or issues file present in repo.

## Security Considerations

**Hardcoded dev JWT secret as class default:**
- Risk: `jwt_secret: str = "rafid-dev-secret-change-me"` in `backend/app/config.py` line 21 is a real fallback value used whenever `JWT_SECRET` env var is unset — if a production deploy forgets to set the env var, all JWTs are signed with a publicly known secret, allowing full auth bypass/token forgery.
- Files: `backend/app/config.py`, `backend/app/security/auth.py`
- Current mitigation: None — no runtime check that rejects the default value when `env != "dev"`.
- Recommendations: Fail fast at startup if `env == "prod"` and `jwt_secret` still equals the dev default; load secret exclusively from a secrets manager in production.

**Hardcoded dev Fernet encryption key as class default:**
- Risk: `_DEV_FERNET_KEY` constant (`backend/app/config.py` lines 9-10, 27) is committed to source control and used to encrypt provider tokens at rest whenever `FERNET_KEY` is unset. Anyone with repo access can decrypt any data encrypted with the default key.
- Files: `backend/app/config.py`
- Current mitigation: Comment warns "Any real deployment must set FERNET_KEY in the environment," but nothing enforces it.
- Recommendations: Same fail-fast pattern as JWT secret — refuse to start in non-dev env with the default key.

**CORS wide open (`allow_origins=["*"]`):**
- Risk: `backend/app/main.py` line 51 allows any origin to call the API. Combined with cookie/bearer auth this can enable CSRF-style abuse from malicious sites if credentials mode is ever enabled, and generally weakens API boundary control.
- Files: `backend/app/main.py`
- Current mitigation: None — appears to be hackathon-speed default.
- Recommendations: Restrict to known frontend origin(s) via env-configured allowlist before any real deployment.

**Bare `except Exception` swallowing errors in monitoring job:**
- Files: `backend/app/jobs/scheduler.py` line 30 (also `rafid-engine/rafid_engine/narration.py` line 118)
- Risk: Scheduler tick failures are logged but the job silently continues on next interval — repeated failures (e.g., DB connectivity loss) would not surface as an actionable alert, only log noise.
- Recommendations: Add failure-count metrics/alerting on repeated tick failures; consider distinguishing expected vs unexpected exceptions.

## Performance Bottlenecks

Not detected — codebase is small (~5K LOC across backend + engine) and uses async SQLAlchemy with per-request sessions; no obvious N+1 or blocking-call patterns surfaced in the explored files. Revisit once real transaction volume / longer scoring windows are exercised (`backend/app/scoring/features.py`, `backend/app/services/monitoring.py` — largest files at 193 and 277 lines respectively, worth a closer pass if performance issues emerge).

## Fragile Areas

**Monitoring/repayment tick logic:**
- Files: `backend/app/services/monitoring.py` (277 lines, largest service file), `backend/app/services/repayment.py`
- Why fragile: Simulates "1 tick = 1 simulated day" settlement/repayment flow with idempotency guarded only by a status-transition check (`SettlementStatus.RECEIVED`) plus an in-process lock comment reference ("serialized by a lock in services.monitoring"); concurrent manual-trigger + scheduled-tick races are handled by convention rather than DB-level constraints (e.g., no `SELECT ... FOR UPDATE` visible in reviewed excerpt).
- Safe modification: Any change to settlement/repayment state transitions must preserve the pending→received guard; add DB-level locking if moving beyond single-process deployment.
- Test coverage: `backend/tests/` has 339 total lines across test files — reasonable for a hackathon scope but unclear how much covers concurrent-tick edge cases specifically; verify before extending scheduler concurrency.

**Provider abstraction seam has 100% stub coverage for real providers:**
- Files: `backend/app/providers/lean.py`, `backend/app/providers/factory.py`
- Why fragile: The whole system's real-world viability (beyond demo/mock data) hinges on this unimplemented seam; any assumption baked into `mock.py`'s shape may not hold once real Lean/Tarabut responses are wired in.
- Safe modification: Treat `base.py` interface as the contract; when implementing `LeanProvider`, write integration tests against captured real API fixtures before switching `PROVIDER=lean` in any environment.

## Scaling Limits

**Single-process in-memory scheduler:**
- Current capacity: `AsyncIOScheduler` (APScheduler) runs in-process (`backend/app/jobs/scheduler.py`) — ties monitoring ticks to a single running app instance.
- Limit: Cannot horizontally scale the API behind multiple replicas without either disabling the scheduler on N-1 instances or moving to a distributed job scheduler, or every replica will double-fire monitoring ticks.
- Scaling path: Move to an external scheduler (e.g., Celery beat, cloud cron hitting a dedicated endpoint) or leader-election guard before scaling beyond one instance.

## Dependencies at Risk

**`passlib[bcrypt]==1.7.4` pinned exact + `bcrypt==4.0.1` pinned exact:**
- Files: `backend/pyproject.toml`
- Risk: Passlib is in low-maintenance mode upstream; exact-pinned versions avoid a known passlib/bcrypt>=4.1 compatibility break, but this also means the project can silently drift out of sync with upstream security patches to bcrypt.
- Impact: Low near-term risk, but exact pins should be revisited periodically for CVEs.
- Migration plan: Monitor passlib's replacement recommendations (e.g., moving to `bcrypt` library directly) and re-pin deliberately rather than via automatic upgrade.

## Missing Critical Features

**No rate limiting / brute-force protection visible on auth endpoints:**
- Problem: `backend/app/api/routers/auth.py` was located but rate limiting middleware was not found anywhere in `backend/app/main.py` or router-level dependencies.
- Blocks: Login/token endpoints are exposed to unlimited credential-stuffing attempts.

**No structured error tracking / APM integration:**
- Problem: Only stdlib `logging` observed (`backend/app/jobs/scheduler.py` uses `logging.getLogger`); no Sentry/Datadog or equivalent found in dependencies (`backend/pyproject.toml`).
- Blocks: Production incident diagnosis relies solely on log output, no aggregated error tracking.

## Test Coverage Gaps

**Provider stub paths (Lean/Tarabut) are inherently untestable as real integrations:**
- What's not tested: Real API integration cannot be tested until implemented — currently only the `NotImplementedError` seam exists.
- Files: `backend/app/providers/lean.py`
- Risk: When these are eventually implemented, there's no existing fixture/contract test scaffolding to validate against; risk of untested provider swap in production.
- Priority: Medium — deferred by design ("post-hackathon"), but should be planned before any real provider cutover.

**Fee schedule / financial correctness not verified against a spec:**
- What's not tested: Whether `platform_fee_pct`, `success_fee_pct`, `murabaha_profit_pct`, `max_advance_ratio` defaults in `backend/app/config.py` match any confirmed business requirement — the code comment itself flags them as unconfirmed placeholders.
- Files: `backend/app/config.py`, `backend/app/services/offers.py`, `backend/app/services/murabaha.py`
- Risk: Financial calculations could be systematically wrong even if unit tests pass, since tests would validate against the same placeholder values rather than ground truth.
- Priority: High — core business logic correctness.

---

*Concerns audit: 2026-07-15*
