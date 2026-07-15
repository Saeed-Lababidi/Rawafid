# Phase 1: Live Bilingual Foundation - Research

**Researched:** 2026-07-15
**Domain:** Next.js App Router i18n/RTL shell + free-tier deployment (Railway/Neon primary, Render/UptimeRobot fallback) of a FastAPI monorepo backend
**Confidence:** HIGH (framework/library versions and Docker/monorepo build mechanics verified against registries and official docs; free-tier terms MEDIUM — time-sensitive, re-verify at actual deploy time on 2026-07-15/16)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Repo layout & Vercel cutover**
- D-01: Next.js app lives in `frontend/` — sibling to `backend/` and `rafid-engine/`. Vercel project root-directory setting points at `frontend/`. Python dirs untouched.
- D-02: Cut over immediately: at Phase 1 deploy, the production Vercel URL serves the new shell. `index.html` and `Rafid App (standalone).html` stay in the repo as design/copy reference only — never served.
- D-03: Push-to-main auto-deploys to production for the whole sprint. Accept brief prod breakage risk pre-judging; freeze main before July 17.
- D-04: API base URL is env-driven only: `NEXT_PUBLIC_API_URL`. Local dev `.env.local` → `http://localhost:8000`; Vercel env → deployed backend URL. No hardcoded hosts anywhere.

**Phase-1 visible shell**
- D-05: The deployed URL shows a polished Arabic-first landing page inside real app chrome: header with Rafid logo, language toggle, theme toggle; footer. Hero uses the prototype's product one-liner tone and is fully token-styled — this is the surface judges/user evaluate Phase 1 on.
- D-06: A visible backend-health badge (small status indicator, e.g. footer "متصل / Live") calls the deployed backend's health/system endpoint — makes DEPLOY success criterion demonstrable on sight and proves CORS + env wiring.
- D-07: Demo-dataset disclaimer: persistent slim non-dismissible banner (footer-anchored, muted styling), rendered in both locales. Satisfies FOUND-07 permanently — later phases inherit it from the shared layout.
- D-08: Language toggle in header: pill "عربي / EN", switches the locale-prefixed route (`/ar/...` ↔ `/en/...`), choice persisted via cookie so return visits keep the locale. Arabic is the default locale.

**Dark palette & extended tokens**
- D-09: Tokens implemented as a semantic layer (background / surface / card-border / hairline / text / muted / brand / status) in Tailwind v4 `@theme` CSS custom properties. Components consume semantic tokens only — never raw hex. Handoff §1 values are the light-theme source of truth.
- D-10: Dark theme derived from the navy brand family: deep-navy page background, elevated navy card surfaces, cream-tinted text, terra/purple accents lightened as needed to hold WCAG AA contrast. No off-brand gray dark mode.
- D-11: Default theme is **light** (brand cream aesthetic, deterministic for the stage demo — no system-preference surprise on the judging machine). Toggle persisted via cookie and resolved server-side so first paint is correct (FOUND-02, no flash).
- D-12: Risk-band-D red derived from terra shifted toward red in oklch (per handoff §1 note), with matching chip triple (bg/text/border) mirroring existing chip anatomy. Alert-severity scale: low = purple/neutral chip, medium = existing terra warn chip, high = the new red. One consistent chip anatomy across all three.

**Arabic number/date conventions (central bidi utility)**
- D-13: Western (Latin) digits in **both** locales — Saudi banking/fintech convention, and keeps charts/gauges consistent. Implemented via `Intl` locale `ar-SA-u-nu-latn`.
- D-14: Currency: Arabic locale renders `ر.س` with the amount, English renders `SAR`. All financial figures use tabular-nums. No client-side fee/score math ever — utility formats server values only.
- D-15: Dates: Gregorian calendar **forced** — `ar-SA-u-ca-gregory-nu-latn` (critical gotcha: plain `ar-SA` defaults to the Islamic Umm al-Qura calendar; backend simulated dates are Gregorian ISO). Format style "15 يوليو 2026" / "Jul 15, 2026". Absolute simulated dates only — never relative, never browser-clock math (locked project rule).
- D-16: One module (e.g. `frontend/src/lib/format.ts`) is the **only** entry point for number/currency/date rendering; every formatted value is bidi-isolated (`<bdi>` / `dir` isolation) so mixed-direction Arabic text never glitches (FOUND-05).

