# Pitfalls Research

**Domain:** Arabic-first RTL open-banking SME financing (fintech) web app — Next.js App Router frontend + free-tier deployment, hackathon-timeline (2 days)
**Researched:** 2026-07-15
**Confidence:** MEDIUM (web-search-sourced, cross-checked across 12 targeted queries and Rafid's own handoff doc; no vendor-doc/Context7 verification — treat specifics as directionally correct, verify exact APIs against current Next.js/TanStack/Render docs before relying on them)

## Critical Pitfalls

### Pitfall 1: RTL bolted on with `useEffect` + physical CSS properties

**What goes wrong:**
`dir="rtl"` gets set client-side after mount (e.g. inside a `useEffect` reading locale from context/localStorage), so the page paints LTR first then flips — visible flicker on every load, worse on slow connections. Compounded by using `margin-left`/`padding-right`/`text-align: left` throughout instead of logical properties, so mirroring breaks piecemeal across dozens of components instead of being automatic.

**Why it happens:**
Team builds the LTR/English version first ("we'll RTL it later"), or treats `dir` as client state instead of a server-rendered attribute. Tailwind's physical utilities (`ml-*`, `pr-*`, `text-left`) are the default muscle memory; logical variants (`ms-*`, `pe-*`, `text-start`) require deliberate choice.

**How to avoid:**
Set `dir` (and `lang`) on `<html>` in the root **server** layout, derived from the locale segment/cookie — never in a client `useEffect`. Build Arabic as the default/primary locale from the first screen (PROJECT.md already commits to this), not as a toggle bolted onto an English-first build. Use Tailwind's `rtl:`/`ltr:` variants or logical utility classes (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) everywhere instead of `ml/mr/pl/pr/left/right`. Lint-check for banned physical-property class names before merging screens.

**Warning signs:** Any component using `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`/`text-right` Tailwind classes; direction read from `useState`/`useEffect` instead of the server layout; visible flash on hard refresh.

**Phase to address:** Foundation/scaffold phase (design tokens + i18n/RTL setup), before any real screens are built — matches PROJECT.md's own decision "i18n + dark mode from scaffold, not retrofit."

---

### Pitfall 2: Digits, currency, and dates reverse or misorder in mixed Arabic/Latin strings

**What goes wrong:**
Numbers (score `847`, SAR amounts, percentages, dates) are digit characters, which the Unicode bidi algorithm treats as *weak* — direction is inherited from surrounding context, not fixed. Inside an RTL paragraph, a currency string like `1,250 ر.س` or a mixed sentence with an English enum value can silently reorder grouping separators, flip the position of the currency symbol, or interleave LTR text backwards. This is invisible in English-only testing and only surfaces once real Arabic copy surrounds real numbers.

**Why it happens:**
Numbers are formatted as plain strings and dropped into Arabic JSX without any bidi isolation; `Intl.NumberFormat`/`Intl.DateTimeFormat` locale is set but the surrounding markup doesn't isolate the numeric span from the RTL flow.

**How to avoid:** Decide the digits policy once (Western 0-9 vs Arabic-Indic ٠-٩) — for a fintech dashboard, Western digits are the safer default (bank statements, receipts, and Saudi fintech UIs overwhelmingly use them) and avoid this entire class of bug; enforce it centrally through one formatting utility (`formatSAR()`, `formatScore()`, `formatDate()`), never inline `toLocaleString()` calls per component. Wrap every rendered number/currency/date in a `<bdi>` element or CSS `unicode-bidi: isolate` so it can't inherit stray direction from neighboring Arabic text. Test every screen with real Arabic labels next to real numbers early — not just structurally with lorem ipsum.

**Warning signs:** Numbers reading in the wrong grouping order, SAR symbol on the wrong side of the amount, negative feature-contribution bars showing sign in the wrong place, dates rendering with reversed day/month order.

**Phase to address:** Foundation/scaffold phase (shared formatting utilities) — must exist before the score-reveal and offer-breakdown screens (Pitfall applies hardest to `feature_contributions`, `score`, `total_repayable`).

---

### Pitfall 3: IBM Plex Sans Arabic loads late, causing FOUT/layout shift on the highest-visibility screens

**What goes wrong:**
Arabic web fonts are large (multiple weights × Arabic glyph coverage) and if not preloaded/self-hosted, the browser shows a fallback font (wrong glyph shapes, wrong metrics) for a beat, then swaps — causing visible layout shift on cards/big numbers (the score gauge's 38-46px numerals are exactly where this is most noticeable). Safari in particular delays the swap longer than Chrome, so a demo laptop's browser choice matters.

**Why it happens:**
Loading Arabic fonts via a `<link>` to Google Fonts CDN instead of `next/font`, or using `next/font` without configuring `display` and fallback-metric adjustment; not preloading the specific weights actually used above the fold.

**How to avoid:** Load IBM Plex Sans Arabic via `next/font/google` (self-hosted, preloaded, zero external request) with explicit `weight: ['400','500','600','700']` and `display: 'swap'`; set `adjustFontFallback` (default on) so fallback-font metrics are size-matched to reduce shift. Verify only the weights actually used are loaded (four weights × Arabic block is not small — trim unused weights before demo build).

**Warning signs:** Visible text reflow/jump ~100-300ms after first paint; Lighthouse CLS warning on the score/dashboard screens; different font rendering between first paint and steady state in a screen recording.

**Phase to address:** Foundation/scaffold phase (font setup alongside RTL/design tokens).

---

### Pitfall 4: Dark mode flashes light (or vice versa) on every navigation

**What goes wrong:**
Theme preference is read from `localStorage` inside a `useEffect`, so the page always paints in the default theme first, then flips — a jarring white flash in a dark room, worse than it sounds for judge perception of polish. This is the single most common dark-mode bug, and it compounds with the RTL flash (Pitfall 1) if both are client-side.

**Why it happens:**
Dark mode is treated as pure client state (`useState` + `useEffect` + `localStorage`) instead of resolved before the first byte is sent — because that's the simplest implementation, and it "works" until you actually look at cold loads.

**How to avoid:** Resolve theme server-side: read a `theme` cookie in the root layout and apply the `dark` class to `<html>` there, so the correct theme is in the very first HTML sent. If a cookie isn't available yet, use a tiny inline blocking `<script>` in `<head>` (before any stylesheet) that reads `localStorage` and sets the class synchronously — never as an external/deferred script. Tailwind v4's `darkMode` config must be explicitly set (`selector`/`class`) — the default OS-preference mode won't respect a manual user toggle at all.

**Warning signs:** Visible flash switching from light→dark (or dark→light) on hard refresh; theme "flicker" reports from anyone testing at night; toggle working in dev but not after a fresh production deploy (cache/cookie mismatch).

**Phase to address:** Foundation/scaffold phase, same pass as RTL (both are "paint-before-JS" problems with the same fix shape: resolve server-side or block-before-paint).

---

### Pitfall 5: Hydration mismatches from simulated-date/"live" data crossing the server/client boundary

**What goes wrong:**
This project's data is unusually hydration-hostile: contract `outstanding`, `sim_date`-based day counts, and repayment status all change every ~15s server-side (monitoring agent), and the assessment/score screens likely fetch on the server for SSR speed. If a server-rendered value (fetched at request time) differs from what the client re-fetches/derives immediately after hydration — or if any component computes "days remaining" from `Date.now()`/`new Date()` in the browser instead of the server's absolute `sim_date` — React throws a hydration mismatch, or worse, silently renders wrong numbers that then jump on the client re-render.

**Why it happens:**
Mixing server-fetched initial data with client-side polling libraries without reconciling cache keys/initial data; computing relative dates ("3 days left") against the browser clock, which PROJECT.md and the handoff doc explicitly warn is wrong because dates live on a simulated calendar, not real time.

**How to avoid:** Never compute date math client-side against `Date.now()` — always render absolute dates from the server response and let the backend supply anything relative (or compute "days remaining" purely from two server-supplied absolute dates, not the wall clock). Pass server-fetched data into TanStack Query/SWR as `initialData`/`placeholderData` with matching query keys so the client doesn't immediately re-render a different value than what was server-rendered. Keep genuinely non-deterministic rendering (spinners tied to `Math.random()`, anything reading `window`) out of the initial render path entirely — defer to `useEffect`.

**Warning signs:** React "Text content does not match server-rendered HTML" console errors, especially on the dashboard/contract screens; countdown numbers that briefly show one value then snap to another right after page load; console errors that only appear in production build, not dev.

**Phase to address:** Merchant core loop phase (dashboard/contract screens) — call out explicitly in that phase's plan given this project's live-polling nature.

---

### Pitfall 6: JWT refresh race conditions under parallel polling requests

**What goes wrong:**
With contract/dashboard/alerts screens all polling every 5-15s (per handoff §6), multiple in-flight requests can hit a 401 at the same moment when the 30-minute access token expires. If each request independently tries to refresh, the first refresh call rotates/invalidates the token and the rest fail — potentially causing a false logout right in the middle of the "self-repaying contract" demo moment, which is the whole pitch.

**Why it happens:**
The "refresh-on-401" interceptor is implemented per-request instead of shared/mutex'd — natural first implementation for a single fetch wrapper, but breaks under concurrent polling, which single-request testing during dev won't surface.

**How to avoid:** Implement the refresh interceptor with a single in-flight refresh promise shared across all callers (classic axios/fetch interceptor pattern: if a refresh is already in progress, queue subsequent 401s behind it and retry with the new token once it resolves, don't fire N parallel refresh calls). Test this specifically by having 2+ polling screens open simultaneously near token expiry, not just one request at a time.

**Warning signs:** Random logouts during longer demo sessions; multiple simultaneous `POST /auth/refresh` calls in the network tab; works fine when clicking around but fails when the contract screen has been open (polling) for 30+ minutes.

**Phase to address:** Auth + API client phase (per handoff build order §7 step 1-2) — this is exactly why it's first in the build order; the mutex needs to be right before polling screens are layered on top in later phases.

---

### Pitfall 7: Refetch storms from independent polling hooks instead of one shared poller

**What goes wrong:**
If each component that shows live data (dashboard balance, contract outstanding, alerts badge, nav header) sets up its own `useQuery({ refetchInterval: ... })` against overlapping or near-duplicate endpoints, the app fires far more network requests than the monitoring agent actually needs, hammering the free-tier backend and risking rate limits or the free host's cold-start/sleep timer never triggering (which is good) but also risking visible request pile-up/jank if intervals aren't staggered. `refetchInterval` fires on its own clock regardless of `staleTime`, so a naive "poll everything, everywhere" pattern is easy to fall into.

**Why it happens:**
Each screen author independently reaches for `refetchInterval` on the query they need without checking whether that data is already being polled elsewhere in the tree, or without deduplicating via a shared query key.

**How to avoid:** Centralize live-data query keys (one `useContract(id)`, one `useAlerts()`) so TanStack Query's cache/dedup handles multiple consumers of the same key without multiplying requests. Only poll screens that are actually visible/mounted (React Query does this by default via `refetchIntervalInBackground: false` — leave it off). Pick one interval per data type aligned to the ~15s simulated-day cadence (handoff recommends 5-15s) rather than polling faster "to feel more live" — faster polling doesn't make the tween look smoother, it just adds load.

**Warning signs:** Network tab shows the same or near-identical GET firing from multiple places; backend logs show request bursts; free-tier host response times degrading during a demo walkthrough.

**Phase to address:** Merchant core loop phase (dashboard/contract/alerts) and admin surface phase — set the pattern once in the API client phase's query-hook layer so every subsequent screen reuses it.

---

### Pitfall 8: Poll-driven number updates jump-cut instead of tweening — kills the "pitch differentiator" moment

**What goes wrong:**
The single biggest demo beat (per handoff §6, and PROJECT.md's Core Value statement) is the contract's `outstanding` balance visibly counting down as the monitoring agent auto-collects repayments. If the UI just re-renders the new number on each poll (React's default), it snaps instantly with no visual continuity — the "wow" moment reads as a static number that occasionally glitches to a different value, not as money moving. Naive CSS counter/animation approaches can also jump straight to the final value if misconfigured for large numbers, defeating the animation even when one was attempted.

**Why it happens:**
Tweening a value that arrives from polling (not from a continuous animation loop) requires deliberately capturing the previous value and animating *between* poll snapshots — this is easy to skip under time pressure since "the number updates" technically works without it.

**How to avoid:** On each successful poll where the value changed, animate from the previous rendered value to the new one over ~800ms-1.4s (ease-out) rather than swapping instantly — a small custom hook (`usePreviousValue` + `requestAnimationFrame` or a lightweight tween lib) is enough; GSAP is already a candidate per the handoff. Pair with a subtle toast/pulse on the exact moment a new repayment lands, not just the number change, so the causal story ("a payment arrived") is visible even if the user glances away and back. Respect `prefers-reduced-motion` (handoff explicitly requires this) by falling back to instant updates for that audience.

**Warning signs:** Contract screen "works" in manual testing but looks static in a recorded demo; number changes are only noticed by comparing two screenshots, not by watching; no visual event tied to `POST /admin/monitor/tick` firing.

**Phase to address:** Polish/animation phase (handoff §8) — but the underlying poll-diffing hook should be built in the merchant core loop phase so polish only has to add the tween, not restructure data flow under time pressure.

---

### Pitfall 9: OpenAPI-generated types silently drift from the live backend

**What goes wrong:**
`schema.d.ts` is generated once early in the build, then the backend evolves (or the CORS/env config for the free host changes something) and nobody regenerates — TypeScript keeps compiling against the stale shape, so a renamed/added field (e.g. a `risk_band` `D` case, or `feature_contributions` sign convention) doesn't show as a type error, it just silently doesn't render or crashes at runtime on unexpected `undefined`.

**Why it happens:**
Codegen is a manual one-off command (`npx openapi-typescript ...`) run once during setup, not wired into a script that's re-run whenever backend or frontend work resumes — natural under 2-day time pressure where "it worked when I generated it" feels like it should stay true.

**How to avoid:** Add a single `npm run gen:api` script (wrapping the openapi-typescript command from handoff §4) and re-run it at the start of every work session and immediately after any backend/CORS/env change, not just once. Given the backend is "done" per PROJECT.md, drift risk here is lower than typical — but the free-host migration itself (moving off localhost:8000) is exactly the kind of change that can silently alter response shapes (e.g. different error middleware) if not re-verified against the deployed OpenAPI spec, not just the local one.

**Warning signs:** TypeScript compiles clean but a screen shows `undefined`/blank where data should be; a field works against `localhost:8000` but not against the deployed backend URL; `AssessmentDetailOut`/`OfferOut` shapes accessed via `any`/manual casts instead of the generated types (a sign someone gave up on the generated type and hand-typed around it — exactly what the handoff says not to do).

**Phase to address:** API client phase (generate + wire the script), re-verified in the deployment phase once the free backend host is live (regenerate against the deployed `openapi.json`, not just localhost).

---

### Pitfall 10: Free-tier backend host sleeps or wipes the database mid-demo window

**What goes wrong:**
Most zero-cost FastAPI hosts (Render free web service is the common default) spin down after ~15 minutes of inactivity; the next request pays a 30-60s cold start — which, hit live in front of judges after a Q&A pause, looks like the app is broken. Separately, free Postgres tiers on these same platforms auto-expire (commonly 30-90 days after creation) and get deleted with no warning banner in the app — if provisioned early in the 2-day build and the demo lands right at/after that window, the seeded dataset (`merchant03`/`merchant17`/`merchant20`) silently vanishes.

**Why it happens:**
Free tiers are provisioned once during setup and treated as "done"; nobody schedules a check against the exact expiry timestamp relative to July 17 judging, and nobody sets up an anti-sleep heartbeat because it feels like solved infrastructure rather than a demo-day risk.

**How to avoid:** Pick a free host whose sleep/cold-start behavior is known and mitigated: keep the backend warm with a free uptime pinger (UptimeRobot or similar) hitting a lightweight health endpoint every 5 minutes for the entire lead-up to and duration of judging. Note the exact Postgres free-tier expiry date the moment the DB is created and make sure it's nowhere near July 17; re-run `make reset` (per PROJECT.md) close to demo time regardless, as a known-good baseline. Since the monitoring agent (APScheduler) needs a genuinely long-running process — not serverless — confirm the chosen free host supports background schedulers running continuously, not just request/response (Vercel serverless is explicitly ruled out for the backend per PROJECT.md's own key decision).

**Warning signs:** First request of a demo session takes 30+ seconds; app "worked yesterday," breaks with a 500/connection-refused today; monitoring agent's simulated days stop advancing because the process was recycled/killed by the host.

**Phase to address:** Deployment phase — but the host choice/heartbeat setup should happen as early as possible (parallel to frontend build, not the last hour) precisely because sleep/expiry issues only surface after time has passed, not at initial provisioning.

---

### Pitfall 11: CORS misconfigured with a dangerous quick fix instead of an allow-list

**What goes wrong:**
Hitting a CORS error while wiring the deployed frontend to the deployed backend, the fast "fix" is `Access-Control-Allow-Origin: *` (or reflecting whatever `Origin` header arrives) — which works, ships, and is then forgotten. Combined with credentialed requests (cookies or `Authorization` header used for JWT), this is a real security hole, not just an anti-pattern, though for a hackathon demo the more immediate risk is that `*` silently breaks once credentials/cookies are involved (browsers reject `*` + `Allow-Credentials: true` combinations), causing confusing intermittent auth failures that look unrelated to CORS.

**Why it happens:**
CORS errors are frustrating under time pressure and the wildcard "just works" for the simple case tested first (a GET with no credentials), so it looks fixed.

**How to avoid:** Set `Access-Control-Allow-Origin` to the exact deployed Vercel frontend URL (and `localhost:3000` for dev) as an explicit allow-list in FastAPI's `CORSMiddleware`, not a wildcard — this project's auth is Bearer-token-in-header (not cookie-based per the handoff), so credentialed-cookie CORS rules may not even apply, but the allow-list discipline still matters for correctness once deployed.

**Warning signs:** Requests work from `localhost` but fail from the Vercel URL (or vice versa); browser console shows CORS errors only after deployment, not in local dev; auth requests fail intermittently in a way that looks like a token bug but is actually a blocked preflight.

**Phase to address:** Deployment phase, verified as part of that phase's own success criteria (a real cross-origin request from the deployed frontend to the deployed backend, not just localhost-to-localhost).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|-----------------|------------------|
| Hand-retype API response shapes instead of using generated OpenAPI types | Faster to start typing a screen without running codegen | Silent drift from real backend (Pitfall 9); exactly what handoff §4 forbids | Never — handoff explicitly provides ready-written TS interfaces (`FRONTEND_GUIDE.md` §11); use them |
| Build English/LTR screens first, RTL "later" | Faster initial screen velocity | Retrofit cost across every component (Pitfall 1) — PROJECT.md already flags this as "far costlier" | Never for this project — Arabic is the primary locale by product decision |
| `useEffect`-based dir/theme instead of server-resolved | Simpler mental model, no cookie plumbing | Flash-of-wrong-theme/direction on every load (Pitfalls 1, 4) — visible in any demo recording | Never for the demo-facing build; acceptable only in a disposable spike |
| Skip the poll-diff tween, just re-render new value | Saves animation-hook time under deadline pressure | Kills the single biggest pitch moment (Pitfall 8) | Acceptable only for admin-surface screens (handoff explicitly wants "serious/low-animation" admin), never for the merchant contract screen |
| Client-side "days remaining" math against `Date.now()` | Feels natural, no extra backend field needed | Wrong numbers (simulated calendar ≠ real time) + hydration mismatches (Pitfall 5) | Never — PROJECT.md and handoff both flag this explicitly |
| Single shared refresh-on-401 without mutex | Ships fast, "works" in manual single-tab testing | False logout mid-demo under concurrent polling (Pitfall 6) | Never — this is exactly the failure mode a live 2-day-old demo hits |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|-----------------|-------------------|
| Free backend host (Render-class) | Provisioned once, assumed durable; sleep/cold-start and DB-expiry never re-checked against demo date | Set up an uptime heartbeat immediately; note the Postgres free-tier expiry date and confirm it's safely past July 17 |
| OpenAPI codegen | Run once at project start, never re-run after backend/host changes | Wire into an `npm run gen:api` script; re-run after any backend or hosting change, and once more against the deployed `openapi.json` before the demo |
| Vercel (frontend) ↔ free backend (CORS) | Wildcard `Access-Control-Allow-Origin` shipped as the "it works now" fix | Explicit allow-list of the deployed frontend origin in FastAPI `CORSMiddleware` |
| Monitoring agent polling | Each screen independently polls the same or overlapping endpoints | One shared query-key per resource; let TanStack Query/SWR cache dedupe across consumers |
| `POST /admin/monitor/tick` (demo control) | Not wired until the last minute, so rehearsed demo pacing is untested | Build and rehearse with the tick control early — it's the safety net if the 15s auto-advance doesn't line up with the live demo's pacing |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|-----------------|
| Per-component `refetchInterval` instead of shared keys | Duplicate network calls in the waterfall for the same data | Centralize query hooks per resource (contract, alerts, portfolio) | Noticeable once 3+ live screens/widgets are mounted simultaneously (dashboard + nav badge + alerts panel) |
| Loading full Arabic font family (all weights) unconditionally | Slower first paint on mobile/QR traffic (explicitly this project's primary traffic per handoff) | Load only the weights actually used (400/500/600/700 subset, not extras) via `next/font` | Visible on 390px mobile over real/throttled network, the handoff's own stated test condition |
| Fetching full history (`GET /transactions?limit=5000`, `GET /sales?limit=5000`) for screens that only need summaries | Slow dashboard load, memory bloat on mobile | Use aggregate/summary endpoints where they exist; paginate or cap client-side fetch limits to what's rendered | Breaks first on mobile devices during the demo, not on a dev desktop |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| CORS wildcard + credentials | Cross-origin token/cookie exfiltration if any credentialed flow exists | Explicit origin allow-list (Pitfall 11) |
| JWT stored in `localStorage` without refresh-mutex, long-lived tokens kept past logout | Stale/replayed tokens after logout; XSS-exposed token theft | Follow handoff's access 30min/refresh 7d split; clear both on logout; consider httpOnly cookie for refresh token if time allows, otherwise document the localStorage tradeoff |
| Route guards done client-side only (hide the nav link but not the page) | `bank_admin` routes reachable by a merchant who guesses the URL, since 403 should "hide the route" per handoff's error contract | Enforce role check in the route/layout itself (redirect on 403/role mismatch), not just conditional nav rendering |
| Demo credentials (`admin@rafid.sa`/`AdminPass123!` etc.) hardcoded/visible in shipped frontend code or public repo | Minor for a hackathon demo, but avoid committing them anywhere beyond docs/README | Keep seeded credentials in docs only, never baked into client bundle env vars |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-------------------|
| Relative "days left" language ("3 days remaining") | Wrong once simulated-vs-real time diverges; confuses judges who know the demo runs on compressed time | Show absolute simulated dates only, exactly as PROJECT.md mandates |
| Static score reveal with no explanation hierarchy | Buries the "pitch differentiator" (explainability) under a plain number | Keep `reasons[]`/`feature_contributions` visually prominent, translate backend's English `reasons[]` strings, support negative contribution bars (chargebacks) |
| Generic "loading..." spinners on every poll tick, even when nothing changed | Feels broken/flickery on a screen that polls every 5-15s | Only show a loading state on the *initial* fetch; background poll refetches should update in place without a spinner flash |
| Mixing Murabaha framing with any leaked "interest"/"فائدة" wording (e.g. from an unreviewed English fallback string) | Violates hard product/compliance rule (PROJECT.md) | Audit every English string alongside Arabic ones — English is not a lower-stakes locale for this rule |

## "Looks Done But Isn't" Checklist

- [ ] **RTL layout:** Often missing logical-property coverage in one-off components (icons, chevrons, badge positions) — verify by toggling `dir` and checking every screen mirrors correctly, not just text alignment.
- [ ] **Dark mode:** Often missing coverage on chart/gauge colors and risk-band/alert-severity colors defined only for light mode — verify every custom SVG/canvas color (gauge, donut chart) has a dark-mode variant, not just Tailwind utility classes.
- [ ] **Auth refresh:** Often "works" in a quick manual test but untested under concurrent polling near token expiry — verify by leaving a contract screen open past the 30-minute access-token window with polling active.
- [ ] **Explainability screen:** Often renders positive contributions fine but breaks/omits negative bars — verify against `merchant17`/`merchant20` (engineered-risky) where negative contributions actually occur.
- [ ] **Offer/fee breakdown:** Often has a leftover client-side fee calculation from early scaffolding — verify every number on that screen traces to a field literally returned by `POST /offers/generate`, none computed in the component.
- [ ] **Free host readiness:** Often deployed once and never re-tested cold — verify by hitting the deployed backend after 20+ minutes idle, right before the actual demo slot.
- [ ] **Mobile (390px):** Often only tested on desktop during the 2-day sprint — verify the admin merchant table collapses to stacked cards and the offer-breakdown/score-gauge screens don't overflow at 390px, per handoff's explicit highest-risk-surface callout.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|-----------------|------------------|
| RTL/dark-mode flash discovered late | MEDIUM | Move `dir`/theme resolution into the root server layout (or cookie-based); usually a contained, mechanical fix if logical properties were used consistently, expensive if physical properties are scattered everywhere |
| Refetch storm / backend overload found near demo | LOW | Consolidate to shared query keys, raise `staleTime` where safe; quick since it's config, not structural |
| JWT refresh race discovered during rehearsal | LOW-MEDIUM | Wrap refresh logic in a shared promise/mutex; isolated to the API client module |
| Free host sleeping mid-demo discovered late | LOW | Add UptimeRobot heartbeat immediately, or switch to `POST /admin/monitor/tick` manual pacing and keep a tab open pinging the backend throughout judging |
| Postgres free-tier expired right before demo | HIGH | Re-provision + `make reset` against a fresh instance well before the slot — this is why the expiry date must be checked early, not discovered live |
| Tween/animation not implemented in time | LOW | Acceptable to ship without in a true time crunch — a correct, non-animated live number still tells the truth; prioritize this only after all core-loop screens are functionally correct |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|-------------------|----------------|
| RTL retrofit cost (Pitfall 1) | Foundation/scaffold phase | Toggle locale on every built screen, confirm no physical-direction classes remain |
| Digit/currency bidi bugs (Pitfall 2) | Foundation/scaffold phase | Render real Arabic copy next to real SAR amounts/scores on first built screen, not lorem ipsum |
| Arabic font FOUT/CLS (Pitfall 3) | Foundation/scaffold phase | Lighthouse CLS check on score/dashboard screens |
| Dark-mode flash (Pitfall 4) | Foundation/scaffold phase | Hard refresh in dark mode, confirm zero flash |
| Hydration mismatch on live data (Pitfall 5) | Merchant core loop phase | No React hydration console errors on dashboard/contract screens in production build |
| JWT refresh race (Pitfall 6) | Auth + API client phase | Two tabs polling simultaneously past token expiry, confirm no forced logout |
| Refetch storms (Pitfall 7) | Auth + API client phase (hook pattern) → verified in merchant/admin phases | Network tab shows deduped requests across mounted live-data components |
| Jump-cut instead of tween (Pitfall 8) | Polish/animation phase (hook built in merchant core loop phase) | Screen recording of a poll tick shows smooth interpolation, not a snap |
| OpenAPI type drift (Pitfall 9) | API client phase, re-verified in deployment phase | `gen:api` script re-run against deployed `openapi.json` before demo |
| Free-host sleep/DB expiry (Pitfall 10) | Deployment phase (started early, not last) | Cold hit after 20+ min idle succeeds; DB expiry date confirmed safely past July 17 |
| CORS misconfig (Pitfall 11) | Deployment phase | Real cross-origin request from deployed Vercel URL to deployed backend succeeds without wildcard origin |

## Sources

- [GitHub: vercel/next.js RTL dir attribute discussion](https://github.com/vercel/next.js/discussions/19049)
- [Lingo.dev: Supporting RTL layouts in Next.js i18n](https://lingo.dev/en/nextjs-i18n/right-to-left-languages)
- [xgeeks/Medium: Stop fixing Numbers — RTL bidi digits](https://medium.com/xgeeks/stop-fixing-numbers-96a0a1915719)
- [W3C: Unicode Bidirectional Algorithm basics](https://w3c.github.io/i18n-drafts/articles/inline-bidi-markup/uba-basics.en)
- [watranslator: Localizing Dates, Numbers & Currency for Arabic](https://watranslator.com/localizing-dates-numbers-currencies-arabic-users/)
- [TheLinuxCode: Fonts in Next.js — next/font patterns and pitfalls](https://thelinuxcode.com/fonts-in-nextjs-2026-nextfont-patterns-performance-and-production-pitfalls/)
- [Not A Number: Fixing Dark Mode Flickering (FOUC) in React and Next.js](https://www.notanumber.in/blog/fixing-react-dark-mode-flickering)
- [Dimitri Bourreau: Dark and light themes with Tailwind — common pitfalls](https://www.dimitribourreau.dev/en/blog/themes-sombres-et-clairs-tailwind)
- [Next.js docs: Text content does not match server-rendered HTML](https://nextjs.org/docs/messages/react-hydration-error)
- [Medium: Next.js hydration errors — real causes, fixes, prevention checklist](https://medium.com/@blogs-world/next-js-hydration-errors-in-2026-the-real-causes-fixes-and-prevention-checklist-4a8304d53702)
- [Zaid Ahmad: JWT Auth in Next.js App Router — what most guides skip](https://zaidahmaddev.com/blog/jwt-auth-nextjs-app-router-what-they-skip)
- [GitHub: vercel/next.js refresh token strategy in middleware discussion](https://github.com/vercel/next.js/discussions/78604)
- [TanStack Query docs: Polling guide](https://tanstack.com/query/latest/docs/framework/react/guides/polling)
- [TanStack Query docs: Important Defaults](https://tanstack.com/query/v4/docs/framework/react/guides/important-defaults)
- [Aetherio: OpenAPI to TypeScript — Zero API Drift](https://aetherio.tech/en/articles/generation-types-typescript-openapi-synchronisation-backend-frontend)
- [Evil Martians: Life's too short to hand-write API types](https://evilmartians.com/chronicles/lifes-too-short-to-hand-write-api-types-openapi-driven-react)
- [Vibe App Scanner: CORS Misconfiguration on Vercel](https://vibeappscanner.com/security-issue/vercel-cors-misconfiguration)
- [Vercel Community: CORS issue while deployment](https://community.vercel.com/t/cors-issue-while-deployment/8006)
- [samkiel.dev: Your Render Free Tier Is Not Broken, It's Just Cold](https://blog.samkiel.dev/your-render-free-tier-is-not-broken-its-just-cold)
- [Render docs: Deploy for Free](https://render.com/docs/free)
- [Medium: Lessons learnt by failing in my first ever hackathon](https://medium.com/@akashrajum7/lessons-learnt-by-failing-in-my-first-ever-hackathon-b707fa306c0a)
- [Medium: Lessons learned from Hackathons — expect the unexpected](https://medium.com/@raphael.moutard/lessons-learned-from-hackathons-expect-the-unexpected-48fd58b4a927)
- [CSS-Tricks: Animating Number Counters](https://css-tricks.com/animating-number-counters/)
- [Motion for React docs: AnimateNumber](https://motion.dev/docs/react-animate-number)
- Rafid project docs: `.planning/PROJECT.md`, `RAFID_FRONTEND_HANDOFF.md` (§3 field-mapping traps, §6 monitoring-agent consequences, §7 build order, §8 polish)

---
*Pitfalls research for: Arabic-first RTL open-banking SME financing frontend (Rafid)*
*Researched: 2026-07-15*
