# Rafid Backend — Frontend Integration Guide

Everything the frontend needs to build against the Rafid API. The backend is running FastAPI;
every request/response shape below is enforced by Pydantic and mirrored in the live OpenAPI
spec, which is always the source of truth:

- **Swagger UI (interactive):** http://localhost:8000/docs
- **Raw spec (for codegen):** http://localhost:8000/openapi.json

> Tip: you can generate a typed client instead of hand-writing fetch calls:
> `npx openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts`
> (or use `orval` / `openapi-generator` — the spec is standard OpenAPI 3.1).

---

## 1. Getting the backend running

```bash
cd backend
docker compose up -d db          # Postgres 16 on localhost:5433
uv sync                          # install deps (Python 3.12)
uv run alembic upgrade head      # create schema
uv run python -m app.seed.run    # seed demo data (see §10)
uv run uvicorn app.main:app --reload --port 8000
```

Base URL in dev: **`http://localhost:8000`** (no path prefix, no versioning).
CORS is wide open (`allow_origins=["*"]`) — any localhost dev server can call it directly.

Health check: `GET /health` → `{"status":"ok", "app":"Rafid API", "env":"dev", "provider":"mock", "scoring_backend":"stub"}`

---

## 2. Big picture — what this product does

A digital merchant (sells on Salla/Zid/Jahez/Foodics) connects their **bank** and **sales
platforms** via consent (open banking). The backend aggregates 90 days of revenue, scores the
merchant with a credit model, and offers **cash today** against money the platforms already owe
them ("held receivables" = settlements not yet paid out) — up to **80%** of that amount, as a
Sharia-compliant **Murabaha** (no interest; bank buys at cost, sells at cost + disclosed
profit). Repayment is auto-collected from the merchant's incoming settlements by a background
**monitoring agent**, which also raises risk alerts.

Two user roles = two frontend surfaces:

| Role | JWT `role` claim | Surface |
|---|---|---|
| Merchant | `merchant` | Onboarding wizard, financing flow, contract tracking, alerts |
| Bank underwriter | `bank_admin` | Portfolio dashboard, merchant drill-down, risk alerts, annotations |

### The merchant journey (maps 1:1 to API calls)

```
register ──► connect bank ──► connect sales platform(s) ──► aggregate 90d data
                                                                 │
   accept offer ◄── generate offer ◄── run credit assessment ◄──┘
        │
        ▼
  Murabaha contract active ──► settlements arrive ──► repayments auto-apply ──► repaid
                                     (monitoring agent, §9)
```

---

## 3. Authentication

JWT bearer tokens. Two tokens per login:

- **access token** — send on every request: `Authorization: Bearer <access_token>`. Expires in **30 minutes**.
- **refresh token** — exchange for a fresh pair via `POST /auth/refresh`. Expires in **7 days**.

Token payload (if you want to decode client-side): `sub` (user id), `role`
(`merchant` | `bank_admin`), `merchant_id` (null for admins), `type` (`access` | `refresh`), `exp`, `iat`.

**Never send a merchant id from the client for merchant-scoped endpoints** — the backend always
derives it from the token. There is no way (and no need) to specify "which merchant" as a
merchant user.

### `POST /auth/register` → 201

Creates user + merchant profile in one call. Body:

```json
{
  "email": "owner@shop.sa",
  "password": "min8chars",
  "business_name": "My Shop",
  "business_type": "ecommerce",      // optional, default "ecommerce"
  "city": "Riyadh",                  // optional, default "Riyadh"
  "established_at": "2024-01-15"     // optional, default ~2 years ago
}
```

Returns a **TokenPair** (user is logged in immediately):

```json
{ "access_token": "eyJ...", "refresh_token": "eyJ...", "token_type": "bearer" }
```

Errors: `409` email already registered, `422` validation (password < 8 chars, bad email).

### `POST /auth/login` → 200
Body `{ "email": "...", "password": "..." }` → TokenPair. `401` on bad credentials.

### `POST /auth/refresh` → 200
Body `{ "refresh_token": "..." }` → new TokenPair. `401` if expired/invalid/wrong-type.

### `GET /auth/me` → 200 (any authenticated user)
```json
{ "id": "a1b2...", "email": "owner@shop.sa", "role": "merchant", "merchant_id": "c3d4..." }
```

