from fastapi import APIRouter

from app.api.deps import CurrentMerchant, SessionDep
from app.schemas.common import RiskAlertOut
from app.services.monitoring import merchant_alerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("/me", response_model=list[RiskAlertOut])
async def my_alerts(merchant: CurrentMerchant, session: SessionDep):
    return await merchant_alerts(session, merchant)
