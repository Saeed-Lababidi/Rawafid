# Project Research Summary

Project: Rafid - Arabic-first RTL open-banking SME financing platform (frontend build)
Domain: Fintech dashboard (merchant app + bank-admin underwriting surface), Next.js App Router against an existing fixed FastAPI backend
Researched: 2026-07-15
Confidence: MEDIUM-HIGH

## Executive Summary

Rafid is an Arabic-first RTL fintech product: a merchant-facing SME financing app (connect accounts, get explainable credit score, accept Murabaha-compliant offer, watch contract self-repay live) plus a bank-admin underwriting surface, built on top of an already-complete FastAPI backend with a real 7-factor scoring engine, JWT bearer auth, and a 15-second-tick simulated-time monitoring agent. Experts building this class of product converge on a few non-negotiables: server is the sole source of truth for every financial figure (score, fees, days-remaining), i18n/RTL/dark-mode must be scaffolded before any screen is built (never retrofitted), and live data is delivered via polling (TanStack Query refetchInterval), not websockets, since none exist server-side.

The recommended approach: Next.js 16 App Router + TypeScript + Tailwind v4 (locked), layered with next-intl for [locale] RTL routing, next-themes for flash-free dark mode, TanStack Query for server-state/polling, and an openapi-typescript + openapi-fetch generated client so no API shape is ever hand-retyped. Architecture centers on a single src/api/ layer (generated types, typed fetch client with 401-refresh-mutex, per-resource query hooks) consumed by two disjoint route groups, (merchant) and (admin), sharing only infra (locale/theme/auth/design tokens). Build order is integration-first: scaffold+tokens, API client, auth/routing, merchant core loop (strict dependency order: connect, aggregate, dashboard, score, offer, contract, alerts), admin surface, deploy wiring, WOW animation polish last.

Key risks cluster into two buckets. First, paint-before-JS bugs - RTL flash, dark-mode flash, digit/currency bidi errors, late-loading Arabic fonts - all stem from resolving direction/theme/formatting client-side instead of server-side, and must be fixed in the foundation phase or they compound across every subsequent screen. Second, live-demo infrastructure risk - free-tier host cold starts/sleep, Postgres free-tier expiry, JWT refresh races under concurrent polling, refetch storms, and jump-cut (non-tweened) number updates that kill the single biggest pitch moment (the self-repaying contract). Mitigate with Railway/Neon (or Render+UptimeRobot fallback) provisioned early, a shared refresh-mutex built before any polling screen, centralized query-key hooks, and a poll-diff tween hook built during core-loop implementation (polish only adds easing later).

## Key Findings

### Recommended Stack

Core stack is largely locked by prior decision (Next.js 16 App Router, TypeScript strict, Tailwind v4) and extended with purpose-built libraries for this domains two hardest problems: RTL/i18n and live-feeling polled data. Full detail in .planning/research/STACK.md.

Core technologies:
- Next.js 16 (App Router, Turbopack) - locked; native Vercel deploy, fastest 2-day iteration.
- TypeScript 5.x strict - locked; catches OpenAPI shape/enum drift before runtime.
- Tailwind CSS v4 (@theme) - locked; CSS-first tokens map directly onto handoff design tokens and RTL logical utilities.
- next-intl 4.x - purpose-built App Router i18n/RTL; single highest-leverage pick for Arabic quality, do not substitute.
- next-themes 0.4.x - flash-free dark mode via blocking inline script, composes independently with locale.
- @tanstack/react-query v5 - the entire live data story via refetchInterval; no websockets exist server-side.
- openapi-typescript + openapi-fetch - zero-runtime generated types + thin typed fetch wrapper; enforces no hand-retyped shapes.
- Supporting: recharts (charts), custom SVG+GSAP (score gauge), motion (component animation), zustand (auth-token slice), react-hook-form+zod (forms).
- Hosting: Railway (trial credit, no scale-to-zero) + Neon Postgres (permanent free tier) preferred; Render + UptimeRobot keep-alive as fallback. Avoid Fly.io free tier (removed), Koyeb free Postgres (too capped), and any host with zero keep-alive strategy.

### Expected Features

Full detail in .planning/research/FEATURES.md, grounded against the authoritative RAFID_FRONTEND_HANDOFF.md.