**Suggested client handling:** on any `401`, try one refresh; if that also fails, log out.
`403` means wrong role (merchant hitting admin endpoint or vice versa) — hide those routes.

---

## 4. Error format

All expected errors are `{ "detail": "human readable message" }` with a meaningful status:

| Status | Meaning | Example detail |
|---|---|---|
| 400 | Business rule rejected | `"latest assessment declined (band D)"`, `"offer expired"` |
| 401 | Missing/invalid/expired token | `"invalid token"` |
| 403 | Wrong role | `"requires role bank_admin"` |
| 404 | Not found / not yours | `"contract not found"` |
| 409 | Conflict | `"email already registered"`, `"settlement already received"` |
| 422 | Pydantic validation error | FastAPI's standard `detail: [{loc, msg, type}]` array |

The `detail` strings for 400s are written to be user-presentable (e.g. show them in a toast).

---

## 5. Reference: enums & conventions

**Conventions:** all money is `float` SAR. Dates are `"YYYY-MM-DD"`. Datetimes are ISO-8601
**UTC without timezone suffix** (`"2026-07-13T09:30:00.123456"`) — treat as UTC. All ids are
32-char hex strings.

| Enum | Values |
|---|---|
| Bank institutions | `alinma`, `alrajhi_synth`, `riyad_synth` |
| Sales platforms | `salla`, `zid`, `jahez`, `foodics` |
| Connection `type` | `bank`, `sales` |
| Connection `status` | `pending_consent`, `active`, `revoked` |
| Settlement `status` | `pending`, `received` |
| Sales order `status` | `completed`, `refunded` |
| Transaction `direction` | `credit`, `debit` |
| Offer `status` | `offered`, `accepted`, `rejected`, `expired` |
| Contract `status` | `active`, `repaid`, `defaulted` |
| Schedule item `status` | `pending`, `partial`, `paid` |
| Risk band | `A`, `B`, `C`, `D` (D = declined) |
| Alert `type` | `revenue_drop`, `settlement_delay`, `missed_repayment` |
| Alert `severity` | `low`, `medium`, `high` |
| User `role` | `merchant`, `bank_admin` |

TypeScript interfaces for every payload are in §11.

---

## 6. Merchant endpoints

All require `Authorization: Bearer <access>` with role `merchant` unless noted.

### 6.1 Profile

- `GET /merchants/me` → MerchantOut
  ```json
  {
    "id": "c3d4...", "name": "TechSouq", "business_type": "ecommerce",
    "city": "Riyadh", "verification_status": "verified", "established_at": "2021-03-01"
  }
  ```
  (`verification_status` is always `"verified"` in the MVP — KYC is simulated.)
- `PATCH /merchants/me` — body: any of `{ "name", "business_type", "city" }` → MerchantOut

### 6.2 Connections & consent (the "link your accounts" wizard)

The consent handshake is a simulated OAuth2 flow. **Three steps per connection:**

**Step 1 — start:** `POST /connections/bank/consent/start` (or `/connections/sales/consent/start`)
```json
// request
{ "institution": "alinma" }          // bank name, or platform name for /sales
// response 200
{
  "session_id": "mock.bank.c3d4....alinma.9f8e7d6c",
  "authorize_url": "https://auth.mock-openbanking.sa/authorize?session=...",
  "institution": "alinma",
  "connection_id": "e5f6..."
}
```
`400` if institution isn't in the enum list (§5).

**Step 2 — "redirect":** in a real integration the user would be sent to `authorize_url` and
come back with an auth code. **With the mock provider, skip straight to step 3** — any
non-empty `auth_code` string is accepted. (UI suggestion: still show the bank-consent screen /
a fake redirect for demo effect, then call complete.)

**Step 3 — complete:** `POST /connections/consent/complete`
```json
// request
{ "session_id": "mock.bank.c3d4....alinma.9f8e7d6c", "auth_code": "demo" }
// response 200 → ConnectionOut
{
  "id": "e5f6...", "type": "bank", "provider": "mock", "institution": "alinma",
  "status": "active", "created_at": "2026-07-13T09:30:00"
}
```
`400`: unknown session, session belongs to another merchant, or consent already granted/revoked.

**Other:**
- `GET /connections` → ConnectionOut[] — all of this merchant's connections, any status.
- `POST /connections/{connection_id}/revoke` → ConnectionOut with `status: "revoked"`.
  Revocation wipes the stored provider token; revoked connections contribute nothing to future
  aggregations. `400` if already revoked, not found, or not yours.

