# Phase 1: Live Bilingual Foundation - Pattern Map

**Mapped:** 2026-07-15
**Files analyzed:** 17 (13 new frontend, 4 modified backend)
**Analogs found:** 17 / 17 (frontend: RESEARCH.md verified code examples + handoff copy/token source; backend: real current-code excerpts)

**Note on frontend analogs:** `frontend/` is greenfield — no prior Next.js code exists in this repo. `Rafid App (standalone).html` is a bundler-exported artifact (fonts/boilerplate only useful for font-face confirmation and page `<title>`); it does NOT contain readable component/copy source in this build, so per CONTEXT.md/RESEARCH.md guidance, frontend analogs are the **verified library code patterns in 01-RESEARCH.md `## Code Examples`/`## Architecture Patterns`** (sourced from next-intl/next-themes/Tailwind official docs, fetched 2026-07-15) plus **design tokens from `RAFID_FRONTEND_HANDOFF.md` §1** (exact hex/type/shape values, authoritative). Copy tone: use handoff §0/§2 product framing ("Murabaha", never "interest/فائدة", demo-dataset disclaimer wording) since prototype HTML source strings weren't recoverable from the bundle.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `frontend/src/i18n/routing.ts` | config | request-response | RESEARCH.md Pattern 1 (next-intl `defineRouting`) | exact (library-verified) |
| `frontend/src/i18n/request.ts` | config | request-response | next-intl `getRequestConfig` (RESEARCH.md Architecture) | exact (library-verified) |
| `frontend/src/middleware.ts` | middleware | request-response | RESEARCH.md Pattern 1 middleware excerpt | exact (library-verified) |
| `frontend/src/app/layout.tsx` | component (server) | request-response | RESEARCH.md project-structure note (minimal root passthrough) | exact |
| `frontend/src/app/[locale]/layout.tsx` | component (server) | request-response | RESEARCH.md Pattern 2 (`ThemeProvider`, `<html dir>`) | exact (library-verified) |
| `frontend/src/app/[locale]/page.tsx` | component (server) | request-response | handoff §0/§2 copy tone + RESEARCH.md structure | role-match |
| `frontend/src/app/[locale]/globals.css` | config | transform | RESEARCH.md Pattern 3 (`@theme`) + handoff §1 tokens | exact (token values authoritative) |
| `frontend/src/components/header.tsx` | component | request-response | handoff §2 screen inventory (header chrome) | role-match |
| `frontend/src/components/footer.tsx` | component | request-response | handoff §0 disclaimer requirement | role-match |
| `frontend/src/components/lang-toggle.tsx` | component (client) | event-driven | next-intl `Link`/locale-switch pattern (RESEARCH.md Pattern 1) | role-match |
| `frontend/src/components/theme-toggle.tsx` | component (client) | event-driven | next-themes `useTheme()` hook (RESEARCH.md Pattern 2) | exact (library-verified) |
| `frontend/src/components/health-badge.tsx` | component (client) | streaming (polling) | RESEARCH.md Architecture diagram "HealthBadge" node + `backend/app/api/routers/system.py` (response shape) | role-match |
| `frontend/src/lib/format.ts` | utility | transform | RESEARCH.md Pattern 4 (full working code) | exact (verified against MDN) |
| `frontend/src/messages/ar.json` / `en.json` | config | transform | next-intl message catalog convention (RESEARCH.md structure) | exact |
| `backend/app/main.py` (CORS edit) | config | request-response | itself, current `allow_origins=["*"]` block | exact (real code) |
| `backend/app/db.py` (SSL connect_args edit) | config | request-response | itself, current `_engine_kwargs()` | exact (real code) |
| `backend/Dockerfile` → repo-root Dockerfile | config | batch (build) | itself, current single-stage Dockerfile | exact (real code) |

## Pattern Assignments

### `frontend/src/i18n/routing.ts` (config, request-response)

