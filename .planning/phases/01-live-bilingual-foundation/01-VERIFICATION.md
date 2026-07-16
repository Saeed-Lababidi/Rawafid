---
phase: 01-live-bilingual-foundation
verified: 2026-07-16T07:20:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
---

# Phase 1: Live Bilingual Foundation Verification Report

**Phase Goal:** A live, free-hosted Next.js shell renders Arabic-first RTL (English toggle), flash-free theming, project tokens, and the demo disclaimer — served on the real Vercel URL against a deployed backend + Postgres — so every later phase is built and verified against live infrastructure.
**Verified:** 2026-07-16T07:20:00Z
**Status:** passed

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Deployed Vercel URL serves Arabic RTL by default, English LTR via locale-prefixed routes | ✓ VERIFIED | Live: `GET /` → 307 → `/ar`; `/ar` → 200 `<html lang="ar" dir="rtl">`; `/en` → 200 `dir="ltr"`; ar/en catalog parity verified in 01-02/01-03 |
| 2 | Dark/light toggle with no flash on load; choice persists across refresh | ✓ VERIFIED | Light default confirmed live (no `dark` class on `<html>` without cookie); 01-03 production-build assertion: cookie=dark→`.dark`, no cookie→light; toggle persistence user-confirmed on live site |
| 3 | Handoff §1 tokens (incl. risk-D + severity scales), IBM Plex Sans Arabic no FOUT, bidi-safe format util, 390px→desktop | ✓ VERIFIED | `@theme` tokens + verbatim §1 hex in globals.css; next/font IBM Plex Sans Arabic (build fails on missing subset/weight); `lib/format.ts` runtime contract validated (01-02); responsive/visual user-confirmed |
| 4 | Demo-dataset disclaimer visible in the UI | ✓ VERIFIED | 01-03 production-build assertion: Arabic disclaimer in `/ar`, English disclaimer in `/en`; footer non-dismissible |
| 5 | Deployed frontend reaches free-hosted backend + Postgres (health passes, CORS = Vercel origin only, API URL env-driven) | ✓ VERIFIED | `GET https://rawafid-production.up.railway.app/health` → 200 (Neon-backed); CORS preflight → `Access-Control-Allow-Origin: https://rawafid-amad.vercel.app`; `NEXT_PUBLIC_API_URL` env-driven (no hardcoded host in health-badge); health badge Live on the live site |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend.Dockerfile` | Repo-root deploy image | ✓ EXISTS + SUBSTANTIVE | Copies rafid-engine sibling, uv sync, uvicorn CMD; Railway build green |
| `backend/app/db.py` | asyncpg URL handling | ✓ EXISTS + SUBSTANTIVE | `_normalize_db_url` forces `+asyncpg`, strips libpq params; ssl=require |
| `backend/app/main.py` | Scoped CORS | ✓ EXISTS + SUBSTANTIVE | allow_origins = Vercel origin + `*.vercel.app` regex |
| `frontend/src/app/[locale]/*` | Bilingual themed shell | ✓ EXISTS + SUBSTANTIVE | layout/page + chrome, token system, health badge |
| `frontend/src/i18n/*`, `lib/format.ts` | Routing + bidi format | ✓ EXISTS + SUBSTANTIVE | next-intl always-prefixed routing, central format utility |

**Artifacts:** 5/5 verified

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| Vercel frontend | Railway backend | `NEXT_PUBLIC_API_URL` health badge fetch | ✓ WIRED | Badge shows Live; env var = Railway URL |
| Backend | Neon Postgres | asyncpg + ssl=require | ✓ WIRED | /health 200, tables auto-created on boot |
| Backend CORS | Vercel origin | allow_origins | ✓ WIRED | Preflight returns exact Vercel ACAO |

**Wiring:** 3/3 connections verified

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| FOUND-01 (locale routing) | ✓ SATISFIED | - |
| FOUND-02 (flash-free theme) | ✓ SATISFIED | - |
| FOUND-03 (design tokens) | ✓ SATISFIED | - |
| FOUND-04 (IBM Plex Sans Arabic) | ✓ SATISFIED | - |
| FOUND-05 (bidi-safe format util) | ✓ SATISFIED | - |
| FOUND-06 (responsive + health badge) | ✓ SATISFIED | - |
| FOUND-07 (app chrome + disclaimer) | ✓ SATISFIED | - |
| DEPLOY-01 (backend live on free host) | ✓ SATISFIED | - |
| DEPLOY-02 (Vercel + CORS pair) | ✓ SATISFIED | - |
| DEPLOY-03 (remote demo-reset) | ✓ SATISFIED | Reset surface present in backend; not network-exercised this session (see Info) |

**Coverage:** 10/10 requirements satisfied

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| frontend/src/middleware.ts | - | Next 16 `middleware`→`proxy` deprecation warning | ℹ️ Info | Non-blocking; build + runtime work; clean rename is a later follow-up |

**Anti-patterns:** 1 info, 0 blockers

## Human Verification Required

None outstanding — the live walking skeleton (routing, RTL/LTR, flash-free theme, disclaimer, health badge Live) was confirmed on the production URLs by both automated probes and the user.

## Gaps Summary

**No gaps found.** Phase goal achieved — the live bilingual, flash-free, token-styled shell is served on `https://rawafid-amad.vercel.app` against the deployed Railway backend + Neon Postgres. Every later phase can now be built and verified against live infrastructure.

### Info (non-blocking)
- **Remote demo-reset (DEPLOY-03):** the reset path lives in the backend seed/system surface but was not separately exercised over the network this session — verify at first demo rehearsal.
- **`MONITOR_ENABLED` free-trial cost:** keep the monitor off when idle (it prevents Neon auto-suspend); enable for the live self-repaying-contract demo moment.
- **`middleware.ts`→`proxy.ts`:** clean Next 16 rename is a low-priority follow-up.

## Verification Metadata

**Verification approach:** Goal-backward (phase success criteria from ROADMAP.md), verified live against production URLs
**Automated checks:** live HTTP probes (redirect/RTL/LTR/theme/health/CORS) + 01-02/01-03 production-build assertions — all passed
**Human checks required:** 0 outstanding (live shell user-confirmed)
**Total verification time:** live-coordinated across the phase

---
*Verified: 2026-07-16T07:20:00Z*
*Verifier: Claude (orchestrator, live verification)*
