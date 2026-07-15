# Feature Research

**Domain:** Arabic-first RTL open-banking SME financing fintech (merchant app + bank-admin underwriting surface)
**Researched:** 2026-07-15
**Confidence:** MEDIUM (web-sourced fintech UX patterns, cross-checked across multiple independent sources; grounded against HIGH-confidence internal contract in `RAFID_FRONTEND_HANDOFF.md` which is authoritative for field shapes/API)

## Feature Landscape

### Table Stakes (Users Expect These)

Features a judge/user assumes exist. Missing these makes the demo feel broken or amateur, regardless of the underlying engine quality.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Auth + role-gated routing (merchant vs bank_admin) | Any fintech product with two user types must clearly separate them; a judge who can see admin data as a merchant reads as a security bug | LOW | Handoff §4/§7 — build first, everything else sits behind it |
| One primary "hero number" per screen | Fintech dashboards (Mercury/Brex/Ramp pattern) lead with one number that answers the user's first question — balance, score, outstanding — everything else secondary | LOW | Dashboard = held receivables/revenue; contract = outstanding; score reveal = the score itself |
| Connect-accounts flow with visible per-account status | SME merchants expect to see which bank/platform is linked, when, and be able to revoke — standard open-banking consent UX | MEDIUM | 3-step handshake (start consent → complete → aggregate); show connected/pending/revoked state per account clearly |
| Score/risk display with a single clear grade | Any credit-scoring product needs an instantly legible outcome (gauge + band letter), not just a raw number | LOW-MEDIUM | Circular/speedometer gauge, 0–1000 rescaled, color-coded band A/B/C/D — see ARCHITECTURE/STACK for exact viz choice |
| Offer/cost breakdown before commitment | Standard lending UX — user must see full cost (principal, fees, profit, total repayable) before accepting; hiding this reads as predatory | LOW | Server-computed only (`POST /offers/generate`) — never compute client-side |
| Repayment progress + schedule | Loan/financing products are expected to show "how much is left, when's next payment" — a static "approved" screen with no ongoing state feels unfinished | MEDIUM | Progress bar + schedule table/timeline; both "plan" (schedule[]) and "ledger" (repayments) must render since the monitoring agent changes them live |
| Alerts/notifications for risk events | Once alerts exist as a concept (revenue drop, settlement delay, missed repayment) a merchant-facing product without a visible alerts screen feels incomplete and untrustworthy | LOW-MEDIUM | 3 types × 3 severities; needs distinct color/icon per severity — do not reuse one alert style for everything |
| Loading / empty / error states on every data screen | A blank white screen or console error while data loads reads as broken in a live demo, and judges will see it since the monitoring agent causes visible mid-demo state changes | LOW | Skeleton loaders, "not yet scored" empty state pre-assessment, 400 toast / 401 refresh-then-logout / 403 hidden route / 422 field errors per handoff §4 |
| Responsive layout, mobile-first | QR-code hackathon traffic is phones; a desktop-only layout that breaks at 390px is an instant amateur signal | MEDIUM | Handoff explicitly calls out 390px test, admin table → stacked cards on phones |
| i18n parity (Arabic RTL primary + English) | Already a fixed requirement — but as a feature-completeness bar: every screen, not just marketing copy, must have full parity in both languages/directions or it reads unfinished | MEDIUM-HIGH | Numbers/dates must also mirror correctly in RTL (careful with LTR numerals inside RTL sentences — a common Arabic-fintech bug) |
| Dark/light mode | Already fixed requirement — feature-completeness implication: gauge colors, risk-band colors, alert-severity colors all need distinct light+dark tokens, not just backgrounds | MEDIUM | Design tokens (handoff §1) need dark variants added, especially the new risk-D and alert-severity colors that don't exist yet |
| Underwriting drill-down for admin | Any B2B admin/ops surface needs the ability to go from a list to full detail on one record — portfolio table with no drill-down is not a credible "bank admin" surface | MEDIUM | Merchant list → full history (connections/assessments/offers/contracts/alerts) — standard drill-down pattern |
| Demo-dataset disclaimer | Explicit product/compliance requirement (handoff, PROJECT.md) — must be visible until licensed | LOW | Small persistent banner/footer note, both languages |

