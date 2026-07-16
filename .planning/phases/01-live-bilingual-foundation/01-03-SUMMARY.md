---
phase: 01-live-bilingual-foundation
plan: 03
subsystem: ui
tags: [nextjs, tailwindcss-v4, next-themes, next-intl, ibm-plex-sans-arabic, lucide-react, rtl, design-tokens]

# Dependency graph
requires:
  - phase: 01-live-bilingual-foundation (plan 02)
    provides: next-intl locale-prefixed routing, ar/en message catalogs, lib/format.ts, NEXT_PUBLIC_API_URL env seam
provides:
  - "Tailwind v4 @theme semantic token system: brand/surface/accent tokens, risk-band A-D + alert-severity chip triples, radii, Phase-1 active type scale + reserved 17px/500-weight tokens (light + dark, verbatim handoff §1 hex)"
  - "IBM Plex Sans Arabic via next/font/google (arabic+latin subsets, 400/700, display swap) wired into --font-sans"
  - "Server-resolved, flash-free theming: theme cookie read in [locale]/layout.tsx so first SSR paint already carries the correct .dark class (light default, D-11)"
  - "Full app chrome: header (logo + lang pill + theme toggle), footer (persistent bilingual disclaimer + health badge), token-styled Arabic-first hero landing with how-it-works strip"
  - "next-intl navigation wrappers (i18n/navigation.ts) enabling the locale-swap Link/router pattern"
affects: [01-04, phase-2-auth, phase-3-merchant-screens, phase-4-admin-screens]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tailwind v4 @theme semantic tokens re-assigned wholesale under a .dark class selector (via @custom-variant dark) so every bg/text/border utility flips theme for free — no per-component dark: duplication needed for surface colors"
    - "Server-side cookie-resolved theme class on <html>, next-themes handles only client-side toggling + its own localStorage mirror — the cookie write in ThemeToggle keeps both persistence layers in sync"
    - "useSyncExternalStore over useEffect+setState for client polling/mount-detection (health-badge, theme-toggle) — avoids the setState-in-effect cascading-render lint footgun while keeping identical behavior"

key-files:
  created:
    - "frontend/src/app/[locale]/globals.css"
    - "frontend/src/app/[locale]/layout.tsx"
    - "frontend/src/app/[locale]/page.tsx"
    - "frontend/src/components/header.tsx"
    - "frontend/src/components/footer.tsx"
    - "frontend/src/components/lang-toggle.tsx"
    - "frontend/src/components/theme-toggle.tsx"
    - "frontend/src/components/health-badge.tsx"
    - "frontend/src/i18n/navigation.ts"
  modified: []

key-decisions:
  - "Deleted frontend/src/app/layout.tsx and frontend/src/app/globals.css (the create-next-app defaults) instead of keeping a passthrough root layout — Next.js's root-layout invariant requires exactly one <html>/<body> definition in the tree above any page; [locale]/layout.tsx now IS the root layout (a dynamic-segment root layout is an explicitly documented Next.js pattern for i18n). Keeping both files would have produced nested <html> tags."
  - "Added frontend/src/i18n/navigation.ts (createNavigation(routing)) — 01-02's scaffold only exported `routing`, not the Link/usePathname/useRouter wrappers lang-toggle.tsx needs to swap locales while preserving the current path."
  - "Chip-anatomy tokens (--color-chip-good/warn/destructive/info-*) declared in globals.css per D-12 but not consumed by any Phase-1 component (no risk/alert UI exists yet) — scaffolded now, first rendered Phase 3 per UI-SPEC."
  - "No numeric stat rendered on the landing page — the plan's lib/format.ts + <bdi> requirement is optional here (\"if any renders\") and skipping it avoids introducing placeholder/stub data on a marketing page."
  - "CTA text uses white (--color-accent-foreground) rather than brand-cream against the terra accent fill — better WCAG contrast; not locked by UI-SPEC, exercised as Claude's discretion."

patterns-established:
  - "@theme + .dark class re-assignment for all semantic surface tokens (page-bg/card/card-border/hairline/muted-text/body-text); `dark:` variant (via @custom-variant) reserved only for brand-ink swaps (navy/cream) that need a genuine per-element choice, not a token substitution"
  - "Health-badge / any future polling component: build an external store object (subscribe/getSnapshot) instead of an effect that calls setState directly — keeps the interval lifecycle tied to subscriber count and passes eslint-plugin-react-hooks's set-state-in-effect rule"

