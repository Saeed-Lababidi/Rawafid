"""Feature engineering: aggregated rows -> ScoringFeatures (backend-owned)."""

import statistics
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.models import Merchant, SalesOrderRow, SettlementRow, TransactionRow
from app.scoring.base import ScoringFeatures


async def build_features(session: AsyncSession, merchant: Merchant) -> ScoringFeatures:
    window_days = get_settings().scoring_window_days
    today = date.today()
    since = today - timedelta(days=window_days)

    orders = (
        (
            await session.execute(
                select(SalesOrderRow).where(
                    SalesOrderRow.merchant_id == merchant.id,
                    SalesOrderRow.order_date >= since,
                )
            )
        )
        .scalars()
        .all()
    )
    completed = [o for o in orders if o.status == "completed"]
    refunded_amount = sum(o.amount for o in orders if o.status == "refunded")
    total_amount = sum(o.amount for o in orders)

    # daily revenue series over the window
    daily: dict[date, float] = {}
    for o in completed:
        daily[o.order_date] = daily.get(o.order_date, 0.0) + o.amount
    series = [daily.get(since + timedelta(days=i), 0.0) for i in range(window_days + 1)]

    total_revenue = sum(series)
    avg_daily = total_revenue / len(series) if series else 0.0
    volatility = (statistics.pstdev(series) / avg_daily) if avg_daily > 0 else 0.0

    # normalized linear trend: per-day OLS slope relative to average daily revenue
    n = len(series)
    trend = 0.0
    if n > 1 and avg_daily > 0:
        xs = range(n)
        mean_x = (n - 1) / 2
        cov = sum((x - mean_x) * (y - avg_daily) for x, y in zip(xs, series, strict=True))
        var = sum((x - mean_x) ** 2 for x in xs)
        trend = (cov / var) / avg_daily

    # settlement cadence from historical payout credits (bank statement)
    credits = (
        (
            await session.execute(
                select(TransactionRow)
                .where(
                    TransactionRow.merchant_id == merchant.id,
                    TransactionRow.category == "settlement",
                    TransactionRow.date >= since,
                )
                .order_by(TransactionRow.date)
            )
        )
        .scalars()
        .all()
    )
    cycle_dates = sorted({c.date for c in credits})
    gaps = [(b - a).days for a, b in zip(cycle_dates, cycle_dates[1:], strict=False)]
    avg_settlement_days = statistics.mean(gaps) if gaps else 14.0

    held = (
        await session.execute(
            select(SettlementRow).where(
                SettlementRow.merchant_id == merchant.id,
                SettlementRow.status == "pending",
            )
        )
    ).scalars().all()
    held_total = round(sum(s.amount for s in held), 2)

    platform_totals: dict[str, float] = {}
    for o in completed:
        platform_totals[o.platform] = platform_totals.get(o.platform, 0.0) + o.amount
    mix = (
        {p: round(v / total_revenue, 4) for p, v in platform_totals.items()}
        if total_revenue > 0
        else {}
    )

    return ScoringFeatures(
        merchant_id=merchant.id,
        window_days=window_days,
        total_revenue_90d=round(total_revenue, 2),
        avg_daily_revenue=round(avg_daily, 2),
        revenue_volatility=round(volatility, 4),
        revenue_trend=round(trend, 5),
        num_settlement_cycles=len(cycle_dates),
        avg_settlement_days=round(avg_settlement_days, 1),
        held_receivables_total=held_total,
        chargeback_ratio=round(refunded_amount / total_amount, 4) if total_amount else 0.0,
        account_age_days=(today - merchant.established_at).days,
        platform_mix=mix,
    )
