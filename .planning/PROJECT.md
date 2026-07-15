# Rafid (رافد)

## What This Is

Open-banking SME financing platform built for the AMAD hackathon (Open Banking track, فريق روافد). A merchant connects bank + sales-platform accounts via open-banking consent, the backend aggregates 90 days of data, **rafid-engine** scores creditworthiness with a transparent explainable model, and the merchant receives Sharia-compliant **Murabaha** cash against confirmed held receivables — repayment auto-collects via a background monitoring agent that also raises risk alerts. Bank underwriters get their own admin surface. This milestone: build the production **Next.js frontend** and take the whole system to a **fully live, free-hosted demo** before judging.

## Core Value

A judge can experience the complete merchant loop live — connect accounts → explainable score reveal → Murabaha offer → a contract that visibly repays itself in real time — in a polished Arabic-first UI that looks professional and worth a fortune.

## Business Context

- **Customer**: Saudi SME merchants (financing) + partner-bank underwriters (`bank_admin` surface)
- **Revenue model**: 2% platform fee + 1% success fee + disclosed 6% Murabaha profit (never framed as interest)
- **Success metric**: winning demo at AMAD hackathon judging, July 17, 2026
- **Strategy notes**: pitch stats in `RAFID_FRONTEND_HANDOFF.md` §10; deck `رافد — هاكاثون أمد.pdf`

## Requirements

### Validated

- ✓ FastAPI backend: JWT auth (merchant/bank_admin roles), connections + consent flow, aggregation, assessments, offers, contracts + repayment schedules, alerts, admin endpoints — existing
- ✓ rafid-engine: pure-Python 7-factor explainable credit scorecard (`assess()`/`quote()`), plugged behind `CreditScoringModel` seam — existing
- ✓ Monitoring agent (APScheduler): 15 real seconds = 1 simulated day; auto-advances settlements → repayments → contract closure → risk alerts — existing
- ✓ Seeded demo dataset: admin + 20 pre-connected merchants incl. happy-path (merchant03) and engineered-risky (merchant17/20) — existing
- ✓ Test suites for backend + engine (pytest) — existing
- ✓ Hackathon prototype HTML (design/copy source) + pitch deck PDF — existing

### Active

- [ ] Next.js (TypeScript, Tailwind, App Router) frontend replacing static `index.html` in the same repo/Vercel project
- [ ] Auth + role routing: register/login, JWT storage, refresh-on-401 interceptor, route guards for `merchant` vs `bank_admin`
- [ ] Typed API client generated from live OpenAPI spec (no hand-retyped shapes, no client-side fee/score math)
- [ ] Merchant app: connect-accounts wizard → aggregate → dashboard → assessment/score reveal with explainability (reasons + feature contributions, negative bars supported) → offer review (full Murabaha breakdown) → active contract with polling → alerts → connections/settings
- [ ] Bank admin app: portfolio home (funnel/risk donut/stats/open alerts) → merchant list + drill-down → underwriting view + annotate → demo tick control
- [ ] i18n: Arabic (primary, RTL) + English, full parity
- [ ] Dark + light mode
- [ ] Responsive: mobile-first (test at 390px) through desktop
- [ ] Design system as tokens from handoff §1, extended with risk-band D/declined state + alert-severity scale
- [ ] Live deployment: frontend on existing Vercel project; backend + Postgres on a completely free host so the self-advancing demo works end-to-end online
- [ ] WOW polish pass: score-gauge ring sweep + count-up, outstanding-balance tween on poll, staggered card entrances, connect-toggle springs, severity-graded alert entrances, `prefers-reduced-motion` respected — plus further ideas iterated with the user after the baseline design lands

### Out of Scope

- Real Lean/Tarabut open-banking integration — mock provider is the hackathon contract; enum swap later
- Websockets/live push — backend exposes none; polling (5–15s) is the design
- Client-side computation of scores, fees, or "days remaining" — server + simulated calendar are the source of truth
- The word "interest"/"فائدة" anywhere in copy — Murabaha framing is a hard product rule
- مدى and هنقرستيشن as platforms — not modeled in the backend enum (`salla`, `zid`, `jahez`, `foodics` only)
- Paid hosting of any kind — budget is zero
- Backend feature work beyond deploy needs — backend is done; only config/CORS/env changes for hosting

## Context

- Backend + engine are complete and mapped (`.planning/codebase/`): Python 3.12, FastAPI, async SQLAlchemy (Postgres prod / SQLite tests), uv, Docker compose, Alembic.
- **`RAFID_FRONTEND_HANDOFF.md` (repo root) is the authoritative frontend contract** — screen inventory, prototype→real-API field mapping, design tokens, API surface, build order. `uploads/FRONTEND_GUIDE.md` §11 has ready-written TS interfaces.
- Prototype design source: `Rafid App (standalone).html`; `index.html` is what the existing Vercel deployment currently serves.
- Monitoring agent consequence: data changes by itself every ~15s — screens must poll while visible, animate value changes smoothly, and show absolute simulated dates only.
- Seeded demo accounts: `admin@rafid.sa` / `AdminPass123!`, `merchant01–20@rafid.sa` / `MerchantPass123!`; `make reset` re-seeds.
- Error contract: always `{ "detail": "..." }`; 400 toast, 401 refresh-once-else-logout, 403 hide route, 422 Pydantic array.

## Constraints

- **Timeline**: judging July 17, 2026 (~2 days) — integration first, polish second (handoff §7 build order)
- **Tech stack**: Next.js + TypeScript + Tailwind CSS (user decision); animation tooling deferred, lenis/anime.js candidates
- **Budget**: hosting must be 100% free — Vercel (frontend, existing project) + free backend host TBD (must support long-running FastAPI + APScheduler + Postgres)
- **Compliance framing**: Murabaha language only, demo-dataset disclaimer visible until licensed
- **Language/direction**: Arabic-first RTL with English toggle; IBM Plex Sans Arabic

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js + TypeScript + Tailwind, App Router | User choice; Vercel-native; ecosystem fit for i18n/dark mode | — Pending |
| Integration first, polish later | 2-day deadline; handoff §7 mandates it | — Pending |
| Backend on separate free host, not Vercel | APScheduler monitor needs a long-running process; Vercel is serverless | — Pending |
| i18n (ar+en) + dark mode from scaffold, not retrofit | Retrofitting RTL/i18n/theming across built screens is far costlier | — Pending |
| Build prototype-faithful baseline first, then WOW iterations with user | User wants to see what they're working with before layering effects | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-07-15 after initialization*
