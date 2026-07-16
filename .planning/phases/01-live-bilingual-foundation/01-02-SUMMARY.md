---
phase: 01-live-bilingual-foundation
plan: 02
subsystem: ui
tags: [nextjs, next-intl, next-themes, lucide-react, tailwindcss, i18n, rtl, intl, arabic, formatting]

# Dependency graph
requires:
  - phase: none
    provides: greenfield frontend/ (no prior Next.js code)
provides:
  - "frontend/ Next.js 16 App Router project (Tailwind v4, TypeScript, src dir, @/* alias)"
  - "next-intl locale-prefixed routing (Arabic default, English toggle, cookie persistence)"
  - "parallel ar/en message catalogs (Murabaha framing, health/disclaimer/hero/how-it-works copy)"
  - "lib/format.ts — single bidi-safe number/currency/date utility (Western digits, forced Gregorian)"
  - "NEXT_PUBLIC_API_URL env seam (.env.local dev, .env.example template)"
affects: [01-03, 01-04, phase-2-auth, phase-3-merchant-screens, phase-4-admin-screens]

# Tech tracking
tech-stack:
  added: [next@16.2.10, react@19.2.4, react-dom@19.2.4, tailwindcss@4, next-intl@4.13.2, next-themes@0.4.6, lucide-react@1.24.0, typescript@5]
  patterns:
    - "Locale-prefixed routing via next-intl defineRouting + middleware (localePrefix always, defaultLocale ar)"
    - "Single central Intl-based formatting utility; callers wrap output in a bidi-isolation boundary"
    - "Env-driven backend base URL only (NEXT_PUBLIC_API_URL), no hardcoded hosts"

key-files:
  created:
    - frontend/src/i18n/routing.ts
    - frontend/src/i18n/request.ts
    - frontend/src/middleware.ts
    - frontend/src/messages/ar.json
    - frontend/src/messages/en.json
    - frontend/src/lib/format.ts
    - frontend/.env.example
  modified:
    - frontend/next.config.ts
    - frontend/.gitignore
    - frontend/package.json

key-decisions:
  - "Kept the middleware.ts file convention (Next 16 deprecation warning) — it is the plan's named artifact and next-intl 4.13's documented convention; fully functional, migrate to proxy.ts later"
  - "Un-ignored .env.example in frontend/.gitignore so the required env template is actually tracked (the scaffold's .env* rule was hiding it)"
  - "Composed hero + how-it-works copy within Murabaha framing (UI-SPEC locked only CTA/health/disclaimer verbatim); never the conventional-lending term"

patterns-established:
  - "i18n seam: routing.ts (config) + request.ts (per-request messages) + middleware.ts (locale negotiation) + next.config plugin"
  - "format.ts is the sole entry point for number/currency/date; no inline toLocaleString elsewhere"
  - "Message catalogs keep identical top-level key sets (catalog parity); Arabic is the default locale"

requirements-completed: [FOUND-01, FOUND-05]

