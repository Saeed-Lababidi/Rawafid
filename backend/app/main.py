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

# frontend teammate consumes /openapi.json; allow local dev origins broadly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
