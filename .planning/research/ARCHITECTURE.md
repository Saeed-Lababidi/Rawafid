# Architecture Research

**Domain:** Arabic-first RTL open-banking SME financing (fintech) — Next.js App Router frontend against an existing FastAPI backend (JWT bearer, no cookies, no websockets, self-advancing monitoring agent)
**Researched:** 2026-07-15
**Confidence:** HIGH (Next.js/App Router/TanStack Query patterns — well-established, current docs); MEDIUM (free-host specifics — time-sensitive, verify at deploy time)

## Standard Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                     Vercel: Next.js App Router                        │
│                                                                         │
│  app/[locale]/                                                         │
│   ├─ layout.tsx        i18n provider, dir=rtl|ltr, theme, QueryClient │
│   ├─ (auth)/            login, register — public                      │
│   ├─ (merchant)/        merchant shell — protected, role=merchant     │
│   │   dashboard, financing, offer, contract, alerts, connections      │
│   └─ (admin)/           admin shell — protected, role=bank_admin      │
│       portfolio, merchants, underwriting, monitor                     │
│                                                                         │
│  middleware.ts   locale detect + UX-only auth/role redirect            │
│                                                                         │
│  src/api/                                                              │
│   ├─ schema.d.ts       generated: openapi-typescript ← /openapi.json  │
│   ├─ client.ts         openapi-fetch instance, base=NEXT_PUBLIC_API_URL│
│   ├─ auth-store.ts     Zustand: tokens in memory+localStorage+cookie  │
│   └─ queries/*.ts       TanStack Query hooks, one file per resource   │
└───────────────────────────┬─────────────────────────────────────────┘
                             │ HTTPS, Authorization: Bearer <access>
                             │ (CORS: explicit origin allow-list, no credentials)
                             ▼
┌───────────────────────────────────────────────────────────────────────┐
│         Free host (Render/Fly/equivalent): FastAPI backend            │
│         — unchanged, existing layered service architecture             │
│         (see .planning/codebase/ARCHITECTURE.md)                       │
│         + APScheduler monitor ticking every 15s in-process            │
└───────────────────────────┬─────────────────────────────────────────┘
                             │ asyncpg
                             ▼
┌───────────────────────────────────────────────────────────────────────┐
│         Free Postgres (Neon/Supabase — persistent, no 30-day expiry)  │
└───────────────────────────────────────────────────────────────────────┘

External: uptime pinger (cron-job.org / UptimeRobot) → GET /health every
~10 min, keeps free host warm so the monitor keeps ticking even with zero
demo traffic.
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|-------------------------|
| `[locale]` root layout | i18n context, `dir` attribute, font, theme provider, `QueryClientProvider` | `next-intl` `NextIntlClientProvider` + `next-themes` + root `QueryClient` (client component boundary) |
| `middleware.ts` | Locale negotiation/redirect + **UX-only** route gate (not the security boundary) | `next-intl` middleware chained with a lightweight cookie check for auth/role presence |
| `(auth)` route group | Public login/register screens | Server components for shell, client form + mutation for submit |
| `(merchant)` route group | Merchant shell + all merchant screens, gated to `role=merchant` | Layout-level client guard reading auth store; nav shell wraps 8 screens (handoff §2) |
| `(admin)` route group | Admin shell, gated to `role=bank_admin` | Same guard pattern, separate nav shell, 4 screens |
| `src/api/schema.d.ts` | Generated TS types mirroring live OpenAPI spec — single source of truth for request/response shapes | `openapi-typescript` CLI, committed to repo, regenerated on backend contract change |
| `src/api/client.ts` | One typed fetch client: base URL, auth header injection, 401-refresh-retry, 400-toast, 403-redirect | `openapi-fetch` `createClient` + `onRequest`/`onResponse` middleware hooks |
| `src/api/auth-store.ts` | Access/refresh token lifecycle, single source of truth for "am I authenticated, what role" | Zustand store with `persist` (localStorage) + a mirrored non-httpOnly cookie write on login/refresh/logout for `middleware.ts` to read |
| `src/api/queries/*.ts` | Typed TanStack Query hooks per resource domain (assessments, offers, contracts, alerts, admin, connections) | `useQuery`/`useMutation` wrapping `client.ts`; per-screen `refetchInterval` |
| Design-system layer (`src/components/ui/`) | Tokens from handoff §1 as Tailwind theme + CSS variables, dark/light, RTL-safe (logical properties) | Tailwind config + CSS variables switched by `dir`/`data-theme` |
| FastAPI backend (unchanged) | All business logic, auth issuance, scoring, offers, contracts, monitoring | See `.planning/codebase/ARCHITECTURE.md` — do not modify beyond CORS/env |
| Free Postgres | Persistent state store for backend | Neon or Supabase free tier (asyncpg-compatible connection string) |
| Uptime pinger | Keeps free host process alive so `APScheduler` keeps ticking, not just "keeps API fast" | External cron hitting `GET /health` (already exists, `backend/app/api/routers/system.py`) every ~10 min |

## Recommended Project Structure

```
frontend/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx              # i18n + theme + QueryClientProvider root
│   │   ├── page.tsx                # marketing/landing → redirect to /login or /dashboard
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (merchant)/
│   │   │   ├── layout.tsx          # merchant shell nav, role guard
│   │   │   ├── connect/page.tsx    # connect-accounts wizard
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── financing/page.tsx  # assessment/score reveal
│   │   │   ├── offer/[id]/page.tsx
│   │   │   ├── contract/[id]/page.tsx   # polling screen
│   │   │   ├── alerts/page.tsx
│   │   │   └── settings/page.tsx   # connections/settings
│   │   └── (admin)/
│   │       ├── layout.tsx          # admin shell nav, role guard
│   │       ├── portfolio/page.tsx
│   │       ├── merchants/page.tsx
│   │       ├── merchants/[id]/page.tsx
│   │       └── monitor/page.tsx    # demo tick control
│   └── api/                        # (only if a BFF proxy route is added later — none by default)
├── middleware.ts
├── messages/
│   ├── ar.json
│   └── en.json
├── src/
│   ├── api/
│   │   ├── schema.d.ts             # generated, do not hand-edit
│   │   ├── client.ts
│   │   ├── auth-store.ts
│   │   └── queries/
│   │       ├── auth.ts
│   │       ├── merchant.ts
│   │       ├── connections.ts
│   │       ├── assessments.ts
│   │       ├── offers.ts
│   │       ├── contracts.ts
│   │       ├── alerts.ts
│   │       └── admin.ts
│   ├── components/
│   │   ├── ui/                     # design-system primitives (tokens-driven)
│   │   ├── merchant/                # score gauge, offer breakdown, contract feed
│   │   └── admin/                   # funnel, risk donut, drill-down table
│   ├── lib/
│   │   ├── i18n.ts                 # next-intl config
│   │   ├── format.ts               # number/date formatting (ar-SA/en, absolute dates only)
│   │   └── query-client.ts         # QueryClient factory + default options
│   └── styles/
│       └── tokens.css              # CSS vars from handoff §1, dark/light + RTL logical props
```

### Structure Rationale

- **`app/[locale]/(merchant)` vs `(admin)`:** two route groups sharing the `[locale]` segment give each role its own layout/nav shell without duplicating locale/theme wiring, and without leaking one role's routes into the other's URL space.
- **`src/api/` centralizes the whole backend contract:** generated types + one client + one auth store + query hooks means every screen imports from one place — no ad-hoc `fetch()` calls, no hand-retyped shapes (handoff §4 explicitly forbids this).
- **`messages/{ar,en}.json` at repo root, not per-route:** flat message catalog is simpler to keep in parity (a stated requirement — "full parity") than nesting translations per screen.
- **i18n + theme + auth wired at the root `[locale]/layout.tsx` from day one:** per PROJECT.md decision, retrofitting RTL/i18n/theming across already-built screens is far costlier than scaffolding it first.

## Architectural Patterns

### Pattern 1: Route groups for role-gated surfaces, `[locale]` above both

**What:** `app/[locale]/(merchant)/...` and `app/[locale]/(admin)/...` — parenthesized route groups don't affect the URL, only nesting and layout scope. Each group's `layout.tsx` renders the role-specific shell and performs the client-side role check before rendering children.
**When to use:** Two structurally different apps (different nav, different data) sharing infra (locale, theme, query client) but not sharing screens.
**Trade-offs:** Clean separation, easy to reason about "what can a merchant see"; cost is two shells to maintain in parallel — acceptable here since handoff §2 already defines two disjoint screen sets.

**Example:**
```
app/[locale]/(merchant)/layout.tsx  → checks role==='merchant', else router.replace('/login')
app/[locale]/(admin)/layout.tsx     → checks role==='bank_admin', else router.replace('/login')
```

### Pattern 2: Middleware as UX router, not the security boundary

**What:** `middleware.ts` reads a **non-httpOnly** cookie mirror of "logged in + role" (written by the client on login/refresh/logout) purely to redirect `/dashboard` → `/login` before first paint, and to pick the right locale. It does **not** verify the JWT signature and is not trusted for authorization — every actual data request still requires a valid Bearer token, checked by FastAPI on every call (`CurrentMerchant`/`CurrentAdmin` deps already exist server-side, per `.planning/codebase/ARCHITECTURE.md`).
**When to use:** Always, for this project — because the backend contract is JSON Bearer tokens, not cookies, Next.js middleware has no way to cryptographically verify auth without a network round-trip per request (defeats the purpose of edge middleware) or without the backend setting cookies (out of scope — backend is fixed).
**Trade-offs:** Avoids CVE-2025-29927-class mistakes (never rely solely on middleware for security — see Next.js middleware bypass advisory, March 2025) and avoids adding a BFF proxy layer under a 2-day deadline. Cost: a user could momentarily see a protected shell flash before a client-side redirect if the cookie mirror is stale/cleared out of band — acceptable for a hackathon demo, not for a real production fintech app (flag as a known trade-off).

**Example:**
```typescript
// middleware.ts
export function middleware(req: NextRequest) {
  const intlResponse = intlMiddleware(req); // next-intl locale handling
  const authFlag = req.cookies.get('rafid_role')?.value; // 'merchant' | 'bank_admin' | undefined
  const isProtected = /\/(merchant|admin)\//.test(req.nextUrl.pathname);
  if (isProtected && !authFlag) return NextResponse.redirect(new URL('/login', req.url));
  return intlResponse;
}
```

### Pattern 3: Token handling — memory + localStorage + cookie-mirror, given the backend is bearer-only

**What:** Backend `/auth/login`, `/auth/register`, `/auth/refresh` return `{access_token, refresh_token, token_type}` as plain JSON (`backend/app/schemas/auth.py`) — no `Set-Cookie`, and `/auth/refresh` expects the refresh token **in the request body**, not read from a cookie. This is the textbook case for httpOnly-cookie storage (see Sources), but that pattern requires the backend to issue/accept cookies, which is out of scope for this milestone (PROJECT.md: "Backend feature work beyond deploy needs... only config/CORS/env changes"). Given that constraint plus the 2-day timeline, the pragmatic pattern is:
- Access + refresh tokens held in a Zustand store (in-memory, source of truth for the current tab).
- Persisted to `localStorage` so a hard refresh doesn't force re-login (accepted XSS trade-off, documented — this is a hackathon demo dataset, not real PII/funds).
- A small non-httpOnly cookie (`rafid_role`, or the JWT itself if middleware needs the role claim) mirrored on login/refresh/logout so `middleware.ts` can do the UX redirect from Pattern 2.
- `client.ts`'s `onRequest` hook attaches `Authorization: Bearer <access>`; `onResponse` hook catches 401, calls `/auth/refresh` once, retries the original request, and on second failure clears the store + cookie and redirects to `/login` (handoff §4: "401 (try refresh once, else logout)").
**When to use:** Specifically because this backend is fixed as Bearer-only. If a future milestone adds cookie-issuing auth to the backend, migrate to full httpOnly + BFF proxy (Pattern 3b below) — do not build that now, it's the over-engineered option under this timeline.
**Trade-offs:** Simpler, no proxy layer, works directly with the existing CORS config (`allow_credentials=False` stays false — no cross-origin cookies to send). Known weakness: tokens readable by any injected script; mitigate by keeping the frontend dependency surface small and not rendering unsanitized user content (there's very little free-text in this app's data model).

**Example (fetch wrapper 401-retry):**
```typescript
// src/api/client.ts (openapi-fetch middleware)
let refreshing: Promise<void> | null = null;

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = useAuthStore.getState().accessToken;
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
  async onResponse({ response, request }) {
    if (response.status !== 401) return response;
    refreshing ??= refreshTokens().finally(() => { refreshing = null; });
    try {
      await refreshing;
      const retryReq = request.clone();
      retryReq.headers.set('Authorization', `Bearer ${useAuthStore.getState().accessToken}`);
      return fetch(retryReq);
    } catch {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return response;
    }
  },
};
```

### Pattern 3b (deferred, not this milestone): httpOnly cookie + BFF proxy

**What:** Next.js Route Handlers (`app/api/*`) exchange credentials with FastAPI server-side, set httpOnly/Secure/SameSite cookies on the Vercel domain, and proxy all subsequent authenticated calls, attaching the Bearer header server-side so the browser never sees the token.
**When to use:** If the backend's auth contract changes to support cookie issuance, or in a later milestone with a longer timeline and real user data at stake.
**Trade-offs:** Best XSS posture (industry standard for JWT-based SPA-style apps — see Sources), but adds a full proxy layer, doubles the request hops (browser → Vercel function → FastAPI), and needs Vercel serverless-function cold-start accounted for on top of the backend's own cold start. Not worth it for a 2-day hackathon demo against a bearer-only backend.

### Pattern 4: `[locale]` segment + `next-intl`, `dir` derived from locale

**What:** `app/[locale]/layout.tsx` reads the `locale` param, sets `<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>`, wraps children in `NextIntlClientProvider`. `middleware.ts` handles locale negotiation/redirect (`/` → `/ar` default, since Arabic is primary per PROJECT.md).
**When to use:** Always for this project — "Arabic-first RTL open-banking... with English toggle" is a hard requirement, and retrofitting locale segments after screens exist is far more expensive than scaffolding first (already a Key Decision in PROJECT.md).
**Trade-offs:** URL-based locale (`/ar/dashboard`, `/en/dashboard`) is shareable/predictable and lets `dir` be set server-side (no flash of wrong direction), versus a client-only i18n context that would require a hydration-time direction flip. Styling must use CSS logical properties (`margin-inline-start`, not `margin-left`) so the same component works mirrored in both directions without per-direction overrides.

**Example:**
```typescript
// app/[locale]/layout.tsx
export default async function LocaleLayout({ children, params }) {
  const { locale } = await params;
  const messages = await getMessages();
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider><QueryProvider>{children}</QueryProvider></ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Pattern 5: TanStack Query polling, tuned per screen against the monitoring agent's real cadence

**What:** Backend's `APScheduler` monitor ticks every `MONITOR_INTERVAL_SECONDS` (default 15s — `backend/app/config.py`), auto-advancing settlements/repayments/alerts with zero client action. `refetchInterval` per query should be set close to but not faster than that cadence, and only on screens actually rendering the affected data.
**When to use:**
- **Contract/schedule screen:** `refetchInterval: 5000–10000`, `refetchIntervalInBackground: false` (only poll while the tab is actually open on that screen — no websockets exist, so this is the only signal of "live"); pair with a smooth count-down/count-up tween on `outstanding` changes (handoff §6, §8), not a jump-cut re-render.
- **Alerts screen / alerts badge in shells:** similar interval; consider a lighter global poll (e.g. 15–20s) for an unread-alerts-count badge visible across all merchant screens.
- **Dashboard reads (accounts/transactions/sales/settlements):** these only change via merchant-initiated `aggregate` or the monitor's settlement processing — poll at a longer interval (e.g. 15–30s) or `refetchOnWindowFocus` only, not tight polling.
- **Admin portfolio/merchant-list:** poll at a slower cadence (e.g. 20–30s) since underwriters are watching aggregate trends, not second-by-second ticks; the "monitor tick" demo control can trigger an immediate `queryClient.invalidateQueries` after `POST /admin/monitor/tick` so the demo operator sees instant feedback without waiting for the next poll.
**Trade-offs:** Polling everywhere wastes the free backend host's limited resources and can trip rate limits on some free tiers; scope `refetchInterval` to only the screens where staleness is visible/pitched, and pause (`enabled: false` or `refetchInterval: false`) when the tab/screen isn't the active one (React Query pauses on window blur by default already — keep that default rather than forcing `refetchIntervalInBackground: true`, since this app has no urgent background-notification requirement).

**Example:**
```typescript
// src/api/queries/contracts.ts
export function useContract(id: string) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: () => client.GET('/contracts/{id}', { params: { path: { id } } }),
    refetchInterval: 7000,
    staleTime: 5000,
  });
}
```

### Pattern 6: OpenAPI-typed client layering (generated types → typed fetch → query hooks)

**What:** Three strict layers, each depending only on the one below: (1) `schema.d.ts` generated from the live `/openapi.json` via `openapi-typescript` — pure types, no runtime code, regenerated whenever the backend contract changes; (2) `client.ts` — one `openapi-fetch` instance configured with base URL + auth/error middleware, giving fully-typed `client.GET('/contracts/{id}', ...)` calls with path/query/body inference; (3) `queries/*.ts` — TanStack Query hooks wrapping (2), one file per backend resource domain, matching the router split already used server-side (`assessments`, `offers`, `contracts`, `alerts`, `admin`, `connections`).
**When to use:** Always for this project — handoff §4 mandates "no hand-retyped shapes." Regenerate `schema.d.ts` locally against the running dev backend (or against the deployed backend once live) and commit the file — do **not** attempt to fetch `/openapi.json` at Vercel build time, since the backend may be cold/unreachable during a build.
**Trade-offs:** One extra codegen step per backend contract change, but eliminates an entire class of "frontend guessed a field name wrong" bugs, and keeps the frontend honest about the real 0–1000 score scale, `risk_band` A–D, and band-dependent `max_advance_ratio` (handoff §3 — these differ sharply from the throwaway prototype's invented numbers).

## Data Flow

### Request Flow (merchant core loop — build order §7 sequence)

```
[Merchant clicks "Run assessment"]
    ↓
[financing/page.tsx] → [useMutation: runAssessment()] → [client.ts POST /assessments/run]
    ↓                         ↓ (Authorization: Bearer, attached by onRequest hook)
[optimistic/pending UI]  [FastAPI: assessments router → scoring service → rafid-engine]
    ↓                         ↓
[AssessmentDetailOut] ← ← ← [response: score, risk_band, reasons[], feature_contributions{}]
    ↓
[score-reveal component renders opaque server Decision — no client math]
    ↓
[queryClient.invalidateQueries(['assessments'])] → offer step reads latest assessment
```

### State Management

```
[auth-store.ts: Zustand]                 [TanStack QueryClient: server cache]
    ↓ (access/refresh tokens, role)           ↓ (all API-derived data)
[client.ts reads token on every request]  [queries/*.ts hooks ← components]
    ↓                                         ↓ (refetchInterval per screen)
[middleware.ts reads cookie mirror         [components render, never store
 for redirect-only UX gate]                 derived financial figures in
                                             local state — always re-derive
                                             from the latest query result]
```

Local component state is reserved for pure UI concerns (wizard step index, form inputs, animation trigger flags). Every financial figure, date, score, or status comes from a TanStack Query cache entry that traces back to a live API response — never computed or stored ad hoc, matching the backend's own "server + simulated calendar are the source of truth" rule (PROJECT.md Out of Scope).

### Key Data Flows

1. **Auth bootstrap:** login/register → `TokenPair` JSON → written to `auth-store` (memory + localStorage) → role mirrored to cookie → route-group layout re-evaluates guard → redirect to the correct shell (`(merchant)` or `(admin)`).
2. **Connect → aggregate → dashboard:** consent start/complete (mock provider, any non-empty `auth_code`) → `POST /merchants/me/aggregate` → dashboard queries (`accounts`, `transactions`, `sales`, `settlements`) invalidated/refetched to show real numbers.
3. **Assessment → offer → contract:** `/assessments/run` → score-reveal reads `AssessmentDetailOut` → `/offers/generate` (server-priced, no client math) → `/offers/{id}/accept` → `ContractDetailOut` with polling (`refetchInterval`) driving the self-updating `outstanding` figure.
4. **Monitoring-agent-driven background flow:** independent of any user click — the backend's `APScheduler` tick advances settlements/repayments/alerts server-side every 15s; the frontend's only job is to keep polling the affected screens while they're mounted and animate the deltas (count-tween, toast/pulse on new repayment — handoff §6/§8), never to simulate the passage of time itself.
5. **Admin drill-down:** portfolio aggregate reads (`/admin/portfolio`) → merchant list → merchant detail pulls the same assessment/offer/contract/alert shapes the merchant screens use, read-only plus one write path (`/admin/offers/{id}/annotate`) and one operator control (`/admin/monitor/tick`) that should trigger an immediate cache invalidation for instant demo feedback.

## Scaling Considerations

This is a 2-day hackathon demo on a free-tier topology — "scale" here means "survive the judging window reliably," not user growth.

| Scale | Architecture Adjustments |
|-------|---------------------------|
| Judging demo (a handful of judges, seeded 20 merchants) | Current design is already correctly sized: single free backend instance, polling (not websockets), Postgres free tier is plenty. Priority is **uptime through the judging window**, not throughput. |
| If backend free host spins down between visits | External uptime pinger (cron-job.org/UptimeRobot) hitting `GET /health` every ~10 min keeps the process warm continuously — start this well before judging, not just-in-time, since a cold start (30–60s) during a live demo reads as "broken." |
| If demo needs a mid-window reset | `make reset` (`python -m app.seed.run --reset`) needs a way to run on the free host without SSH — verify the chosen host's shell/console access ahead of time, or add a guarded reset trigger; do this as a deploy-readiness check days before judging, not the morning of. |
| Beyond the hackathon (hypothetical) | Would need: real open-banking provider swap (enum swap only, per Out of Scope), paid host to remove cold starts, httpOnly-cookie/BFF auth (Pattern 3b), rate limiting, and moving polling toward SSE/websockets if the backend ever adds a push channel — none of this is in scope now. |

### Scaling Priorities

1. **First (and only real) risk:** free host cold start during judging — mitigate with an external keep-alive ping started well in advance, not architectural changes.
2. **Second:** free Postgres tier expiry/limits (some free Postgres tiers auto-pause or expire after inactivity/time windows) — pick a persistent free tier (Neon/Supabase) rather than a host's bundled trial database, and re-verify it's still live a day before judging.

## Anti-Patterns

### Anti-Pattern 1: Trusting `middleware.ts` as the security boundary

**What people do:** Treat an edge middleware auth/role check as sufficient protection for `/admin/*` or `/merchant/*` routes, sometimes skipping server-side role checks because "middleware already handled it."
**Why it's wrong:** Next.js middleware runs client-influenceable request context and has had real bypasses (CVE-2025-29927, `x-middleware-subrequest` header). More fundamentally here, this backend never issues a verifiable cookie — the middleware can only check a self-reported flag, not a signature. Real authorization is, and must remain, enforced by FastAPI's `CurrentMerchant`/`CurrentAdmin` dependencies on every request.
**Do this instead:** Treat middleware purely as a UX redirect (Pattern 2). Let every screen's data queries fail closed — a 401/403 from the API is the real gate; render an error/redirect state on that, don't assume middleware already prevented the request.

### Anti-Pattern 2: Computing financial figures or "days remaining" on the client

**What people do:** Compute a countdown from `Date.now()`, or recompute fees/scores client-side for a snappier UI (this is literally what the throwaway prototype did — handoff §3).
**Why it's wrong:** The backend runs a simulated calendar (15 real seconds = 1 simulated day) that has no fixed relationship to wall-clock time; and score/fee/offer math lives in `rafid-engine`, which must stay the single source of truth for Sharia-compliance and accuracy (`.planning/codebase/ARCHITECTURE.md` Anti-Patterns section — this is a codified backend rule the frontend must not violate from the other side).
**Do this instead:** Render only absolute dates and server-provided numbers; re-fetch via polling rather than locally extrapolating; treat every `Decision`/`Offer`/`ContractDetailOut` field as opaque.

### Anti-Pattern 3: Polling every screen at the same tight interval regardless of relevance

**What people do:** Set one global `refetchInterval` (e.g. 5s) on every query "to be safe."
**Why it's wrong:** Wastes free-tier backend resources, risks visible jank from constant re-renders on screens where nothing is actually changing (e.g. the connections/settings screen), and can make the free Postgres/host feel sluggish exactly when a judge is watching.
**Do this instead:** Scope tight polling (Pattern 5) to the screens the monitoring agent actually affects — contract, alerts; use slower or on-focus refetch elsewhere.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|----------------------|-------|
| FastAPI backend (Render/Fly/equivalent free host) | Direct HTTPS calls from the browser, `Authorization: Bearer` header, base URL from `NEXT_PUBLIC_API_URL` | No BFF proxy in this milestone (Pattern 3 vs 3b above). Confirm the chosen host supports long-running processes (APScheduler needs a persistent process, not a request-scoped serverless function — this is already a Key Decision in PROJECT.md ruling out Vercel for the backend). |
| Free Postgres (Neon/Supabase) | `DATABASE_URL` env var on the backend host, `postgresql+asyncpg://` scheme already used in code | Confirm SSL mode required by the provider (`?ssl=require` or provider-specific param) works with the existing `asyncpg` engine setup in `backend/app/db.py`; verify the tier doesn't auto-pause/expire before judging day. |
| Uptime pinger (cron-job.org / UptimeRobot / GitHub Actions cron) | External scheduled `GET /health` (endpoint already exists — `backend/app/api/routers/system.py`) every ~10 min | Not optional for this project: keeps both API latency low *and* the `APScheduler` monitor actually ticking, since a spun-down free host pauses the simulated calendar along with everything else. Start well before judging. |
| OpenAPI spec (`/openapi.json`) | Local/dev-time codegen only (`openapi-typescript` CLI → committed `schema.d.ts`) | Do not fetch this at Vercel build time — the backend may be cold or briefly unreachable during a build; regenerate on demand when the backend contract changes and commit the result. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|----------------|-------|
| `(merchant)` shell ↔ `(admin)` shell | No direct communication — fully separate route groups, separate nav, separate query-hook files; only share `src/api/client.ts`, `auth-store.ts`, and design-system primitives | Mirrors the backend's own `CurrentMerchant` vs `CurrentAdmin` separation (`.planning/codebase/ARCHITECTURE.md`) — keep the frontend split at the same seam the backend already enforces. |
| `middleware.ts` ↔ `auth-store.ts` | One-way cookie mirror written by the store on login/refresh/logout, read-only by middleware | Middleware never writes auth state; it only redirects based on what the store already decided. |
| `queries/*.ts` ↔ `client.ts` | All typed calls go through the single `client.ts` instance (Pattern 6) | No file should call `fetch()` directly against the backend — this is the enforcement point for "no hand-retyped shapes" and for the 401-refresh/400-toast/403-hide contract (handoff §4) being applied uniformly. |
| Frontend ↔ `rafid-engine` | **None, by design** | Frontend never imports or calls the scoring engine; it only renders `Decision`/`Offer` JSON returned by `/assessments/run` and `/offers/generate` (handoff §4 "AI engine boundary" — already enforced server-side, restate here so the frontend build order doesn't accidentally try to "port" the prototype's client-side scoring math). |

## Suggested Build Order (integration-first, per handoff §7 — architecture dependency view)

1. **Scaffold + infra layer** — `[locale]` root layout (i18n + `dir` + theme + fonts), design tokens as Tailwind/CSS vars, `QueryClientProvider`. Nothing downstream can be built RTL/i18n-correct without this first (PROJECT.md Key Decision).
2. **API client layer** — generate `schema.d.ts` from the running backend's `/openapi.json`, build `client.ts` (auth header + 401-refresh-retry + 400-toast middleware), build `auth-store.ts`. Every other screen depends on this.
3. **Auth + route groups** — login/register screens, `(merchant)`/`(admin)` route groups with layout-level role guards, `middleware.ts` UX redirect. Required before any protected screen can be reached.
4. **Merchant core loop, in dependency order** — connect wizard → aggregate → dashboard reads → assessment/score reveal → offer review → accept → contract (with polling, Pattern 5) → alerts → connections/settings. Each step's data literally depends on the previous step having run against the real backend (can't show a contract without an accepted offer, no offer without a scored assessment).
5. **Admin surface** — portfolio → merchant list/drill-down → underwriting/annotate → monitor-tick control. Independent of the merchant loop's UI but depends on the same `client.ts`/`auth-store.ts` foundation from step 2, and benefits from steps 3–4 existing first so the drill-down has real data to show.
6. **Deploy topology wiring** — backend to free host + free Postgres, CORS origin allow-list, `NEXT_PUBLIC_API_URL` set in Vercel, uptime pinger configured. Do this in parallel with step 4/5 once the API client layer (step 2) is stable, so integration is being tested against the real deployed backend well before judging, not the night before.
7. **WOW polish pass** (handoff §8) — score-gauge sweep, contract-number tweening, staggered entrances, alert severity entrances, `prefers-reduced-motion` — deliberately last, per the explicit "integration first, polish second" build order in both PROJECT.md and the handoff.

## Sources

- [Next.js: Guides — Authentication](https://nextjs.org/docs/app/guides/authentication) — HIGH (official docs)
- [Next.js: App Router — Adding Authentication](https://nextjs.org/learn/dashboard-app/adding-authentication) — HIGH (official docs)
- [WorkOS: Building authentication in Next.js App Router — the complete guide for 2026](https://workos.com/blog/nextjs-app-router-authentication-guide-2026) — MEDIUM (vendor blog, cross-checked against official docs)
- [Authgear: How to Add JWT Authentication to Next.js App Router (2026)](https://www.authgear.com/post/nextjs-jwt-authentication/) — MEDIUM
- [Authgear: Next.js Session Management — Cookies, JWTs & Tokens](https://www.authgear.com/post/nextjs-session-management/) — MEDIUM
- [Wisp CMS: LocalStorage vs httpOnly Cookies for JWT](https://www.wisp.blog/blog/understanding-token-storage-local-storage-vs-httponly-cookies) — MEDIUM (corroborates httpOnly-as-ideal, informs the documented trade-off in Pattern 3)
- CVE-2025-29927 (Next.js middleware authorization bypass, March 2025) — referenced via search results (HashBuilds, Medium coverage) — MEDIUM, underlies Anti-Pattern 1
- [next-intl: App Router getting started](https://next-intl.dev/docs/getting-started/app-router) — HIGH (official docs)
- [next-intl: Routing configuration](https://next-intl.dev/docs/routing/configuration) — HIGH (official docs)
- [Medium (wtxhq): Next.js, i18n support, and RTL layouts](https://medium.com/wtxhq/next-js-i18n-support-and-rtl-layouts-87144ad727c9) — MEDIUM
- [TanStack Query: Polling guide](https://tanstack.com/query/latest/docs/framework/react/guides/polling) — HIGH (official docs)
- [TanStack Query: Important Defaults](https://tanstack.com/query/v4/docs/react/guides/important-defaults) — HIGH (official docs)
- [openapi-ts.dev: openapi-fetch](https://openapi-ts.dev/openapi-fetch/) — HIGH (official docs for the tool)
- [openapi-ts.dev: openapi-react-query](https://openapi-ts.dev/openapi-react-query/) — HIGH (official docs)
- [Render: Platforms with a real free tier for developers in 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026) — MEDIUM (vendor, but directly on-topic and current)
- [Render: Running Python, Go, Rust, and Ruby backends alongside a Next.js frontend](https://render.com/articles/running-python-go-rust-and-ruby-backends-alongside-a-next-js-frontend) — MEDIUM (vendor, matches this project's exact topology)
- [Medium (Saverio Mazza): How to Keep Your FastAPI Server Active on Render's Free Tier](https://medium.com/@saveriomazza/how-to-keep-your-fastapi-server-active-on-renders-free-tier-93767b70365c) — LOW/MEDIUM (community, cross-checked against multiple similar posts and Render's own docs on 15-min spin-down)
- [Vercel Knowledge Base: How can I enable CORS on Vercel?](https://vercel.com/kb/guide/how-to-enable-cors) — HIGH (official docs)
- [GitHub vercel/next.js Discussion #90367: Deploy Next.js + FastAPI on Vercel for free](https://github.com/vercel/next.js/discussions/90367) — MEDIUM (community, informs `NEXT_PUBLIC_API_URL` pattern; this project explicitly rules out hosting the backend on Vercel itself per PROJECT.md, since APScheduler needs a long-running process)
- Codebase ground truth (HIGH — read directly): `backend/app/api/routers/auth.py`, `backend/app/schemas/auth.py`, `backend/app/main.py` (CORS config), `backend/app/config.py`, `backend/app/api/routers/system.py` (`/health`), `backend/Makefile` (`make reset`), `.planning/codebase/ARCHITECTURE.md`, `RAFID_FRONTEND_HANDOFF.md`, `.planning/PROJECT.md`

---
*Architecture research for: Arabic-first RTL fintech Next.js frontend + free-tier deploy topology against a fixed FastAPI backend*
*Researched: 2026-07-15*
