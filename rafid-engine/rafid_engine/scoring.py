"""The seven factor scoring functions.

Each function is pure and returns a sub-score in [0, 1]. Higher is always better
(volatility and concentration are inverted inside their functions), which keeps
the aggregator trivial and every factor's direction consistent. All tunable
numbers come from ``config.SCORING`` — these functions hold shape, not policy.

Missing or insufficient signals return a neutral 0.5 rather than a punitive 0,
so a merchant is never penalised for data we simply don't have yet (that
uncertainty is expressed through the confidence score in A3 instead).
"""
from __future__ import annotations

from statistics import mean, pstdev
from typing import Optional

from .config import SCORING
from .schema import MerchantFeatures


# --------------------------------------------------------------------------- #
# Small numeric helpers
# --------------------------------------------------------------------------- #
def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def piecewise(x: float, points: tuple[tuple[float, float], ...]) -> float:
    """Interpolate ``x`` over an ascending ``(x, y)`` table; clamp beyond ends."""
    if x <= points[0][0]:
        return points[0][1]
    if x >= points[-1][0]:
        return points[-1][1]
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        if x0 <= x <= x1:
            t = (x - x0) / (x1 - x0) if x1 != x0 else 0.0
            return y0 + t * (y1 - y0)
    return points[-1][1]


def _cv(values: list[float]) -> Optional[float]:
    """Coefficient of variation; ``None`` if the mean is non-positive."""
    m = mean(values)
    if m <= 0:
        return None
    return pstdev(values) / m


def _slope(values: list[float]) -> float:
    """Least-squares slope of ``values`` against their index."""
    n = len(values)
    xs = list(range(n))
    mx, my = mean(xs), mean(values)
    den = sum((x - mx) ** 2 for x in xs)
    if den == 0:
        return 0.0
    return sum((x - mx) * (y - my) for x, y in zip(xs, values)) / den


# --------------------------------------------------------------------------- #
# The seven factors
# --------------------------------------------------------------------------- #
def score_revenue_scale(f: MerchantFeatures) -> float:
    """Capacity to service an advance, from monthly revenue (diminishing returns)."""
    return clamp(piecewise(f.revenue.monthly_avg, SCORING.revenue_breakpoints))


def score_revenue_stability(f: MerchantFeatures) -> float:
    """Steadiness of revenue — low weekly volatility scores high."""
    series = f.revenue.weekly_series
    if len(series) < 2:
        return SCORING.neutral
    cv = _cv(series)
    if cv is None:
        return SCORING.neutral
    return clamp(1 - cv / SCORING.stability_cv_cap)


def score_growth_trend(f: MerchantFeatures) -> float:
    """Trajectory — flat is neutral (0.5), growth lifts, decline drops."""
    series = f.revenue.weekly_series
    if len(series) < 3:
        return SCORING.neutral
    m = mean(series)
    if m <= 0:
        return SCORING.neutral
    growth_per_period = _slope(series) / m
    return clamp(0.5 + (growth_per_period / SCORING.growth_scale_per_period) * 0.5)


def score_cash_flow_health(f: MerchantFeatures) -> float:
    """Net inflow strength, penalised for negative-balance days and returns."""
    b = f.banking
    base = clamp(b.net_inflow_ratio / SCORING.cash_net_inflow_target)
    penalty = (
        SCORING.cash_neg_day_penalty * b.negative_balance_days
        + SCORING.cash_returned_penalty * b.returned_payments
    )
    return clamp(base - penalty)


def score_settlement_reliability(f: MerchantFeatures) -> float:
    """Predictability of settlements, penalised by chargeback + dispute rate."""
    st = f.settlements
    expected = [u.expected for u in st.upcoming]
    if len(expected) >= 2:
        cv = _cv(expected)
        regularity = clamp(1 - cv / SCORING.settlement_cv_cap) if cv is not None else SCORING.neutral
    elif len(expected) == 1:
        regularity = 0.60
    else:
        regularity = 0.30  # no forward settlements = weak security
    penalty = SCORING.settlement_dispute_penalty * (st.chargeback_rate + st.dispute_rate)
    return clamp(regularity - penalty)


def score_repayment_history(f: MerchantFeatures) -> float:
    """On-time ratio, shrunk toward a neutral prior when history is thin."""
    r = f.repayment
    if r.prior_advances <= 0 or r.on_time_ratio is None:
        return SCORING.repayment_prior_mean
    n = r.prior_advances
    k = SCORING.repayment_shrink_k
    blended = (r.on_time_ratio * n + SCORING.repayment_prior_mean * k) / (n + k)
    return clamp(blended)


def score_concentration(f: MerchantFeatures) -> float:
    """Diversification — reliance on a single platform scores low."""
    shares = f.sales.by_platform
    if not shares:
        return SCORING.neutral
    top_share = max(shares.values())
    return clamp(piecewise(top_share, SCORING.concentration_breakpoints))


# Registry codes -> scoring function. Registry imports this map.
SCORE_FUNCTIONS = {
    "REVENUE_SCALE": score_revenue_scale,
    "REVENUE_STABILITY": score_revenue_stability,
    "GROWTH_TREND": score_growth_trend,
    "CASH_FLOW_HEALTH": score_cash_flow_health,
    "SETTLEMENT_RELIABILITY": score_settlement_reliability,
    "REPAYMENT_HISTORY": score_repayment_history,
    "CONCENTRATION": score_concentration,
}