**Analog:** RESEARCH.md Pattern 1, sourced next-intl.dev/docs/routing/setup

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always', // /ar/... and /en/... — never bare "/"
});
```

Apply D-08 (Arabic default) directly via `defaultLocale: 'ar'`.

---

### `frontend/src/middleware.ts` (middleware, request-response)

**Analog:** RESEARCH.md Pattern 1

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

---

### `frontend/src/app/[locale]/layout.tsx` (server component, request-response)

**Analog:** RESEARCH.md Pattern 2 (next-themes README) + Pattern 1 (locale param)

```tsx
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

**Critical constraints (D-11):** `enableSystem={false}`, `defaultTheme="light"` — never let OS theme override the demo's deterministic light default. `suppressHydrationWarning` on `<html>` is required per next-themes docs (script mutates element pre-hydration).

Theme cookie must be read **server-side** — RESEARCH.md Pitfall 1 warns dev-mode (`next dev`) doesn't reproduce the no-flash guarantee; verify only against the actual Vercel production build.

Also owns: `next/font/google` load with `subsets: ['arabic', 'latin']` (Pitfall 2 — omitting `'arabic'` silently breaks Arabic glyphs), header/footer composition per handoff §2.

---

### `frontend/src/app/[locale]/globals.css` (config, transform)

**Analog:** RESEARCH.md Pattern 3 + `RAFID_FRONTEND_HANDOFF.md` §1 (authoritative hex values — lock as-is, do not invent)

```css
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
  --color-page-bg: #0A2038;
  --color-card: #0F2B47;
  /* ... */
}
```

**Full token source (handoff §1, verbatim — copy exactly, do not approximate):**
```
Colors
  --navy #032341 · --terra #C36B4E · --purple #8980BC · --cream #F6E7DC
  --page-bg #F7F2EC · --card #FFFFFF · --card-border #EDE3D6
  --hairline #F0E7DA/#E9DFD3 · --muted-text #8A7E70 · --body-text #4A4238/#6B6156
  --good #3E7C4F/#2F6140 bg #EAF2EA border #CDE0CF
  --warn-chip-bg #F1E4DB text #C36B4E border #E4CDBF
  --purple-chip-bg #EDEBF5 text #6F67A8
  --risk-A/B (good-ish), --risk-C (terra/amber), --risk-D (need a red — none defined, derive oklch-shifted from terra)

Type: IBM Plex Sans Arabic 400/500/600/700. H1 28px/700 · card H2 17px/700 · body 13–14px · meta 11–12px muted. Big numbers 38–46px/700.
Shape: cards radius 18px · tiles 12px · pills 999px · grid gap 18px · grids repeat(auto-fit, minmax(320–340px, 1fr))
```

D-12 requires adding a risk-band-D red (none exists in prototype) and a 3-tier alert-severity chip scale (low=purple/neutral, medium=existing terra warn, high=new red) — mirror the existing chip anatomy (`bg`/`text`/`border` triple) exactly, e.g. `--warn-chip-bg`/`text`/`border` pattern above, for the new red chip.

---

### `frontend/src/components/theme-toggle.tsx` (client component, event-driven)

**Analog:** next-themes `useTheme()` — standard hook usage pattern (RESEARCH.md Pattern 2 context)

```tsx
'use client';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {/* icon */}
    </button>
  );
}
```

---

### `frontend/src/components/lang-toggle.tsx` (client component, event-driven)

**Analog:** next-intl locale-switch convention (RESEARCH.md Architecture: "client-side Link/useRouter wrappers switch locale without full reload")

Pattern: pill "عربي / EN" per D-08; use next-intl's locale-aware `Link`/`usePathname`/`useRouter` from `@/i18n/routing` (next-intl provides these wrappers when using `defineRouting`) to swap the `/ar/...` ↔ `/en/...` prefix while preserving the current path. Cookie persistence is automatic via next-intl middleware (Pattern 1) — no manual cookie-set code needed in the component.

---

### `frontend/src/components/health-badge.tsx` (client component, streaming/polling)

