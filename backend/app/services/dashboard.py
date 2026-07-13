"""Bank/underwriter dashboard aggregates (plan §M7): portfolio, risk, funnel."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import ConnectionStatus, ContractStatus, OfferStatus
from app.domain.models import (
    Connection,
    CreditAssessment,
    FinancingOffer,
    Merchant,
    MurabahaContract,
    RiskAlert,
)


async def portfolio(session: AsyncSession) -> dict:
    merchants_total = await session.scalar(select(func.count()).select_from(Merchant))

    connected = await session.scalar(
        select(func.count(func.distinct(Connection.merchant_id))).where(
            Connection.status == ConnectionStatus.ACTIVE.value
        )
    )
    scored = await session.scalar(
        select(func.count(func.distinct(CreditAssessment.merchant_id)))
    )
    offered = await session.scalar(
        select(func.count(func.distinct(FinancingOffer.merchant_id)))
    )
    accepted = await session.scalar(
        select(func.count(func.distinct(FinancingOffer.merchant_id))).where(
            FinancingOffer.status == OfferStatus.ACCEPTED.value
        )
    )

    # risk distribution over each merchant's latest assessment
    latest = (
        select(
            CreditAssessment.merchant_id,
            func.max(CreditAssessment.created_at).label("latest_at"),
        )
        .group_by(CreditAssessment.merchant_id)
        .subquery()
    )
    band_rows = (
        await session.execute(
            select(CreditAssessment.risk_band, func.count())
            .join(
                latest,
                (CreditAssessment.merchant_id == latest.c.merchant_id)
                & (CreditAssessment.created_at == latest.c.latest_at),
            )
            .group_by(CreditAssessment.risk_band)
        )
    ).all()

    active_contracts = await session.scalar(
        select(func.count()).select_from(MurabahaContract).where(
            MurabahaContract.status == ContractStatus.ACTIVE.value
        )
    )
    disbursed_total = await session.scalar(
        select(func.coalesce(func.sum(MurabahaContract.cost_price), 0.0))
    )
    outstanding_total = await session.scalar(
        select(func.coalesce(func.sum(MurabahaContract.outstanding), 0.0)).where(
            MurabahaContract.status == ContractStatus.ACTIVE.value
        )
    )
    expected_revenue = await session.scalar(
        select(
            func.coalesce(
                func.sum(MurabahaContract.profit_amount + MurabahaContract.fees_total), 0.0
            )
        )
    )
    open_alerts = await session.scalar(
        select(func.count()).select_from(RiskAlert).where(RiskAlert.resolved.is_(False))
    )

    return {
        "funnel": {
            "registered": merchants_total,
            "connected": connected,
            "scored": scored,
            "offered": offered,
            "accepted": accepted,
        },
        "risk_distribution": {band: count for band, count in band_rows},
        "contracts": {
            "active": active_contracts,
            "disbursed_total": round(float(disbursed_total), 2),
            "outstanding_total": round(float(outstanding_total), 2),
            "expected_revenue": round(float(expected_revenue), 2),
        },
        "open_alerts": open_alerts,
    }


async def merchant_overview(session: AsyncSession, merchant: Merchant) -> dict:
    assessments = (
        (
            await session.execute(
                select(CreditAssessment)
                .where(CreditAssessment.merchant_id == merchant.id)
                .order_by(CreditAssessment.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    offers = (
        (
            await session.execute(
                select(FinancingOffer)
                .where(FinancingOffer.merchant_id == merchant.id)
                .order_by(FinancingOffer.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    contracts = (
        (
            await session.execute(
                select(MurabahaContract).where(MurabahaContract.merchant_id == merchant.id)
            )
        )
        .scalars()
        .all()
    )
    connections = (
        (
            await session.execute(
                select(Connection).where(Connection.merchant_id == merchant.id)
            )
        )
        .scalars()
        .all()
    )
    alerts = (
        (
            await session.execute(
                select(RiskAlert)
                .where(RiskAlert.merchant_id == merchant.id)
                .order_by(RiskAlert.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return {
        "merchant": merchant,
        "connections": connections,
        "assessments": assessments,
        "offers": offers,
        "contracts": contracts,
        "alerts": alerts,
    }
