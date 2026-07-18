from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentAdmin, SessionDep
from app.domain.enums import AuditAction
from app.domain.models import CreditAssessment, FinancingOffer, Merchant, RiskAlert
from app.schemas.admin import AdminMerchantDetailOut, AdminMerchantOut, PortfolioOut
from app.schemas.common import RiskAlertOut
from app.schemas.financing import AnnotateRequest, AssessmentDetailOut, OfferOut, TickResponse
from app.services import audit, dashboard, monitoring

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/merchants", response_model=list[AdminMerchantOut])
async def list_merchants(_: CurrentAdmin, session: SessionDep):
    return await dashboard.merchants_summary(session)


@router.get("/merchants/{merchant_id}", response_model=AdminMerchantDetailOut)
async def merchant_detail(merchant_id: str, _: CurrentAdmin, session: SessionDep):
    merchant = await session.get(Merchant, merchant_id)
    if not merchant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "merchant not found")
    return await dashboard.merchant_overview(session, merchant)


@router.get("/portfolio", response_model=PortfolioOut)
async def portfolio(_: CurrentAdmin, session: SessionDep):
    return await dashboard.portfolio(session)


@router.get("/assessments/{assessment_id}", response_model=AssessmentDetailOut)
async def assessment_detail(assessment_id: str, _: CurrentAdmin, session: SessionDep):
    assessment = await session.get(CreditAssessment, assessment_id)
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "assessment not found")
    return assessment


@router.get("/alerts", response_model=list[RiskAlertOut])
async def all_alerts(_: CurrentAdmin, session: SessionDep, include_resolved: bool = False):
    query = select(RiskAlert).order_by(RiskAlert.created_at.desc())
    if not include_resolved:
        query = query.where(RiskAlert.resolved.is_(False))
    rows = await session.execute(query)
    return list(rows.scalars())


@router.post("/offers/{offer_id}/annotate", response_model=OfferOut)
async def annotate_offer(
    offer_id: str, req: AnnotateRequest, admin: CurrentAdmin, session: SessionDep
):
    offer = await session.get(FinancingOffer, offer_id)
    if not offer:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "offer not found")
    offer.annotation = req.annotation
    audit.record(
        session, AuditAction.OFFER_ANNOTATE, "financing_offer", offer.id,
        actor_user_id=admin.id, merchant_id=offer.merchant_id,
        details={"annotation": req.annotation},
    )
    await session.commit()
    return offer


@router.post("/monitor/tick", response_model=TickResponse)
async def manual_tick(admin: CurrentAdmin, session: SessionDep):
    """Force one monitoring tick (= one simulated day) live during the demo."""
    return await monitoring.run_tick(session, actor_user_id=admin.id)
