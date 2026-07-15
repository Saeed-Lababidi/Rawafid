# Roadmap: Rafid (رافد) — Production Frontend + Live Demo

## Overview

A judge experiences the complete merchant loop live. We get there by standing up a live, bilingual (Arabic-RTL primary), flash-free Next.js shell on the real free hosts first — so every screen after is verifiable on the deployed URL — then layering a typed, refresh-resilient auth/API foundation, then the full merchant financing journey (connect → aggregate → explainable score → Murabaha offer → self-repaying contract → alerts), then the bank-admin underwriting surface plus stage-demo choreography, and finally the WOW animation polish that makes the signature pitch moments land. Deploy is provisioned in Phase 1 (not last) because free-host sleep and Postgres-expiry risk grows with time against the July 17 judging date. Polish is deliberately last per the handoff's integration-first build order.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Live Bilingual Foundation** - Deployed RTL/LTR, flash-free themed Next.js shell on real free hosts (backend + Postgres + Vercel), remote-resettable
- [ ] **Phase 2: Authenticated Typed API Layer** - Register/login against live backend via generated typed client, shared refresh-mutex, role routing, error contract
- [ ] **Phase 3: Merchant Core Loop** - Connect → aggregate → dashboard → explainable score → Murabaha offer → live self-repaying contract → alerts → settings
- [ ] **Phase 4: Admin Surface & Demo Choreography** - Bank-admin portfolio, merchant drill-down, underwriting annotate, demo-tick + settlement-receive + account quick-switch
- [ ] **Phase 5: WOW Polish** - Gauge sweep + count-up, outstanding tween, staggered cards, spring toggles, severity-graded alerts, reduced-motion respected

## Phase Details

### Phase 1: Live Bilingual Foundation

**Goal**: A live, free-hosted Next.js shell renders Arabic-first RTL (English toggle), flash-free theming, project tokens, and the demo disclaimer — served on the real Vercel URL against a deployed backend + Postgres — so every later phase is built and verified against live infrastructure.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, FOUND-06, FOUND-07, DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):

  1. User loads the deployed Vercel URL and sees the app in Arabic RTL by default, and switches to English LTR with full copy parity via locale-prefixed routes
  2. User toggles dark/light mode with no flash of wrong theme on load, and the choice persists across refresh
  3. User sees handoff §1 tokens (incl. risk-band-D and alert-severity scales), IBM Plex Sans Arabic with no FOUT/layout shift, and bidi-safe numbers/currency/dates via one central utility, on a correct layout from 390px through desktop
  4. User sees the demo-dataset disclaimer visible in the UI
  5. The deployed frontend reaches the free-hosted backend + Postgres with no cold-start risk (health check passes, CORS allows only the Vercel origin, API URL is env-driven), and demo data can be reset remotely

**Plans**: 4 plans

Plans:
**Wave 1**

- [ ] 01-01-PLAN.md — Deploy backend + Neon Postgres to Railway (repo-root Dockerfile, CORS allow-list, asyncpg TLS, fresh secrets, remote demo-reset) — DEPLOY-01/02/03
- [ ] 01-02-PLAN.md — Scaffold Next.js + Tailwind v4, next-intl [locale] RTL/LTR routing (ar default, cookie-persisted), central bidi-safe format utility, env-driven API URL — FOUND-01, FOUND-05

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 01-03-PLAN.md — @theme token system (handoff §1 + dark + risk-D + severity chips), IBM Plex Sans Arabic, flash-free cookie-resolved theming, header/footer chrome, health badge, disclaimer, landing page 390px→desktop — FOUND-02/03/04/06/07

**Wave 3** *(blocked on Wave 2 completion)*

- [ ] 01-04-PLAN.md — Vercel cutover (Root Directory frontend/, NEXT_PUBLIC_API_URL), live E2E verification (routing, CORS pair, badge Live, no-flash, 390px visual) — DEPLOY-02, FOUND-02/06 live checks

**UI hint**: yes

### Phase 2: Authenticated Typed API Layer

**Goal**: Users authenticate against the live backend through a typed client generated from the deployed OpenAPI spec, with resilient single-flight token refresh, role-based route separation, and the standard error contract wired once for every later screen.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):

  1. User can register and log in with email/password, and the session persists across a page refresh
  2. With two or more polling screens open near token expiry, an expired access token refreshes exactly once via a shared refresh-mutex (no false logout), and refresh failure logs out cleanly
  3. Merchant and bank_admin users land on their own route trees, and forbidden surfaces are hidden (403 = hide)
  4. Every API call flows through a client whose types are generated from the deployed OpenAPI spec — no hand-retyped shapes, no client-side fee or score math
  5. Business-rule errors (400 `detail`) surface as toasts and validation errors (422) map to the offending form fields

**Plans**: TBD

Plans:

