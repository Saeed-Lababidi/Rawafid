# Requirements: Rafid (رافد) — Production Frontend + Live Demo

**Defined:** 2026-07-15
**Core Value:** A judge can experience the complete merchant loop live — connect accounts → explainable score reveal → Murabaha offer → a contract that visibly repays itself in real time — in a polished Arabic-first UI that looks professional and worth a fortune.

## v1 Requirements

Requirements for the July 17, 2026 judging demo. Each maps to roadmap phases.

### Foundation (scaffold — never retrofit)

- [ ] **FOUND-01**: User sees the app in Arabic (RTL) by default and can switch to English (LTR) with full copy parity, via locale-prefixed routes
- [ ] **FOUND-02**: User can toggle dark/light mode with no flash of wrong theme on load (server-resolved, persisted)
- [ ] **FOUND-03**: User sees handoff §1 design tokens (colors, type scale, radii) applied consistently in both themes, extended with risk-band-D and alert-severity (low/medium/high) scales
- [ ] **FOUND-04**: User sees IBM Plex Sans Arabic loaded without FOUT/layout shift (next/font, preloaded weights)
- [ ] **FOUND-05**: User sees all numbers, currency, and dates rendered bidi-safe through one central formatting utility (no mixed-direction glitches in Arabic)
- [ ] **FOUND-06**: User gets a correct layout from 390px mobile through desktop on every screen
- [ ] **FOUND-07**: User sees the demo-dataset disclaimer visible in the UI

### Authentication & API layer

- [ ] **AUTH-01**: User can register and log in with email/password; session persists across refresh
- [ ] **AUTH-02**: User's expired access token refreshes automatically on 401 via a single shared refresh-mutex (no false logout with multiple polling screens open); refresh failure logs out cleanly
- [ ] **AUTH-03**: User is routed by JWT role — merchant routes vs bank_admin routes — with guards hiding forbidden surfaces (403 = hide)
- [ ] **AUTH-04**: All API calls go through a typed client generated from the live OpenAPI spec (no hand-retyped shapes, no client-side fee/score math)
- [ ] **AUTH-05**: User sees business-rule errors (400 `detail`) as toasts, and validation errors (422) mapped to form fields

### Merchant app

- [ ] **MERCH-01**: Merchant can connect bank + sales-platform accounts through the 3-step consent wizard (real enums: alinma/alrajhi_synth/riyad_synth, salla/zid/jahez/foodics) with per-account status
- [ ] **MERCH-02**: Merchant can trigger aggregation and see counts + held receivables total (idempotent re-run handled gracefully)
- [ ] **MERCH-03**: Merchant sees dashboard with revenue chart, held receivables, and balances
- [ ] **MERCH-04**: Merchant can run an assessment and see the score reveal: gauge scaled /1000, risk band A–D with Arabic grade labels, including the D/declined state
- [ ] **MERCH-05**: Merchant sees explainability screen — translated `reasons[]` and `feature_contributions{}` as a signed bar chart supporting negative bars (pitch centerpiece)
- [ ] **MERCH-06**: Merchant can generate and review an offer with full server-computed Murabaha breakdown (principal, advance ratio, fees, disclosed profit, total repayable) with expiry and any underwriter annotation
- [ ] **MERCH-07**: Merchant can accept or reject the offer; acceptance produces a live contract
- [ ] **MERCH-08**: Merchant sees active contract with polling (5–15s): outstanding balance, progress, schedule timeline (plan) and repayments feed (ledger), absolute simulated dates only — never browser-clock math
- [ ] **MERCH-09**: Merchant sees alerts feed — 3 types × 3 severities, severity-colored
- [ ] **MERCH-10**: Merchant can view and revoke connections in settings
- [ ] **MERCH-11**: Merchant sees loading/empty/error states on every data screen

### Bank admin app

- [ ] **ADMIN-01**: Admin sees portfolio home — funnel, risk donut, contract stats, open alerts
- [ ] **ADMIN-02**: Admin can browse merchant list and drill into full history (connections/assessments/offers/contracts/alerts)
- [ ] **ADMIN-03**: Admin can review assessment explainability and annotate an offer (underwriting view)
- [ ] **ADMIN-04**: Admin has demo controls: advance-day tick + manual settlement-receive ("money arrives" beat), clearly separated as demo tooling