**Analog:** RESEARCH.md Architecture diagram node + real backend response shape from `backend/app/api/routers/system.py` (lines 1-20, read in full — file is 20 lines)

```python
# backend/app/api/routers/system.py — actual current code, defines the badge's fetch target/shape
@router.get("/health")
async def health(session: SessionDep):
    await session.execute(text("SELECT 1"))
    settings = get_settings()
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.env,
        "provider": settings.provider,
        "scoring_backend": settings.scoring_backend,
    }
```

Frontend pattern (per RESEARCH.md Architecture diagram + D-06):

```tsx
'use client';
import { useEffect, useState } from 'react';

export function HealthBadge() {
  const [status, setStatus] = useState<'checking' | 'live' | 'down'>('checking');
  useEffect(() => {
    const check = () =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
        .then((r) => (r.ok ? setStatus('live') : setStatus('down')))
        .catch(() => setStatus('down'));
    check();
    const id = setInterval(check, 30_000); // polling cadence — Claude's discretion per CONTEXT.md
    return () => clearInterval(id);
  }, []);
  // render "متصل / Live" pill keyed off status
}
```

**Never hardcode the URL** (D-04) — always `process.env.NEXT_PUBLIC_API_URL`, this is the sole anti-pattern flagged in RESEARCH.md for this component.

---

### `frontend/src/lib/format.ts` (utility, transform)

**Analog:** RESEARCH.md Pattern 4 — full verified implementation, copy near-verbatim

```typescript
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

Usage — every render site wraps in `<bdi>` for isolation (D-16):
```tsx
<bdi className="tabular-nums">{formatCurrency(offer.total_repayable, locale)}</bdi>
```

**Anti-pattern, do not repeat:** bare `ar-SA` (without `-u-ca-gregory`) silently renders Hijri dates against a Gregorian backend — this is the single most important correctness rule in this file (RESEARCH.md Pitfall 2/Anti-Patterns).

---

### `backend/app/main.py` — CORS edit (config, request-response)

**Analog:** itself — current state read in full (67 lines)

**Current code (lines 48-55), the only sanctioned edit zone:**
```python
# frontend teammate consumes /openapi.json; allow local dev origins broadly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Target state (DEPLOY-02, D-06):**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://<your-vercel-project>.vercel.app"],  # was ["*"]
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
Decide preview-URL handling per RESEARCH.md Assumption A3 (either lock to production domain only, simplest, or add a `*.vercel.app` regex if previews are tested against the live backend before merge). Everything else in `main.py` (router registration lines 57-66, lifespan lines 26-33) is untouched — this file's role/data-flow classification (FastAPI entrypoint, request-response) doesn't change, only the CORS middleware args.

---

### `backend/app/db.py` — SSL connect_args edit (config, request-response)

**Analog:** itself — current state read in full (43 lines)

**Current code (lines 14-18), the function to extend:**
```python
def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        # In-memory SQLite (tests) needs a single shared connection.
        return {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
    return {"pool_pre_ping": True}
```

**Target state (Pitfall 3 — required for Neon/asyncpg, not optional):**
```python
def _engine_kwargs(url: str) -> dict:
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}, "poolclass": StaticPool}
    return {"pool_pre_ping": True, "connect_args": {"ssl": "require"}}
```
Also strip any `sslmode=`/`channel_binding=` query params from the Neon-provided `DATABASE_URL` env value at the host config level (not in code) — asyncpg's `connect()` doesn't accept `sslmode` as a kwarg (`TypeError`), only `ssl`. This is a required deploy-config code change per CONTEXT.md canonical_refs and RESEARCH.md Pitfall 3, not feature work — keep the diff minimal (this one `return` line only).

---

### `backend/Dockerfile` → repo-root Dockerfile (config, batch/build)

**Analog:** itself — current state read in full (12 lines), which is structurally insufficient for the deploy (build context = `backend/`, cannot see sibling `rafid-engine/`)

