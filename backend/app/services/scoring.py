from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import AuditAction
from app.domain.models import CreditAssessment, Merchant
from app.scoring.factory import get_scoring_model
from app.scoring.features import build_features
from app.services import audit


class ScoringError(Exception):
    pass


async def run_assessment(
    session: AsyncSession, merchant: Merchant, actor_user_id: str | None = None
) -> CreditAssessment:
    features = await build_features(session, merchant)
    if features.total_revenue_90d <= 0:
        raise ScoringError("no aggregated sales data; connect platforms and aggregate first")

    decision = get_scoring_model().score(features)

    assessment = CreditAssessment(
        merchant_id=merchant.id,
        features=features.model_dump(),
        decision=decision.model_dump(),
        score=decision.score,
        risk_band=decision.risk_band,
        approved=decision.approved,
        model_version=decision.model_version,
    )
    session.add(assessment)
    await session.flush()
    audit.record(
        session, AuditAction.SCORING_RUN, "credit_assessment", assessment.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
        details={"score": decision.score, "band": decision.risk_band,
                 "approved": decision.approved, "model_version": decision.model_version},
    )
    await session.commit()
    return assessment


async def latest_assessment(
    session: AsyncSession, merchant_id: str
) -> CreditAssessment | None:
    return await session.scalar(
        select(CreditAssessment)
        .where(CreditAssessment.merchant_id == merchant_id)
        .order_by(CreditAssessment.created_at.desc())
        .limit(1)
    )
