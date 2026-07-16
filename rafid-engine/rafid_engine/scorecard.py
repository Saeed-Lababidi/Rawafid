"""Scorecard aggregation.

Combines the seven factor sub-scores into the normalized score, the 300–850
score, a grade band, a health status, and the per-factor contribution list the
frontend renders as bars. Pure and deterministic: same features in, same result.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import config
from .registry import FactorRegistry, build_default_registry
from .schema import (
    FactorContribution,
    HealthStatus,
    Localized,
    MerchantFeatures,
    Polarity,
)
from .scoring import clamp

# Built once and reused: the default registry is stateless (each Factor's
# score_fn is a pure function), so rebuilding it on every run_scorecard() call
# was pure waste. Callers can still pass a custom registry to bypass the cache.
_DEFAULT_REGISTRY = build_default_registry()


@dataclass
class ScorecardResult:
    normalized: float
    score_850: int
    grade: str
    band: Localized
    health: HealthStatus
    health_label: Localized
    factors: list[FactorContribution]


def grade_for(score_850: int) -> tuple[str, str, str]:
    """Return ``(grade, ar_label, en_label)`` for a score, via config bands."""
    for min_score, grade, ar, en in config.GRADE_BANDS:
        if score_850 >= min_score:
            return grade, ar, en
    last = config.GRADE_BANDS[-1]
    return last[1], last[2], last[3]


def _polarity(sub: float) -> Polarity:
    if sub >= 0.60:
        return Polarity.positive
    if sub <= 0.40:
        return Polarity.negative
    return Polarity.neutral


def _band_detail(sub: float) -> Localized:
    if sub >= 0.80:
        return Localized(ar="قوي", en="Strong")
    if sub >= 0.60:
        return Localized(ar="جيد", en="Good")
    if sub >= 0.40:
        return Localized(ar="متوسط", en="Moderate")
    return Localized(ar="ضعيف", en="Weak")


def _health(normalized: float) -> tuple[HealthStatus, Localized]:
    if normalized >= 0.80:
        return HealthStatus.strong, Localized(ar="أداء تجاري قوي", en="Strong business performance")
    if normalized >= 0.65:
        return HealthStatus.stable, Localized(ar="أداء مستقر", en="Stable performance")
    if normalized >= 0.50:
        return HealthStatus.fragile, Localized(ar="أداء هش", en="Fragile performance")
    return HealthStatus.distressed, Localized(ar="أداء متعثر", en="Distressed performance")


def run_scorecard(
    features: MerchantFeatures, registry: FactorRegistry | None = None
) -> ScorecardResult:
    reg = registry or _DEFAULT_REGISTRY

    graded: list[tuple] = []
    normalized = 0.0
    for factor in reg.all():
        sub = clamp(factor.score_fn(features))  # defensive: enforce [0, 1]
        contribution = factor.weight * sub
        normalized += contribution
        graded.append((factor, sub, contribution))

    score_850 = config.SCORE_BASE + round(normalized * config.SCORE_SPAN)
    grade, ar, en = grade_for(score_850)

    factors = [
        FactorContribution(
            code=factor.code,
            name=factor.name,
            weight=factor.weight,
            sub_score=round(sub, 4),
            contribution_pct=round((contribution / normalized * 100) if normalized > 0 else 0.0, 1),
            polarity=_polarity(sub),
            detail=_band_detail(sub),
        )
        for factor, sub, contribution in graded
    ]
    factors.sort(key=lambda fc: fc.contribution_pct, reverse=True)

    health, health_label = _health(normalized)
    return ScorecardResult(
        normalized=round(normalized, 4),
        score_850=score_850,
        grade=grade,
        band=Localized(ar=ar, en=en),
        health=health,
        health_label=health_label,
        factors=factors,
    )
