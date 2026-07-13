"""Factor registry — the extensibility seam.

A scoring factor is a small self-contained unit: a code, a bilingual name, a
weight, and a ``score_fn`` that maps ``MerchantFeatures`` to a sub-score in
[0, 1]. Adding a new signal later means registering one more ``Factor`` and
adjusting weights in ``config`` — the aggregator never changes.

A2 wires the seven factors to their real scoring functions in ``scoring.py``.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from . import config
from .schema import Localized, MerchantFeatures, Polarity
from .scoring import SCORE_FUNCTIONS


class ScoreFn(Protocol):
    def __call__(self, features: MerchantFeatures) -> float:
        """Return a sub-score in [0, 1]."""
        ...


@dataclass(frozen=True)
class Factor:
    code: str
    name: Localized
    weight: float
    score_fn: ScoreFn
    polarity_hint: Polarity = Polarity.positive


class FactorRegistry:
    """Ordered collection of factors. Enforces unique codes."""

    def __init__(self) -> None:
        self._factors: dict[str, Factor] = {}

    def register(self, factor: Factor) -> None:
        if factor.code in self._factors:
            raise ValueError(f"Factor already registered: {factor.code}")
        self._factors[factor.code] = factor

    def all(self) -> list[Factor]:
        return list(self._factors.values())

    def get(self, code: str) -> Factor:
        return self._factors[code]

    def total_weight(self) -> float:
        return round(sum(f.weight for f in self._factors.values()), 6)


def _l(ar: str, en: str) -> Localized:
    return Localized(ar=ar, en=en)


_FACTOR_META: dict[str, Localized] = {
    "REVENUE_SCALE": _l("حجم الإيرادات", "Revenue scale"),
    "REVENUE_STABILITY": _l("استقرار الإيرادات", "Revenue stability"),
    "GROWTH_TREND": _l("اتجاه النمو", "Growth trend"),
    "CASH_FLOW_HEALTH": _l("صحة التدفق النقدي", "Cash-flow health"),
    "SETTLEMENT_RELIABILITY": _l("انتظام التسويات", "Settlement reliability"),
    "REPAYMENT_HISTORY": _l("سجل السداد", "Repayment history"),
    "CONCENTRATION": _l("تنويع القنوات", "Channel diversification"),
}


def build_default_registry() -> FactorRegistry:
    """The seven Rafid factors, weighted per ``config.FACTOR_WEIGHTS``."""
    registry = FactorRegistry()
    for code, weight in config.FACTOR_WEIGHTS.items():
        registry.register(
            Factor(
                code=code,
                name=_FACTOR_META[code],
                weight=weight,
                score_fn=SCORE_FUNCTIONS[code],
            )
        )
    return registry