coverage:
  - id: D1
    description: "Locale-prefixed bilingual routing: Arabic default (/ar), English toggle (/en), cookie persistence across refresh, localePrefix always"
    requirement: "FOUND-01"
    verification:
      - kind: automated
        ref: "grep defaultLocale 'ar' in frontend/src/i18n/routing.ts => AR_DEFAULT_OK"
        status: pass
      - kind: automated
        ref: "cd frontend && npm run build (routing + middleware compile, Proxy registered)"
        status: pass
    human_judgment: true
    rationale: "Runtime redirect (/ -> /ar) and cookie-over-Accept-Language persistence are exercised in dev / 01-04 render assertions; no [locale] page renders yet in this plan to assert the full redirect end-to-end"
  - id: D2
    description: "Message catalog parity (ar.json/en.json identical top-level keys) with Murabaha framing only (no prohibited financing term)"
    requirement: "FOUND-01"
    verification:
      - kind: automated
        ref: "node top-level key-set equality check => CATALOG_PARITY_OK"
        status: pass
      - kind: automated
        ref: "grep -c 'فائدة' ar.json => 0 ; grep -ci 'interest' en.json => 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "Central bidi-safe format utility: Western digits both locales, forced Gregorian dates, locale-deterministic currency position, null/undefined -> em dash, 0 -> formatted zero, never throws"
    requirement: "FOUND-05"
    verification:
      - kind: automated
        ref: "grep ar-SA-u-ca-gregory => GREGORIAN_OK ; grep ar-SA-u-nu-latn => LATN_DIGITS_OK"
        status: pass
      - kind: unit
        ref: "node contract check: AR '12,345.60 ر.س', EN 'SAR 12,345.60', AR date '15 يوليو 2026', 0 -> '0.00 ر.س', null/undefined/invalid -> '—'"
        status: pass
    human_judgment: false
  - id: D4
    description: "NEXT_PUBLIC_API_URL is the only backend-host source; .env.local -> localhost:8000 (gitignored), .env.example documents the Railway placeholder (tracked)"
    requirement: "FOUND-01"
    verification:
      - kind: automated
        ref: "git check-ignore: .env.local ignored, .env.example tracked; no hardcoded host in source"
        status: pass
    human_judgment: false

# Metrics
duration: 60min
completed: 2026-07-16
status: complete
---

# Phase 01 Plan 02: Bilingual Routing + Formatting Foundation Summary

**Greenfield Next.js 16 App Router frontend with next-intl Arabic-default locale routing, parallel ar/en Murabaha-framed message catalogs, and a single bidi-safe Intl formatting utility (Western digits, forced-Gregorian dates) — `npm run build` green.**

## Performance

- **Duration:** ~60 min
- **Started:** 2026-07-16T08:08:33+03:00 (Task 1 commit)
- **Completed:** 2026-07-16T09:08:01+03:00 (Task 3 commit)
- **Tasks:** 3 (Task 2 = approved package-legitimacy checkpoint, no commit)
- **Files created/modified:** 26 committed (19 scaffold + 7 Task 3 new, plus 4 modified) + `.env.local` (gitignored)

## Accomplishments
- Scaffolded `frontend/` (create-next-app: TypeScript, App Router, Tailwind v4, ESLint, src dir, `@/*` alias) as a sibling of `backend/`/`rafid-engine/` — no Python dirs touched
- Passed the blocking-human package-legitimacy gate (coordinator approved next-intl/next-themes/lucide-react as official) before any i18n install
- Wired next-intl locale-prefixed routing: `locales ['ar','en']`, `defaultLocale 'ar'`, `localePrefix 'always'`, cookie persistence via middleware; next.config wrapped with the plugin
- Built parallel `ar.json`/`en.json` catalogs (brand, nav, hero, how-it-works ×3, health-badge states, demo disclaimer) with strict Murabaha framing and zero prohibited terms
- Built `lib/format.ts` as the sole number/currency/date entry point — Western digits (`ar-SA-u-nu-latn`), forced Gregorian (`ar-SA-u-ca-gregory-nu-latn`), `ر.س`/`SAR` positioning, null/undefined→`—`, 0→formatted zero, never throws
- Established `NEXT_PUBLIC_API_URL` as the only backend-host source (`.env.local` dev, `.env.example` Railway placeholder)

## Task Commits

1. **Task 1: Scaffold Next.js App Router + Tailwind v4** - `52a8d22` (feat)
2. **Task 2: Package legitimacy gate** - checkpoint (blocking-human), approved by coordinator — no code commit
3. **Task 3: i18n libraries + routing + catalogs + format utility + env** - `5f2e82b` (feat)

_Task 2 is a `checkpoint:human-verify gate="blocking-human"` — never auto-approved; coordinator confirmed the three package names against the RESEARCH Package Legitimacy Audit before install._

