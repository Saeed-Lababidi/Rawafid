# Phase 1: Live Bilingual Foundation - Context

**Gathered:** 2026-07-15
**Status:** Ready for planning

<domain>
## Phase Boundary

A live, free-hosted Next.js shell renders Arabic-first RTL (English toggle), flash-free theming, handoff §1 design tokens (extended with risk-band-D and alert-severity scales), IBM Plex Sans Arabic without FOUT, a central bidi-safe formatting utility, responsive 390px→desktop layout, and the demo-dataset disclaimer — served on the real Vercel URL against a deployed backend + Postgres (Railway + Neon primary; Render + UptimeRobot fallback), remote-resettable. Requirements: FOUND-01..07, DEPLOY-01..03. No auth, no API client, no merchant/admin screens — those are Phases 2–4.

</domain>

<decisions>
## Implementation Decisions

### Repo layout & Vercel cutover
- **D-01:** Next.js app lives in `frontend/` — sibling to `backend/` and `rafid-engine/`. Vercel project root-directory setting points at `frontend/`. Python dirs untouched. *(user-selected)*
- **D-02:** Cut over immediately: at Phase 1 deploy, the production Vercel URL serves the new shell. `index.html` and `Rafid App (standalone).html` stay in the repo as design/copy reference only — never served. *(user-selected)*
- **D-03:** Push-to-main auto-deploys to production for the whole sprint. Accept brief prod breakage risk pre-judging; freeze main before July 17 (see Discretion). *(user-selected)*
- **D-04:** API base URL is env-driven only: `NEXT_PUBLIC_API_URL`. Local dev `.env.local` → `http://localhost:8000`; Vercel env → deployed backend URL. No hardcoded hosts anywhere. *(auto — recommended)*

### Phase-1 visible shell
- **D-05:** The deployed URL shows a polished Arabic-first landing page inside real app chrome: header with Rafid logo, language toggle, theme toggle; footer. Hero uses the prototype's product one-liner tone and is fully token-styled — this is the surface judges/user evaluate Phase 1 on. *(auto — recommended)*
- **D-06:** A visible backend-health badge (small status indicator, e.g. footer "متصل / Live") calls the deployed backend's health/system endpoint — makes DEPLOY success criterion demonstrable on sight and proves CORS + env wiring. *(auto — recommended)*
- **D-07:** Demo-dataset disclaimer: persistent slim non-dismissible banner (footer-anchored, muted styling), rendered in both locales. Satisfies FOUND-07 permanently — later phases inherit it from the shared layout. *(auto — recommended)*
- **D-08:** Language toggle in header: pill "عربي / EN", switches the locale-prefixed route (`/ar/...` ↔ `/en/...`), choice persisted via cookie so return visits keep the locale. Arabic is the default locale. *(auto — recommended)*

### Dark palette & extended tokens
- **D-09:** Tokens implemented as a semantic layer (background / surface / card-border / hairline / text / muted / brand / status) in Tailwind v4 `@theme` CSS custom properties. Components consume semantic tokens only — never raw hex. Handoff §1 values are the light-theme source of truth. *(auto — recommended)*
- **D-10:** Dark theme derived from the navy brand family: deep-navy page background, elevated navy card surfaces, cream-tinted text, terra/purple accents lightened as needed to hold WCAG AA contrast. No off-brand gray dark mode. *(auto — recommended)*
- **D-11:** Default theme is **light** (brand cream aesthetic, deterministic for the stage demo — no system-preference surprise on the judging machine). Toggle persisted via cookie and resolved server-side so first paint is correct (FOUND-02, no flash). *(auto — recommended)*
- **D-12:** Risk-band-D red derived from terra shifted toward red in oklch (per handoff §1 note), with matching chip triple (bg/text/border) mirroring existing chip anatomy. Alert-severity scale: low = purple/neutral chip, medium = existing terra warn chip, high = the new red. One consistent chip anatomy across all three. *(auto — recommended)*

### Arabic number/date conventions (central bidi utility)
- **D-13:** Western (Latin) digits in **both** locales — Saudi banking/fintech convention, and keeps charts/gauges consistent. Implemented via `Intl` locale `ar-SA-u-nu-latn`. *(auto — recommended)*
- **D-14:** Currency: Arabic locale renders `ر.س` with the amount, English renders `SAR`. All financial figures use tabular-nums. No client-side fee/score math ever — utility formats server values only. *(auto — recommended)*
- **D-15:** Dates: Gregorian calendar **forced** — `ar-SA-u-ca-gregory-nu-latn` (critical gotcha: plain `ar-SA` defaults to the Islamic Umm al-Qura calendar; backend simulated dates are Gregorian ISO). Format style "15 يوليو 2026" / "Jul 15, 2026". Absolute simulated dates only — never relative, never browser-clock math (locked project rule). *(auto — recommended)*
- **D-16:** One module (e.g. `frontend/src/lib/format.ts`) is the **only** entry point for number/currency/date rendering; every formatted value is bidi-isolated (`<bdi>` / `dir` isolation) so mixed-direction Arabic text never glitches (FOUND-05). *(auto — recommended)*

