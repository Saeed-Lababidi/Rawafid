"""APScheduler-driven monitoring agent (plan §9).

Interval configurable via MONITOR_INTERVAL_SECONDS; each firing runs one
monitoring tick (= one simulated day). The tick itself is serialized by a
lock in services.monitoring, so overlap with the manual endpoint is safe.
"""

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.config import get_settings
from app.db import SessionLocal
from app.services.monitoring import run_tick

logger = logging.getLogger("rafid.monitor")

scheduler = AsyncIOScheduler()


async def _monitor_job() -> None:
    try:
        async with SessionLocal() as session:
            result = await run_tick(session)
        logger.info(
            "monitor tick: sim_date=%s received=%d delayed=%d repayments=%d alerts=%d",
            result.sim_date, result.settlements_received, result.settlements_delayed,
            result.repayments_applied, result.alerts_raised,
        )
    except Exception:
        logger.exception("monitor tick failed")


def start_scheduler() -> None:
    settings = get_settings()
    if not settings.monitor_enabled:
        logger.info("monitoring agent disabled (MONITOR_ENABLED=false)")
        return
    scheduler.add_job(
        _monitor_job,
        "interval",
        seconds=settings.monitor_interval_seconds,
        id="monitoring_tick",
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    logger.info(
        "monitoring agent started: every %ds (1 tick = 1 simulated day)",
        settings.monitor_interval_seconds,
    )


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
