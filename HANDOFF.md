# Rafid — frontend handoff

Everything you need to run the app, demo it, and pick up the next piece of work.
The backend is already deployed — **you do not need Python, Docker, or a database
to build frontend features.**

---

## 1. Prerequisites

- Node 20+
- Git
- Claude Code (optional — only if you want the `/gsd-*` workflow commands)
- Python 3.12 + `uv` — **only** if you want to run the backend locally. You don't.

## 2. Clone and run

```bash
git clone https://github.com/Saeed-Lababidi/Rawafid.git
cd Rawafid

cd frontend
npm install
cp .env.example .env.local     # already points at the live Railway backend
npm run dev                    # http://localhost:3000 → redirects to /ar
```

That's it. The frontend talks to the deployed backend, so there is no Railway,
Neon, or Vercel setup needed to develop.

> If port 3000 is busy, Next picks 3001 and prints the URL — read the startup
> line, don't assume 3000.

## 3. Restore the GSD tooling (optional)

The `.claude/` directory (agents, slash commands, gsd-core) is **deliberately not
committed** and is gitignored. If you want `/gsd-progress`, `/gsd-plan-phase`, etc.:

```bash
npx -y @opengsd/gsd-core@latest --claude --local
```

Skip this if you're just writing frontend code.

## 4. What already exists

**Phase 1 — Live Bilingual Foundation** (on `main`, documented in
`.planning/phases/01-live-bilingual-foundation/`):
locale-prefixed routing (`/ar` default, `/en`), RTL, IBM Plex Sans Arabic,
server-resolved dark mode, brand design tokens, landing page, health badge.

**Frontend MVP** (branch `feat/frontend-mvp`) — merchant + bank surfaces wired
to the live backend:

| Route | What it does |
|---|---|
| `/login` | Email/password form + three one-click demo accounts |
| `/dashboard` | Held-receivables hero, 90-day revenue chart, settlements, alerts |
| `/financing` | Assessment → explainable score → Murabaha offer → accept → live-repaying contract |
| `/admin` | Portfolio KPIs, origination funnel, risk donut, alerts, merchant list, manual day-tick |

Supporting code:

- `src/lib/types.ts` — API payload contracts (mirrors the OpenAPI spec)
- `src/lib/api.ts` — typed client: JWT pair in `localStorage`, one transparent
  `/auth/refresh` retry on a 401, role decode for routing
- `src/lib/format.ts` — the **only** place numbers/currency/dates get formatted
- `src/components/ui/` — primitives + hand-rolled SVG charts (no chart library)
- `src/components/app/app-shell.tsx` — client auth gate + sub-nav

## 5. Demo script (2 minutes)

1. Landing → **Get started**
2. Click **Healthy merchant** (TechSouq — big receivables)
3. Dashboard: point at the held-receivables hero and the 90-day revenue curve
4. **Get financing** → **Run credit assessment** → score gauge, plain-language
   reasons, and the contribution bars (this explainability screen is the
   differentiator — linger here)
5. **See my offer** → walk the cost breakdown: cost price + disclosed profit +
   fees = total repayable. **Say "Murabaha", never "interest".**
6. **Accept & receive cash** → the contract screen; outstanding drops on its own
   as settlements arrive
7. Sign out → **At-risk merchant** (Amber Cosmetics) for revenue-drop and
   settlement-delay alerts
8. Sign out → **Bank underwriter** for the portfolio funnel, risk donut, and
   **Advance one day**

## 6. Things that will bite you

- **Time is simulated.** One monitoring tick = one simulated day, and by default
  it fires every ~15s. Dates in settlements run ahead of the real calendar —
  render them as-is, never compute "days remaining" against the browser clock.
- **Data mutates by itself.** The contract and dashboard screens poll (8–10s).
  That's intentional, not a bug.
- **Trial cost:** keep `MONITOR_ENABLED=false` on Railway while idle. Flip it to
  `true` only for the live demo — or leave it off and drive time manually with
  the **Advance one day** button on `/admin`.
- **Never compute financial figures client-side.** Score, fees, profit, and
  advance amounts all arrive already calculated. Render them, don't derive them.
- **`.env.local` is gitignored.** Copy it from `.env.example`.

## 7. Demo accounts

| Who | Login | Password |
|---|---|---|
| Bank admin | `admin@rafid.sa` | `AdminPass123!` |
| Merchants | `merchant01@rafid.sa` … `merchant20@rafid.sa` | `MerchantPass123!` |

`merchant03` (TechSouq) is the healthy happy path. `merchant17` (Amber Cosmetics)
and `merchant20` (Safa Kitchen) are engineered risky — use them for alerts.
The login screen's demo buttons cover all three cases.

## 8. Deferred — good next tickets

- **Connect-accounts wizard** — `POST /connections/{bank|sales}/consent/start`
  → fake consent screen → `/connections/consent/complete` → `/merchants/me/aggregate`.
  Skipped because seeded merchants are already onboarded, but it's the story for
  a from-scratch registration demo.
- **Registration flow** — `POST /auth/register` works end-to-end already.
- **Admin merchant drill-down** — `GET /admin/merchants/{id}` returns everything;
  no screen renders it yet.
- **Underwriter annotations** — `POST /admin/offers/{id}/annotate`; the merchant
  offer screen already displays `annotation` if present.
- **Deferred from Phase 1** — remote demo-reset was never network-tested
  (see `01-VERIFICATION.md`).

## 9. Reference

- **API contract:** `backend/FRONTEND_GUIDE.md` — request/response shape for every
  endpoint, plus copy-paste TypeScript types. This is the doc to read.
- **Live spec:** https://rawafid-production.up.railway.app/openapi.json
- **Health:** https://rawafid-production.up.railway.app/health
- **Design tokens / UI spec:** `RAFID_FRONTEND_HANDOFF.md`
- **Phase history:** `.planning/phases/`

## 10. Deploying

Vercel auto-deploys `main`. You need push access, or point your own Vercel
project at the repo and set `NEXT_PUBLIC_API_URL` in its environment.

The MVP currently sits on `feat/frontend-mvp` — merge to `main` to ship it.
