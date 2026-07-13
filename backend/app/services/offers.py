from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.enums import AuditAction, OfferStatus
from app.domain.models import FinancingOffer, Merchant
from app.services import audit, murabaha
from app.services.aggregation import held_receivables
from app.services.scoring import latest_assessment


class OfferError(Exception):
    pass


async def generate_offer(
    session: AsyncSession, merchant: Merchant, actor_user_id: str | None = None
) -> FinancingOffer:
    settings = get_settings()
    assessment = await latest_assessment(session, merchant.id)
    if not assessment:
        raise OfferError("no credit assessment; run POST /assessments/run first")
    if not assessment.approved:
        raise OfferError(f"latest assessment declined (band {assessment.risk_band})")

    held = await held_receivables(session, merchant.id)
    if held <= 0:
        raise OfferError("no held receivables to finance against")

    ratio = min(assessment.decision["max_advance_ratio"], settings.max_advance_ratio)
    principal = round(ratio * held, 2)
    if principal <= 0:
        raise OfferError("advance amount is zero")

    platform_fee = round(principal * settings.platform_fee_pct, 2)
    success_fee = round(principal * settings.success_fee_pct, 2)
    profit = round(principal * settings.murabaha_profit_pct, 2)  # disclosed Murabaha profit

    # expire any previous open offers — one live offer at a time
    for old in (
        await session.execute(
            select(FinancingOffer).where(
                FinancingOffer.merchant_id == merchant.id,
                FinancingOffer.status == OfferStatus.OFFERED.value,
            )
        )
    ).scalars():
        old.status = OfferStatus.EXPIRED.value

    offer = FinancingOffer(
        merchant_id=merchant.id,
        assessment_id=assessment.id,
        principal=principal,
        advance_ratio=ratio,
        platform_fee=platform_fee,
        success_fee=success_fee,
        profit_amount=profit,
        total_repayable=round(principal + profit + platform_fee + success_fee, 2),
        status=OfferStatus.OFFERED.value,
        expires_at=datetime.utcnow() + timedelta(days=settings.offer_expiry_days),
    )
    session.add(offer)
    await session.flush()
    audit.record(
        session, AuditAction.OFFER_GENERATE, "financing_offer", offer.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
        details={"principal": principal, "ratio": ratio, "held_receivables": held},
    )
    await session.commit()
    return offer


async def _get_open_offer(
    session: AsyncSession, merchant: Merchant, offer_id: str
) -> FinancingOffer:
    offer = await session.get(FinancingOffer, offer_id)
    if not offer or offer.merchant_id != merchant.id:
        raise OfferError("offer not found")
    if offer.status != OfferStatus.OFFERED.value:
        raise OfferError(f"offer is {offer.status}")
    if offer.expires_at < datetime.utcnow():
        offer.status = OfferStatus.EXPIRED.value
        await session.commit()
        raise OfferError("offer expired")
    return offer


async def accept_offer(
    session: AsyncSession, merchant: Merchant, offer_id: str,
    actor_user_id: str | None = None,
):
    offer = await _get_open_offer(session, merchant, offer_id)
    contract = await murabaha.create_contract(session, merchant, offer, actor_user_id)
    offer.status = OfferStatus.ACCEPTED.value
    audit.record(
        session, AuditAction.OFFER_ACCEPT, "financing_offer", offer.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
        details={"contract_id": contract.id},
    )
    await session.commit()
    return contract


async def reject_offer(
    session: AsyncSession, merchant: Merchant, offer_id: str,
    actor_user_id: str | None = None,
) -> FinancingOffer:
    offer = await _get_open_offer(session, merchant, offer_id)
    offer.status = OfferStatus.REJECTED.value
    audit.record(
        session, AuditAction.OFFER_REJECT, "financing_offer", offer.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
    )
    await session.commit()
    return offer
