# Phase 1: Live Bilingual Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-15
**Phase:** 1-Live Bilingual Foundation
**Areas discussed:** Repo layout & Vercel cutover, Phase-1 visible shell, Dark palette & extended tokens, Arabic number/date conventions

> Mid-discussion the user switched to full-autonomous mode ("Choose what you recommend always. I trust you."). Questions 1–3 of Area 1 were answered interactively; everything after is auto-selected recommended options, marked `[auto]`.

---

## Repo layout & Vercel cutover

| Option | Description | Selected |
|--------|-------------|----------|
| frontend/ dir | Sibling to backend/ and rafid-engine/; Vercel root-directory points at frontend/ | ✓ |
| Repo root | package.json + app/ at root; mixes Node artifacts with Python dirs | |
| Separate repo | Clean split but breaks single-repo hackathon flow | |

**User's choice:** frontend/ dir (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Cut over immediately | Prod URL serves new shell from Phase 1 deploy; prototype stays in repo as reference | ✓ |
| Keep prototype live until Phase 3 | Old prototype on prod URL, Next.js on preview URL | |
| Serve prototype at a subpath | New shell at /, prototype at /prototype | |

**User's choice:** Cut over immediately (Recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Push-to-main auto-deploy | Every push to main deploys prod; freeze before July 17 | ✓ |
| Preview branches + manual promote | Safer prod URL, merge overhead | |
| Auto-deploy + prod freeze day | Push-to-main until July 16, then lock | |

**User's choice:** Push-to-main auto-deploy (Recommended)

**[auto] Q4 — env wiring:** `NEXT_PUBLIC_API_URL` env-driven; `.env.local` → localhost:8000, Vercel env → deployed backend. Prototype files remain in repo untouched.

---

## Phase-1 visible shell `[auto]`

- **Shell content** → Polished Arabic-first landing page + real app chrome (header: logo, language toggle, theme toggle; footer). Alternatives considered: bare placeholder page; token-showcase page. Rejected: judges/user evaluate Phase 1 on this surface.
- **Backend-health badge** → visible live-status indicator hitting backend health endpoint; proves CORS/env/deploy on sight.
- **Disclaimer** → persistent slim non-dismissible footer banner, both locales. Alternatives: dismissible toast (rejected — FOUND-07 says visible), modal (too intrusive).
- **Language toggle** → header pill عربي/EN, locale-prefixed routes, cookie persistence, Arabic default.

---

## Dark palette & extended tokens `[auto]`

- **Token architecture** → semantic token layer in Tailwind v4 `@theme` CSS vars; components never use raw hex. Alternative: per-component dark: overrides (rejected — unmaintainable across 12+ screens).
- **Dark derivation** → navy-family dark theme (deep navy bg, elevated navy cards, cream text, AA-checked accents). Alternative: neutral gray dark (rejected — off-brand).
- **Default theme** → light, cookie-persisted, server-resolved. Alternative: system preference default (rejected — non-deterministic on judging machine).
- **Risk-D + severity** → terra→red oklch shift per handoff §1 note; severity low=purple/neutral, medium=terra warn, high=red; single chip anatomy.

---

## Arabic number/date conventions `[auto]`

- **Digits** → Western digits both locales (`ar-SA-u-nu-latn`). Alternative: Arabic-Indic digits (٧٧١) in ar (rejected — Saudi banking apps use Western; chart-lib friction).
- **Currency** → ر.س (ar) / SAR (en), tabular-nums. Alternative: new Saudi riyal symbol (rejected — font support risk on judging devices).
- **Dates** → Gregorian forced via `-u-ca-gregory` (plain ar-SA defaults to Umm al-Qura — would mis-render backend Gregorian sim dates). Absolute dates only.
- **Bidi safety** → single `format.ts` module, every output bidi-isolated.

---

## Claude's Discretion

- Prod freeze ritual by end of July 16 (hotfix via previews).
- Remote demo-reset: host-console preferred; token-guarded endpoint only if console impractical.
- Fresh prod `JWT_SECRET`/`FERNET_KEY`.
- Monitor interval stays 15s unless host forces change.
- Landing copy, exact dark hex values, badge polling cadence.

## Deferred Ideas

None.
