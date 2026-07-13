# Rafid Backend

Receivables-backed, Sharia-compliant **Murabaha** financing for digital merchants.
Team Rawafid — Tuwaiq Academy "Amad" Hackathon (Open Banking track, with Alinma Bank).

A merchant connects their bank + sales platforms (Salla/Zid/Jahez/Foodics), an ML model
scores 90 days of revenue, Rafid offers financing up to **80% of held receivables**, and
repayment is auto-collected from upcoming settlements. A background monitoring agent
watches settlements and raises risk alerts.

## Quick start

```bash
cd backend
docker compose up -d db        # Postgres 16 on localhost:5433
uv sync                        # Python 3.12 deps
uv run alembic upgrade head    # schema
uv run python -m app.seed.run  # 1 admin + 20 merchants with 90d synthetic data
uv run uvicorn app.main:app --reload --port 8000
```

- API docs (frontend contract): http://localhost:8000/docs · `/openapi.json`
- Health: `GET /health`
- `make dev` / `make seed` / `make reset` / `make test` / `make lint`

**Demo logins**

| Role | Email | Password |
|---|---|---|
| Bank admin | `admin@rafid.sa` | `AdminPass123!` |
| Merchants | `merchant01..20@rafid.sa` | `MerchantPass123!` |

`merchant17` (Amber Cosmetics) and `merchant20` (Safa Kitchen) are engineered risky —
revenue drop + delayed settlements — so alerts fire during the demo.

## Demo script (happy path)

```bash
BASE=http://localhost:8000
TOKEN=$(curl -s $BASE/auth/login -H 'content-type: application/json' \
  -d '{"email":"merchant03@rafid.sa","password":"MerchantPass123!"}' | jq -r .access_token)
AUTH="Authorization: Bearer $TOKEN"

curl -s -X POST $BASE/assessments/run -H "$AUTH" | jq '{score, risk_band, approved}'
OFFER=$(curl -s -X POST $BASE/offers/generate -H "$AUTH")
echo $OFFER | jq '{principal, profit_amount, total_repayable}'
curl -s -X POST $BASE/offers/$(echo $OFFER | jq -r .id)/accept -H "$AUTH" | jq .

# monitoring agent ticks every 15s (1 tick = 1 simulated day); or force one:
ADMIN=$(curl -s $BASE/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@rafid.sa","password":"AdminPass123!"}' | jq -r .access_token)
curl -s -X POST $BASE/admin/monitor/tick -H "Authorization: Bearer $ADMIN" | jq .
curl -s $BASE/admin/portfolio -H "Authorization: Bearer $ADMIN" | jq .
```

Seeded merchants already have connections + aggregated data. A fresh merchant flow:
`POST /auth/register` → `POST /connections/bank/consent/start` (institutions:
`alinma`, `alrajhi_synth`, `riyad_synth`) → `POST /connections/consent/complete`
(any `auth_code`; mock consent) → same for `/connections/sales/consent/start`
(platforms: `salla`, `zid`, `jahez`, `foodics`) → `POST /merchants/me/aggregate`.

## Architecture

Layered: routers (HTTP + JWT only) → services (all business logic) → two frozen
interfaces + repositories. See `IMPLEMENTATION_PLAN.md` at repo root.

**The two seams (frozen, additive-only):**

- `app/providers/base.py` — `OpenBankingProvider` / `SalesPlatformProvider`.
  MVP: `MockProvider` (deterministic synthetic data, simulated OAuth2 consent).
  Later: fill in `app/providers/lean.py`, set `PROVIDER=lean`.
- `app/scoring/base.py` — `ScoringFeatures` → `CreditScoringModel.score()` → `CreditDecision`.
  MVP: `StubScoringModel` (transparent weighted formula, explainable contributions).
  Saeed's model: implement `score()` behind the same interface, set `SCORING_BACKEND=module`
  (wire the import in `app/scoring/factory.py`). Out-of-process option: `HttpScoringModel` stub.

**Monitoring agent** (`app/jobs/scheduler.py` + `app/services/monitoring.py`):
APScheduler, every `MONITOR_INTERVAL_SECONDS` (default 15s) runs one tick = one simulated
day: due settlements arrive (risky merchants get deterministic delays), repayments
auto-apply against Murabaha schedules, contracts close when cleared, risk signals
re-checked (`revenue_drop`, `settlement_delay`, `missed_repayment` alerts). Idempotent —
tick lock + status-transition guards; manual triggers: `POST /admin/monitor/tick`,
`POST /settlements/{id}/receive`.

## Murabaha modeling (no interest, anywhere)

Bank buys the receivable-backed asset at `cost_price` and sells at
`sale_price = cost + disclosed profit`. Revenue = platform fee + success fee + Murabaha
profit — explicit line items on the offer. Fee numbers are **placeholders**
(`PLATFORM_FEE_PCT=0.02`, `SUCCESS_FEE_PCT=0.01`, `MURABAHA_PROFIT_PCT=0.06`) until
confirmed. Score scale 0–1000 with bands A≥750/B≥600/C≥450/D — placeholder convention.
⚠️ Real deployment requires Sharia committee sign-off on the contract template.

## Security & compliance (MVP level)

- JWT access+refresh, roles `merchant` / `bank_admin`; merchant scope always from token.
- Provider tokens Fernet-encrypted at rest (`FERNET_KEY` env; dev fallback key baked in —
  **must** be overridden outside dev).
- Consent explicit + revocable: `POST /connections/{id}/revoke` invalidates tokens and
  blocks future aggregation.
- `AuditLog` rows on consent grant/revoke, scoring, offer, disbursement, repayment, ticks.
- Not done (post-hackathon): rate limiting, real KYC/AML, HTTPS termination, SAMA sandbox.

## Layout

```
app/
  providers/   base.py (SEAM) mock.py lean.py factory.py
  scoring/     base.py (SEAM) features.py stub.py http.py factory.py
  domain/      models.py enums.py
  services/    onboarding aggregation scoring offers murabaha repayment monitoring dashboard audit
  api/         deps.py routers/ (auth merchants connections data assessments offers contracts alerts admin system)
  security/    auth.py crypto.py
  jobs/        scheduler.py
  seed/        synthetic.py run.py
alembic/       migrations
tests/         pytest (e2e happy path + auth + stub model)
```

## Tests

```bash
uv run pytest -q   # 9 tests; e2e runs the whole financing lifecycle on SQLite in-memory
```