A merchant typically has 1 bank connection + 1–2 sales platform connections.

### 6.3 Aggregation (pull the 90 days of data)

`POST /merchants/me/aggregate` → 200

```json
{
  "accounts": 1,
  "transactions": 25,
  "sales_orders": 490,
  "settlements": 3,
  "held_receivables_total": 169201.53
}
```

- Pulls accounts/transactions from the bank connection, sales orders + pending settlements from
  each sales connection, over the last 90 days.
- **Idempotent / incremental**: counts are *newly inserted* rows only. Calling twice
  immediately returns zeros — that's normal, not an error.
- `held_receivables_total` = sum of pending settlements = the financing basis. **Show this
  number prominently** — the offer is a percentage of it.
- Call it right after connecting, and optionally re-call before scoring.

### 6.4 Read the aggregated data (for charts/tables)

- `GET /accounts` → BankAccountOut[]
  `{ id, external_id, institution, iban, currency: "SAR", balance }`
- `GET /transactions?limit=500` → TransactionOut[] (newest first)
  `{ id, account_external_id, date, amount, direction: "credit"|"debit", description, category }`
  — `category: "settlement"` rows are platform payouts (useful for cash-flow charts).
- `GET /sales?limit=500` → SalesOrderOut[] (newest first; `limit` up to 5000 — fetch all 90
  days for a daily-revenue chart, ~400–800 rows)
  `{ id, platform, order_date, amount, currency, status: "completed"|"refunded" }`
- `GET /settlements` → SettlementOut[] (ordered by expected_date)
  ```json
  {
    "id": "…", "platform": "salla", "amount": 84245.10,
    "expected_date": "2026-08-03", "received_date": null,
    "status": "pending", "delayed": false
  }
  ```
  Pending ones are the held receivables. `delayed: true` + a pushed-out `expected_date` means
  the monitoring agent flagged a late payout (pairs with a `settlement_delay` alert).
- `POST /settlements/{id}/receive` → SettlementOut — **manual demo trigger**: forces a pending
  settlement to arrive *now*, which immediately auto-applies repayments to any active contract.
  Great for a "money arrives → balance drops" live moment. `409` if already received.

### 6.5 Credit assessment (scoring)

`POST /assessments/run` → **201** AssessmentDetailOut. Runs feature engineering over the
aggregated data and scores it (takes well under a second).

```json
{
  "id": "9a8b...",
  "merchant_id": "c3d4...",
  "score": 649,                    // 0..1000
  "risk_band": "B",                // A | B | C | D
  "approved": true,
  "model_version": "stub-1.0.0",
  "created_at": "2026-07-13T09:31:00",
  "features": {
    "merchant_id": "c3d4...",
    "window_days": 90,
    "total_revenue_90d": 402113.55,
    "avg_daily_revenue": 4418.83,
    "revenue_volatility": 0.31,    // std/mean of daily revenue
    "revenue_trend": 0.0021,       // normalized slope; >0 growing, <0 shrinking
    "num_settlement_cycles": 10,
    "avg_settlement_days": 9.0,
    "held_receivables_total": 169201.53,
    "chargeback_ratio": 0.013,
    "account_age_days": 912,
    "platform_mix": { "salla": 0.72, "zid": 0.28 }
  },
  "decision": {
    "score": 649,
    "risk_band": "B",
    "approved": true,
    "max_advance_ratio": 0.70,     // band-dependent: A=0.80 B=0.70 C=0.55 D=0
    "max_advance_amount": 118441.07,
    "reasons": [
      "Score 649/1000 -> risk band B.",
      "Strong 90-day revenue volume.",
      "Stable daily revenue pattern.",
      "Revenue trending upward."
    ],
    "feature_contributions": {     // explainability — render as a bar chart
      "base": 200.0,
      "revenue_volume": 250.0,
      "revenue_stability": 138.0,
      "revenue_trend": 31.5,
      "chargebacks": -32.5,
      "account_age": 49.9,
      "settlement_regularity": 83.3
    },
    "model_version": "stub-1.0.0"
  }
}
```