### Claude's Discretion
- Prod freeze ritual: informally freeze main by end of July 16; hotfix via verified Vercel previews only.
- Remote demo-reset (DEPLOY-03): prefer host-console path (e.g. Railway shell / `railway run make reset`) to keep backend code untouched; if the console path proves impractical, a minimal token-guarded reset endpoint is acceptable — smallest possible backend delta per PROJECT.md "config/CORS/env only" constraint. Researcher verifies which is viable.
- Prod secrets: fresh `JWT_SECRET` / `FERNET_KEY` generated for deployment — dev defaults must never ship.
- Monitor interval: keep backend default (15s = 1 simulated day) in prod unless host free-tier constraints force a change.
- Landing copy specifics, exact dark hex values, badge polling cadence: Claude decides within the token/brand rules above.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | Arabic RTL default, English LTR toggle, locale-prefixed routes, full copy parity | next-intl `[locale]` App Router routing + RTL `dir` pattern (Architecture Patterns, Standard Stack) |
| FOUND-02 | Dark/light toggle, no flash, server-resolved, persisted | next-themes + cookie-read server component pattern (Architecture Patterns, Pitfall 1) |
| FOUND-03 | Handoff §1 tokens + risk-band-D + alert-severity scales, both themes | Tailwind v4 `@theme` semantic token layer (Standard Stack, Code Examples) |
| FOUND-04 | IBM Plex Sans Arabic, no FOUT/layout shift | `next/font/google` self-hosting, confirmed subset (Standard Stack, Pitfall 2) |
| FOUND-05 | Bidi-safe numbers/currency/dates via one central utility | `Intl.NumberFormat`/`DateTimeFormat` with `-u-nu-latn`/`-u-ca-gregory`, `<bdi>` isolation (Code Examples, D-13..D-16) |
| FOUND-06 | Correct layout 390px→desktop | Tailwind v4 mobile-first grid (`repeat(auto-fit,minmax(...))`) per handoff §1 (Architecture Patterns) |
| FOUND-07 | Demo-dataset disclaimer visible | Shared layout footer banner (D-07, Architecture Patterns) |
| DEPLOY-01 | Free-hosted backend+Postgres, no cold-start risk, expiry checked vs July 17 | Railway (no default sleep) + Neon (no project deletion on idle) primary; Render+UptimeRobot fallback (Environment Availability, Common Pitfalls) |
| DEPLOY-02 | Vercel deploy pointed at deployed backend, CORS allow-list, env-driven URL, types from deployed openapi.json | Vercel root-directory + env var scoping (Architecture Patterns, Code Examples) |
| DEPLOY-03 | Remote demo-data reset | Railway shell exec vs guarded reset endpoint (Open Questions, Claude's Discretion) |
</phase_requirements>

## Summary

Phase 1 has two distinct halves that must both land before Phase 2 starts: (1) a Next.js 16 App Router shell with locale-prefixed bilingual routing, flash-free theming, a Tailwind v4 semantic token system, and a bidi-safe formatting utility — all pure frontend, greenfield, low technical risk; and (2) getting the *existing, complete* FastAPI backend + Postgres actually running on a free host and reachable from the real Vercel URL — which is where the real risk lives. The backend's Dockerfile only works today for a build context rooted at `backend/`, but `rafid-engine` is consumed as a sibling-directory path dependency (`../rafid-engine`), so any cloud build must use a **repo-root build context** with an adjusted Dockerfile (or `COPY` layout) — both Railway and Render support this via a Dockerfile-path-vs-build-context split, confirmed against each host's own docs. Separately, the backend's `DATABASE_URL` is passed straight into `create_async_engine` with no SSL handling; Neon **requires** TLS and asyncpg does not accept the standard `sslmode=require` query-string param that Neon's connection string uses — this needs a small `connect_args={"ssl": "require"}` code change (categorize as required deploy-config code, not feature work) or the app will fail to connect to Neon entirely, silently disguised as a generic connection error.

On free-tier viability: Railway's default behavior does **not** sleep services on inactivity (sleep is an opt-in "Serverless" feature you must explicitly enable) — so Railway is genuinely lower cold-start risk than Render, which spins down after 15 minutes idle and takes ~1 minute to wake. Railway's $5 trial credit expires 30 days after signup and reverts to a $1/month free-credit tier after — for a 2-day window (today is July 15, judging July 17) this is a non-issue, but the team should provision **today** so the 30-day trial window fully covers judging with margin, and set a Railway budget alert since $5 covers roughly a few days of an always-on small container. Neon's free tier has no project-deletion-on-inactivity policy (only compute scale-to-zero after 5 min idle, which just adds a brief per-request wake-up, not data loss) and never expires — this directly resolves the "Neon expiry" blocker noted in STATE.md; the actual expiry risk was conflated with Render's *own* Postgres offering (which does expire in 30 days) — a distinct product from Neon.

**Primary recommendation:** Scaffold with `create-next-app@latest --typescript --tailwind --app`, layer `next-intl` (locale segment + middleware, cookie-persisted) and `next-themes` (cookie-read on the server for the `<html>` class, avoiding any flash) on top, define all tokens in `frontend/src/app/globals.css` under `@theme`, and build one `frontend/src/lib/format.ts` for every number/currency/date render. For deployment, provision Railway (repo-root build context, `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile`) + Neon (with the asyncpg SSL `connect_args` fix) today, wire `NEXT_PUBLIC_API_URL` + Vercel `Root Directory=frontend`, allow-list the Vercel origin in CORS, and stand up Render+UptimeRobot as a documented (not necessarily provisioned) fallback path only if Railway proves unworkable.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Locale routing (`/ar`, `/en`) | Frontend Server (SSR) | Browser / Client | next-intl middleware resolves locale server-side before render; client-side `Link`/`useRouter` wrappers switch locale without full reload |
| Theme resolution (dark/light) | Frontend Server (SSR) | Browser / Client | Cookie read in a Server Component sets `<html class>` before first paint (no flash); client `next-themes` hook only handles the toggle interaction afterward |
| Design tokens | CDN / Static (build-time CSS) | — | Tailwind v4 `@theme` compiles to static CSS custom properties shipped with the build; no runtime computation |
| Font loading | CDN / Static (build-time) | Frontend Server (SSR) | `next/font/google` self-hosts + subsets at build time, injected via `<link>`/inlined `@font-face` in the SSR'd `<head>` |
| Number/currency/date formatting | Browser / Client (render) | Frontend Server (SSR, for initial paint) | Formatting utility runs wherever the value is rendered (both RSC and Client Components use `Intl` — no server/client asymmetry since `Intl` is available in both) |
| Demo disclaimer banner | Frontend Server (SSR) | — | Static content in the shared root layout; no interactivity, no client JS needed |
| Backend health badge | Browser / Client (poll) | API / Backend (`/health`) | Client Component polls the deployed backend directly; API tier owns the actual health computation (DB `SELECT 1`) |
| CORS allow-list | API / Backend | — | `CORSMiddleware` in `backend/app/main.py` — only backend-tier change permitted by project scope for Phase 1 |
| DB connectivity (SSL) | API / Backend | Database / Storage | Backend's SQLAlchemy engine config must pass `ssl` connect arg; Neon enforces TLS at the database tier |
| Demo data reset | API / Backend (or host console) | — | Either a host-console-executed `make reset` (no code) or a minimal guarded reset endpoint (smallest backend delta) |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.10 `[VERIFIED: npm registry]` (name/existence from training knowledge — tag `[ASSUMED]` provenance per protocol, version confirmed live) | React framework, App Router, `next/font` | Official Vercel framework; App Router is the stable, recommended path since 13.4; v16 is current stable major |
| react / react-dom | 19.x (latest matches Next 16's peer range) `[VERIFIED: npm registry]` | UI runtime | Required peer of Next.js App Router / RSC |
| next-intl | 4.13.2 `[ASSUMED name/CITED docs]` — package-legitimacy flagged `SUS` ("too-new", false positive: 4M weekly downloads, official `amannn/next-intl` repo, weekly release cadence) | i18n routing, message catalogs, locale middleware | De facto standard App Router i18n library with first-class `[locale]` segment + middleware support; explicit RTL guidance in official docs |
| next-themes | 0.4.6 `[VERIFIED: npm registry]` | Dark/light theme state, no-flash blocking script | Only App Router-compatible theme library with a documented no-flash inline-script pattern; 24M weekly downloads |
| tailwindcss | 4.3.2 `[ASSUMED name/CITED docs]` — package-legitimacy flagged `SUS` ("too-new", false positive: 97M weekly downloads, official `tailwindlabs` repo) | Utility CSS + `@theme` design tokens | CSS-first token system (`@theme`) is exactly the semantic-token architecture D-09 requires, no JS config file needed |
| @tailwindcss/postcss | matches tailwindcss major (4.x) `[CITED: tailwindcss.com/docs/installation/using-postcss]` | PostCSS plugin required for Tailwind v4 (replaces old `tailwindcss` postcss plugin entry) | Official v4 install path |
| typescript | 7.0.2 `[ASSUMED name/CITED]` — package-legitimacy flagged `SUS` ("too-new", false positive: 214M weekly downloads, official Microsoft repo; TS 7 is the native/Go-based compiler line) | Type safety | Project-wide convention (backend already fully typed); Next.js App Router has first-class TS support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx or tailwind-merge | latest | Conditional/merged className composition | When components need conditional semantic-token classes (e.g., theme-variant chips) — avoid hand-rolled string concatenation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-intl | `next/dist` built-in i18n routing (Pages Router only) | Not available in App Router — next-intl is effectively the only mature option |
| next-themes | Hand-rolled cookie + inline script | next-themes already solves the documented no-flash pattern; hand-rolling duplicates a solved problem (see Don't Hand-Roll) |
| Tailwind v4 `@theme` | CSS Modules + hand-written custom properties | Loses utility-class ergonomics and Tailwind's automatic utility generation from token namespaces; more code for the same result |

**Installation:**
```bash
npx create-next-app@latest frontend --typescript --app --tailwind --eslint --src-dir --import-alias "@/*"
cd frontend
npm install next-intl next-themes
npm install -D @tailwindcss/postcss
```

**Version verification:** Verified live via `npm view <pkg> version` on 2026-07-15 (see Package Legitimacy Audit for per-package registry signals). Training-data package *names* (next-intl, tailwindcss, typescript) are tagged `[ASSUMED]` per provenance rule even though their registry existence and current version were independently confirmed — only names sourced from official docs/Context7 in this session qualify for full `[VERIFIED]` status.

## Package Legitimacy Audit

| Package | Registry | Age (latest publish) | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|----------------------|--------------|--------------|---------|-------------|
| next | npm | 2026-07-01 | 42.3M | github.com/vercel/next.js | SUS ("too-new") | Approved — false positive, official Vercel org, huge download base; keep |
| next-intl | npm | 2026-07-10 | 4.0M | github.com/amannn/next-intl | SUS ("too-new") | Approved — false positive, established maintainer, high downloads; planner adds `checkpoint:human-verify` before first install per protocol |
| next-themes | npm | 2025-03-11 | 24.1M | github.com/pacocoursey/next-themes | OK | Approved |
| tailwindcss | npm | 2026-06-29 | 97.8M | github.com/tailwindlabs/tailwindcss | SUS ("too-new") | Approved — false positive, official Tailwind Labs org, largest CSS framework on npm; keep |
| typescript | npm | 2026-07-08 | 214.4M | github.com/microsoft/TypeScript | SUS ("too-new") | Approved — false positive, official Microsoft org; keep |
| react | npm | 2026-06-01 | 144.9M | github.com/facebook/react | OK | Approved |
| react-dom | npm | 2026-06-01 | 112.9M | github.com/facebook/react | OK | Approved |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** next, next-intl, tailwindcss, typescript — all flagged solely on the seam's "too-new" recency heuristic (each has a very recent patch/minor publish date), contradicted by download counts in the tens-to-hundreds-of-millions/week and repos under the framework's official GitHub org. Recommend the planner insert a single lightweight `checkpoint:human-verify` before `npm install` in the scaffold task (e.g., "confirm `package.json` after `create-next-app` lists these exact package names before proceeding") rather than blocking per-package, since this is a well-known false-positive pattern for fast-releasing, extremely popular packages.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (judge / merchant)                                     │
│  - requests https://rafid.vercel.app/                            │
│  - cookie: NEXT_LOCALE, theme                                    │
└───────────────┬───────────────────────────────────────────────┘
                │ GET /
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Vercel Edge / Next.js Middleware (frontend/src/middleware.ts)  │
│  1. next-intl middleware reads cookie/Accept-Language           │
│  2. no locale prefix in URL → redirect to /ar/... or /en/...    │
│  3. cookie already set → serve prefixed route directly          │
└───────────────┬───────────────────────────────────────────────┘
                │ resolved to /ar (or /en)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  RootLayout (Server Component) — frontend/src/app/[locale]/layout.tsx │
│  1. read `theme` cookie server-side → set <html class="dark|light"> │
│  2. read `locale` param → set <html lang dir="rtl|ltr">          │
│  3. load IBM Plex Sans Arabic via next/font/google (build-time)  │
│  4. render <Header> (logo, LangToggle, ThemeToggle),             │
│     {children}, <Footer> (disclaimer banner, health badge)       │
└───────────────┬───────────────────────────────────────────────┘
                │ first paint — zero flash, correct dir/theme
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Landing page (Server Component) — hero, token-styled sections   │
│  - all copy strings resolved via next-intl message catalogs      │
│  - all numbers/dates (if any placeholder stats) via lib/format.ts│
└───────────────┬───────────────────────────────────────────────┘
                │ client-side polling (health badge only)
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  HealthBadge (Client Component)                                  │
│  fetch(`${NEXT_PUBLIC_API_URL}/health`) every N seconds          │
└───────────────┬───────────────────────────────────────────────┘
                │ HTTPS, CORS: Access-Control-Allow-Origin: <vercel-url>
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Deployed Backend (Railway container, repo-root build context)  │
│  FastAPI /health → SELECT 1 → { status, app, env, provider, ... }│
│  CORSMiddleware allow_origins=[VERCEL_ORIGIN] (was "*")          │
└───────────────┬───────────────────────────────────────────────┘
                │ asyncpg + connect_args={"ssl": "require"}
                ▼
┌─────────────────────────────────────────────────────────────────┐
│  Neon Postgres (managed, TLS-enforced, scale-to-zero at 5 min)  │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
frontend/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx        # theme cookie read, dir/lang, fonts, header/footer
│   │   │   ├── page.tsx          # landing page
│   │   │   └── globals.css       # imported once from root layout — @theme tokens live here
│   │   └── layout.tsx            # minimal root passthrough (next-intl requires locale segment layout to own <html>)
│   ├── components/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── lang-toggle.tsx       # Client Component
│   │   ├── theme-toggle.tsx      # Client Component
│   │   └── health-badge.tsx      # Client Component, polls NEXT_PUBLIC_API_URL
│   ├── lib/
│   │   └── format.ts             # THE central number/currency/date utility (D-16)
│   ├── i18n/
│   │   ├── routing.ts            # next-intl defineRouting (locales, defaultLocale='ar')
│   │   └── request.ts            # next-intl getRequestConfig
│   ├── messages/
│   │   ├── ar.json
│   │   └── en.json
│   └── middleware.ts             # next-intl middleware entry
├── next.config.ts                # next-intl plugin wrapper
├── postcss.config.mjs            # @tailwindcss/postcss
├── .env.local                    # NEXT_PUBLIC_API_URL=http://localhost:8000 (dev only, gitignored)
└── package.json
```

### Pattern 1: Locale-prefixed routing with cookie persistence (FOUND-01, D-08)
**What:** A `[locale]` dynamic segment plus `middleware.ts` running next-intl's routing middleware, configured with `defaultLocale: 'ar'` and a locale list `['ar', 'en']`.
**When to use:** Always — this is the routing foundation every later screen sits under.
**Example:**
```typescript
// Source: next-intl.dev/docs/routing/setup (2026-07-15)
// frontend/src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always', // /ar/... and /en/... — never bare "/"
});
```
```typescript
// frontend/src/middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```
The middleware sets a cookie recording the resolved locale on every request; a returning visitor's cookie takes priority over `Accept-Language` on the next visit — satisfies "persisted across refresh" implicitly for locale (mirrors D-08's explicit ask).

