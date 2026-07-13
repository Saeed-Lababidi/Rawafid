from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentMerchant, CurrentUser, SessionDep
from app.domain.models import FinancingOffer
from app.schemas.financing import ContractOut, OfferOut
from app.services import offers as offers_service
from app.services.offers import OfferError

router = APIRouter(prefix="/offers", tags=["offers"])


@router.post("/generate", response_model=OfferOut, status_code=status.HTTP_201_CREATED)
async def generate(merchant: CurrentMerchant, session: SessionDep, user: CurrentUser):
    try:
        return await offers_service.generate_offer(session, merchant, actor_user_id=user.id)
    except OfferError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e


@router.get("/me", response_model=list[OfferOut])
async def my_offers(merchant: CurrentMerchant, session: SessionDep):
    rows = await session.execute(
        select(FinancingOffer)
        .where(FinancingOffer.merchant_id == merchant.id)
        .order_by(FinancingOffer.created_at.desc())
    )
    return list(rows.scalars())


@router.post("/{offer_id}/accept", response_model=ContractOut)
async def accept(
    offer_id: str, merchant: CurrentMerchant, session: SessionDep, user: CurrentUser
):
    try:
        return await offers_service.accept_offer(
            session, merchant, offer_id, actor_user_id=user.id
        )
    except OfferError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e


@router.post("/{offer_id}/reject", response_model=OfferOut)
async def reject(
    offer_id: str, merchant: CurrentMerchant, session: SessionDep, user: CurrentUser
):
    try:
        return await offers_service.reject_offer(
            session, merchant, offer_id, actor_user_id=user.id
        )
    except OfferError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
