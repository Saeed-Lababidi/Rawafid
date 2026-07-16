# Rafid — Frontend Handoff (prototype → production)

> Paste into Claude Code (fable 5). §§0–2 = product/design context from the hackathon prototype. §§3+ = the **real** contract, now confirmed against `FRONTEND_GUIDE.md` (backend) and the `rafid-engine` README (AI engine). Build order: **integration first, polish later.**

---

## 0. What this is

**Rafid (رافد)** — open-banking SME financing, AMAD hackathon (Open Banking track), فريق روافد. Merchant connects bank + sales-platform accounts (open banking consent) → backend aggregates 90 days of data → **rafid-engine** scores creditworthiness with a transparent, explainable model → merchant gets **Sharia-compliant Murabaha** cash against confirmed held receivables → repayment auto-collects from incoming settlements via a background monitoring agent that also raises risk alerts. Every financed, well-behaved merchant becomes a qualified lead for the bank underwriter (`bank_admin`) surface.

- **Two real roles, two apps/views:** `merchant` and `bank_admin` (from JWT `role` claim). The hackathon prototype's single "منظور البنك" tab becomes a proper admin surface with its own auth.
- Arabic, **RTL throughout**. Keep "Murabaha" framing — `cost_price` + disclosed `profit_amount` = `sale_price`; **never** use the word "interest"/"فائدة" anywhere in copy.
- Demo dataset disclaimer stays in the UI until licensed.

---

## 1. Design system (unchanged — lock as tokens)

```
Colors
  --navy #032341 · --terra #C36B4E · --purple #8980BC · --cream #F6E7DC
  --page-bg #F7F2EC · --card #FFFFFF · --card-border #EDE3D6
  --hairline #F0E7DA/#E9DFD3 · --muted-text #8A7E70 · --body-text #4A4238/#6B6156
  --good #3E7C4F/#2F6140 bg #EAF2EA border #CDE0CF
  --warn-chip-bg #F1E4DB text #C36B4E border #E4CDBF
  --purple-chip-bg #EDEBF5 text #6F67A8
  --risk-A/B (good-ish), --risk-C (terra/amber), --risk-D (need a red — none defined yet, add one, e.g. oklch-derived from terra toward red)

Type: IBM Plex Sans Arabic 400/500/600/700. H1 28px/700 · card H2 17px/700 · body 13–14px · meta 11–12px muted. Big numbers 38–46px/700.
Shape: cards radius 18px · tiles 12px · pills 999px · grid gap 18px · grids `repeat(auto-fit, minmax(320–340px, 1fr))` (mobile-first collapse to 1 col — QR traffic is phones).
```

Note: add a **risk-band D / declined** visual state and an **alert-severity** color scale (low/medium/high) — the prototype never modeled declines or alerts; production must.

---

## 2. Screen inventory (updated for real roles + lifecycle)

**Merchant app**
1. **Register / Login** — new. Email+password, JWT storage, refresh-on-401.
2. **Connect accounts wizard** — bank + sales platform consent (real 3-step handshake, §4), then aggregate.
3. **Dashboard** — revenue chart, held receivables, balances (was "لوحة التاجر").
4. **Get financing / score reveal** — runs the real assessment; explainability screen (`reasons[]`, `feature_contributions{}`) — **pitch differentiator, keep prominent**.
5. **Offer review** — full Murabaha cost breakdown, accept/reject (was "التمويل", now with real fields + expiry + underwriter annotation visibility).
6. **Active contract** — live progress, schedule timeline, repayment feed. **Polls** (monitoring agent auto-advances, §6).
7. **Alerts** — new. `revenue_drop` / `settlement_delay` / `missed_repayment`, severity-colored.
8. **Connections / settings** — view + revoke.

**Bank admin app** (separate auth surface, `bank_admin` role)
9. **Portfolio home** — funnel + risk donut + contract stats + open alerts (was the 4 stat tiles).
10. **Merchant list + drill-down** — was the "منظور البنك" table; drill-down now pulls full history (connections/assessments/offers/contracts/alerts).
11. **Underwriting view** — explainability for review + annotate an offer.
12. **Demo control** — "advance one day" tick button (only useful if `MONITOR_ENABLED=false`).

---

## 3. Mapping prototype copy/shapes → real API (read before reusing prototype code)

The prototype's numbers were invented for the pitch; the real backend has **different scales and enums**. Don't port the mock data as-is — re-map the Arabic labels onto the real fields:

| Prototype | Real | Note |
|---|---|---|
| Score `771 / 850`, grade `"جدارة عالية A−"` | `score` **0–1000**, `risk_band` **A/B/C/D** (A≥750, B≥600, C≥450, D<450 = declined) | Rescale the gauge to /1000; write Arabic grade labels per band (e.g. A→"جدارة ائتمانية ممتازة", D→"غير مؤهل حاليًا"). |
| `factors[]` with hand-picked % | `decision.feature_contributions{}` (points, sum to score) + `decision.reasons[]` (human strings, **English** from backend — translate or wrap) | Contributions can be negative (e.g. chargebacks) — bar chart must support negative bars. |
| Max advance flat 80% | `decision.max_advance_ratio` **band-dependent**: A=0.80 B=0.70 C=0.55 D=0 | Don't hardcode 80%. |
| Finance screen: client computed `fee = amount*2.1%` | `POST /offers/generate` returns real breakdown: `principal, advance_ratio, platform_fee(2%), success_fee(1%), profit_amount(6% disclosed Murabaha profit), total_repayable` | **No client-side fee math** — call the endpoint. Amount isn't freely chosen by the merchant; the offer is sized off `max_advance_amount` from the assessment. If you want an amount slider, confirm with backend whether `/offers/generate` accepts a requested amount (check OpenAPI — the engine's `quote(decision, requested_amount=...)` suggests it should; verify the router param). |
| Static "accepted" success card | `POST /offers/{id}/accept` → real `ContractOut` with `outstanding` that **changes on its own** every ~15s (monitoring agent) | Contract screen needs polling, not a one-time render. |
| Repayment schedule invented client-side | `GET /contracts/{id}` → `schedule[]` tied to real `settlement_id`s; `GET /contracts/{id}/repayments` → actual collection events | Render both: schedule = plan, repayments = ledger. |
| Banks: مصرف الإنماء / الراجحي / **بنك البلاد** | Real enum: `alinma`, `alrajhi_synth`, **`riyad_synth`** | Swap البلاد → **بنك الرياض**. |
| Platforms: جاهز/سلة/بوابة مدى/زد/فودكس/هنقرستيشن | Real enum: `salla`, `zid`, `jahez`, `foodics` **only** | Drop مدى (payment gateway, not a linkable sales platform in this backend) and هنقرستيشن — not modeled. Keep سلة/زد/جاهز/فودكس. |
| No alerts anywhere | Real `RiskAlertOut` — 3 types × 3 severities | New UI needed; not optional, it's part of the monitoring-agent pitch. |
| No auth | Real JWT (access 30min / refresh 7d), roles gate routes | Build this first — everything else sits behind it. |

---

## 4. Real API surface (confirmed — source of truth is the live OpenAPI spec)

- Swagger: `http://localhost:8000/docs` · spec: `http://localhost:8000/openapi.json`
- Codegen: `npx openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts` (or orval/openapi-generator)
- Base URL dev: `http://localhost:8000`, no prefix, CORS open.

**Auth:** `POST /auth/register`, `/auth/login`, `/auth/refresh`, `GET /auth/me`. Bearer token on every request; derive merchant from token, never send merchant id.