### Differentiators (Competitive Advantage / WOW Factor)

Features that set this apart for judges — align tightly with Core Value ("explainable score reveal → Murabaha offer → contract that visibly repays itself, live").

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Explainability screen (reasons[] + feature_contributions, negative bars) | Most fintech scoring UIs hide the model as a black box; showing *why* a merchant scored what they scored — including negative contributions (e.g., chargebacks pulling score down) — is the single most defensible "explainable AI" story in the pitch. Research confirms best practice is plain-language reasons + simple signed bar/waterfall, not a raw SHAP dump | MEDIUM | Handoff calls this out explicitly as "pitch differentiator, keep prominent." Translate backend English `reasons[]` to Arabic; bar chart must support negative values |
| Live self-updating contract (real-time-feeling repayment) | Because the monitoring agent actually advances simulated time and mutates `outstanding` every ~15s, a smooth count-down tween + "settlement received" toast turns a backend cron job into a visceral live-money demo moment — genuinely rare for a hackathon to have real backend state changing under a UI, not fake/scripted | MEDIUM-HIGH | This is the single best "worth a fortune" moment if executed with animation (GSAP tween on outstanding, pulse/toast on new repayment row) |
| Score gauge sweep + count-up animation | Turns a static number into a moment of reveal — judges remember reveals, not tables. Aligns with "explainable score reveal" being the pitch's centerpiece | LOW-MEDIUM | Ring sweep + count-up to real value, ~1.4s easing, respect `prefers-reduced-motion` |
| Murabaha transparency framing done *well* (not just compliantly) | Most competitors treat Sharia-compliance as a legal checkbox; presenting it as a genuine UX narrative (plain "cost price + disclosed profit = total payable," visible amortization, zero interest-adjacent language anywhere) turns compliance into a trust/marketing asset for Saudi judges who know the SAMA/Vision 2030 context | LOW-MEDIUM | Full breakdown card on offer screen: principal → advance ratio → platform fee (2%) → success fee (1%) → Murabaha profit (6%, disclosed) → total repayable. Never say "interest" |
| Underwriter risk portfolio view (funnel + risk donut + open alerts) | Shows the product isn't just a merchant toy — it's a real B2B lending pipeline a bank would actually run, which matters a lot for a bank-track hackathon judge | MEDIUM | Portfolio home: funnel (applied→scored→offered→accepted→active), risk-band donut, contract stats, open alert count |
| "Advance one day" / demo-tick control | Lets presenters *choreograph* the live-money moment on demand instead of waiting/hoping for the real 15s cycle to land during the 3-minute demo window — huge risk-reduction for a rehearsed pitch | LOW | `POST /admin/monitor/tick`, gate behind `MONITOR_ENABLED=false`; hide from production/merchant view entirely |
| Manual settlement-receive trigger for a "money arrives" beat | `POST /settlements/{id}/receive` lets a presenter force a payout mid-demo — same choreography value as the tick control, specifically for the "watch money hit the merchant" moment | LOW | Admin-only or hidden dev control; don't expose to merchant role |
| Seeded-account switching for demo | Fast-switching between merchant03 (happy path) and merchant17/20 (risky/decline/alerts story) during a live demo lets one presenter show the full spectrum of outcomes in minutes without re-seeding | LOW-MEDIUM | Could be a login-screen quick-picker in dev/demo build only — not a production feature; keep clearly dev-gated |
| Micro-interactions everywhere else (staggered card entrance, connect-toggle springs, severity-graded alert entrance) | Research on hackathon judging is explicit: a loading-spinner-to-checkmark transition "feels 10x more professional" — small, cheap animations compound into a "worth a fortune" perception even when the underlying logic is simple | LOW each, MEDIUM in aggregate | Already scoped in handoff §8 — reinforced by research as high-leverage, low-cost signal for judges specifically |

### Anti-Features (Deliberately Do Not Build)