requirements-completed: [FOUND-02, FOUND-03, FOUND-04, FOUND-06, FOUND-07]

coverage:
  - id: D1
    description: "Tailwind v4 @theme token system (handoff §1 verbatim light values, concrete dark palette, risk-band A-D + alert-severity chip triples, radii, Phase-1 type scale + reserved tokens)"
    requirement: "FOUND-03"
    verification:
      - kind: unit
        ref: "grep --color-risk-d, #032341, #F7F2EC, #081C30 in frontend/src/app/[locale]/globals.css => TOKENS_OK/HEX_OK"
        status: pass
      - kind: integration
        ref: "cd frontend && npm run build => succeeds"
        status: pass
    human_judgment: true
    rationale: "Exact dark-hex WCAG AA contrast and visual chip appearance need a human eyeball pass — automated greps only prove the values exist, not that they read correctly on screen."
  - id: D2
    description: "IBM Plex Sans Arabic loads via next/font/google (arabic+latin subsets, 400/700, display swap) with no FOUT"
    requirement: "FOUND-04"
    verification:
      - kind: unit
        ref: "grep \"subsets: ['arabic'\" frontend/src/app/[locale]/layout.tsx => FONT_OK"
        status: pass
      - kind: integration
        ref: "cd frontend && npm run build => succeeds (next/font fails the build if a requested weight/subset is unavailable)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Server-resolved, flash-free theme: theme cookie read in [locale]/layout.tsx, light default (D-11), idempotent round-trip"
    requirement: "FOUND-02"
    verification:
      - kind: e2e
        ref: "curl http://127.0.0.1:3111/ar (no cookie) => html class contains 'light', not 'dark'; curl -H 'Cookie: theme=dark' /ar => html class contains 'dark' (production build + next start, not next dev)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Full app chrome: header (logo wordmark + lang pill + theme toggle, 44px hit areas, flex-wrap), footer (persistent non-dismissible bilingual disclaimer + health badge)"
    requirement: "FOUND-07"
    verification:
      - kind: e2e
        ref: "curl http://127.0.0.1:3111/ar => contains 'بيانات تجريبية...'; curl /en => contains 'Demo dataset...'"
        status: pass
      - kind: unit
        ref: "grep h-11/w-11 in header.tsx/theme-toggle.tsx/lang-toggle.tsx => 44px hit-area classes present"
        status: pass
    human_judgment: true
    rationale: "390px no-overlap/no-clip in ar-RTL and en-LTR, light and dark, is an explicit UI-SPEC backstop item (visual check) — deferred to the 01-04 live-verify checkpoint per the plan's own output note."
  - id: D5
    description: "Env-driven three-state health badge (checking/live/down) polling NEXT_PUBLIC_API_URL/health every 30s, never a hardcoded host"
    requirement: "FOUND-06"
    verification:
      - kind: unit
        ref: "grep NEXT_PUBLIC_API_URL health-badge.tsx => ENV_DRIVEN_OK; grep -c localhost health-badge.tsx => 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "Arabic-first token-styled hero landing (headline/subheadline/CTA) + 3-item how-it-works auto-fit(minmax(320px,1fr)) grid, responsive 390px->desktop, no raw hex in components"
    requirement: "FOUND-06"
    verification:
      - kind: unit
        ref: "grep -rInE '#[0-9A-Fa-f]{6}' frontend/src/components frontend/src/app/[locale]/page.tsx (comment-filtered) => 0 matches"
        status: pass
      - kind: unit
        ref: "node key-set-parity check on ar.json/en.json => PARITY_OK; grep -ci interest en.json => 0; grep -c فائدة ar.json => 0"
        status: pass
    human_judgment: false

# Metrics
duration: 55min
completed: 2026-07-16
status: complete
---

# Phase 01 Plan 03: Token System, Theming, App Chrome + Landing Page Summary

**Tailwind v4 @theme token system (light/dark/risk-band/alert-severity), IBM Plex Sans Arabic via next/font, cookie-resolved flash-free theming, and the full bilingual header/footer/hero/how-it-works shell — `npm run build` and production-build render assertions (dir/lang/theme-cookie/disclaimer) all green.**

## Performance