### Claude's Discretion
- **Prod freeze ritual:** informally freeze main by end of July 16; hotfix via verified Vercel previews only.
- **Remote demo-reset (DEPLOY-03):** prefer host-console path (e.g. Railway shell / `railway run make reset`) to keep backend code untouched; if the console path proves impractical, a minimal token-guarded reset endpoint is acceptable — smallest possible backend delta per PROJECT.md "config/CORS/env only" constraint. Researcher verifies which is viable.
- **Prod secrets:** fresh `JWT_SECRET` / `FERNET_KEY` generated for deployment — dev defaults must never ship.
- **Monitor interval:** keep backend default (15s = 1 simulated day) in prod unless host free-tier constraints force a change.
- **Landing copy specifics, exact dark hex values, badge polling cadence:** Claude decides within the token/brand rules above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Frontend contract (authoritative)
- `RAFID_FRONTEND_HANDOFF.md` — THE frontend contract: §1 design tokens (lock as-is for light theme), §2 screen inventory, §3 prototype→real-API mapping, §4 API surface, §6 monitoring-agent consequences (polling, absolute dates), §7 build order, §8 polish spec. Repo root; GSD doc-scan misses it — always feed explicitly.
- `Rafid App (standalone).html` — prototype: source of screen layout + Arabic copy tone ONLY. Data shapes/enums in it are wrong — re-map per handoff §3.
- ⚠ `uploads/FRONTEND_GUIDE.md` referenced by handoff §4/§9 does **not exist** in this repo. Do not block on it: TypeScript types come from codegen against the live `openapi.json` (Phase 2 plan 02-01 already specifies this).

### Backend deploy inputs
- `backend/Dockerfile`, `backend/docker-compose.yml` — container build for the free host.
- `backend/.env.example` + `.planning/codebase/STACK.md` §Configuration — full env-var list the host needs (`DATABASE_URL`, `JWT_SECRET`, `FERNET_KEY`, `PROVIDER=mock`, `SCORING_BACKEND=module`, `MONITOR_ENABLED`, fee schedule, etc.).
- `backend/Makefile` — `make reset` re-seed target the remote-reset path must reach.
- `.planning/codebase/INTEGRATIONS.md` — confirms no existing CI/hosting config; CORS currently `allow_origins=["*"]` in `backend/app/main.py` (must become Vercel-origin allow-list at deploy).

### Project planning
- `.planning/ROADMAP.md` Phase 1 — goal + success criteria + plan split (01-01 scaffold, 01-02 deploy).
- `.planning/REQUIREMENTS.md` — FOUND-01..07, DEPLOY-01..03 texts.
- `.planning/STATE.md` §Blockers — time-sensitive free-tier concerns to re-verify at deploy time (Railway credit, Neon expiry vs July 17, remote reset without SSH).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing frontend code to reuse — `frontend/` is greenfield. Prototype HTML supplies design tokens, layout intent, and Arabic copy tone only.
- Backend is complete and containerized (`backend/Dockerfile`); deploy work is provisioning + env config, not code.

### Established Patterns
- Backend config is fully env-driven via pydantic-settings — host provisioning is a pure env-vars exercise; dev-default secrets exist and must be overridden.
- Error contract `{ "detail": "..." }` and JWT roles already fixed — shell doesn't consume them yet but layout/provider structure shouldn't preclude Phase 2 route groups (`(merchant)`/`(admin)` planned).
- `rafid-engine` consumed as local path dep (`../rafid-engine`) — backend deploy build context must include both `backend/` and `rafid-engine/` (repo-root build context or adjusted Dockerfile paths; researcher confirms against chosen host).

### Integration Points
- Vercel project (existing) — root directory flips to `frontend/`; env `NEXT_PUBLIC_API_URL`.
- Backend `main.py` CORS — the one permitted backend change zone (allow-list Vercel origin).
- Health/system endpoint (`backend/app/api/routers/system.py`) — target for the shell's live-backend badge and UptimeRobot keep-alive pings.

</code_context>

<specifics>
## Specific Ideas

- Shell must already "look worth a fortune": token-faithful cream/navy aesthetic, IBM Plex Sans Arabic, mobile-first 390px — judges may see the URL before Phase 5 polish.
- Backend-health badge doubles as the live-infrastructure proof for success criterion 5 — visible, not buried in devtools.
- User operating in full-autonomous mode from Area 1 Q4 onward: recommended options auto-selected, logged with `(auto — recommended)` markers above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Live Bilingual Foundation*
*Context gathered: 2026-07-15*