**Current code (all 12 lines):**
```dockerfile
FROM python:3.12-slim

WORKDIR /srv

COPY pyproject.toml ./
RUN pip install --no-cache-dir uv && uv pip install --system -r pyproject.toml

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Note the existing Dockerfile doesn't even use `uv.lock` (`uv pip install --system -r pyproject.toml`, not `uv sync --frozen`) — RESEARCH.md Pattern 5's repo-root replacement also fixes this to use the lockfile.

**Target (RESEARCH.md Pattern 5, repo-root build context required — structural, not optional):**
```dockerfile
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
Place at repo root (e.g. `backend.Dockerfile` or `deploy/backend.Dockerfile`); on Railway set `RAILWAY_DOCKERFILE_PATH` to point at it with build context = repo root (unset Root Directory). Existing `backend/Dockerfile` and `backend/docker-compose.yml` stay untouched for local dev (`docker-compose.yml`'s `full` profile already builds from `backend/Dockerfile` for local use — do not remove it, add the new file alongside).

## Shared Patterns

### Environment-driven API base URL (D-04)
**Source:** RESEARCH.md Code Examples — Vercel env var scoping
**Apply to:** `health-badge.tsx` and any future fetch call (Phase 2+ API client) — always `process.env.NEXT_PUBLIC_API_URL`, never a literal host string, in every client/server component that talks to the backend.

### Bidi-safe formatted output (D-16)
**Source:** `frontend/src/lib/format.ts` (Pattern 4)
**Apply to:** Every component rendering a server-derived number/currency/date — landing page (if it shows any placeholder stats) and, going forward, all Phase 2+ dashboard/offer/contract screens. Always wrap output in `<bdi>` with `tabular-nums`.

### Semantic-token-only styling (D-09)
**Source:** `globals.css` `@theme` block
**Apply to:** All components (`header.tsx`, `footer.tsx`, toggles, badge, landing page) — never reference raw hex; only `bg-*`/`text-*`/`border-*` utilities generated from the `--color-*` namespace.

### Cookie-persisted, server-resolved preferences (D-08, D-11)
**Source:** next-intl middleware (locale) + next-themes `ThemeProvider` (theme), both RESEARCH.md Pattern 1/2
**Apply to:** `middleware.ts` (locale) and `app/[locale]/layout.tsx` (theme) — the only two places preference state is read/set; components never read `localStorage`/`sessionStorage` directly (explicit anti-pattern).

### Real-code deploy edits stay minimal (project constraint: "config/CORS/env only")
**Source:** `backend/app/main.py`, `backend/app/db.py` current code (both read in full above)
**Apply to:** Both files — diffs must be exactly the CORS `allow_origins` line and the `connect_args` addition; no other business logic touched, per CONTEXT.md Claude's Discretion and PROJECT.md constraint.

## No Analog Found

None — every file in scope has at least a library-verified (RESEARCH.md) or real-current-code analog. The only limitation is that `Rafid App (standalone).html` could not supply readable component/copy source (bundler-exported build artifact); design tokens and copy tone are instead sourced from `RAFID_FRONTEND_HANDOFF.md` §0/§1/§2, which CONTEXT.md/RESEARCH.md both treat as the authoritative frontend contract superseding the prototype file for anything beyond layout intent.

## Metadata

**Analog search scope:** `backend/app/main.py`, `backend/app/db.py`, `backend/app/config.py`, `backend/Dockerfile`, `backend/app/api/routers/system.py` (all read in full, real current code); `RAFID_FRONTEND_HANDOFF.md` §0-§2 (read); `Rafid App (standalone).html` (grepped, found to be a non-readable bundler artifact — abandoned per codebase note); `.planning/phases/01-live-bilingual-foundation/01-RESEARCH.md` (read in full, used as primary frontend pattern source per library-verified code examples).
**Files scanned:** 6 backend files, 2 doc sources, 1 research doc.
**Pattern extraction date:** 2026-07-15