Things that seem good but create real problems for this project's compliance framing, timeline, or backend contract.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|------------------|-------------|
| Any "interest"/"فائدة" language, APR display, or interest-style framing | Users/devs default to familiar loan vocabulary; APR is the standard lending-transparency metric elsewhere | Hard product/compliance rule violation — Murabaha framing is non-negotiable; using "interest" anywhere (even in an internal tooltip) breaks the entire pitch's Sharia-compliance claim | Show `profit_amount` as a disclosed fixed markup on `cost_price`, always paired with the Murabaha explanation copy from the prototype |
| Client-side computation of score, fees, or days-remaining | Feels faster to build (no round trip), tempting for a countdown timer or "estimate your offer" slider | `Decision`/`Offer` are opaque server outputs per the AI-engine boundary; recomputing client-side risks silently diverging from the real 7-factor model and undermines the "transparent explainable model" pitch if the UI's math doesn't match the server's. Days-remaining against browser clock is provably wrong since the calendar is simulated server-side | Always render server-returned fields; poll `sim_date`-bearing endpoints for anything time-sensitive |
| Websocket/real-time push for live updates | "Live self-updating contract" sounds like it wants websockets | Backend exposes none — this is an explicit out-of-scope in PROJECT.md; building a websocket layer would be pure wasted effort against zero backend support with 2 days left | Polling (5–15s) via TanStack Query/SWR `refetchInterval`, animated on value change to *feel* live without being push-based |
| Free-text "requested amount" slider without backend confirmation | Feels like better UX ("let the merchant pick their financing amount") | `/offers/generate` sizing is `max_advance_amount`-driven by the assessment; if the router doesn't actually accept a `requested_amount` param (unverified against live OpenAPI per handoff §3), building a slider UI implies a capability that may 422 or silently ignore input | Verify against live `/openapi.json` first; if unsupported, present the server-computed offer as-is with no editable amount input |
| Real bank/aggregator integration (Lean/Tarabut) | Feels more "real" / impressive to judges that it's not mocked | Explicit out-of-scope; real open-banking integration requires licensing/SAMA approval processes far outside a 2-day hackathon window and isn't what's being judged | Mock provider + clear demo-dataset disclaimer; frame it as "production-ready seam, mock provider today" in the pitch narrative instead of trying to fake real bank connectivity |
| مدى / هنقرستيشن as connectable platforms | Present in the original hackathon prototype copy, natural to want full parity with the pitch deck's visuals | Not modeled in the backend enum (`salla`, `zid`, `jahez`, `foodics` only) — building UI for them creates dead-end options that 422 on submit | Drop them from platform-selection UI entirely; keep only the 4 real enum values |
| Fully custom SHAP beeswarm/summary-plot visualization for the merchant score screen | XAI literature treats SHAP summary plots as "gold standard" for explainability, tempting to port directly | Raw SHAP-style plots are analyst/statistician tooling — research confirms they "confuse users" without translation; wrong altitude for a merchant-facing screen with a 2-day build budget | Plain-language `reasons[]` + simple signed contribution bar chart for merchants; reserve any denser visualization (if built at all) for the bank-admin underwriting view, which has a more expert audience |
| Gamification (badges, streaks, XP) on repayment tracking | Consumer fintech/personal-finance apps use gamification to motivate repeat engagement | This is a B2B SME financing product with a fixed, short simulated contract lifecycle, not a habit-forming consumer app — badges/streaks would feel tonally mismatched with the professional/bank-grade positioning judges expect, and burn build time with zero pitch value | Use progress bars and clear "X of Y repaid, Y remaining, next settlement on [date]" language instead — motivational clarity without game mechanics |

## Feature Dependencies

