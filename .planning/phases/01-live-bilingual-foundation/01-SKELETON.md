# Walking Skeleton — Rafid (رافد)

**Phase:** 1
**Generated:** 2026-07-16

## Capability Proven End-to-End

A judge loads the production Vercel URL and sees the Arabic-first, flash-free-themed Rafid shell whose footer health badge live-polls the deployed Railway backend (`GET /health` → `SELECT 1` against Neon Postgres) and shows "متصل / Live" — proving frontend, backend, database, CORS, and env wiring all work on real free-hosted infrastructure.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Next.js 16 App Router + TypeScript + Tailwind v4 (`frontend/`, sibling to `backend/` and `rafid-engine/` — D-01) | User-locked stack; App Router `[locale]` segment is the i18n foundation every screen sits under |
| i18n / direction | next-intl, locales `['ar','en']`, defaultLocale `ar`, localePrefix `always`, cookie-persisted (D-08) | Arabic-first RTL is a hard product requirement (FOUND-01); locale-prefixed routes with middleware negotiation is the mature App Router pattern |
| Theming | next-themes (`attribute="class"`, `defaultTheme="light"`, `enableSystem=false`) + `theme` cookie read server-side in the `[locale]` layout (D-11) | Flash-free first paint (FOUND-02) requires server resolution; deterministic light default protects the stage demo from OS-preference surprises |
| Design tokens | Tailwind v4 `@theme` CSS custom properties in `frontend/src/app/[locale]/globals.css` — handoff §1 verbatim (light), UI-SPEC dark palette, risk-D + alert-severity chips (D-09/D-10/D-12) | Scaffold once, never retrofit; components consume semantic utilities only, never raw hex |
| Typography | IBM Plex Sans Arabic via `next/font/google`, subsets `['arabic','latin']`, weights 400/700 (FOUND-04) | Build-time self-hosting eliminates FOUT/layout shift; the arabic subset is mandatory |
| Formatting seam | `frontend/src/lib/format.ts` — the ONLY number/currency/date entry point; `ar-SA-u-nu-latn` digits, `ar-SA-u-ca-gregory-nu-latn` dates, `<bdi>` isolation at call sites (D-13..D-16) | Bidi-safety (FOUND-05) and the no-client-side-financial-math rule are enforced through one seam |
| Data layer | Existing FastAPI + SQLAlchemy async backend (unchanged business logic) + Neon Postgres free tier, asyncpg `connect_args={"ssl": "require"}` | Backend is done; only deploy-config edits are sanctioned. Neon has no expiry-on-inactivity (unlike Render's own Postgres) |
| Backend hosting | Railway (repo-root Docker build context, `backend.Dockerfile`, `RAILWAY_DOCKERFILE_PATH`) — no-default-sleep; Render + UptimeRobot documented-only fallback | The `../rafid-engine` path dependency forces a repo-root build context; Railway's no-sleep default removes cold-start risk for judging (DEPLOY-01) |
| Frontend hosting | Existing Vercel project, Root Directory `frontend/`, push-to-main auto-deploy (D-02/D-03) | Zero-budget constraint; immediate cutover so every later phase verifies against the real URL |
| API base wiring | `NEXT_PUBLIC_API_URL` env var only — `.env.local` for dev, Vercel env for prod; missing value fails loudly, never a silent default host (D-04) | Local/prod parity; the badge is the visible proof of correct wiring |
| Security posture | CORS narrowed from wildcard to the Vercel origin; fresh JWT_SECRET/FERNET_KEY in Railway env; guarded remote demo-reset (console exec or token-gated path) | ASVS L1; the three Phase-1 `high` threats each carry an executed mitigation |
| Auth | None in Phase 1 (backend JWT exists; frontend auth is Phase 2) | Locked phase boundary — shell layout/providers must not preclude Phase-2 `(merchant)`/`(admin)` route groups |

## Stack Touched in Phase 1

- [x] Project scaffold — create-next-app, Tailwind v4, ESLint, TypeScript (01-02)
- [x] Routing — `/ar` and `/en` locale-prefixed routes with middleware negotiation (01-02)
- [x] Database — real read: `/health` executes `SELECT 1` on Neon via the badge poll; real write: the remote demo-reset re-seeds the full demo dataset (operator-triggered, 01-01). First user-facing DB writes arrive with Phase 2 auth.
- [x] UI — interactive elements wired end-to-end: health badge polls the deployed API; language + theme toggles mutate cookies that the server resolves on next paint (01-03)
- [x] Deployment — Railway backend + Neon Postgres + Vercel frontend, all live on real URLs, verified by curl assertions and visual checkpoint (01-01, 01-04)

## Out of Scope (Deferred to Later Slices)

- Register/login screens, JWT storage, refresh-mutex, role routing — Phase 2
- Typed API client generated from the deployed openapi.json (`gen:api`) — Phase 2 (the DEPLOY-02 "types regenerated" clause completes there)
- All merchant screens (connect wizard, dashboard, score reveal, explainability, offer, contract, alerts, settings) — Phase 3
- Admin surface + demo choreography (tick, settlement-receive, account quick-switch) — Phase 4
- Animation polish (gauge sweep, tweens, staggers, springs) — Phase 5
- shadcn/ui — deliberately not initialized (UI-SPEC decision); revisit at Phase 3 forms/tables
- Real Lean/Tarabut provider integration, requested-amount slider — v2
- Collections/lists (zero-one-many, empty states, pagination) — first render Phase 3 per UI-SPEC planner note

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: Users register/log in against the live backend through a typed OpenAPI client with single-flight refresh and role routing
- Phase 3: A merchant completes the full financing journey — connect → aggregate → explainable score → Murabaha offer → live self-repaying contract → alerts
- Phase 4: A bank underwriter reviews the portfolio + drill-downs; the presenter choreographs the live-money demo
- Phase 5: The signature pitch moments animate (gauge sweep, outstanding tween, staggers) respecting `prefers-reduced-motion`
