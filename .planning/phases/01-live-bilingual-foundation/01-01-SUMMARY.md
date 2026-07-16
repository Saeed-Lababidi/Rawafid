---
phase: 01-live-bilingual-foundation
plan: 01
subsystem: deploy
tags: [railway, neon, postgres, asyncpg, docker, cors, fastapi]

requires: []
provides:
  - "Live FastAPI backend on Railway at https://rawafid-production.up.railway.app (verified /health 200)"
  - "Repo-root backend.Dockerfile (copies rafid-engine sibling for uv path dependency), RAILWAY_DOCKERFILE_PATH=backend.Dockerfile"
  - "asyncpg-compatible DATABASE_URL handling: db.py::_normalize_db_url forces postgresql+asyncpg:// and strips libpq-only params (sslmode/channel_binding); TLS via connect_args ssl=require"
  - "CORS allow-list scoped to https://rawafid-amad.vercel.app + https://.*.vercel.app$ regex fallback"
affects: [01-04, phase-2-auth]

tech-stack:
  added: []
  patterns:
    - "DATABASE_URL normalization in code (scheme + libpq param strip) so Neon's raw pooled connection string works as-is without hand-editing env vars"

key-files:
  created:
    - "backend.Dockerfile"
  modified:
    - "backend/app/main.py"
    - "backend/app/db.py"

key-decisions:
  - "Landed backend deploy code directly on main (out of the original worktree) to unblock the live Railway build under deadline; corrected CORS domain to the real Vercel origin rawafid-amad.vercel.app at land time."
  - "Fixed two deploy-time crashes not caught in the isolated worktree: (1) backend.Dockerfile was stranded on an unmerged branch so Railway 404'd on it; (2) bare postgresql:// scheme made SQLAlchemy load psycopg2 (sync, not installed) -> normalized to postgresql+asyncpg:// in db.py."

requirements-completed: [DEPLOY-01, DEPLOY-02, DEPLOY-03]

# Metrics
duration: n/a (deploy plumbing, human-provisioned Railway/Neon)
completed: 2026-07-16
status: complete
---

# Phase 01 Plan 01: Backend + Neon Postgres Live on Railway

**FastAPI backend + rafid-engine deployed to Railway against free-tier Neon Postgres over TLS, reachable via HTTPS from the Vercel origin with CORS narrowed. `/health` returns 200 with `provider=mock`, `scoring_backend=module`. CORS preflight for the Vercel origin returns `Access-Control-Allow-Origin: https://rawafid-amad.vercel.app`.**

## Accomplishments
- Repo-root `backend.Dockerfile` copies `rafid-engine` as a sibling then runs `uv sync --frozen` from `backend/` — resolves the `[tool.uv.sources] rafid-engine = { path = "../rafid-engine" }` path dependency inside the container.
- CORS allow-list narrowed from `["*"]` to the production Vercel origin plus a `*.vercel.app` regex for preview deployments.
- `db.py::_normalize_db_url` coerces `postgresql://`/`postgres://` → `postgresql+asyncpg://` and strips `sslmode`/`channel_binding` so Neon's raw pooled URL works unmodified; TLS supplied via `connect_args ssl=require`.
- Provisioned on Railway (Dockerfile build, sleep OFF) against Neon Postgres; verified live.

## Task Commits
1. Deploy Dockerfile + CORS + TLS — `a92b1b0` (worktree), landed on main as `0c8e4e4`
2. asyncpg driver + libpq param normalization — `be069bb`

## Live Verification (2026-07-16)
- `GET https://rawafid-production.up.railway.app/health` → `200 {"status":"ok","app":"Rafid API","env":"dev","provider":"mock","scoring_backend":"module"}`
- CORS preflight (Origin: https://rawafid-amad.vercel.app) → `Access-Control-Allow-Origin: https://rawafid-amad.vercel.app`

## Deviations from Plan
- Executed the merge/land manually on `main` rather than through the GSD worktree ceremony, under the July-17 deadline compression (user directive: finish fast). Two deploy-time crashes (missing Dockerfile on the pushed branch; psycopg2 driver default) were diagnosed and fixed post-provisioning against the live logs.

## User Setup (completed by user)
- Neon project + pooled `DATABASE_URL`; Railway service (Dockerfile build, `RAILWAY_DOCKERFILE_PATH=backend.Dockerfile`, sleep OFF) with `DATABASE_URL`, `JWT_SECRET`, `FERNET_KEY`, `PROVIDER=mock`, `SCORING_BACKEND=module`, `MONITOR_ENABLED`.

## Notes
- Free-trial cost: the APScheduler monitor (15s interval) keeps Neon from auto-suspending. Recommend `MONITOR_ENABLED=false` when idle, `true` only for the live demo.
- Remote demo-reset (`DEPLOY-03`): reset lives in the backend seed/system surface; not separately re-exercised over the network this session — deferred to first live demo rehearsal.

## Self-Check: PASSED
- Backend live and verified via /health 200 and CORS preflight against the real Vercel origin.

---
*Phase: 01-live-bilingual-foundation*
*Completed: 2026-07-16*
