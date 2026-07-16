"""Exposure and repayment.

Two computations, kept separate from the risk score on purpose:

  max_advance   = advance_rate_max * risk_multiplier(grade) * confirmed_receivables
  schedule      = repay `total_repayment` from upcoming settlements, taking at most
                  `max_deduction_share` (40%) of any single settlement, so the
                  merchant keeps operating liquidity.

If the known upcoming settlements can't fully recover the advance within the 40%
cap, we project further cycles using the merchant's own average settlement size
and cadence. Projected installments are flagged so the bank can distinguish them
from confirmed ones.
"""
from __future__ import annotations

from datetime import date, timedelta
from statistics import mean

from . import config
from .schema import Deduction


def effective_advance_rate(grade: str) -> float:
    """Advance rate after the grade-based risk multiplier."""
    multiplier = config.PRODUCT.risk_multiplier.get(grade, 0.0)
    return config.PRODUCT.advance_rate_max * multiplier


def max_advance(grade: str, confirmed_receivables: float) -> float:
    """Largest safe advance: receivables-capped, risk-adjusted, ticket-bounded."""
    cap = effective_advance_rate(grade) * confirmed_receivables
    cap = min(cap, config.PRODUCT.max_ticket)
    return float(int(cap))  # floor to whole SAR


def _avg_gap_days(dates: list[date]) -> int:
    if len(dates) < 2:
        return 7
    gaps = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
    gap = round(mean(gaps))
    return gap if gap > 0 else 7


def build_repayment_schedule(
    total_repayment: float,
    upcoming: list[tuple[date, float]],
    max_cycles: int = 26,
) -> tuple[list[Deduction], date | None]:
    """Allocate ``total_repayment`` across settlements at <= 40% each.

    If sparse/near-zero settlement data means the 40%-per-cycle cap can't fully
    recover the balance within ``max_cycles`` projected cycles, the shortfall is
    folded into the final installment rather than silently dropped — the
    schedule always sums to ``total_repayment`` exactly, even if that means the
    last installment exceeds the normal 40% cap. That trade-off (a single
    oversized final deduction) is preferable to quietly under-collecting.
    """
    if total_repayment <= 0 or not upcoming:
        return [], None

    share = config.PRODUCT.max_deduction_share
    remaining = round(total_repayment, 2)
    schedule: list[Deduction] = []

    # 1) confirmed upcoming settlements
    for settle_date, expected in upcoming:
        if remaining <= 0:
            break
        deduction = min(round(share * expected, 2), remaining)
        schedule.append(
            Deduction(date=settle_date, settlement_expected=expected,
                      deduction=round(deduction, 2), projected=False)
        )
        remaining = round(remaining - deduction, 2)

    # 2) project further cycles from the merchant's own cadence, if needed
    if remaining > 0:
        avg_amount = mean([e for _, e in upcoming])
        gap = _avg_gap_days([d for d, _ in upcoming])
        cursor = upcoming[-1][0]
        cycles = 0
        while remaining > 0 and cycles < max_cycles:
            cursor = cursor + timedelta(days=gap)
            deduction = min(round(share * avg_amount, 2), remaining)
            schedule.append(
                Deduction(date=cursor, settlement_expected=round(avg_amount, 2),
                          deduction=round(deduction, 2), projected=True)
            )
            remaining = round(remaining - deduction, 2)
            cycles += 1

        # Sparse/near-zero settlements can exhaust max_cycles without fully
        # allocating the balance. Rather than silently under-collecting, fold
        # the shortfall into the last installment so the sum always matches.
        if remaining > 0 and schedule:
            schedule[-1] = schedule[-1].model_copy(
                update={"deduction": round(schedule[-1].deduction + remaining, 2)}
            )
            remaining = 0.0

    payoff = schedule[-1].date if schedule else None
    return schedule, payoff


def price_advance(
    amount: float, upcoming: list[tuple[date, float]]
) -> tuple[float, float, list[Deduction], date | None]:
    """Return (fee, total_repayment, schedule, payoff_date) for an advance."""
    fee = round(amount * config.PRODUCT.murabaha_fee_rate, 2)
    total = round(amount + fee, 2)
    schedule, payoff = build_repayment_schedule(total, upcoming)
    return fee, total, schedule, payoff