### Pattern 2: Flash-free theme resolved server-side (FOUND-02, D-11)
**What:** next-themes' `ThemeProvider` wraps the app and injects a blocking inline script that sets the `<html>` class before paint; `attribute="class"`, `defaultTheme="light"` (per D-11 — no `enableSystem`, since the demo must be deterministic).
**When to use:** Root layout only, once.
**Example:**
```tsx
// Source: github.com/pacocoursey/next-themes README (2026-07-15)
// frontend/src/app/[locale]/layout.tsx
import { ThemeProvider } from 'next-themes';

export default function LocaleLayout({ children, params }: Props) {
  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```
`suppressHydrationWarning` on `<html>` is required — next-themes documents that without it React will warn because the injected script mutates the element before hydration (this is expected, not an error).

### Pattern 3: Semantic design tokens via Tailwind v4 `@theme` (FOUND-03, D-09, D-10, D-12)
**What:** All handoff §1 colors plus the new risk-band-D and alert-severity chip triples declared as CSS custom properties inside `@theme`, namespaced so Tailwind auto-generates utilities (`bg-brand-navy`, `text-risk-d`, etc.). Dark-mode overrides live in a `.dark { @theme { ... } }`-style block or a parallel `:root.dark` custom-property override (Tailwind v4 supports both `@theme` for the utility-generating source-of-truth and a plain `:root`/`.dark` override block for values that only change at runtime, not at build time).
**When to use:** Once, at scaffold time — never retrofitted (locked project decision).
**Example:**
```css
/* Source: tailwindcss.com/docs/theme (2026-07-15) */
/* frontend/src/app/[locale]/globals.css */
@import 'tailwindcss';

@theme {
  --color-brand-navy: #032341;
  --color-brand-terra: #C36B4E;
  --color-brand-purple: #8980BC;
  --color-brand-cream: #F6E7DC;
  --color-page-bg: #F7F2EC;
  --color-card: #FFFFFF;
  --color-card-border: #EDE3D6;
  --color-risk-a: #3E7C4F;
  --color-risk-d: oklch(from var(--color-brand-terra) l c h); /* shift toward red — tune at implementation */
  --font-sans-ar: 'IBM Plex Sans Arabic', ui-sans-serif, system-ui;
  --radius-card: 18px;
  --radius-tile: 12px;
  --radius-pill: 999px;
}

:root.dark {
  --color-page-bg: #0A2038; /* deep navy — exact hex is Claude's discretion per D-10 */
  --color-card: #0F2B47;
  /* ... */
}
```

