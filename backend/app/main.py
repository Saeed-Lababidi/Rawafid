import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers import (
    admin,
    alerts,
    assessments,
    auth,
    connections,
    contracts,
    data,
    merchants,
    offers,
    system,
)
from app.config import get_settings
from app.db import create_all
from app.jobs.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.auto_create_tables:
        await create_all()
    start_scheduler()
    yield
    stop_scheduler()


settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    description=(
        "Rafid — receivables-backed, Sharia-compliant Murabaha financing for digital "
        "merchants. Open-banking data via a provider abstraction (mock for MVP); "
        "credit decisions via a pluggable scoring model."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# Exact origins come from CORS_ORIGINS (localhost dev by default; deployments set
# their real frontend origin). The scoped *.vercel.app regex additionally lets
# preview deployments (D-03: push-to-main auto-deploys, previews tested pre-merge)
# reach the backend during the sprint. The previous allow_origins=["*"] is gone
# (T-01-01) — narrow, not broad, is the deploy-time default now.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_origin_regex=r"https://.*\.vercel\.app$",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system.router)
app.include_router(auth.router)
app.include_router(merchants.router)
app.include_router(connections.router)
app.include_router(data.router)
app.include_router(assessments.router)
app.include_router(offers.router)
app.include_router(contracts.router)
app.include_router(alerts.router)
app.include_router(admin.router)
