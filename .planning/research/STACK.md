# Stack Research

**Domain:** Arabic-first RTL open-banking SME financing (fintech) dashboard — Next.js frontend + free-tier full-stack deployment
**Researched:** 2026-07-15
**Confidence:** MEDIUM (all findings from cross-checked web sources, no official-doc/Context7 verification pass was available in this environment — see Sources)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.x (App Router, Turbopack default) | Frontend framework | Locked user decision. Next 16 stabilized App Router, ships Turbopack-by-default builds/dev, React Compiler support — fastest iteration for a 2-day build. Deploys natively to the existing Vercel project (zero-config). |
| TypeScript | 5.x (strict) | Type safety across API client, state, components | Locked user decision. Non-negotiable for a typed OpenAPI client — catches enum/shape drift (e.g. `risk_band`, platform enum) against the live backend contract before runtime. |
| Tailwind CSS | v4 (CSS-first, `@theme`) | Styling / design tokens | Locked user decision. v4's `@theme` directive is the correct home for the handoff's design tokens (`--navy`, `--terra`, `--purple`, `--cream`, risk-band colors) — no `tailwind.config.js` needed, tokens become real CSS custom properties usable outside Tailwind too (e.g. in chart color props). Native `dir`-aware logical utilities pair well with RTL. |
| next-intl | 4.x | i18n (Arabic primary/RTL + English) | Purpose-built for App Router (unlike next-i18next, which is Pages Router-era and needs workarounds in App Router). Native `[locale]` segment routing, `getTranslations()` in Server Components (zero client JS cost for static copy), and is the documented path for setting `dir="rtl"`/`dir="ltr"` per-locale on `<html>`. This is the single highest-leverage pick for RTL/Arabic quality — do not substitute. |
| next-themes | 0.4.x | Dark/light mode | De facto standard for Next.js theming, ~1kb, zero-flicker via a blocking inline script (reads `localStorage` before paint), class-based toggle maps directly onto Tailwind v4 `@custom-variant dark`. Composes cleanly with next-intl's locale provider (independent axes: locale × theme). |
| @tanstack/react-query (TanStack Query) | v5.x | Server-state, polling, cache | This is the backend's whole "live data" story: `refetchInterval` (ms or a function of the Query) is the documented, supported way to poll a screen every 5–15s while visible — exactly what the monitoring-agent/contract/alerts screens need, no WebSockets exist server-side. Also gives free retry/loading/error state machinery for every API call. |
| openapi-typescript + openapi-fetch | openapi-typescript 7.x / openapi-fetch 0.13.x | Typed API client generated from the live OpenAPI spec | Zero-runtime, types-only codegen (`npx openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts`) — matches the handoff's explicit codegen command and "no hand-retyped shapes" requirement. `openapi-fetch` gives a thin, fully-typed fetch wrapper (method/path/body all inferred from the schema) that's easy to wrap once with the refresh-on-401 interceptor logic. Simpler and lighter than generating a full hook library you don't need (see Alternatives). |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| recharts | 3.x | Revenue line chart, negative-bar feature-contributions chart, risk donut | Highest-adoption React chart lib, simplest declarative component API, directly supports negative-value `<Bar>` (renders below zero baseline automatically) and `<Pie>`/donut via `innerRadius`. Sufficient performance at dashboard-scale (tens of points, polled every 5–15s, not high-frequency streaming). |
| Custom SVG (no gauge library) | — | Score gauge (0–1000 ring) | No mainstream React gauge lib matches the handoff's exact "ring sweep + count-up" spec cleanly; a hand-built SVG `<circle>` with `stroke-dasharray`/`stroke-dashoffset` driven by a GSAP tween gives full control over the 0–1000 scale, risk-band color, and the count-up number simultaneously. Treat as a ~50-line custom component, not a dependency decision. |
| motion (Framer Motion) | 12.x (`motion` package) | Card stagger-in, alert entrances, connect-toggle springs, page/route transitions | 2026 consensus pick for React-native declarative UI motion (enter/exit, layout, spring physics) — smaller mental-model gap than GSAP for ordinary component animation, respects `prefers-reduced-motion` easily via `useReducedMotion()`. |
| gsap (+ ScrollTrigger, optional) | 3.13.x | Score-gauge ring sweep, outstanding-balance number tween on poll, timeline-heavy sequences | GSAP remains the tool for numeric tweening (`gsap.to(obj, {value: newScore, onUpdate: ...})`) and complex staggered/scroll-triggered sequences the handoff explicitly asks for (§8: "ease cubic-bezier(0.22,1,0.36,1) ~1.4s", ScrollTrigger stagger). Free including plugins since GSAP 3.13. Use alongside Motion, not instead of it — different jobs (declarative component motion vs. imperative numeric/timeline control). |
| lenis | 1.x (`lenis` package, `lenis/react`) | Smooth-scroll feel on long dashboard/admin pages | Optional WOW-polish item, phase 2 only. Current package is `lenis` (not the retired `@studio-freight/react-lenis`); use the `root` prop on `<ReactLenis>` to avoid breaking `position: sticky` / `IntersectionObserver`-based features (score gauge reveal, card stagger triggers). If synced with GSAP ScrollTrigger, set `autoRaf: false` and drive both off one `gsap.ticker`. |
| zustand | 5.x | Lightweight client state (auth token, current role, locale/theme not already owned by next-intl/next-themes) | Needed only for the small slice of client state TanStack Query doesn't own (e.g. in-memory access token, "is refreshing" flag for the interceptor lock). Avoid Redux Toolkit here — this app has no complex derived client state, just server cache + a few flags; Zustand is less boilerplate for a 2-day build. |
| react-hook-form + zod | 7.x / 3.x | Register/login forms, connect-wizard steps, offer amount input, admin annotate form | Standard pairing for typed, validated forms; zod schemas can mirror the OpenAPI request shapes for extra safety on top of the generated types. |
| clsx or tailwind-merge | latest | Conditional/merged Tailwind class composition | Needed once components take variant props (risk-band color, alert severity, dark/light) — avoids string-concat class bugs. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| openapi-typescript CLI | Regenerate `src/api/schema.d.ts` from `http://localhost:8000/openapi.json` (dev) or the deployed backend URL (prod) | Run as an npm script (`"gen:api": "openapi-typescript $API_URL/openapi.json -o src/api/schema.d.ts"`) — re-run whenever the backend schema changes; commit the generated file so CI/Vercel builds don't need live backend access. |
| ESLint + Prettier (Next.js defaults) | Lint/format | `create-next-app` (Next 16) now ships TypeScript-first + ESLint by default — accept the scaffold defaults rather than hand-rolling config, saves time under the deadline. |
| UptimeRobot or cron-job.org (free) | External keep-alive ping for the backend host | Not an npm dependency — a free external cron pinging `GET /health` (or any cheap endpoint) every ~5–10 min. Required if the backend host has an idle-based spin-down/scale-to-zero (Render, Koyeb) so APScheduler keeps ticking and judges never hit a cold start. See Hosting section below. |