### Demo choreography

- [ ] **DEMO-01**: Presenter can quick-switch between seeded demo accounts (merchant03 happy path, merchant17/20 risky, admin) for stage pacing

### Deployment (live demo, zero budget)

- [ ] **DEPLOY-01**: Backend + Postgres run on a free host with no cold-start risk during judging (Railway + Neon primary; Render + UptimeRobot keep-alive fallback), provisioned early with expiry checked against July 17
- [ ] **DEPLOY-02**: Frontend deploys on the existing Vercel project, pointed at the deployed backend (CORS allow-list, env-driven API URL, types regenerated against deployed openapi.json)
- [ ] **DEPLOY-03**: Demo data can be reset remotely on the deployed backend (host console or guarded path for `make reset`)

### WOW polish (full handoff §8 set)

- [ ] **WOW-01**: Score gauge ring sweep + count-up to real /1000 value on reveal
- [ ] **WOW-02**: Contract outstanding tweens smoothly on poll change with settlement toast/pulse (no jump cuts)
- [ ] **WOW-03**: Cards stagger-in on scroll; connect toggles spring with live counter tick-up
- [ ] **WOW-04**: Alerts enter with severity-graded emphasis; admin surface stays low-animation
- [ ] **WOW-05**: All motion respects `prefers-reduced-motion`

## v2 Requirements

Deferred. Tracked but not in the current roadmap.

### Platform

- **PLAT-01**: Real Lean/Tarabut open-banking provider integration (enum swap behind existing seam)
- **PLAT-02**: Requested-amount slider on offer generation — pending verification that `/offers/generate` accepts `requested_amount` in the live OpenAPI spec
- **PLAT-03**: Pitch-deck refresh aligned to the production UI

## Out of Scope

| Feature | Reason |
|---------|--------|
| The word "interest"/"فائدة" anywhere | Hard product rule — Murabaha framing only |
| Client-side computation of scores, fees, or days-remaining | Server + simulated calendar are sole source of truth |
| Websockets / live push | Backend exposes none; polling is the design |
| مدى and هنقرستيشن platforms | Not in the backend enum |
| Paid hosting of any kind | Zero budget constraint |
| Backend feature work beyond deploy config | Backend is done; only CORS/env/reset-path changes allowed |
| SHAP-style dense explainability visuals | Merchant-facing audience needs plain language + simple signed bars |
| Gamification (badges/streaks) | Tonally wrong for B2B lending |

## Traceability

Which phases cover which requirements. Populated during roadmap creation (2026-07-15).

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| FOUND-06 | Phase 1 | Pending |
| FOUND-07 | Phase 1 | Pending |
| DEPLOY-01 | Phase 1 | Pending |
| DEPLOY-02 | Phase 1 | Pending |
| DEPLOY-03 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| AUTH-05 | Phase 2 | Pending |
| MERCH-01 | Phase 3 | Pending |
| MERCH-02 | Phase 3 | Pending |
| MERCH-03 | Phase 3 | Pending |
| MERCH-04 | Phase 3 | Pending |
| MERCH-05 | Phase 3 | Pending |
| MERCH-06 | Phase 3 | Pending |
| MERCH-07 | Phase 3 | Pending |
| MERCH-08 | Phase 3 | Pending |
| MERCH-09 | Phase 3 | Pending |
| MERCH-10 | Phase 3 | Pending |
| MERCH-11 | Phase 3 | Pending |
| ADMIN-01 | Phase 4 | Pending |
| ADMIN-02 | Phase 4 | Pending |
| ADMIN-03 | Phase 4 | Pending |
| ADMIN-04 | Phase 4 | Pending |
| DEMO-01 | Phase 4 | Pending |
| WOW-01 | Phase 5 | Pending |
| WOW-02 | Phase 5 | Pending |
| WOW-03 | Phase 5 | Pending |
| WOW-04 | Phase 5 | Pending |
| WOW-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 36 total (recount — prior "30" was an undercount of the listed items)
- Mapped to phases: 36
- Unmapped: 0 ✓ (100% coverage, no orphans, no duplicates)

---
*Requirements defined: 2026-07-15*
*Last updated: 2026-07-15 after roadmap traceability populated*