- `400` if the merchant has no aggregated sales yet (`"no aggregated sales data; connect platforms and aggregate first"`).
- `reasons` are human-readable — show them verbatim. `feature_contributions` values are the
  score points each factor added/subtracted (they sum to the score) — perfect for an
  explainability bar chart. **This explainable-decision screen is a pitch differentiator.**
- `GET /assessments/me` → AssessmentOut[] (summary rows, newest first: id, score, risk_band, approved, model_version, created_at)
- `GET /assessments/{id}` → AssessmentDetailOut (full features + decision, as above)

Score bands (placeholder convention): **A ≥ 750, B ≥ 600, C ≥ 450, D below** — D is declined.

### 6.6 Offers

`POST /offers/generate` → **201** OfferOut. Requires an approved assessment; sizes the offer
off *current* held receivables.

```json
{
  "id": "7f6e...",
  "merchant_id": "c3d4...",
  "assessment_id": "9a8b...",
  "principal": 118441.07,          // the cash advance (Murabaha cost price)
  "advance_ratio": 0.70,           // min(band ratio, 0.80)
  "platform_fee": 2368.82,         // 2%  (placeholder)
  "success_fee": 1184.41,          // 1%  (placeholder)
  "profit_amount": 7106.46,        // 6%  disclosed Murabaha profit (placeholder)
  "total_repayable": 129100.76,    // principal + profit + both fees
  "currency": "SAR",
  "status": "offered",
  "annotation": null,              // underwriter note, if any (visible to merchant)
  "expires_at": "2026-07-20T09:32:00",
  "created_at": "2026-07-13T09:32:00"
}
```

- Generating a new offer auto-expires any previous open offer — at most **one live offer** per
  merchant.
- `400` when: no assessment, assessment declined, no held receivables, offer would be zero.
- `GET /offers/me` → OfferOut[] (newest first).
- `POST /offers/{id}/accept` → 200 **ContractOut** (§6.7) — the money moment.
- `POST /offers/{id}/reject` → 200 OfferOut (`status: "rejected"`).
- Accept/reject give `400` if the offer is not open (`"offer is accepted"`, `"offer expired"`…).

**Offer screen must display the full cost breakdown** (principal, profit, fees, total
repayable) — up-front disclosed pricing is the Sharia-compliance story. Never label anything
"interest".

### 6.7 Contracts & repayment

Accepting an offer creates a Murabaha contract with a repayment schedule mapped onto upcoming
settlements.

- `GET /contracts/me` → ContractOut[]
  ```json
  {
    "id": "5c4d...", "merchant_id": "c3d4...", "offer_id": "7f6e...",
    "cost_price": 118441.07,       // what the bank advanced
    "profit_amount": 7106.46,      // disclosed up front
    "sale_price": 125547.53,       // cost + profit
    "fees_total": 3553.23,
    "total_due": 129100.76,
    "outstanding": 84300.12,       // live remaining balance — the hero number
    "disbursed_at": "2026-07-13T09:33:00",
    "status": "active"
  }
  ```
- `GET /contracts/{id}` → ContractDetailOut = ContractOut + `schedule`:
  ```json
  "schedule": [
    { "id": "…", "seq": 1, "due_date": "2026-07-16", "amount": 52260.40,
      "paid_amount": 52260.40, "settlement_id": "…", "status": "paid" },
    { "id": "…", "seq": 2, "due_date": "2026-08-03", "amount": 76840.36,
      "paid_amount": 32039.72, "settlement_id": "…", "status": "partial" }
  ]
  ```
  Installments are tied to specific settlements (`settlement_id`); a final catch-all
  installment may have `settlement_id: null` (collected from future payouts). Render as a
  progress timeline; overall progress = `1 - outstanding / total_due`.
- `GET /contracts/{id}/repayments` → RepaymentOut[] — the actual collection events:
  `{ id, contract_id, schedule_item_id, settlement_id, amount, applied_at }`

Contract goes `active → repaid` automatically when `outstanding` hits 0. (`defaulted` exists
in the enum but nothing triggers it in the MVP.)

### 6.8 Alerts

`GET /alerts/me` → RiskAlertOut[] (newest first):

```json
{
  "id": "…", "merchant_id": "c3d4...", "contract_id": null,
  "type": "revenue_drop",          // revenue_drop | settlement_delay | missed_repayment
  "severity": "high",              // low | medium | high
  "message": "Revenue down 49% vs prior 14-day baseline.",
  "resolved": false,
  "created_at": "2026-07-13T09:40:00"
}
```

