from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import SessionDep
from app.config import get_settings

router = APIRouter(tags=["system"])


@router.get("/health")
async def health(session: SessionDep):
    await session.execute(text("SELECT 1"))
    settings = get_settings()
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.env,
        "provider": settings.provider,
        "scoring_backend": settings.scoring_backend,
    }