- **Duration:** ~55 min
- **Started:** 2026-07-16T09:32:56+03:00 (Task 1 commit)
- **Completed:** 2026-07-16T09:34:02+03:00 (Task 2 commit); Task 3 verification ran immediately after
- **Tasks:** 3 (Task 3 is verification-only per plan, no code commit)
- **Files created/modified:** 9 created, 3 deleted (create-next-app scaffold defaults superseded by the `[locale]` tree)

## Accomplishments
- Built the full `@theme` token system in `frontend/src/app/[locale]/globals.css`: brand tokens, semantic surface layer, accent, raw risk-band swatches, risk-band + alert-severity chip triples (good/warn/destructive/info), radii (18/12/999px), the Phase-1 active type scale (12/14/28/40) plus reserved 17px/500-weight tokens — light values verbatim from `RAFID_FRONTEND_HANDOFF.md` §1, dark values from `01-UI-SPEC.md`'s concrete dark palette
- Wired IBM Plex Sans Arabic (`next/font/google`, subsets `['arabic','latin']`, weights `['400','700']`, `display: 'swap'`) into `--font-sans` via a CSS variable
- Made `[locale]/layout.tsx` the app's root layout (see Deviations) reading the `theme` cookie server-side via `cookies()` so the first SSR paint already carries the correct `.dark`/light class — verified against a production build, not `next dev`
- Built `ThemeToggle` (next-themes `useTheme()` + a cookie mirror on toggle) and `LangToggle` (`عربي / EN` pill via next-intl locale-aware navigation)
- Built `HealthBadge` as a three-state (checking/live/down) polling badge driven entirely by `NEXT_PUBLIC_API_URL`, never a hardcoded host
- Built `Header`/`Footer` chrome and the Arabic-first `page.tsx` landing (hero + CTA + auto-fit how-it-works strip), all styled with semantic token utilities only (zero raw hex in components)
- Added `frontend/src/i18n/navigation.ts` (missing from 01-02) so `LangToggle` has locale-aware `Link`/`usePathname`/`useRouter`

## Task Commits

1. **Task 1: Token system, fonts, and flash-free server-resolved theming** - `85f7ba5` (feat)
2. **Task 2: App chrome + token-styled landing page** - `dcb5724` (feat)
3. **Task 3: Production-build render assertions** - verification-only, no commit (results below)

## Files Created/Modified
- `frontend/src/app/[locale]/globals.css` - full `@theme` block + `.dark` override block + `@custom-variant dark`
- `frontend/src/app/[locale]/layout.tsx` - root layout (html lang/dir, cookie-resolved theme class, next/font, ThemeProvider, NextIntlClientProvider, Header/Footer/main composition, skip-to-content link)
- `frontend/src/app/[locale]/page.tsx` - Arabic-first landing (hero, CTA, how-it-works grid)
- `frontend/src/components/header.tsx` - logo wordmark + LangToggle + ThemeToggle, flex-wrap row
- `frontend/src/components/footer.tsx` - disclaimer + HealthBadge
- `frontend/src/components/lang-toggle.tsx` - locale-swap pill
- `frontend/src/components/theme-toggle.tsx` - light/dark toggle + cookie mirror
- `frontend/src/components/health-badge.tsx` - env-driven three-state badge, `useSyncExternalStore`-backed polling
- `frontend/src/i18n/navigation.ts` - `createNavigation(routing)` exports
- `frontend/src/app/layout.tsx` (deleted), `frontend/src/app/globals.css` (deleted), `frontend/src/app/page.tsx` (deleted) - create-next-app scaffold defaults, superseded by the `[locale]` tree