**Merchant:**
- `GET/PATCH /merchants/me`
- Connections: `POST /connections/{bank|sales}/consent/start` → `POST /connections/consent/complete` (any non-empty `auth_code` works — mock provider) → `GET /connections` → `POST /connections/{id}/revoke`
- `POST /merchants/me/aggregate` → counts + `held_receivables_total` (idempotent/incremental — calling twice returns zeros, that's correct)
- Reads: `GET /accounts`, `GET /transactions?limit=`, `GET /sales?limit=` (up to 5000), `GET /settlements`
- `POST /settlements/{id}/receive` — manual demo trigger, forces a payout now (good "money arrives" demo beat)
- `POST /assessments/run` → `AssessmentDetailOut` (score/band/features/decision); `GET /assessments/me`, `GET /assessments/{id}`
- `POST /offers/generate`, `GET /offers/me`, `POST /offers/{id}/accept`, `POST /offers/{id}/reject`
- `GET /contracts/me`, `GET /contracts/{id}` (+schedule), `GET /contracts/{id}/repayments`
- `GET /alerts/me`

**Admin (`bank_admin`):** `GET /admin/merchants`, `GET /admin/merchants/{id}` (full drill-down), `GET /admin/assessments/{id}`, `GET /admin/portfolio`, `GET /admin/alerts?include_resolved=`, `POST /admin/offers/{id}/annotate`, `POST /admin/monitor/tick`.

**Error shape:** always `{ "detail": "..." }`; 400 business rule (toast-able), 401 (try refresh once, else logout), 403 (hide the route), 404, 409, 422 (Pydantic array).

**TypeScript types:** copy verbatim from `FRONTEND_GUIDE.md` §11 into `src/api/types.ts` — every interface is already written (TokenPair, MerchantOut, ConnectionOut, AssessmentDetailOut, OfferOut, ContractDetailOut, RiskAlertOut, PortfolioOut, etc). Don't hand-retype them.

**AI engine boundary (rafid-engine):** pure Python, two functions only — `assess(features) -> Decision`, `quote(decision, requested_amount) -> Offer`. No DB/network. **Frontend never calls this directly** — it's server-side only, surfaced through `/assessments/run` and `/offers/generate`. Treat `Decision` (score, risk_band, reasons, feature_contributions) as opaque server data to render, never recompute client-side.

---

## 5. Seeded demo accounts (use these while building)

- Admin: `admin@rafid.sa` / `AdminPass123!`
- Merchants: `merchant01@rafid.sa`…`merchant20@rafid.sa` / `MerchantPass123!` — all pre-connected + aggregated, **not yet scored** (run assessment live).
- `merchant03` (TechSouq) = healthy happy-path demo. `merchant17` (Amber Cosmetics) / `merchant20` (Safa Kitchen) = engineered risky, for the alerts/decline story.
- Reset anytime: `make reset` + restart uvicorn.

---

## 6. The monitoring agent — design consequence

Every **15 real seconds = 1 simulated day** in the backend (unless `MONITOR_ENABLED=false`). This auto-progresses settlements → repayments → contract closure → alerts, with zero frontend action. Consequences:
- **Poll** dashboard/contract/alerts screens every 5–15s (React Query/SWR `refetchInterval`) while visible — no websockets exist.
- Never compute "days remaining" against the browser clock — dates are on the simulated calendar; show absolute dates only. `sim_date` only comes from the admin-only tick response.
- Design the contract's `outstanding` number and schedule-item statuses to **animate smoothly on poll-driven change** (count-down tween, not a jump cut) — this is a live, self-moving number, which is actually a great animation opportunity (GSAP number tween + a subtle "settlement received" toast/pulse).
- Consider a hidden "advance day" control (`POST /admin/monitor/tick`) in the admin app for rehearsed demos.

---

## 7. Build order (integration first)

1. **Auth + role routing** — register/login, token storage + refresh interceptor, route guards for `merchant` vs `bank_admin`.
2. **API client** — generate types from OpenAPI (§4), one fetch/axios wrapper with the 401-refresh-retry + toast-on-400 pattern.
3. **Merchant core loop, in order:** connect wizard → aggregate → dashboard reads → assessment (score reveal) → offer → accept → contract (with polling) → alerts.
4. **Admin surface:** portfolio → merchant drill-down → underwriting/annotate → monitor tick control.
5. **THEN design polish** — §8.

Keep the Arabic copy tone from the prototype (score card explanation, Sharia note, receivables framing) but rebind every number/enum to the real fields per §3.

---

## 8. Design + animation polish (phase 2)

Mobile-first (QR traffic) — test at 390px first. Highest-risk responsive surfaces: finance/offer breakdown, score gauge, admin merchant table (→ stacked cards on phones).

- **Score gauge:** ring sweep + count-up to real `/1000` value, ease `cubic-bezier(0.22,1,0.36,1)` ~1.4s (GSAP).
- **Contract screen:** smooth-tween `outstanding` on each poll change; toast/pulse on new repayment; progress-bar fill.
- **Cards:** stagger-in on scroll (GSAP ScrollTrigger, 40–60ms apart).
- **Connect toggles:** spring on connect + live counter tick-up.
- **Alerts:** severity-colored entrance (high = more attention-grabbing, still restrained).
- Respect `prefers-reduced-motion`. Keep the admin table serious/low-animation.

---

## 9. Assets in this project
- `Rafid App.dc.html` / `Rafid App (standalone).html` — hackathon prototype (source of screen layout + Arabic copy — **not** the real data shapes, see §3).
- `Rafid Deck.dc.html` — pitch deck.
- `uploads/FRONTEND_GUIDE.md`, `uploads/README.md` — the real backend/engine contracts this doc is now based on.

## 10. Verified stats (pitch copy)
- SME lending = 11.3% of bank portfolios end-2025 (Vision 2030 target 20%).
- SME financing gap ≈ 300B SAR; total SME credit ≈ 468B SAR.
- SME GDP contribution ~23–30% → 35% target.
- SAMA-licensed open-banking providers: Lean (لين), Tarabut (تارابوت).
