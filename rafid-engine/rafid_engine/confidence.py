"""Confidence model.

Confidence answers a different question from the risk score: *how much should we
trust this assessment given the data we have?* A merchant can be low-risk but
low-confidence (thin data) — those are separate axes and must not be conflated.

Four drivers, each in [0, 1], combined by config weights:
  - data completeness   (how much of the expected data is present)
  - history depth       (weeks of revenue + months of tenure vs targets)
  - source coverage      (bank + sales + settlements all connected?)
  - track record        (how many prior advances inform the repayment signal)

Low confidence can downgrade an otherwise-approvable decision to review — that
coupling lives in ``decision.py``.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import config
from .schema import ConfidenceBand, ConfidenceDriver, Localized, MerchantFeatures
from .scoring import clamp


@dataclass
class ConfidenceResult:
    value: float
    band: ConfidenceBand
    drivers: list[ConfidenceDriver]


def _band(value: float) -> ConfidenceBand:
    if value >= config.CONFIDENCE.high_band:
        return ConfidenceBand.high
    if value >= config.CONFIDENCE.medium_band:
        return ConfidenceBand.medium
    return ConfidenceBand.low


def assess_confidence(features: MerchantFeatures) -> ConfidenceResult:
    C = config.CONFIDENCE
    meta = features.meta

    # 1) data completeness — taken directly from the feature snapshot
    completeness = clamp(meta.data_completeness)

    # 2) history depth — revenue weeks and business tenure vs targets
    weeks = len(features.revenue.weekly_series)
    history = 0.5 * clamp(weeks / C.target_weeks) + 0.5 * clamp(
        features.merchant.tenure_months / C.target_tenure_months
    )

    # 3) source coverage — bank + sales + settlements all connected?
    # Explicit checks, not string-sniffing: a source counts as "sales" only if it
    # names a known sales platform (or by_platform data is already present),
    # so an unrelated connected source (e.g. a settlements provider) can't be
    # miscounted as sales coverage.
    sources = {s.lower() for s in meta.sources_connected}
    has_bank = any("bank" in s for s in sources)
    has_sales = bool(features.sales.by_platform) or bool(sources & config.KNOWN_SALES_PLATFORMS)
    has_settlements = (
        features.settlements.confirmed_receivables > 0 or bool(features.settlements.upcoming)
    )
    coverage = (has_bank + has_sales + has_settlements) / 3

    # 4) track record — depth of repayment history behind the repayment factor
    track = clamp(features.repayment.prior_advances / C.target_prior_advances)

    value = round(
        clamp(
            C.w_completeness * completeness
            + C.w_history * history
            + C.w_coverage * coverage
            + C.w_track * track
        ),
        4,
    )

    drivers = [
        ConfidenceDriver(
            code="DATA_COMPLETENESS",
            detail=Localized(
                ar=f"اكتمال البيانات {round(completeness * 100)}%",
                en=f"{round(completeness * 100)}% data completeness",
            ),
        ),
        ConfidenceDriver(
            code="HISTORY_DEPTH",
            detail=Localized(
                ar=f"{weeks} أسبوعًا من الإيرادات و{features.merchant.tenure_months} شهرًا من النشاط",
                en=f"{weeks} weeks of revenue, {features.merchant.tenure_months} months trading",
            ),
        ),
        ConfidenceDriver(
            code="SOURCE_COVERAGE",
            detail=Localized(
                ar=f"تغطية المصادر {int(coverage * 3)}/3 (بنك · مبيعات · تسويات)",
                en=f"{int(coverage * 3)}/3 sources (bank · sales · settlements)",
            ),
        ),
        ConfidenceDriver(
            code="TRACK_RECORD",
            detail=Localized(
                ar=f"{features.repayment.prior_advances} عملية تمويل سابقة",
                en=f"{features.repayment.prior_advances} prior advances on record",
            ),
        ),
    ]

    return ConfidenceResult(value=value, band=_band(value), drivers=drivers)
