"""Bank/underwriter dashboard aggregates (plan §M7): portfolio, risk, funnel."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import (
    ConnectionStatus,
    ConnectionType,
    ContractStatus,
    OfferStatus,
    SettlementStatus,
)
from app.domain.models import (
    Connection,
    CreditAssessment,
    FinancingOffer,
    Merchant,
    MurabahaContract,
    RiskAlert,
    SalesOrderRow,
    SettlementRow,
)

# Rafid's own revenue: a flat monthly subscription per merchant, set by their
# operational volume (orders/month) and never by any financing amount — charging
# on financing volume would be bay' al-dayn. Ceilings mirror the frontend tiers
# (`model.tiers` / lib/tiers.ts); prices are the SAR/month for each tier.
_SUBSCRIPTION_WINDOW_DAYS = 90
_DAYS_PER_MONTH = 30
# (inclusive max orders/month, monthly price SAR) in ascending order; above the
# last ceiling falls through to the top (Scale) price.
_SUBSCRIPTION_TIERS: list[tuple[float, float]] = [(1_000, 199.0), (10_000, 799.0)]
_SCALE_PRICE = 2_499.0


def _subscription_price(completed_orders_90d: int) -> float:
    per_month = completed_orders_90d / _SUBSCRIPTION_WINDOW_DAYS * _DAYS_PER_MONTH
    for max_orders, price in _SUBSCRIPTION_TIERS:
        if per_month <= max_orders:
            return price
    return _SCALE_PRICE


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

    # Rafid subscription revenue: sum each merchant's tier price, priced purely
    # on their completed-order volume. Merchants with no orders yet still sit on
    # the base tier, so price every registered merchant, defaulting to 0 orders.
    merchant_ids = (await session.execute(select(Merchant.id))).scalars().all()
    order_counts = {
        mid: count
        for mid, count in (
            await session.execute(
                select(SalesOrderRow.merchant_id, func.count())
                .where(SalesOrderRow.status == "completed")
                .group_by(SalesOrderRow.merchant_id)
            )
        ).all()
    }
    subscription_revenue = round(
        sum(_subscription_price(order_counts.get(mid, 0)) for mid in merchant_ids), 2
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
        "subscription_revenue": subscription_revenue,
        "open_alerts": open_alerts,
    }


async def merchants_summary(session: AsyncSession) -> list[dict]:
    """Portfolio table: one enriched row per merchant for the underwriter list.

    Everything is read from already-stored rows in a handful of grouped queries
    (no per-merchant fan-out), then stitched together in Python.
    """
    merchants = (
        (await session.execute(select(Merchant).order_by(Merchant.created_at)))
        .scalars()
        .all()
    )

    # latest assessment per merchant -> score / band / decision
    latest = (
        select(
            CreditAssessment.merchant_id,
            func.max(CreditAssessment.created_at).label("latest_at"),
        )
        .group_by(CreditAssessment.merchant_id)
        .subquery()
    )
    assess = {
        mid: (score, band, approved)
        for mid, score, band, approved in (
            await session.execute(
                select(
                    CreditAssessment.merchant_id,
                    CreditAssessment.score,
                    CreditAssessment.risk_band,
                    CreditAssessment.approved,
                ).join(
                    latest,
                    (CreditAssessment.merchant_id == latest.c.merchant_id)
                    & (CreditAssessment.created_at == latest.c.latest_at),
                )
            )
        ).all()
    }

    platforms: dict[str, list[str]] = {}
    for mid, inst in (
        await session.execute(
            select(Connection.merchant_id, Connection.institution).where(
                Connection.type == ConnectionType.SALES.value,
                Connection.status == ConnectionStatus.ACTIVE.value,
            )
        )
    ).all():
        platforms.setdefault(mid, []).append(inst)

    def _sum_by_merchant(rows) -> dict[str, float]:
        return {mid: float(total) for mid, total in rows}

    volume = _sum_by_merchant(
        (
            await session.execute(
                select(
                    SalesOrderRow.merchant_id,
                    func.coalesce(func.sum(SalesOrderRow.amount), 0.0),
                )
                .where(SalesOrderRow.status == "completed")
                .group_by(SalesOrderRow.merchant_id)
            )
        ).all()
    )
    held = _sum_by_merchant(
        (
            await session.execute(
                select(
                    SettlementRow.merchant_id,
                    func.coalesce(func.sum(SettlementRow.amount), 0.0),
                )
                .where(SettlementRow.status == SettlementStatus.PENDING.value)
                .group_by(SettlementRow.merchant_id)
            )
        ).all()
    )
    outstanding = _sum_by_merchant(
        (
            await session.execute(
                select(
                    MurabahaContract.merchant_id,
                    func.coalesce(func.sum(MurabahaContract.outstanding), 0.0),
                )
                .where(MurabahaContract.status == ContractStatus.ACTIVE.value)
                .group_by(MurabahaContract.merchant_id)
            )
        ).all()
    )
    open_alerts = {
        mid: count
        for mid, count in (
            await session.execute(
                select(RiskAlert.merchant_id, func.count())
                .where(RiskAlert.resolved.is_(False))
                .group_by(RiskAlert.merchant_id)
            )
        ).all()
    }

    rows: list[dict] = []
    for m in merchants:
        a = assess.get(m.id)
        plats = sorted(platforms.get(m.id, []))
        rows.append(
            {
                "id": m.id,
                "name": m.name,
                "business_type": m.business_type,
                "city": m.city,
                "verification_status": m.verification_status,
                "established_at": m.established_at,
                "score": a[0] if a else None,
                "risk_band": a[1] if a else None,
                "approved": a[2] if a else None,
                "platforms": plats,
                "platform_count": len(plats),
                "sales_volume": round(volume.get(m.id, 0.0), 2),
                "held_receivables": round(held.get(m.id, 0.0), 2),
                "outstanding": round(outstanding.get(m.id, 0.0), 2),
                "open_alerts": open_alerts.get(m.id, 0),
            }
        )
    return rows


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