```
Auth + role routing
    └──requires──> (nothing; foundation)

Connect-accounts wizard
    └──requires──> Auth + role routing

Aggregate (POST /merchants/me/aggregate)
    └──requires──> Connect-accounts wizard (at least one bank + one sales connection)

Dashboard (revenue/receivables/balances)
    └──requires──> Aggregate

Score reveal / explainability screen
    └──requires──> Aggregate (assessment needs aggregated features)

Offer review (Murabaha breakdown)
    └──requires──> Score reveal (offer sizing derives from assessment's max_advance_amount)

Active contract (polling, live outstanding)
    └──requires──> Offer review (offer must be accepted)

Repayment schedule + ledger view
    └──requires──> Active contract

Alerts screen
    └──enhances (not requires)──> Active contract (alerts can fire independent of a specific contract, but are most meaningful once one exists)

Bank admin: Merchant list + drill-down
    └──requires──> Auth + role routing (bank_admin)
    └──enhances──> Explainability screen pattern (drill-down reuses the same score/reasons rendering, elevated to underwriter view)

Bank admin: Underwriting view + annotate
    └──requires──> Merchant list + drill-down

Bank admin: Portfolio home (funnel/risk donut/stats)
    └──requires──> a populated merchant/contract dataset (seeded data satisfies this from day one)

Demo-tick control (admin) ──enhances──> Active contract, Repayment schedule, Alerts (lets presenter choreograph their live-update moments)

Manual settlement-receive trigger ──enhances──> Active contract ("money arrives" beat)

WOW animation layer (gauge sweep, count-up tween, staggered entrances, alert entrance grading)
    └──enhances──> Score reveal, Active contract, Alerts, Dashboard cards
    (explicitly sequenced *after* integration per handoff §7 — do not build before the underlying screens work)

i18n (ar/en) + dark/light mode
    └──conflicts with──> "build baseline first, then WOW" if retrofitted late (per PROJECT.md Key Decisions: must be scaffolded from the start, not bolted on)
```

### Dependency Notes