## Decisions Made
- **`[locale]/layout.tsx` is the root layout, not a nested one:** Next.js requires exactly one `<html>`/`<body>` pair in the layout tree above any given page. The plan described `app/layout.tsx` as a "minimal root passthrough," but any `app/layout.tsx` sitting above `app/[locale]/layout.tsx` would either duplicate the `<html>` tag (invalid) or omit it (violates Next's root-layout contract, breaking `next/font`, `next-themes`, and the lang/dir attributes this whole plan depends on). Deleted both `app/layout.tsx` and `app/globals.css`; `app/[locale]/layout.tsx` is now the root layout — an explicitly documented Next.js pattern for i18n ("The root layout can be under a dynamic segment, e.g. `app/[lang]/layout.js`").
- **`getTranslations` (async) instead of `useTranslations` (sync) in the async layout:** next-intl's sync hook throws `"useTranslations is not callable within an async component"` when called from an `async function` Server Component. `header.tsx`/`footer.tsx`/`page.tsx` stay sync and use `useTranslations` as planned.
- **`useSyncExternalStore` over `useEffect`+`setState`** in `theme-toggle.tsx` (mount detection) and `health-badge.tsx` (polling): the newer `eslint-plugin-react-hooks` `set-state-in-effect` rule flags direct `setState` calls in an effect body as a cascading-render risk. Rewriting both as external-store subscriptions (health-badge: a module-level store owning the fetch/interval lifecycle; theme-toggle: the standard server/client mount-detection snapshot trick) preserves identical runtime behavior and clears lint with zero warnings.
- **CTA text color:** used `--color-accent-foreground: #FFFFFF` rather than brand-cream against the terra accent fill for stronger WCAG contrast — not locked by the UI-SPEC copywriting contract, exercised as Claude's discretion.
- **No numeric stat on the landing page:** the plan's `lib/format.ts`/`<bdi>` requirement was conditional ("if any numeric stat renders") — skipped to avoid introducing placeholder data on a page that has no real backend-sourced figures yet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `app/layout.tsx` as literally described would produce invalid/duplicate `<html>` tags**
- **Found during:** Task 1 (root layout planning)
- **Issue:** The plan's Task 1 action says to keep `frontend/src/app/layout.tsx` as a "minimal root passthrough" while `app/[locale]/layout.tsx` owns the `<html>` element. Next.js requires the *root* layout (the top-most layout above any page) to define `<html>`/`<body>`; if `app/layout.tsx` exists above `app/[locale]/layout.tsx`, either both try to render `<html>` (nested, invalid DOM) or the outer one omits it (violates Next's root-layout contract and breaks `suppressHydrationWarning`/`next-themes`/`next/font` targeting `<html>`).
- **Fix:** Deleted `frontend/src/app/layout.tsx` and `frontend/src/app/globals.css` (the create-next-app defaults); `frontend/src/app/[locale]/layout.tsx` is now the sole root layout, per Next.js's documented dynamic-segment root layout pattern.
- **Files modified:** `frontend/src/app/layout.tsx` (deleted), `frontend/src/app/globals.css` (deleted), `frontend/src/app/[locale]/layout.tsx` (created as root layout)
- **Verification:** `npm run build` succeeds; production-build curl assertions confirm correct `lang`/`dir`/theme-class output (Task 3).
- **Committed in:** `85f7ba5` (Task 1 commit)

**2. [Rule 3 - Blocking] Missing next-intl navigation wrappers**
- **Found during:** Task 2 (`lang-toggle.tsx`)
- **Issue:** `01-02` only created `frontend/src/i18n/routing.ts` (the `defineRouting` config), not the `createNavigation(routing)` output (`Link`/`usePathname`/`useRouter`) that `lang-toggle.tsx` needs to swap `/ar` <-> `/en` while preserving the current path.
- **Fix:** Added `frontend/src/i18n/navigation.ts` exporting `{ Link, usePathname, useRouter, redirect, getPathname }` from `createNavigation(routing)` — the standard next-intl convention, no new dependency.
- **Files modified:** `frontend/src/i18n/navigation.ts` (new)
- **Verification:** `npm run build` succeeds; `LangToggle`'s `router.replace(pathname, { locale })` compiles and type-checks against next-intl's generated types.
- **Committed in:** `dcb5724` (Task 2 commit)

**3. [Rule 1 - Bug] `useTranslations` unusable inside the async `[locale]/layout.tsx`**
- **Found during:** Task 1/3 (first production-build smoke test)
- **Issue:** `useTranslations` from `next-intl` throws at runtime ("not callable within an async component") when called from an `async function` Server Component — the layout must be `async` to `await params`/`await cookies()`.
- **Fix:** Switched to `getTranslations` from `next-intl/server` (the async-safe equivalent) in `[locale]/layout.tsx` only; sync Server Components (`header.tsx`, `footer.tsx`, `page.tsx`) keep `useTranslations`.
- **Files modified:** `frontend/src/app/[locale]/layout.tsx`
- **Verification:** production `next start` + curl no longer 500s; skip-to-content link renders localized text in both `/ar` and `/en`.
- **Committed in:** `85f7ba5` (Task 1 commit)

