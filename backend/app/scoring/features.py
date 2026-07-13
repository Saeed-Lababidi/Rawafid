"""Feature engineering: aggregated rows -> ScoringFeatures (backend-owned)."""

import math
import statistics
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.domain.models import (
    Connection,
    Merchant,
    SalesOrderRow,
    SettlementRow,
    TransactionRow,
)
from app.scoring.base import ScoringFeatures, UpcomingSettlement

_SECTORS = {"restaurants", "ecommerce"}


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

    # --- richer signals for the rafid-engine (additive; stub/http ignore them) ---
    # weekly revenue series from the daily window
    weekly = [round(sum(series[i : i + 7]), 2) for i in range(0, len(series), 7)]

    # Expected forward settlement stream repayment is deducted from. We project the
    # merchant's ESTABLISHED cadence forward rather than passing the 1-2 raw pending
    # rows, which are a lumpy snapshot at the payout-window boundary (one full cycle
    # + one partial) and misrepresent settlement regularity. Amount = typical
    # historical payout; spacing = observed avg settlement cadence. The advance is
    # still capped by real confirmed_receivables (held), so this only shapes the
    # repayment schedule and the settlement-reliability signal, never the exposure.
    typical_settlement = (
        round(statistics.mean([c.amount for c in credits]), 2)
        if credits
        else (round(held_total / len(held), 2) if held else 0.0)
    )
    cadence_days = max(7, round(avg_settlement_days))
    upcoming_settlements: list[UpcomingSettlement] = []
    if typical_settlement > 0 and held_total > 0:
        n_cycles = min(12, max(4, math.ceil(held_total / typical_settlement) + 2))
        for i in range(1, n_cycles + 1):
            upcoming_settlements.append(
                UpcomingSettlement(
                    date=(today + timedelta(days=cadence_days * i)).isoformat(),
                    expected=typical_settlement,
                )
            )

    # bank-statement net inflow over the window (credits vs debits)
    txns = (
        (
            await session.execute(
                select(TransactionRow).where(
                    TransactionRow.merchant_id == merchant.id,
                    TransactionRow.date >= since,
                )
            )
        )
        .scalars()
        .all()
    )
    inflow = sum(t.amount for t in txns if t.direction == "credit")
    outflow = sum(t.amount for t in txns if t.direction == "debit")
    net_inflow_ratio = round((inflow - outflow) / inflow, 4) if inflow > 0 else 0.0

    # connected data sources -> drives the engine's confidence/data-completeness
    conns = (
        (
            await session.execute(
                select(Connection).where(
                    Connection.merchant_id == merchant.id,
                    Connection.status == "active",
                )
            )
        )
        .scalars()
        .all()
    )
    sources = sorted({c.type for c in conns})
    has_bank = "bank" in sources
    has_sales = "sales" in sources
    data_completeness = round(
        0.5 * (total_revenue > 0) + 0.25 * has_bank + 0.25 * has_sales, 3
    )

    sector = merchant.business_type if merchant.business_type in _SECTORS else "other"

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
        merchant_name=merchant.name,
        sector=sector,
        registration_verified=merchant.verification_status == "verified",
        weekly_revenue=weekly,
        upcoming_settlements=upcoming_settlements,
        # backend has no separate dispute signal; refunds already feed chargeback_ratio
        dispute_rate=0.0,
        net_inflow_ratio=net_inflow_ratio,
        sources_connected=sources,
        data_completeness=data_completeness,
    )