Must have (table stakes):
- Auth + role-gated routing (merchant vs bank_admin)
- Connect-accounts wizard with visible per-account status
- Score/risk display with single clear grade (gauge + band)
- Offer/cost breakdown before commitment (server-computed only)
- Repayment progress + schedule
- Alerts/notifications (3 types x 3 severities)
- Loading/empty/error states on every data screen
- Responsive mobile-first (390px)
- i18n parity (ar-RTL primary + en) and dark/light mode, scaffolded not retrofitted
- Bank admin: portfolio, merchant list/drill-down, underwriting annotate
- Demo-dataset disclaimer

Should have (competitive differentiators):
- Explainability screen: reasons[] + signed feature_contributions bar chart (negative values supported) - the pitch centerpiece
- Live self-updating contract: real backend monitoring-agent state changing under the UI, tweened not jump-cut
- Score gauge sweep + count-up reveal animation
- Murabaha transparency done well (never interest wording), full breakdown card
- Admin demo-tick + manual settlement-receive controls to choreograph the live-money moment on stage
- Seeded-account quick-switcher for demo pacing

Defer (v2+ / anti-features):
- Real Lean/Tarabut open-banking integration, websockets, free-text requested-amount slider (unverified backend param), unsupported connectable platforms (not in backend enum), SHAP-style dense visualizations for merchants, gamification (badges/streaks - tonally wrong for B2B lending).

### Architecture Approach

Next.js app/[locale]/ root wraps two disjoint, role-gated route groups - (merchant) and (admin) - sharing only a centralized src/api/ layer (generated OpenAPI types to single typed fetch client with auth/refresh middleware to per-resource TanStack Query hooks), a Zustand auth store, and design-system tokens. Full detail in .planning/research/ARCHITECTURE.md.

