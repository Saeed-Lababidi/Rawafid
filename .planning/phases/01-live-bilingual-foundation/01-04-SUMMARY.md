---
phase: 01-live-bilingual-foundation
plan: 04
subsystem: deploy
tags: [vercel, nextjs, e2e, live-verification, cors, i18n]

requires:
  - phase: 01-live-bilingual-foundation (plan 01)
    provides: live Railway backend URL for NEXT_PUBLIC_API_URL
  - phase: 01-live-bilingual-foundation (plan 03)
    provides: full bilingual token-styled shell + health badge
provides:
  - "Live production frontend at https://rawafid-amad.vercel.app serving the Next.js app (Vercel root directory = frontend/, Framework Preset = Next.js)"
  - "NEXT_PUBLIC_API_URL wired to https://rawafid-production.up.railway.app in Vercel production env"
  - "End-to-end verified walking skeleton on real URLs (routing, RTL/LTR, flash-free theme, health badge Live against Railway)"
affects: [phase-2-auth, phase-3-merchant-screens]

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "No code changes — this plan is Vercel dashboard configuration + live E2E verification only (files_modified was empty by design)."
  - "Diagnosed a post-deploy platform 404 (plain-text NOT_FOUND, no x-matched-path): Vercel was not serving the app as Next.js because the old static-prototype project retained a non-Next Framework Preset. Fix: set Framework Preset = Next.js, clear Build/Output/Install overrides, root = frontend, redeploy."

requirements-completed: [DEPLOY-02, FOUND-01, FOUND-02, FOUND-06]

# Metrics
duration: n/a (Vercel dashboard cutover + live verification)
completed: 2026-07-16
status: complete
---

# Phase 01 Plan 04: Vercel Cutover + Live E2E Verification

**Cut the existing Vercel project over to `frontend/` with Framework Preset = Next.js and `NEXT_PUBLIC_API_URL` pointed at the live Railway backend, then verified the walking skeleton end-to-end on the real production URLs.**

## Accomplishments
- Vercel project root directory set to `frontend`; Framework Preset corrected to Next.js (was inheriting a non-Next preset from the old static prototype, which caused a platform-level 404 on every route until fixed).
- `NEXT_PUBLIC_API_URL = https://rawafid-production.up.railway.app` set in Vercel production env — the health badge's sole data source.
- Frontend redeployed green and serving the styled bilingual shell.

## Live E2E Verification (2026-07-16, against https://rawafid-amad.vercel.app)
- `GET /` → `307` redirect to `/ar` (locale middleware firing on Vercel)
- `GET /ar` → `200`, `<html lang="ar" dir="rtl">` (Arabic-first RTL)
- `GET /en` → `200`, `<html ... dir="ltr">` (English LTR, copy parity)
- No `dark` class on `<html>` without a cookie → light default, flash-free (D-11)
- User-confirmed live: styled shell renders, theme toggle persists, health badge shows Live against the Railway backend.

## Deviations from Plan
- Executed as a live coordination between orchestrator (pushes, automated probes) and user (Vercel dashboard actions) rather than a spawned executor — the plan carries no code, and the deadline favored direct handling. The Framework-Preset 404 was an unplanned diagnosis (stale settings on the pre-existing Vercel project).

## User Setup (completed by user)
- Vercel: Root Directory = `frontend`, Framework Preset = Next.js, `NEXT_PUBLIC_API_URL` env var, redeploy.

## Self-Check: PASSED
- Production URLs verified: `/`→`/ar` 307, `/ar` 200 RTL, `/en` 200 LTR, light-default theme; frontend↔backend confirmed via health badge Live.

---
*Phase: 01-live-bilingual-foundation*
*Completed: 2026-07-16*