**4. [Rule 1 - Bug] `eslint-plugin-react-hooks` `set-state-in-effect` failures**
- **Found during:** Task 2 (`npm run lint` after first health-badge/theme-toggle draft)
- **Issue:** Both components called `setState` synchronously inside a `useEffect` body (mount-detection gate, and the initial `check()` + `setInterval` polling pattern) — flagged as a cascading-render risk by the newer hooks lint rule.
- **Fix:** Rewrote both as `useSyncExternalStore` subscriptions: `theme-toggle.tsx` uses the standard server/client mount-detection snapshot; `health-badge.tsx` uses a module-level store object that owns the fetch/interval lifecycle, started/stopped by subscriber count.
- **Files modified:** `frontend/src/components/theme-toggle.tsx`, `frontend/src/components/health-badge.tsx`
- **Verification:** `npm run lint` => 0 problems; `npm run build` succeeds; production-build curl assertions unchanged (Task 3).
- **Committed in:** `dcb5724` (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 Rule 1 bug-prevention, 1 Rule 1 runtime-error fix, 1 Rule 3 blocking)
**Impact on plan:** All four were required for the plan's own acceptance criteria (`npm run build` succeeds) to hold at all — none are scope creep. The root-layout restructure is the only one with any architectural shape (Rule 1, not Rule 4) because it's forced by an invariant Next.js enforces, not a design choice with alternatives.

## Issues Encountered
- **CSS comment self-termination bug (self-caught, not a plan deviation):** an early draft of a `globals.css` comment contained the literal substring `*/` embedded mid-sentence (`bg-*/text-*/border-*`), which prematurely closed the CSS comment and broke the PostCSS parse (`Unknown word utility`). Caught immediately by the first `npm run build`; rewrote the comment to avoid any `*/` sequence. No behavior impact, just a authoring mistake.
- **Two pre-existing benign build warnings** (inherited from 01-02, unrelated to this plan): the `middleware.ts` deprecation notice (Next 16 renamed the convention to `proxy.ts`) and the stray `C:\Users\Saeed\package-lock.json` workspace-root inference warning. Neither blocks the build; both are out of scope for this plan.

## User Setup Required
None - no external service configuration required by this plan.

## Next Phase Readiness
- **Ready for 01-04 (Vercel cutover):** the full bilingual, token-styled, themed shell exists and builds clean; `NEXT_PUBLIC_API_URL` is the sole health-badge data source, ready to point at the deployed backend.
- **Deferred to 01-04 per the plan's own output note:** the definitive no-flash visual confirmation against the real Vercel production deployment, and the 390px header/logo/pill/toggle no-overlap visual backstop (ar-RTL + en-LTR, light + dark) — both explicitly called out in the plan as completing at the 01-04 live-verify checkpoint, not here.
- **Chip tokens scaffolded, unused:** risk-band and alert-severity chip triples exist in `globals.css` per D-12 but render nowhere yet (no risk/alert UI until Phase 3) — do not remove them; they are intentionally pre-declared per "scaffold once, never retrofit."

## Self-Check: PASSED

- All 9 created files verified present on disk; all 3 deletions verified absent.
- Task commits `85f7ba5` (Task 1) and `dcb5724` (Task 2) verified in `git log`.
- All plan automated checks pass: `TOKENS_OK`, `THEME_OK`, `FONT_OK`, hex-value greps (`#032341`, `#F7F2EC`, `#081C30`, `--color-risk-d`), `ENV_DRIVEN_OK`, `DISCLAIMER_OK`, `PARITY_OK`, zero `localhost`/raw-hex-in-components/prohibited-term matches, `npm run build` green, `npm run lint` green (0 problems).
- Task 3 production-build render assertions all pass: `/ar` => `dir="rtl" lang="ar"`; `/en` => `dir="ltr" lang="en"`; `/ar` with `Cookie: theme=dark` => html class contains `dark`; `/ar` with no cookie => html class contains `light` (not `dark`); `/ar` body contains the Arabic disclaimer + hero headline; `/en` body contains the English disclaimer — all against `next build && next start`, not `next dev`.

---
*Phase: 01-live-bilingual-foundation*
*Completed: 2026-07-16*