- [ ] 02-01: Generate schema.d.ts from deployed openapi.json (gen:api script), build openapi-fetch client with auth header + 401 refresh-mutex + 400-toast/422-field error middleware, Zustand auth store
- [ ] 02-02: Register/login screens, (merchant)/(admin) route groups with layout-level role guards + middleware UX redirect

**UI hint**: yes

### Phase 3: Merchant Core Loop

**Goal**: A merchant completes the entire financing journey end-to-end — connect accounts, aggregate, reveal an explainable credit score, review a server-computed Murabaha offer, and watch a live contract repay itself — the pitch centerpiece.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: MERCH-01, MERCH-02, MERCH-03, MERCH-04, MERCH-05, MERCH-06, MERCH-07, MERCH-08, MERCH-09, MERCH-10, MERCH-11
**Success Criteria** (what must be TRUE):

  1. Merchant connects bank + sales-platform accounts through the 3-step consent wizard (real enums, per-account status), triggers aggregation, and sees counts + held-receivables total with idempotent re-run handled gracefully
  2. Merchant views a dashboard (revenue chart, held receivables, balances) and runs an assessment revealing a /1000 gauge and risk band A–D with Arabic grade labels, including the D/declined state
  3. Merchant sees the explainability screen — translated `reasons[]` and a signed `feature_contributions{}` bar chart that supports negative bars
  4. Merchant reviews an offer with the full server-computed Murabaha breakdown (principal, advance ratio, fees, disclosed profit, total repayable, expiry, any underwriter annotation) and accepts or rejects, with acceptance producing a live contract
  5. Merchant watches the active contract poll every 5–15s (outstanding balance, progress, schedule timeline + repayments ledger on absolute simulated dates only), sees the alerts feed (3 types × 3 severities, severity-colored), can view/revoke connections, and gets loading/empty/error states on every data screen

**Plans**: TBD

Plans:

- [ ] 03-01: Connect-accounts consent wizard + aggregation (per-account status, held-receivables total, idempotent re-run)
- [ ] 03-02: Dashboard, assessment/score reveal (gauge /1000, A–D + declined), explainability (reasons + signed feature-contribution bars)
- [ ] 03-03: Offer review + accept/reject, active contract with poll-diff hook (schedule + repayments ledger), alerts feed, connections/settings, loading/empty/error states

**UI hint**: yes

### Phase 4: Admin Surface & Demo Choreography

**Goal**: A bank underwriter reviews the financed portfolio and drills into any merchant's full history, and the presenter can choreograph the live-money demo on stage.
**Mode:** mvp
**Depends on**: Phase 2 (uses real Phase 3 data when present)
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, DEMO-01
**Success Criteria** (what must be TRUE):

  1. Admin sees the portfolio home — funnel, risk donut, contract stats, and open alerts
  2. Admin browses the merchant list and drills into a single merchant's full history (connections, assessments, offers, contracts, alerts)
  3. Admin reviews assessment explainability and annotates an offer from the underwriting view
  4. Presenter uses clearly-separated demo controls — advance-day tick and manual settlement-receive ("money arrives" beat) — and quick-switches between seeded accounts (merchant03 happy path, merchant17/20 risky, admin) for stage pacing

**Plans**: TBD

Plans:

- [ ] 04-01: Portfolio home (funnel/risk donut/stats/open alerts) + merchant list & full drill-down
- [ ] 04-02: Underwriting explainability + offer annotate, demo controls (tick + settlement-receive) and seeded-account quick-switcher, both clearly separated as demo tooling

**UI hint**: yes

### Phase 5: WOW Polish

**Goal**: The pitch's signature moments animate smoothly and respect motion preferences, without ever changing a server-sourced value — integration-first is done, this is the deliberate final polish pass, iterated further with the user after the baseline lands.
**Mode:** mvp
**Depends on**: Phase 3, Phase 4
**Requirements**: WOW-01, WOW-02, WOW-03, WOW-04, WOW-05
**Success Criteria** (what must be TRUE):

  1. The score gauge sweeps its ring and counts up to the real /1000 value on reveal
  2. The contract outstanding tweens smoothly on each poll change with a settlement toast/pulse (no jump cuts)
  3. Cards stagger in on scroll and connect toggles spring with a live counter tick-up
  4. Alerts enter with severity-graded emphasis while the admin surface stays low-animation
  5. All motion respects `prefers-reduced-motion`

**Plans**: TBD

Plans:

- [ ] 05-01: Score-gauge ring-sweep + count-up, contract-outstanding tween + settlement toast/pulse layered onto the Phase 3 poll-diff hook, staggered card entrances, spring connect-toggles, severity-graded alert entrances, all gated by prefers-reduced-motion

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Live Bilingual Foundation | 0/4 | Not started | - |
| 2. Authenticated Typed API Layer | 0/2 | Not started | - |
| 3. Merchant Core Loop | 0/3 | Not started | - |
| 4. Admin Surface & Demo Choreography | 0/2 | Not started | - |
| 5. WOW Polish | 0/1 | Not started | - |