`message` is display-ready. Alerts are raised by the monitoring agent (§9); duplicates are
suppressed while one of the same type is unresolved.

---

## 7. Admin (bank underwriter) endpoints

Require role `bank_admin` (`403` otherwise). Merchant tokens can't see these; admin tokens
can't use merchant-scoped endpoints (admin has no merchant profile).

- `GET /admin/merchants` → MerchantOut[] — every merchant (funnel list view).
- `GET /admin/merchants/{merchant_id}` → full drill-down:
  ```json
  {
    "merchant":     { ...MerchantOut },
    "connections":  [ ...ConnectionOut ],
    "assessments":  [ ...AssessmentOut ],   // summaries, newest first
    "offers":       [ ...OfferOut ],
    "contracts":    [ ...ContractOut ],
    "alerts":       [ ...RiskAlertOut ]
  }
  ```
- `GET /admin/assessments/{id}` → AssessmentDetailOut — full explainability for underwriting
  review (same shape as §6.5).
- `GET /admin/portfolio` → the dashboard headline:
  ```json
  {
    "funnel": { "registered": 20, "connected": 20, "scored": 5, "offered": 3, "accepted": 2 },
    "risk_distribution": { "A": 1, "B": 3, "C": 1 },     // latest assessment per merchant
    "contracts": {
      "active": 2,
      "disbursed_total": 124403.83,
      "outstanding_total": 90799.54,
      "expected_revenue": 4070.29      // total profit + fees across all contracts
    },
    "open_alerts": 3
  }
  ```
  Render funnel as a bar/funnel chart, risk distribution as a donut. This is the "verified SME
  funnel" Alinma story.
- `GET /admin/alerts?include_resolved=false` → RiskAlertOut[] across all merchants.
- `POST /admin/offers/{offer_id}/annotate` — body `{ "annotation": "text" }` → OfferOut.
  Underwriter note; lands on the offer object (merchant can see it via `GET /offers/me`).
- `POST /admin/monitor/tick` → force one monitoring tick (§9). Response:
  ```json
  {
    "sim_date": "2026-07-16",
    "settlements_received": 1,
    "settlements_delayed": 0,
    "repayments_applied": 1,
    "contracts_closed": 0,
    "alerts_raised": 0
  }
  ```

---

## 8. Recommended screens → endpoint map

**Merchant app**