### Pattern 4: Central bidi-safe formatting utility (FOUND-05, D-13–D-16)
**What:** One module exporting `formatNumber`, `formatCurrency`, `formatDate`, each taking `(value, locale)` and returning a string wrapped for bidi isolation by the caller via `<Bdi>`.
**When to use:** Every place a server-derived number, currency amount, or date is rendered — no exceptions, no inline `toLocaleString()` calls elsewhere in the codebase (see Don't Hand-Roll).
**Example:**
```typescript
// Source: developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl (2026-07-15)
// frontend/src/lib/format.ts
type Locale = 'ar' | 'en';

const intlLocale = (locale: Locale) =>
  locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

export function formatCurrency(value: number, locale: Locale): string {
  const formatted = new Intl.NumberFormat(intlLocale(locale), {
    style: 'decimal',
    minimumFractionDigits: 2,
  }).format(value);
  return locale === 'ar' ? `${formatted} ر.س` : `SAR ${formatted}`;
}

export function formatDate(isoDate: string, locale: Locale): string {
  const dateLocale = locale === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US';
  return new Intl.DateTimeFormat(dateLocale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoDate));
}
```
```tsx
// Usage — every render site wraps in <bdi> for isolation
<bdi className="tabular-nums">{formatCurrency(offer.total_repayable, locale)}</bdi>
```
`ar-SA` alone defaults to the Islamic Umm al-Qura calendar for `Intl.DateTimeFormat` — the explicit `-u-ca-gregory` extension is mandatory since backend simulated dates are Gregorian ISO strings (confirmed via MDN `Intl` locale extension docs).

### Pattern 5: Repo-root Docker build context for the monorepo path dependency (DEPLOY-01/02)
**What:** Because `backend/pyproject.toml` declares `rafid-engine = { path = "../rafid-engine" }`, any container build must see both `backend/` and `rafid-engine/` in its build context — the *existing* `backend/Dockerfile` (context = `backend/`) cannot resolve this today.
**When to use:** Cloud deploy only — local `docker-compose` "full" profile has the same latent gap but hasn't been exercised (no CI ran it).
**Example:**
```dockerfile
# Source: derived from docs.railway.com/builds/dockerfiles + render.com/docs/monorepo-support (2026-07-15)
# repo-root Dockerfile (e.g. deploy/backend.Dockerfile, or move backend/Dockerfile to repo root)
FROM python:3.12-slim
WORKDIR /srv

COPY rafid-engine ./rafid-engine
COPY backend/pyproject.toml backend/uv.lock ./backend/
WORKDIR /srv/backend
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev

COPY backend ./
EXPOSE 8000
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
- **Railway:** keep service Root Directory unset (repo root), set service variable `RAILWAY_DOCKERFILE_PATH=backend.Dockerfile` (or wherever the new file lives) — Railway then builds with repo root as context per its own monorepo docs.
- **Render (fallback):** in the Docker-based Web Service settings, set "Root Directory" appropriately and use the separate **Dockerfile path** vs **Docker build context directory** fields (confirmed present in Render's monorepo docs) — set build context to repo root, Dockerfile path to the backend Dockerfile's location.

### Anti-Patterns to Avoid
- **Hardcoding the backend URL anywhere in frontend code:** breaks D-04 and makes local/prod parity impossible — always `process.env.NEXT_PUBLIC_API_URL`.
- **Using `ar-SA` without the `-u-ca-gregory` extension for dates:** silently renders Hijri dates against a Gregorian backend, producing dates that don't match reality — must always force Gregorian.
- **Reading `sessionStorage`/`localStorage` for theme before paint:** causes flash — theme must be cookie-based and read server-side in the layout, not client `useEffect`.
- **Setting `enableSystem` on next-themes for this project:** would let the OS theme override the deterministic light default on the judge's machine — explicitly locked out by D-11.
- **Trying to keep the existing `backend/Dockerfile` (context=`backend/`) for cloud deploy without modification:** will fail to resolve the `rafid-engine` path dependency the moment the build tries to `uv sync`/`uv pip install` — this is not a hypothetical, it's a structural gap in the current file.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale-aware routing + redirect + cookie negotiation | Custom middleware parsing `Accept-Language` and path segments | next-intl `createMiddleware` + `defineRouting` | Locale negotiation priority (path > cookie > header), redirect loops, and static-rendering interaction are all subtle and already solved |
| No-flash theme switching | Custom inline `<script>` in `_document`/layout reading `localStorage` | next-themes | The blocking-script-before-hydration pattern with `suppressHydrationWarning` is exactly what next-themes ships, tested across browsers/incognito |
| Arabic digit/calendar formatting | Manual digit-substitution regex or a date library with hardcoded Hijri/Gregorian logic | Native `Intl.NumberFormat`/`Intl.DateTimeFormat` with Unicode locale extension keys (`-u-nu-latn`, `-u-ca-gregory`) | Browser/Node-native, zero dependencies, exactly matches the ICU locale data every other web platform relies on |
| Design token theming | Hand-written CSS custom property sheet + manual utility classes | Tailwind v4 `@theme` | Automatic utility generation from token namespaces (`--color-*` → `bg-*`/`text-*`/`border-*`) removes an entire class of "forgot to add the utility" bugs |

**Key insight:** Every "don't hand-roll" item in this phase is a well-trodden, purpose-built library or a native platform API (`Intl`) — the actual novel engineering risk in Phase 1 isn't the frontend patterns, it's the **deploy plumbing** (monorepo Docker build context, asyncpg+Neon SSL), which has no library to hide behind and must be gotten right by hand.

## Common Pitfalls

### Pitfall 1: Theme flash despite next-themes ("dev mode still flashes")
**What goes wrong:** Developers test only in `next dev` and conclude next-themes doesn't work, or ship with `enableSystem` on and see the judge's machine theme override the deterministic light default.
**Why it happens:** `next dev` doesn't minify/inline the blocking script identically to a production build in all cases; the no-flash guarantee is explicitly a production-build behavior per next-themes' own docs.
**How to avoid:** Verify no-flash on the actual Vercel preview/production deployment, not `localhost:3000` dev server. Keep `enableSystem={false}` and `defaultTheme="light"` per D-11.
**Warning signs:** Brief dark-then-light (or vice versa) flicker visible on hard refresh in production.

### Pitfall 2: IBM Plex Sans Arabic FOUT from missing subset declaration
**What goes wrong:** `next/font/google` throws a build error ("Missing specified subset") or silently falls back to a system font if the `subsets` array doesn't include `'arabic'`.
**Why it happens:** Google Fonts serves subset-specific files; IBM Plex Sans Arabic's available subsets are `arabic`, `cyrillic-ext`, `latin`, `latin-ext` — omitting `arabic` from the `subsets` array breaks the Arabic glyphs specifically, which is the one thing this phase cannot get wrong.
**How to avoid:** `IBM_Plex_Sans_Arabic({ subsets: ['arabic', 'latin'], weight: ['400','500','600','700'], display: 'swap' })`, preload only the weights actually used above the fold.
**Warning signs:** Arabic text rendering in a fallback serif/sans instead of Plex; Next.js build-time warning about missing subsets.

### Pitfall 3: asyncpg + Neon SSL query-param mismatch (backend won't connect at all)
**What goes wrong:** Neon's provided connection string uses `?sslmode=require&channel_binding=require` query params (the libpq/psycopg convention); asyncpg's driver does not translate `sslmode` from a SQLAlchemy URL query string and raises `TypeError: connect() got an unexpected keyword argument 'sslmode'` — confirmed as an open, well-documented SQLAlchemy/asyncpg interaction gap.
**Why it happens:** SQLAlchemy passes URL query params straight through to the DBAPI's `connect()` as kwargs; asyncpg's own `connect()` signature uses `ssl`, not `sslmode`.
**How to avoid:** Strip SSL-related query params from the Neon-provided `DATABASE_URL` before use, and add `connect_args={"ssl": "require"}` to `create_async_engine(...)` in `backend/app/db.py`'s `_engine_kwargs` for any non-sqlite Postgres URL. This is a small, necessary code change — categorize it as required deploy-config plumbing (not "feature work"), since without it DEPLOY-01 is unachievable against Neon.
**Warning signs:** Backend container crash-loops on startup, or `/health` 500s with a connection error mentioning `sslmode` or SSL handshake failure.

### Pitfall 4: Existing `backend/Dockerfile` silently can't resolve `rafid-engine` in any cloud build
**What goes wrong:** Deploying with the unmodified `backend/Dockerfile` and a `backend/`-scoped build context (the natural default for "point the host at the backend folder") fails during `uv sync`/`uv pip install` because `../rafid-engine` doesn't exist inside that build context.
**Why it happens:** The Dockerfile was authored assuming a local dev environment where the path dependency resolves against the real sibling directory on disk; it was never exercised inside an isolated Docker build context before this phase.
**How to avoid:** Use Pattern 5 (repo-root build context) on whichever host is chosen — this is a hard requirement, not an optimization.
**Warning signs:** Build log shows `uv` failing to resolve or find `rafid-engine`, or a `FileNotFoundError`/`does not exist` referencing `../rafid-engine`.

### Pitfall 5: Confusing Render's own free Postgres with Neon
**What goes wrong:** Assuming "Render free tier" covers the database too, and discovering the Postgres instance was deleted mid-sprint.
**Why it happens:** Render offers its *own* free Postgres product, separate from using Render only as a compute host pointed at an external Neon database — Render's own free Postgres **expires 30 days after creation** with only a 14-day grace period, unlike Neon which has no deletion-on-inactivity policy.
**How to avoid:** Always use Neon for Postgres regardless of which compute host (Railway or Render) runs the API — this matches the locked decision (Neon primary) and must carry over to the Render fallback path too, not just Railway.
**Warning signs:** None until day 30 — this is a silent time bomb; explicitly confirm `DATABASE_URL` points at a `neon.tech` host in both the Railway and Render fallback configs.

## Code Examples

### Vercel env var scoping (DEPLOY-02, D-04)
```bash
# Source: vercel.com/docs/environment-variables (2026-07-15)
# Set once per environment in Vercel dashboard, or via CLI:
vercel env add NEXT_PUBLIC_API_URL production   # → https://<railway-app>.up.railway.app
vercel env add NEXT_PUBLIC_API_URL preview       # → same, or a staging backend if one exists
```
```bash
# frontend/.env.local (gitignored, dev only)
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### CORS allow-list change (the one sanctioned backend edit)
```python
# Source: backend/app/main.py (existing file) — change allow_origins only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://<your-vercel-project>.vercel.app"],  # was ["*"]
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Note: if Vercel preview deployments (unique URL per PR/push) also need to reach the backend during the sprint (D-03 implies frequent pushes to main triggering prod deploys — previews are a separate concern), either allow-list the stable production domain only (simplest, matches "Vercel origin" wording in D-06/DEPLOY-02) or add a regex/wildcard match for `*.vercel.app` previews if the team tests via preview URLs before merging to main.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Tailwind `tailwind.config.js` with `theme.extend` | Tailwind v4 CSS-first `@theme` in a CSS file, no JS config needed | Tailwind v4.0 (early 2025) | Design tokens are now literally CSS custom properties, directly matching D-09's "semantic layer" requirement with less indirection |
| `next-i18next` (Pages Router) | `next-intl` (App Router native, `[locale]` segment + middleware) | next-intl's App Router support matured through 2023-2024, now the dominant App Router i18n library | Locale-prefixed routing (FOUND-01) is a first-class supported pattern, not a workaround |
| TypeScript 5.x tsc | TypeScript 7 native/Go-based compiler line | TS 7 rollout through 2026 | Faster type-checking in CI; no syntax/API changes relevant to this phase |

**Deprecated/outdated:**
- Manually toggling a `dark` class via `useEffect` + `localStorage` for theming: superseded by next-themes' blocking-script pattern years ago; still commonly copy-pasted from outdated tutorials — avoid.
- `sslmode=require` as a bare query-string param for any asyncpg-based SQLAlchemy connection: never worked reliably; the `connect_args={"ssl": ...}` pattern is the only correct approach and has been the documented workaround for years.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Package names `next-intl`, `tailwindcss`, `typescript` (existence/purpose known from training, cross-checked via `npm view` + package-legitimacy seam, not sourced from an official-docs fetch in this session) | Standard Stack | Low — these are among the most widely-used packages in the JS ecosystem; risk is near-zero but tagged per strict provenance rule |
| A2 | Exact oklch shift value for risk-band-D red left as a placeholder (`oklch(from var(--color-brand-terra) l c h)`) rather than a computed final value | Architecture Patterns (Pattern 3) | Low — explicitly Claude's discretion per D-12; planner/implementer must pick concrete l/c/h numbers and verify WCAG AA contrast at implementation time |
| A3 | Recommendation to allow-list only the stable production Vercel domain in CORS (not preview-deployment wildcards) | Code Examples | Low-medium — if the team relies on testing against Vercel preview URLs before merging to main, previews will get CORS errors hitting the backend; mitigated by documenting the wildcard alternative inline |
| A4 | Railway's $5 trial credit is sufficient to run a small always-on FastAPI + doesn't cover Postgres cost separately (Neon hosts Postgres, not Railway) — exact daily burn rate for a 1GB RAM container not confirmed numerically | Summary / Environment Availability | Medium — if Railway's actual usage-based billing for this specific container size burns faster than expected, the team could hit the $5 cap before July 17; mitigate by checking the Railway usage dashboard the day after provisioning |

**If this table is empty:** N/A — see rows above.

## Open Questions

1. **Does Vercel's existing project need "Include files outside the Root Directory" enabled?**
   - What we know: Frontend (`frontend/`) has no shared workspace dependency on `backend/` or `rafid-engine/` — it's a fully standalone Next.js app.
   - What's unclear: Whether any planned Phase-2 OpenAPI-codegen step needs to read files outside `frontend/` (e.g., fetching `openapi.json` is a network call to the *deployed* backend, not a local file read, so likely no).
   - Recommendation: Leave "Include files outside Root Directory" **off** for Phase 1; revisit only if a later phase needs local cross-directory file access during the Vercel build.

2. **Railway vs Render final choice — provision both or just Railway first?**
   - What we know: Railway's no-default-sleep behavior is objectively lower cold-start risk than Render's 15-minute spin-down; CONTEXT.md already locks Railway as primary.
   - What's unclear: Whether Railway's free/trial resource ceiling (1GB RAM, shared vCPU) is sufficient for FastAPI + APScheduler + a modest Postgres-adjacent workload under demo load (a handful of judges hitting the API simultaneously) — no load-testing data available.
   - Recommendation: Provision Railway first (today, 2026-07-15) to maximize the 30-day trial window's overlap with judging; keep the Render+UptimeRobot Dockerfile/config path documented (Pattern 5 covers both) but don't necessarily provision it unless Railway shows resource strain during rehearsal.

3. **Remote demo-reset (DEPLOY-03): host console vs guarded endpoint — which is actually available on Railway's free/trial tier?**
   - What we know: Railway offers a web-based shell / `railway run <command>` CLI path in general; whether `railway run make reset` is invocable against a *deployed* (not local) service on the trial plan specifically wasn't directly confirmed via docs fetch in this session.
   - What's unclear: Some hosts restrict shell/exec access to paid tiers only — this needs a direct check against Railway's current dashboard during the deploy plan (01-02), not assumed from general product documentation.
   - Recommendation: Plan 01-02 should verify Railway's exec/shell availability on the actual provisioned trial project as an early step; if unavailable, fall back to the minimal token-guarded reset endpoint (smallest possible backend delta, per CONTEXT.md's explicit fallback guidance) — e.g. `POST /admin/reset?token=<env-secret>` calling the existing `app.seed.run --reset` logic in-process.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js/npm (local dev machine) | Frontend scaffold, `npm view` checks | ✓ | npm confirmed reachable this session | — |
| Docker (local) | Testing the repo-root build context before pushing to a host | Not verified this session (Windows dev machine) | — | Rely on host-side build logs (Railway/Render) if local Docker unavailable; the repo-root Dockerfile pattern (Pattern 5) can be validated directly against the cloud host's build log instead of a local `docker build` |
| Railway account + CLI | DEPLOY-01 (primary host) | Not verified this session — requires user action | — | Render + UptimeRobot documented as fallback (Pattern 5 covers both) |
| Neon account | DEPLOY-01 (Postgres) | Not verified this session — requires user action | — | None — Neon is locked as the Postgres provider regardless of compute host, per CONTEXT.md and Pitfall 5 |
| Vercel project (existing) | DEPLOY-02 | Assumed existing per D-01/D-02 ("existing Vercel project") | — | — |
| UptimeRobot account | DEPLOY-01 fallback keep-alive (Render path only) | Not verified this session | — | Free tier confirmed sufficient (50 monitors, 5-min interval) if needed |

**Missing dependencies with no fallback:**
- None — every dependency above has either a confirmed-available path or an explicit fallback.

**Missing dependencies with fallback:**
- Railway account/CLI access — if provisioning fails or resource limits bite, Render + UptimeRobot is the documented fallback (same Docker pattern applies, per Pattern 5).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Phase 1 has no auth surface (explicitly out of scope — Phase 2) |
| V3 Session Management | Partial | Locale/theme cookies are preference-only, not session/auth cookies — no `HttpOnly`/`Secure` requirement beyond standard Next.js cookie defaults, but should still set `SameSite=Lax` (default) since no cross-site posting is needed |
| V4 Access Control | No | No protected routes in Phase 1 |
| V5 Input Validation | Minimal | No user-supplied input processed server-side in this phase beyond locale/theme toggle values, which should be validated against the fixed `['ar','en']`/`['light','dark']` enum (next-intl/next-themes do this internally) |
| V6 Cryptography | No | No secrets handled client-side; backend `JWT_SECRET`/`FERNET_KEY` rotation for prod is a backend/deploy concern (Claude's Discretion item), not a frontend cryptography concern |
| V7 Error Handling / Logging | Partial | CORS misconfiguration (leaving `allow_origins=["*"]` in production) is the primary Phase-1-relevant risk — must be narrowed to the Vercel origin before judging |
| V9 Communications | Yes | Neon enforces TLS by default (see Pitfall 3) — do not disable/downgrade `ssl` in `connect_args`; Vercel↔Railway/Render traffic is HTTPS by default on both platforms |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Open CORS (`allow_origins=["*"]`) left in production, allowing any origin to call the live backend | Spoofing / Information Disclosure | Allow-list only the production Vercel origin (Code Examples); this is the one sanctioned backend change for Phase 1 |
| Guarded demo-reset endpoint (if the code-path fallback is used for DEPLOY-03) exposed without auth | Elevation of Privilege / Tampering | If built, gate behind a static bearer token read from an env var (not committed), never expose in frontend code, never log the token |
| Dev-default `JWT_SECRET`/`FERNET_KEY` shipped to production | Spoofing / Information Disclosure | Generate fresh secrets for the Railway/Render environment (Claude's Discretion item, already flagged in CONTEXT.md) — never reuse the hardcoded dev fallbacks from `backend/app/config.py` |

## Sources

### Primary (HIGH confidence)
- `npm view <pkg> version` (direct registry query) — next 16.2.10, next-intl 4.13.2, next-themes 0.4.6, tailwindcss 4.3.2, typescript 7.0.2 (2026-07-15)
- `gsd-tools query package-legitimacy check` seam — per-package registry signals (downloads, repo, publish date) for next, next-intl, next-themes, tailwindcss, typescript, react, react-dom (2026-07-15)
- [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme) — `@theme` directive semantics, namespace-to-utility mapping
- [tailwindcss.com/docs/installation/using-postcss](https://tailwindcss.com/docs/installation/using-postcss) — v4 PostCSS install path
- [next-intl.dev/docs/routing/setup](https://next-intl.dev/docs/routing/setup), [next-intl.dev/docs/routing/middleware](https://next-intl.dev/docs/routing/middleware) — locale routing, middleware, cookie priority
- [github.com/pacocoursey/next-themes](https://github.com/pacocoursey/next-themes) — no-flash blocking script pattern, `suppressHydrationWarning` requirement
- [fonts.google.com/specimen/IBM+Plex+Sans+Arabic](https://fonts.google.com/specimen/IBM+Plex+Sans+Arabic) — font name/availability confirmation
- [developer.mozilla.org/.../Intl/NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) — `-u-nu-latn` numbering-system extension semantics
- [docs.railway.com/pricing/free-trial](https://docs.railway.com/pricing/free-trial) — trial credit ($5/30 days), resource limits (fetched directly)
- [docs.railway.com/reference/app-sleeping](https://docs.railway.com/reference/app-sleeping) — sleep is opt-in, not default
- [docs.railway.com/builds/dockerfiles](https://docs.railway.com/builds/dockerfiles), [docs.railway.com/deployments/monorepo](https://docs.railway.com/deployments/monorepo) — `RAILWAY_DOCKERFILE_PATH`, repo-root context for shared monorepos
- [render.com/docs/free](https://render.com/docs/free) — 15-min spin-down, ~1-min cold start, 750 free hours/month, free Postgres 30-day expiry (fetched directly)
- [render.com/docs/monorepo-support](https://render.com/docs/monorepo-support) — separate Dockerfile-path vs build-context-directory settings (fetched directly)
- [neon.com/faqs/free-plan-limits-and-quotas](https://neon.com/faqs/free-plan-limits-and-quotas), [neon.com/docs/introduction/plans](https://neon.com/docs/introduction/plans) — 100 CU-hrs/mo, 0.5GB storage, no-expiry free tier, suspension≠deletion
- [neon.com/docs/guides/sqlalchemy](https://neon.com/docs/guides/sqlalchemy), [github.com/MagicStack/asyncpg/issues/737](https://github.com/MagicStack/asyncpg/issues/737), [github.com/sqlalchemy/sqlalchemy/issues/6275](https://github.com/sqlalchemy/sqlalchemy/issues/6275) — asyncpg `sslmode` vs `ssl` connect_args gotcha
- [vercel.com/docs/environment-variables](https://vercel.com/docs/environment-variables), [vercel.com/docs/monorepos](https://vercel.com/docs/monorepos) — env var per-environment scoping, Root Directory setting

### Secondary (MEDIUM confidence)
- WebSearch results cross-referencing Railway/Render/Neon pricing pages via third-party summary sites (Kuberns, saaspricepulse, etc.) — used only to corroborate, not as primary source; primary source is the official docs fetched directly above
- Next.js 16 current-stable-version claim — corroborated across nextjs.org/blog references and third-party version-tracking sites (abhs.in), consistent with `npm view next version` returning 16.2.10 directly

### Tertiary (LOW confidence)
- Exact IBM Plex Sans Arabic available weights (Thin/ExtraLight/Light/Regular/Medium/SemiBold/Bold per Google Fonts) — from WebSearch summary only, not independently fetched from the Google Fonts API; verify weight availability directly in `next/font/google`'s autocomplete/type error at implementation time if a specific weight fails to load
- Railway trial-credit daily burn rate for this specific container size — no numeric confirmation found; flagged as Assumption A4

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified live via `npm view`; package names are well-established, training-knowledge-sourced but registry-cross-checked
- Architecture: HIGH — Docker monorepo build-context pattern independently confirmed against both Railway and Render's own docs; next-intl/next-themes/Tailwind v4 patterns confirmed against official docs
- Pitfalls: HIGH — asyncpg/Neon SSL gotcha and Dockerfile build-context gap are both concrete, reproducible technical facts (not opinions), confirmed via GitHub issues and official host docs
- Free-tier terms (Railway/Render/Neon): MEDIUM — official docs fetched directly, but pricing/limits pages are explicitly time-sensitive; STATE.md already flags re-verification at actual deploy time as a blocker — this research should not be treated as the final word on July 16-17

**Research date:** 2026-07-15
**Valid until:** Free-tier/pricing findings: 7 days (re-verify immediately before provisioning, ideally same day as this research since judging is 2026-07-17). Framework/library version findings: 30 days (stable ecosystem, low churn risk within the sprint window).