## Installation

```bash
# Core (Next.js 16 scaffold already gives TS + Tailwind v4 + ESLint if using create-next-app)
npm install next-intl next-themes @tanstack/react-query zustand react-hook-form zod clsx tailwind-merge recharts motion gsap

# Optional WOW-polish (phase 2, add when ready)
npm install lenis

# OpenAPI client (dev-time codegen, no client runtime dependency beyond the thin fetch wrapper)
npm install -D openapi-typescript
npm install openapi-fetch

# Dev dependencies (if not already scaffolded)
npm install -D eslint prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| next-intl | next-i18next | Only if committed to Pages Router — next-i18next predates App Router and needs workarounds there; irrelevant for this project (App Router is a locked decision). |
| openapi-typescript + openapi-fetch | Orval (with TanStack Query plugin) | If the team wants codegen to also emit ready-made `useXQuery`/`useXMutation` hooks per endpoint instead of hand-writing them around `openapi-fetch`. More generated surface area to keep in sync; skip for a 2-day build unless the endpoint count balloons. |
| openapi-typescript + openapi-fetch | Hey API | Newer, plugin-based, supports Next.js-specific client output and a TanStack Query plugin too — a reasonable pick if starting fresh with no time pressure, but openapi-typescript has more 2026 track record (used by Stripe's public SDK docs) and less to learn under deadline. |
| recharts | visx | If a chart needs to be fully custom/animated beyond what Recharts' component API exposes (e.g. a bespoke gauge) — accept more code for more control. Used here for the gauge decision (custom SVG) instead of pulling in visx just for one chart. |
| motion + gsap (both) | GSAP only | If team wants a single animation dependency to reduce bundle/learning surface — GSAP alone can do everything (including React enter/exit via `useGSAP`), at the cost of more imperative code for ordinary component transitions that Motion would express in one line. |
| Zustand | Redux Toolkit | If client state grows complex (e.g. multi-step wizard state machines, undo/redo, heavy derived state) beyond auth-token/UI-flag scale — not expected here. |
| Railway (primary host) | Render + external keep-alive ping | If Railway's trial credit is exhausted or a card is required unexpectedly — Render's free web service + a 10-min UptimeRobot ping is the standard fallback (see Hosting section). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| next-i18next in this project | Pages-Router-oriented library retrofitted onto App Router; more setup friction than next-intl for zero benefit here | next-intl |
| Pages Router | Team has already locked App Router; mixing patterns wastes the 2-day window | App Router only |
| Client-side fee/score computation with any chart/animation lib | Handoff is explicit: server + `rafid-engine` are the only source of truth for score, fees, "days remaining" | Render server-returned `Decision`/`Offer`/`Contract` fields verbatim; animate the *display* of a value, never derive the value |
| WebSocket libraries (socket.io, native WS hooks) | Backend exposes no WebSocket endpoint — this is explicitly a polling design | TanStack Query `refetchInterval` |
| Fly.io as a free host | Free tier was removed in 2024; new orgs get only a ~2-VM-hour or 7-day trial, then a credit card is required — will die mid-hackathon | Railway (trial credit) or Render (free tier + keep-alive ping) |
| Koyeb free Postgres for the primary DB | Capped at 5 active-hours/month + 1GB — will exhaust well before/during a 2-day, continuously-polled demo | Neon free Postgres (permanent, 100 CU-hrs/month, no trial expiry) |
| Relying on Render/Koyeb free compute with zero keep-alive strategy | Both scale down on idle (15 min / 1 hr respectively); a judge landing on a cold instance sees a 1–60s stall right when it matters most | External keep-alive ping (UptimeRobot/cron-job.org) hitting `/health` every 5–10 min for the whole judging window, or use Railway's non-sleeping trial compute instead |
| Hand-rolling a gauge/number-tween library from scratch beyond the score gauge | Reinvents what GSAP/Motion already do well for everything except the one bespoke gauge shape | GSAP for the tween math, custom SVG only for the ring geometry |

## Stack Patterns by Variant

**If judging-day reliability is the top priority (recommended for July 17):**
- Backend compute: **Railway**, using the no-card-required Trial ($5 credit, ~30 days, 2 vCPU/1GB RAM). Trial-tier apps do not scale-to-zero the way Render/Koyeb do, so APScheduler keeps ticking with no keep-alive hack needed and no cold-start risk during judging.
- Database: **Neon** free Postgres (separate from Railway's own Postgres offering) — decouples DB persistence from Railway's credit burn, is a permanent free tier (not a trial), 100 CU-hrs/month and 0.5GB storage are ample for a seeded 20-merchant demo dataset, and Neon's scale-to-zero wake is sub-second (serverless), unlike Render/Supabase's tens-of-seconds pause/restore.
- Frontend: Vercel (existing project, already free/production-appropriate for Next.js).
- Set `MONITOR_ENABLED=true` and confirm the 15s-tick loop survives Railway's process model (long-running container, no per-request cold start unlike serverless — this matches APScheduler's requirement for an always-resident process).

**If Railway's trial credit is unavailable or exhausted before the deadline (fallback):**
- Backend compute: **Render** free web service (512MB/0.1 CPU, spins down after 15 min idle, 30–60s cold start on wake).
- Mitigate spin-down with a **free external ping** (UptimeRobot or cron-job.org, 5–10 min interval) hitting a lightweight `/health` route for the entire period the demo needs to stay warm (start the pinger well before judging begins).
- Database: **Neon** free Postgres (same rationale as above — do not use Render's own free Postgres, which auto-expires after 30 days and is unrelated risk not worth taking for a database that must survive to July 17).
- This combo is the standard "hackathon demo that must look always-on" pattern in 2026: compute host with idle spin-down + external keep-alive ping + a DB that doesn't share the compute host's uptime risk.

**If the DB needs a GUI/admin/auth-extras layer (not currently needed per PROJECT.md — backend already has its own JWT auth):**
- Supabase could substitute for Neon, but its free-tier projects auto-pause after 7 days of *DB* inactivity (not just API traffic) requiring a manual dashboard restore (~60s) — avoid unless the extra Supabase features (storage, realtime, built-in auth) are actually used. They are not needed here; **prefer Neon** for a plain Postgres-only need.

**If deeper WOW-polish scroll effects are added later (phase 2 only):**
- Layer `lenis` in after the baseline dashboard exists and is prototype-faithful (per PROJECT.md's build-order decision) — do not add smooth-scroll before core screens are stable, since it changes scroll semantics (`position: sticky`, intersection observers) that other animations may depend on.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| Next.js 16.x | Tailwind CSS v4.x | Requires the CSS-first `@theme`/`@import "tailwindcss"` setup, not the old `tailwind.config.js` + `content` globs — use the Next 16 scaffold defaults, which already wire this correctly. |
| Next.js 16.x (App Router) | next-intl 4.x | Needs the `[locale]` dynamic segment at the app root and a `middleware.ts` for locale detection/routing — plan the route tree with this from the start (matches PROJECT.md's "i18n from scaffold, not retrofit" decision). |
| next-intl (locale-based `dir`) | next-themes (class-based) | Independent providers, both wrap `{children}` in `layout.tsx`; order does not matter functionally, but nest `NextIntlClientProvider` outside `ThemeProvider` for clarity (locale is a routing concern, theme is a client-state concern). |
| @tanstack/react-query v5.x | openapi-fetch | Wrap the generated, typed `openapi-fetch` client's methods inside `useQuery`/`useMutation` `queryFn`/`mutationFn` — v5's `queryFn` receives no special context needed by openapi-fetch, integration is direct. |
| gsap 3.13.x | lenis 1.x | If both are used together, set `ReactLenis` `autoRaf: false` and drive Lenis off `gsap.ticker.add((time) => lenis.raf(time * 1000))` — otherwise the two independent `requestAnimationFrame` loops desync ScrollTrigger by 1–2 frames (documented, recurring issue in 2026 sources). |
| openapi-typescript-generated schema | FastAPI's `openapi.json` | Regenerate whenever backend Pydantic schemas change (new fields, enum values like the platform/bank enums in RAFID_FRONTEND_HANDOFF.md §3) — treat schema regeneration as a required step before frontend work resumes after any backend touch. |

## Sources

- websearch (MEDIUM confidence, cross-checked across multiple 2026 articles per topic; no official Context7/vendor-doc pass was performed in this run — treat version numbers as directionally current, verify exact patch versions with `npm view <pkg> version` before locking `package.json`):
  - next-intl App Router / RTL — https://next-intl.dev/docs/getting-started/app-router , https://nextjs.org/docs/app/guides/internationalization
  - next-themes — https://github.com/pacocoursey/next-themes , https://www.npmjs.com/package/next-themes
  - OpenAPI codegen comparison (openapi-typescript / Orval / Hey API) — https://orval.dev/ , https://dev.to/nyaomaru/which-openapi-codegen-should-you-choose-openapi-typescript-vs-hey-api-vs-orval-vs-kubb-100p
  - TanStack Query v5 polling — https://tanstack.com/query/latest/docs/framework/react/guides/polling
  - Axios/refresh-on-401 pattern — https://dev.to/elmehdiamlou/efficient-refresh-token-implementation-with-react-query-and-axios-f8d
  - React chart libraries 2026 — https://blog.logrocket.com/best-react-chart-libraries-2026/ , https://www.pkgpulse.com/guides/recharts-vs-chartjs-vs-nivo-vs-visx-react-charting-2026
  - Animation libraries 2026 (Motion vs GSAP vs Anime.js) — https://blog.logrocket.com/best-react-animation-libraries/ , https://motion.dev/docs/gsap-vs-motion
  - Lenis + Next.js/GSAP — https://devdreaming.com/blogs/nextjs-smooth-scrolling-with-lenis-gsap
  - Render free tier — https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026
  - Railway pricing/free trial — https://docs.railway.com/pricing/plans , https://medium.com/@kuberns/railway-free-tier-in-2026-what-you-get-and-when-it-runs-out-2101fdca0998
  - Fly.io free tier removed — https://community.fly.io/t/free-plan-clarification/18661
  - Koyeb free tier — https://www.koyeb.com/docs/faqs/pricing
  - Neon free Postgres — https://neon.com/pricing , https://neon.com/docs/introduction/plans
  - Supabase free tier / pausing — https://supabase.com/pricing
  - Next.js 16 / Tailwind v4 — https://nextjs.org/blog/next-16 , https://nextjs.org/docs/app/guides/upgrading/version-16

---
*Stack research for: Arabic-first RTL fintech Next.js frontend + free full-stack hosting*
*Researched: 2026-07-15*