| Screen | Endpoints |
|---|---|
| Register / login | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` |
| Connect accounts wizard | `POST /connections/{bank\|sales}/consent/start` → fake consent UI → `POST /connections/consent/complete`; then `POST /merchants/me/aggregate` |
| Dashboard (revenue chart, held receivables, balances) | `GET /sales?limit=5000`, `GET /settlements`, `GET /accounts`, `GET /transactions` |
| "Get financing" (score reveal + explainability) | `POST /assessments/run` |
| Offer review (cost breakdown, accept/reject) | `POST /offers/generate`, `GET /offers/me`, `POST /offers/{id}/accept` / `reject` |
| Active contract (progress, schedule, repayment feed) | `GET /contracts/me`, `GET /contracts/{id}`, `GET /contracts/{id}/repayments` |
| Alerts | `GET /alerts/me` |
| Settings / consent management | `GET /connections`, `POST /connections/{id}/revoke` |

**Bank dashboard**

| Screen | Endpoints |
|---|---|
| Portfolio home | `GET /admin/portfolio`, `GET /admin/alerts` |
| Merchant list + drill-down | `GET /admin/merchants`, `GET /admin/merchants/{id}` |
| Underwriting view (explainability + annotate) | `GET /admin/assessments/{id}`, `POST /admin/offers/{id}/annotate` |
| Demo control ("advance one day") | `POST /admin/monitor/tick` |

---

## 9. The monitoring agent & simulated time — read this before building the contract screen

There is a background scheduler in the backend. **Every 15 seconds it runs one tick, and one
tick = one simulated day.** Demo time is compressed; the real wall clock is irrelevant.

Each tick:
1. Advances the simulated date (`sim_date` in the tick response).
2. Pending settlements whose `expected_date` has arrived become `received` — except that risky
   merchants get some settlements `delayed` (pushed +7 days, `settlement_delay` alert).
3. Received settlements **auto-apply repayments** to active contracts (schedule items fill up,
   `outstanding` drops, contract closes at 0).
4. New future settlements are simulated for merchants with active contracts, so repayment
   keeps progressing.
5. Risk signals re-checked → `revenue_drop` / `missed_repayment` alerts.

**Frontend consequences:**
- Data changes *by itself* every ~15s. **Poll** while contract/dashboard screens are visible
  (5–15s interval is plenty; there are no websockets). React Query / SWR with
  `refetchInterval` is the intended pattern.
- Dates in settlements/repayments follow the *simulated* calendar and will run ahead of the
  real date. Display them as-is; don't compute "days remaining" against the browser clock.
  If you need "today", the only source is `sim_date` from `POST /admin/monitor/tick`
  (admin-only) — better to just show absolute dates.
- For a controlled live demo, ops can disable the scheduler (`MONITOR_ENABLED=false` env) and
  drive time manually with `POST /admin/monitor/tick` per click, and/or force a specific payout
  with `POST /settlements/{id}/receive`. Consider a hidden "advance day" button in the bank
  dashboard.
- A long-running server settles everything eventually. Before rehearsals/demo, reseed:
  `make reset` (drops + reseeds), restart uvicorn.

---

## 10. Seeded demo data

`uv run python -m app.seed.run` creates:

| Who | Login | Password |
|---|---|---|
| Bank admin | `admin@rafid.sa` | `AdminPass123!` |
| 20 merchants | `merchant01@rafid.sa` … `merchant20@rafid.sa` | `MerchantPass123!` |

- All 20 are fully onboarded: connections active, 90 days aggregated, held receivables ready.
  They have **not** been scored — running the assessment/offer live is the demo.
- Every merchant's data is deterministic (same numbers every reseed).
- **`merchant17` (Amber Cosmetics) and `merchant20` (Safa Kitchen) are engineered risky** —
  collapsed recent revenue and delayed settlements, so `revenue_drop` / `settlement_delay`
  alerts fire on them. Use them for the risk-monitoring part of the demo; use a healthy one
  (e.g. `merchant03` TechSouq, big receivables) for the happy path.
- A brand-new `POST /auth/register` merchant also works end-to-end — the mock provider
  generates plausible data for any merchant id.

---

## 11. TypeScript types (copy-paste)

```ts
// ---- enums ----
export type Role = "merchant" | "bank_admin";
export type ConnectionType = "bank" | "sales";
export type ConnectionStatus = "pending_consent" | "active" | "revoked";
export type SettlementStatus = "pending" | "received";
export type OfferStatus = "offered" | "accepted" | "rejected" | "expired";
export type ContractStatus = "active" | "repaid" | "defaulted";
export type ScheduleItemStatus = "pending" | "partial" | "paid";
export type RiskBand = "A" | "B" | "C" | "D";
export type AlertType = "revenue_drop" | "settlement_delay" | "missed_repayment";
export type AlertSeverity = "low" | "medium" | "high";

// ---- auth ----
export interface TokenPair { access_token: string; refresh_token: string; token_type: "bearer"; }
export interface UserOut { id: string; email: string; role: Role; merchant_id: string | null; }
export interface MerchantOut {
  id: string; name: string; business_type: string; city: string;
  verification_status: string; established_at: string; // date
}

// ---- connections ----
export interface ConsentStartResponse {
  session_id: string; authorize_url: string; institution: string; connection_id: string;
}
export interface ConnectionOut {
  id: string; type: ConnectionType; provider: string; institution: string;
  status: ConnectionStatus; created_at: string;
}

// ---- data ----
export interface AggregateResponse {
  accounts: number; transactions: number; sales_orders: number; settlements: number;
  held_receivables_total: number;
}
export interface BankAccountOut {
  id: string; external_id: string; institution: string; iban: string;
  currency: string; balance: number;
}
export interface TransactionOut {
  id: string; account_external_id: string; date: string; amount: number;
  direction: "credit" | "debit"; description: string; category: string | null;
}
export interface SalesOrderOut {
  id: string; platform: string; order_date: string; amount: number;
  currency: string; status: "completed" | "refunded";
}
export interface SettlementOut {
  id: string; platform: string; amount: number; expected_date: string;
  received_date: string | null; status: SettlementStatus; delayed: boolean;
}