- **Score reveal requires Aggregate:** the assessment endpoint needs aggregated 90-day features; running it against a merchant with zero aggregation will legitimately return a low/empty score or error — the UI must not let a user reach the score screen without first completing connect+aggregate (or must handle that empty state gracefully for the seeded "not yet scored" accounts).
- **Offer review requires Score reveal:** `max_advance_amount` and `risk_band` gate what `/offers/generate` can return; the UI flow must be strictly sequential (can't jump straight to an offer screen without an assessment existing).
- **Active contract requires Offer review (accepted):** `POST /offers/{id}/accept` is the only path to a `ContractOut`; there is no "browse contracts" without first accepting an offer.
- **Alerts enhances rather than requires Active contract:** alert types include `revenue_drop` and `settlement_delay`, which can theoretically relate to accounts/receivables activity even pre-contract, so the Alerts screen should be reachable independently, not gated behind having an active contract.
- **Demo-tick control and manual settlement-receive trigger enhance the live-update features:** these are presenter tools, not end-user features — they should be visibly separated in the admin UI (e.g., a "Demo Controls" panel) so they never look like a real production feature to a judge reading the screen, while still being the mechanism that makes the "live" story reliable on stage.
- **i18n/dark-mode conflicts with late retrofitting:** already resolved as a Key Decision in PROJECT.md — scaffold both from the start of the baseline build, not after WOW polish, because retrofitting RTL/dark tokens across already-styled components is far more expensive than building on tokens from day one.
- **WOW animation layer enhances but never blocks:** every animated feature (gauge sweep, tween, stagger) must degrade gracefully to an instant/static render when `prefers-reduced-motion` is set or if animation libraries aren't loaded yet — the underlying data screens must be fully functional before any animation is layered on, per the explicit "integration first, polish second" build order.

## MVP Definition

### Launch With (v1 — must work live for judging July 17)

- [ ] Auth + role routing (merchant/bank_admin), JWT storage, refresh-on-401 — everything else is unreachable without this
- [ ] Connect-accounts wizard + aggregate — required to reach any real data
- [ ] Merchant dashboard (revenue, receivables, balances) — table-stakes hero screen
- [ ] Score reveal with explainability (reasons[] + feature_contributions, negative-bar support) — the pitch's core differentiator; not optional
- [ ] Offer review with full Murabaha breakdown, accept/reject — the actual product transaction
- [ ] Active contract with polling + visibly live `outstanding` — the "worth a fortune" live-money moment; this is the demo centerpiece
- [ ] Alerts screen (3 types × 3 severities, color-graded) — explicitly called out as "not optional, it's part of the monitoring-agent pitch"
- [ ] Bank admin: portfolio home + merchant list/drill-down + underwriting/annotate — required to show the two-sided product story
- [ ] Demo-tick control + manual settlement-receive trigger (admin, gated) — de-risks the live demo timing
- [ ] Loading/empty/error states on all data screens — a live demo with a bare white screen or unhandled 401 kills credibility instantly
- [ ] i18n (ar/en full parity) + dark/light mode scaffolded from the start — fixed requirements, feature-complete on every v1 screen
- [ ] Mobile-first responsive at 390px through desktop — QR-code judge traffic will be on phones
- [ ] Demo-dataset disclaimer — compliance/product requirement

### Add After Baseline Works (v1.x — polish pass, still before judging)

- [ ] Score gauge ring-sweep + count-up animation — trigger: baseline score screen renders correctly with real data
- [ ] Contract outstanding smooth-tween + "settlement received" toast/pulse — trigger: polling confirmed working against live monitoring agent
- [ ] Staggered card entrances (dashboard, admin portfolio) — trigger: static layouts confirmed responsive and correct
- [ ] Connect-toggle springs + live counter tick-up — trigger: connect wizard functionally complete
- [ ] Severity-graded alert entrance animation — trigger: alert feed rendering correctly with real severities
- [ ] Seeded-account quick-switcher for demo choreography — trigger: core merchant loop stable enough to rehearse against

### Future Consideration (v2+ — beyond hackathon scope)

- [ ] Real Lean/Tarabut open-banking integration — deferred; enum swap only when SAMA licensing exists
- [ ] Requested-amount slider on offer generation — deferred until backend param confirmed supported; don't build speculative UI against unverified API surface
- [ ] Denser underwriter-only analytics (SHAP-style detail views, portfolio concentration heatmaps by industry/geography) — valuable for a real bank deployment, out of scope for a 2-day demo where the funnel/donut/drill-down already tells the underwriting story

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|----------------------|----------|
| Auth + role routing | HIGH | LOW | P1 |
| Connect wizard + aggregate | HIGH | MEDIUM | P1 |
| Score reveal + explainability | HIGH | MEDIUM | P1 |
| Offer review (Murabaha breakdown) | HIGH | LOW-MEDIUM | P1 |
| Active contract + polling | HIGH | MEDIUM | P1 |
| Alerts screen | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Bank admin portfolio + drill-down | HIGH | MEDIUM | P1 |
| Demo-tick / settlement-receive controls | MEDIUM (presenter-only) | LOW | P1 |
| Loading/empty/error states | HIGH (invisible until missing) | LOW-MEDIUM | P1 |
| i18n + dark/light mode | HIGH (fixed requirement) | MEDIUM-HIGH | P1 |
| Responsive mobile-first | HIGH | MEDIUM | P1 |
| Score gauge sweep/count-up animation | HIGH (judge "wow") | LOW-MEDIUM | P2 |
| Contract outstanding tween + toast | HIGH (judge "wow") | MEDIUM | P2 |
| Staggered entrances / micro-interactions | MEDIUM | LOW each | P2 |
| Seeded-account quick-switcher | MEDIUM (demo speed) | LOW | P2 |
| Real open-banking integration | LOW (out of scope) | HIGH | P3 |
| Requested-amount slider | LOW-MEDIUM (unverified need) | MEDIUM | P3 |
| Dense underwriter analytics (SHAP detail, heatmaps) | LOW (for hackathon) | HIGH | P3 |
| Gamification on repayment | LOW (tonally wrong) | MEDIUM | Anti-feature |

## Competitor Feature Analysis

| Feature | Mercury/Brex/Ramp (SMB fintech) | Consumer credit-score apps (Aella, Credit Pros style) | Rafid Approach |
|---------|----------------------------------|--------------------------------------------------------|-----------------|
| Primary dashboard metric | One hero number per role (balance for founders, spend density for finance teams) | Score number + trend | Held receivables/revenue on merchant dashboard; score itself is a separate reveal moment, not buried in the dashboard |
| Score/risk explainability | N/A (not a credit-scoring product) | Score shown, factors often generic ("payment history," "utilization") with little specificity | Real per-merchant `reasons[]` + signed `feature_contributions` — more specific and transparent than typical consumer apps |
| Cost/fee transparency | Itemized in billing/statements | N/A | Full Murabaha breakdown (principal, advance ratio, platform fee, success fee, profit) shown before acceptance — more upfront than typical "APR buried in fine print" lending UX |
| Live/real-time state | Balance updates on real transactions (genuinely real-time via banking rails) | Score refresh on a schedule (weekly/monthly typically) | Simulated-but-visibly-live via monitoring agent + polling — faster perceived cadence (15s/day) than either comparator, tuned specifically for demo impact |
| Admin/ops-side view | Enterprise finance-team views (Brex) with custom roles/policy engine | N/A (consumer-only) | Bank admin portfolio + underwriting drill-down — closer to Brex's ops-surface pattern than to a consumer app, appropriately since the audience is a bank underwriter |
| Compliance framing | Standard interest/APR-based | Standard interest/APR-based | Explicit non-interest Murabaha framing throughout — a genuine differentiator versus every conventional comparator listed |

## Sources

- [Fintech Dashboard Design: Patterns That Work — Masterly](https://www.themasterly.com/blog/fintech-dashboard-design-guide)
- [The CFO Dashboard: Ramp, Brex or Mercury — Fintech Brainfood](https://www.fintechbrainfood.com/p/the-cfo-dashboard)
- [Explainable AI (XAI): A UX Guide to Financial Transparency — Ergomania](https://ergomania.eu/explainable-ai-xai-ux-design-finance/)
- [SHAP for Credit Risk: Interpreting Machine Learning Black Box — Medium](https://valooresanalyticsdept.medium.com/shap-for-credit-risk-interpreting-machine-learning-black-box-459a511e9e1e)
- [Explainable AI in Finance: Addressing the Needs of Diverse Stakeholders — CFA Institute](https://rpc.cfainstitute.org/research/reports/2025/explainable-ai-in-finance)
- [Islamic Fintech App Development Saudi Arabia (2026) — Logio Legion](https://logiolegion.com/blogs/islamic-fintech-app-development-saudi-arabia-sama-sharia-guide-2026)
- [Islamic Fintech UX: Avoiding Interest, Encouraging Savings — Itexus](https://itexus.com/islamic-fintech-ux-avoiding-interest-encouraging-savings/)
- [Building Sharia-Compliant Financial Products: Murabaha and Beyond — Fimple](https://fimple.co.uk/building-sharia-compliant-financial-products-murabaha-and-beyond/)
- [Great UX in FinTech Simplifies Financial Decisions for All — Medium](https://medium.com/@levitation.llc/great-ux-in-fintech-simplifies-financial-decisions-for-all-668ab4be005e)
- [10 Must-Have UX Design Principles for Fintech — WeAreTenet](https://www.wearetenet.com/blog/ux-design-for-fintech)
- [Credit Risk Dashboard: How to Design and Use — FasterCapital](https://fastercapital.com/content/Credit-Risk-Dashboard--How-to-Design-and-Use-a-Credit-Risk-Dashboard.html)
- [How CRE Lenders Gain an Edge with Risk Management Dashboards — Built](https://getbuilt.com/blog/risk-management-dashboards-lender/)
- [8 Tips to a Successful Hackathon Demo and Presentation — Medium](https://medium.com/upstate-interactive/8-tips-to-a-successful-hackathon-demo-and-presentation-4d1ae83415ad)
- [How to Win a Hackathon: Notes From the Judging Table — JetBrains Blog](https://blog.jetbrains.com/ai/2026/06/how-to-win-a-hackathon-notes-from-the-judging-table/)
- [Understanding hackathon submission and judging criteria — Devpost](https://info.devpost.com/blog/understanding-hackathon-submission-and-judging-criteria)
- [Fintech UX Design: 10 Best Practices for Dashboards — WildnetEdge](https://www.wildnetedge.com/blogs/fintech-ux-design-best-practices-for-financial-dashboards)
- [A Comprehensive Guide to Notification Design — Toptal](https://www.toptal.com/designers/ux/notification-design)
- [UX Challenges in Fintech Products: Designing for Trust, Compliance, and Scale — UITop](https://uitop.design/blog/ux-challenges-in-fintech-products-designing-for-trust-compliance-and-scale/)
- Internal: `RAFID_FRONTEND_HANDOFF.md` (authoritative screen inventory, API surface, field mappings) — HIGH confidence, primary source
- Internal: `.planning/PROJECT.md` (scope, constraints, out-of-scope decisions) — HIGH confidence, primary source

---
*Feature research for: Arabic-first RTL open-banking SME financing fintech (Rafid)*
*Researched: 2026-07-15*