Major components:
1. [locale] root layout - i18n provider, server-resolved dir/theme, QueryClientProvider; nothing downstream can be RTL/theme-correct without this first.
2. src/api/ layer - schema.d.ts (generated, committed) to client.ts (openapi-fetch + auth header + 401-refresh-mutex + error middleware) to queries/*.ts (one file per backend resource domain) - single enforcement point for no hand-retyped shapes.
3. middleware.ts - UX-only route redirect via non-httpOnly cookie mirror of role; explicitly NOT the security boundary (real auth enforced server-side on every request, per FastAPI CurrentMerchant/CurrentAdmin deps).
4. (merchant) / (admin) route groups - separate nav shells, separate screen sets, mirroring the backend own role separation; no cross-communication except through the shared API/auth/design-system layer.
5. Polling pattern - per-screen refetchInterval tuned to the monitoring agent real 15s cadence (contract/alerts tight, dashboard/admin looser), never one global interval.

### Critical Pitfalls

Full list (11 pitfalls) in .planning/research/PITFALLS.md; top 5:

1. RTL bolted on client-side / physical CSS properties - set dir/lang server-side in root layout from the locale segment, build Arabic-first from screen one, use logical Tailwind utilities (ms-/pe-/start-) exclusively.
2. Digit/currency/date bidi bugs - centralize all number/currency/date formatting through one utility, wrap in bdi/unicode-bidi isolate, default to Western digits, test with real Arabic copy early (not lorem ipsum).
3. Dark-mode / RTL flash-of-wrong-state - resolve theme and direction server-side (cookie read in root layout) or via a blocking inline script before paint; never useEffect-only.
4. JWT refresh race under concurrent polling - implement refresh-on-401 as a single shared in-flight promise/mutex, not per-request; test with 2+ polling screens open near token expiry (else risk a false logout mid-demo, right during the pitch centerpiece moment).
5. Jump-cut instead of tweened number updates - the self-repaying contract outstanding value must animate between poll snapshots (GSAP/custom hook), or the single biggest wow moment in the pitch reads as a static, occasionally-glitching number.

Additional high-value pitfalls to carry into planning: hydration mismatches from simulated-date data crossing server/client boundary (never compute days remaining from Date.now()); refetch storms from uncoordinated per-component polling; OpenAPI type drift after backend/host migration (re-run gen:api against the deployed spec, not just localhost); free-tier host sleep + Postgres expiry timed against the July 17 judging date; CORS wildcard shipped as a quick fix that silently breaks or is a security hole.

## Implications for Roadmap

Based on combined research (architecture explicit Suggested Build Order + features dependency graph + pitfalls phase mapping - all three independently converge on the same sequence), suggested phase structure:

### Phase 1: Foundation and Scaffold
Rationale: Every paint-before-JS pitfall (RTL flash, dark-mode flash, bidi bugs, font FOUT/CLS) must be solved here or the retrofit cost across all later screens is far higher.
Delivers: [locale] root layout with server-resolved dir+theme, design tokens as Tailwind v4 @theme CSS vars (light+dark, ar+en), IBM Plex Sans Arabic via next/font (subset weights, preloaded), central number/currency/date formatting utility with bidi isolation.
Addresses: i18n parity + dark/light mode (table stakes), demo-dataset disclaimer.
Avoids: Pitfalls 1-4 (RTL flash, bidi bugs, font FOUT, dark-mode flash).

### Phase 2: API Client Layer and Auth
Rationale: Every other screen depends on the typed client and auth store; the refresh-mutex must exist before any polling screen is built.
Delivers: Generated schema.d.ts (+gen:api npm script), client.ts (openapi-fetch, auth header, 401-refresh-mutex, 400-toast middleware), Zustand auth-store.ts, login/register screens, (merchant)/(admin) route groups with layout-level role guards, middleware.ts UX redirect.
Uses: openapi-typescript, openapi-fetch, TanStack Query, Zustand, react-hook-form+zod.
Implements: src/api/ layer, middleware-as-UX-router pattern, token-handling pattern.
Avoids: Pitfall 6 (refresh race), Pitfall 9 (type drift) - set the shared query-hook pattern here so later phases avoid Pitfall 7 (refetch storms).

### Phase 3: Merchant Core Loop
Rationale: Strictly dependency-ordered per FEATURES.md dependency graph - connect requires auth, aggregate requires connect, dashboard/score require aggregate, offer requires score, contract requires accepted offer, alerts enhance but do not block.
Delivers: Connect-accounts wizard to aggregate to dashboard (revenue/receivables) to score reveal with explainability (reasons[] + negative-bar feature_contributions) to offer review (Murabaha breakdown, accept/reject) to active contract screen with polling (poll-diff hook built here, tween added in Phase 5) to repayment schedule/ledger to alerts screen to connections/settings.
Addresses: Nearly all P1 table-stakes plus the explainability/Murabaha differentiators from FEATURES.md.
Avoids: Pitfall 5 (hydration mismatch on live/simulated-date data - never compute dates client-side).

### Phase 4: Admin Surface
Rationale: Independent of merchant-loop UI but depends on the same API-client/auth foundation from Phase 2; benefits from Phase 3 existing so drill-down has real data to show.
Delivers: Portfolio home (funnel, risk donut, contract stats, open-alert count), merchant list + drill-down (reuses score/reasons rendering pattern), underwriting/annotate, demo-tick + manual settlement-receive controls (clearly separated as Demo Controls, gated by MONITOR_ENABLED).
Addresses: Bank admin table-stakes plus differentiator (underwriter risk portfolio view, demo-tick control).
Avoids: Reinforces Pitfall 7 pattern (shared query keys) at scale across a second surface.

### Phase 5: Deploy Topology and WOW Polish
Rationale: Deploy wiring should start in parallel with Phase 3/4 given free-host sleep/expiry risk grows with time, but animation polish is deliberately last per both PROJECT.md and the handoff explicit integration first, polish second build order.
Delivers: Backend on Railway (or Render+UptimeRobot fallback) + Neon Postgres, CORS allow-list (never wildcard), NEXT_PUBLIC_API_URL wired in Vercel, uptime pinger configured well before judging, gen:api re-run against deployed openapi.json; then score-gauge ring-sweep+count-up, contract-outstanding tween + settlement toast/pulse, staggered card entrances, alert severity-graded entrances, all respecting prefers-reduced-motion.
Addresses: All P2 wow differentiators from FEATURES.md.
Avoids: Pitfall 10 (host sleep/DB expiry), Pitfall 11 (CORS wildcard), Pitfall 8 (jump-cut number updates - tween finally layered onto the Phase 3 poll-diff hook).

### Phase Ordering Rationale

- Dependency chain from FEATURES.md (auth, connect, aggregate, score, offer, contract, alerts) is a hard sequential constraint, not a preference - cannot build a contract screen without an accepted offer, no offer without a scored assessment.
- Architecture infra before screens principle (i18n/theme/API-client/auth) independently confirms Phase 1-2 must precede all feature screens - three separate research files converge on identical ordering, raising confidence in this structure.
- Pitfalls research maps cleanly onto this same phase boundary: every paint-before-JS bug belongs in Phase 1, every polling/auth-race bug belongs in Phase 2 foundation (even though it manifests in Phase 3+ screens), and every infra-durability bug belongs in Phase 5 deploy step, which should nonetheless start early precisely because sleep/expiry risk grows with time.
- WOW polish (gauge sweep, tweening, stagger) is explicitly and repeatedly deferred to last across all three research files - treat this as a firm constraint, not a nice-to-have ordering.

### Research Flags

Phases likely needing deeper research during planning:
- Phase 3 (Merchant Core Loop): hydration-mismatch handling for polling+SSR interplay is domain-specific to this project simulated-calendar design; verify exact TanStack Query initialData/query-key reconciliation pattern against the real deployed backend before finalizing.
- Phase 5 (Deploy Topology): free-tier host behavior (Railway trial credit terms, Neon SSL connection params, exact cold-start timing) is time-sensitive - re-verify current terms at deploy time, not from this research alone.

Phases with standard patterns (skip research-phase):
- Phase 1 (Foundation): next-intl/next-themes/Tailwind v4 RTL patterns are HIGH-confidence, officially documented, well-trodden.
- Phase 2 (API Client and Auth): openapi-typescript/openapi-fetch + TanStack Query integration and the refresh-mutex pattern are HIGH-confidence, standard patterns with official docs.
- Phase 4 (Admin Surface): reuses Phase 2/3 patterns directly, no new architectural questions.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Web-sourced, cross-checked across multiple 2026 articles; no Context7/official-doc verification pass was performed in this run. Core Next.js/Tailwind/TanStack choices are well-established regardless; verify exact patch versions before locking package.json. |
| Features | MEDIUM | Web-sourced fintech UX patterns cross-checked across many sources, but grounded against a HIGH-confidence internal contract (RAFID_FRONTEND_HANDOFF.md) which is authoritative for field shapes/API and resolves most feature ambiguity. |
| Architecture | HIGH (Next.js/App Router/TanStack Query patterns) / MEDIUM (free-host specifics) | Core patterns backed by official docs and direct codebase reads; hosting-topology specifics are time-sensitive and should be re-verified at deploy time. |
| Pitfalls | MEDIUM | Web-search-sourced across 12 targeted queries plus Rafid own handoff doc; no vendor-doc/Context7 verification - treat specifics as directionally correct, verify exact current APIs before relying on them. |

Overall confidence: MEDIUM-HIGH - technology and architecture choices are solid and internally consistent across all four research files; the primary uncertainty is time-sensitive free-tier hosting behavior, which should be re-verified immediately before the deploy phase.

### Gaps to Address

- Free-tier host exact behavior (Railway trial terms, Neon SSL params, exact cold-start timing): re-verify at the start of the deploy phase, not from this research alone.
- Whether /offers/generate accepts a requested_amount param: unverified against the live OpenAPI spec - confirm against the deployed /openapi.json before considering any amount-editing UI (currently scoped as v2+/anti-feature pending verification).
- Exact Postgres free-tier expiry date once provisioned: must be tracked explicitly against July 17 judging date, not assumed safe - flagged as a HIGH-recovery-cost pitfall if discovered late.
- make reset / demo-reset mechanism on the chosen free host without SSH access: verify the chosen host supports this before committing to it.

## Sources

### Primary (HIGH confidence)
- RAFID_FRONTEND_HANDOFF.md (repo root) - authoritative screen inventory, API surface, field mappings, build order
- .planning/PROJECT.md - scope, constraints, key decisions, out-of-scope items
- .planning/codebase/ARCHITECTURE.md - existing backend architecture (unchanged, ground truth)
- Codebase direct reads: backend/app/api/routers/auth.py, backend/app/schemas/auth.py, backend/app/main.py, backend/app/config.py, backend/app/api/routers/system.py, backend/Makefile
- Next.js official docs (App Router, authentication, i18n guides), next-intl official docs, TanStack Query official docs, openapi-ts.dev official docs

### Secondary (MEDIUM confidence)
- Vendor/community sources on free-tier hosting (Render, Railway, Neon, Supabase, Fly.io, Koyeb) - 2026 articles, cross-checked across multiple independent posts
- Fintech UX/dashboard design pattern sources (Masterly, Fintech Brainfood, WildnetEdge, etc.)
- Islamic fintech/Murabaha UX sources (Logio Legion, Itexus, Fimple)
- Explainable AI / SHAP-in-finance sources (Ergomania, CFA Institute, Medium)
- Animation library comparison sources (LogRocket, motion.dev)
- RTL/bidi/i18n technical sources (Lingo.dev, xgeeks, W3C bidi algorithm docs)

### Tertiary (LOW confidence)
- Individual community blog posts on Render free-tier cold-start behavior and Next.js middleware CVE coverage - corroborated across multiple posts but not vendor-official; re-verify at deploy time

---
Research completed: 2026-07-15
Ready for roadmap: yes
