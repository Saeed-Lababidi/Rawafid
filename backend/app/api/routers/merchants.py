from fastapi import APIRouter

from app.api.deps import CurrentMerchant, CurrentUser, SessionDep
from app.schemas.auth import MerchantOut, MerchantUpdate
from app.schemas.financing import AggregateResponse
from app.services.aggregation import aggregate_merchant

router = APIRouter(prefix="/merchants", tags=["merchant"])


@router.get("/me", response_model=MerchantOut)
async def get_me(merchant: CurrentMerchant):
    return merchant


@router.patch("/me", response_model=MerchantOut)
async def update_me(req: MerchantUpdate, merchant: CurrentMerchant, session: SessionDep):
    for field, value in req.model_dump(exclude_none=True).items():
        setattr(merchant, field, value)
    await session.commit()
    return merchant


@router.post("/me/aggregate", response_model=AggregateResponse)
async def aggregate(merchant: CurrentMerchant, session: SessionDep, user: CurrentUser):
    return await aggregate_merchant(session, merchant, actor_user_id=user.id)