## Files Created/Modified
- `frontend/src/i18n/routing.ts` - next-intl defineRouting (ar default, always-prefixed)
- `frontend/src/i18n/request.ts` - getRequestConfig, hasLocale validation, message import
- `frontend/src/middleware.ts` - next-intl createMiddleware, api/_next/_vercel/dotted-file matcher
- `frontend/next.config.ts` - wrapped with next-intl plugin -> ./src/i18n/request.ts
- `frontend/src/messages/ar.json` / `en.json` - parallel bilingual catalogs (Arabic default)
- `frontend/src/lib/format.ts` - central bidi-safe formatNumber/formatCurrency/formatDate
- `frontend/.env.local` - NEXT_PUBLIC_API_URL=http://localhost:8000 (gitignored)
- `frontend/.env.example` - NEXT_PUBLIC_API_URL Railway placeholder (tracked; real URL wired in 01-04)
- `frontend/.gitignore` - added `!.env.example` un-ignore exception
- `frontend/package.json` / `package-lock.json` - next-intl, next-themes, lucide-react

## Decisions Made
- **middleware.ts over proxy.ts:** Next 16 deprecated the `middleware` file convention (renamed to `proxy`) and emits a build warning, but middleware.ts still works, is this plan's named artifact, and is next-intl 4.13's documented convention. Kept as planned; migrating to `proxy.ts` is a clean follow-up (no functional impact).
- **Copy composition:** UI-SPEC locks only CTA, health-badge, and disclaimer strings verbatim. Hero headline/subheadline and the three how-it-works items were composed within the product one-liner tone (D-05) and Murabaha framing — the conventional-lending term appears nowhere.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Un-ignored `.env.example` so the required env template is tracked**
- **Found during:** Task 3 (env files)
- **Issue:** create-next-app's `.gitignore` has a blanket `.env*` rule that also ignores `.env.example`, so the plan-required env template (acceptance: "`frontend/.env.example` documents NEXT_PUBLIC_API_URL") would never be committed.
- **Fix:** Added `!.env.example` un-ignore exception below the `.env*` line; `.env.local` stays ignored.
- **Files modified:** frontend/.gitignore
- **Verification:** `git check-ignore frontend/.env.example` now returns nothing (tracked); `.env.local` still ignored.
- **Committed in:** `5f2e82b` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** The fix is required to satisfy the plan's own `.env.example` artifact/acceptance criterion. No scope creep.

## Issues Encountered
- **Two benign build warnings** (build still succeeds): (1) `middleware` deprecation notice — see Decisions; (2) Next.js workspace-root inference picked a stray `C:\Users\Saeed\package-lock.json` in the user's home dir. The second is environmental/pre-existing (out of scope) and irrelevant on Vercel, where the project Root Directory is set to `frontend/`. Neither blocks the build.

## User Setup Required
None - no external service configuration required by this plan. (Backend deploy env/services are handled in 01-01; the real Railway `NEXT_PUBLIC_API_URL` is wired into Vercel in 01-04.)

## Next Phase Readiness
- **Ready for 01-03/01-04:** i18n seam, message catalogs, and the formatting utility exist and build clean. 01-03/01-04 add the `app/[locale]/layout.tsx` + `page.tsx` (theme provider, `<html dir/lang>`, fonts, header/footer/hero) that consume this routing and these catalogs.
- **Note for 01-04:** replace the `.env.example` Railway placeholder with the finalized deployed backend URL and set the Vercel production env var.
- **Follow-up (non-blocking):** consider migrating `middleware.ts` -> `proxy.ts` to clear the Next 16 deprecation warning.

## Self-Check: PASSED

- All 7 created files + `.env.local` + modified `next.config.ts` verified present on disk.
- Task commits `52a8d22` (scaffold) and `5f2e82b` (i18n + format + env) verified in git history.
- Plan automated checks all pass: `GREGORIAN_OK`, `LATN_DIGITS_OK`, `AR_DEFAULT_OK`, `CATALOG_PARITY_OK`, prohibited-term counts 0/0, `npm run build` succeeds.

---
*Phase: 01-live-bilingual-foundation*
*Completed: 2026-07-16*