// ---- scoring ----
export interface ScoringFeatures {
  merchant_id: string; window_days: number; total_revenue_90d: number;
  avg_daily_revenue: number; revenue_volatility: number; revenue_trend: number;
  num_settlement_cycles: number; avg_settlement_days: number;
  held_receivables_total: number; chargeback_ratio: number; account_age_days: number;
  platform_mix: Record<string, number>;
}
export interface CreditDecision {
  score: number; risk_band: RiskBand; approved: boolean;
  max_advance_ratio: number; max_advance_amount: number;
  reasons: string[]; feature_contributions: Record<string, number>; model_version: string;
}
export interface AssessmentOut {
  id: string; merchant_id: string; score: number; risk_band: RiskBand;
  approved: boolean; model_version: string; created_at: string;
}
export interface AssessmentDetailOut extends AssessmentOut {
  features: ScoringFeatures; decision: CreditDecision;
}

// ---- financing ----
export interface OfferOut {
  id: string; merchant_id: string; assessment_id: string;
  principal: number; advance_ratio: number; platform_fee: number; success_fee: number;
  profit_amount: number; total_repayable: number; currency: string;
  status: OfferStatus; annotation: string | null; expires_at: string; created_at: string;
}
export interface ScheduleItemOut {
  id: string; seq: number; due_date: string; amount: number; paid_amount: number;
  settlement_id: string | null; status: ScheduleItemStatus;
}
export interface ContractOut {
  id: string; merchant_id: string; offer_id: string;
  cost_price: number; profit_amount: number; sale_price: number; fees_total: number;
  total_due: number; outstanding: number; disbursed_at: string; status: ContractStatus;
}
export interface ContractDetailOut extends ContractOut { schedule: ScheduleItemOut[]; }
export interface RepaymentOut {
  id: string; contract_id: string; schedule_item_id: string; settlement_id: string;
  amount: number; applied_at: string;
}

// ---- alerts / admin ----
export interface RiskAlertOut {
  id: string; merchant_id: string; contract_id: string | null;
  type: AlertType; severity: AlertSeverity; message: string;
  resolved: boolean; created_at: string;
}
export interface PortfolioOut {
  funnel: { registered: number; connected: number; scored: number; offered: number; accepted: number };
  risk_distribution: Partial<Record<RiskBand, number>>;
  contracts: { active: number; disbursed_total: number; outstanding_total: number; expected_revenue: number };
  open_alerts: number;
}
export interface AdminMerchantDetailOut {
  merchant: MerchantOut; connections: ConnectionOut[]; assessments: AssessmentOut[];
  offers: OfferOut[]; contracts: ContractOut[]; alerts: RiskAlertOut[];
}
export interface TickResponse {
  sim_date: string; settlements_received: number; settlements_delayed: number;
  repayments_applied: number; contracts_closed: number; alerts_raised: number;
}
export interface ApiError { detail: string; }
```

---

## 12. Backend internals (context, not contract)

You don't need this to build the UI, but it explains behavior:

- **Layers:** routers (HTTP + auth only) → services (all business logic) → SQLAlchemy/Postgres.
  Two pluggable seams: the open-banking provider (currently a deterministic mock — that's why
  any `auth_code` works) and the credit model (currently a transparent stub — that's why scores
  are stable; the real ML model swaps in behind the same interface with no API change).
- **Murabaha wording matters:** `cost_price` (advance) + disclosed `profit_amount` =
  `sale_price`; fees are separate line items. There is deliberately no "interest" anywhere —
  keep UI copy consistent.
- Provider tokens are encrypted at rest; consent grant/revoke, scoring, disbursement and every
  repayment are audit-logged (compliance story for the pitch — there's no read API for the
  audit log yet; ask if you want one).
- Endpoint list summary + demo curl script: see `README.md`. Architecture rationale:
  `IMPLEMENTATION_PLAN.md` at repo root.

**Quick smoke test of your setup** (should all work in <1 min):

```bash
curl -s localhost:8000/health
TOKEN=$(curl -s localhost:8000/auth/login -H 'content-type: application/json' \
  -d '{"email":"merchant03@rafid.sa","password":"MerchantPass123!"}' | jq -r .access_token)
curl -s localhost:8000/merchants/me -H "Authorization: Bearer $TOKEN" | jq .
curl -s localhost:8000/settlements -H "Authorization: Bearer $TOKEN" | jq 'length'
```
