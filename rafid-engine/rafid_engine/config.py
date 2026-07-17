"""Versioned configuration for the Rafid engine.

Every tunable number lives here — factor weights, decision thresholds, product
parameters, grade bands, and the score scale. Nothing downstream hard-codes a
threshold; they read it from this module. Each Decision records
``THRESHOLDS_VERSION`` so any past assessment is fully reproducible.

Changing scoring behaviour should mean editing this file (and bumping a version),
never touching the scoring code.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Mapping

# --- versions (stamped onto every Decision for auditability) ---
ENGINE_VERSION = "0.1.0"
THRESHOLDS_VERSION = "2026.07"

# --- score scale: score_850 = SCORE_BASE + round(normalized * SCORE_SPAN) ---
SCORE_BASE = 300
SCORE_SPAN = 550
SCORE_MIN = SCORE_BASE            # 300
SCORE_MAX = SCORE_BASE + SCORE_SPAN  # 850

# --- the seven scorecard factors and their weights (must sum to 1.0) ---
FACTOR_WEIGHTS: Mapping[str, float] = {
    "REVENUE_SCALE": 0.15,
    "REVENUE_STABILITY": 0.15,
    "GROWTH_TREND": 0.10,
    "CASH_FLOW_HEALTH": 0.15,
    "SETTLEMENT_RELIABILITY": 0.20,
    "REPAYMENT_HISTORY": 0.15,
    "CONCENTRATION": 0.10,
}


@dataclass(frozen=True)
class Thresholds:
    """Decision gates. See Phase 3 for the rationale behind each value."""

    approve_score: int = 680
    review_score_floor: int = 600
    approve_confidence: float = 0.65
    min_tenure_months: int = 3           # ~90 days of trading history
    min_data_completeness: float = 0.60
    max_chargeback_dispute: float = 0.05  # hard knockout ceiling (fraud/abuse)
    severe_delinquency_ratio: float = 0.40  # prior on-time ratio below this -> decline


@dataclass(frozen=True)
class ProductParams:
    """Pricing/product parameters. NOT AI outputs — the engine consumes these."""

    advance_rate_max: float = 0.80        # never advance more than 80% of receivables
    murabaha_fee_rate: float = 0.021      # fixed Murabaha fee (2.1%)
    max_deduction_share: float = 0.40     # never claw back >40% of one settlement
    min_ticket: int = 1_000
    max_ticket: int = 500_000
    # advance-rate multiplier by grade — higher risk gets a lower share
    risk_multiplier: Mapping[str, float] = field(
        default_factory=lambda: {
            "A+": 1.00, "A": 1.00, "A-": 1.00,
            "B+": 0.85, "B": 0.70, "B-": 0.55,
            "C": 0.00, "D": 0.00,
        }
    )


# grade bands: (min_score_inclusive, grade, arabic_label, english_label)
GRADE_BANDS: tuple[tuple[int, str, str, str], ...] = (
    (810, "A+", "ممتاز", "Excellent"),
    (780, "A", "عالية جدًا", "Very high"),
    (750, "A-", "عالية", "High"),
    (720, "B+", "جيدة", "Good"),
    (680, "B", "مقبولة", "Fair"),
    (640, "B-", "حدّية", "Marginal"),
    (600, "C", "ضعيفة", "Weak"),
    (0, "D", "غير مؤهّل", "Not eligible"),
)

@dataclass(frozen=True)
class ScoringParams:
    """Tunable parameters for the seven factor scoring functions (A2).

    Breakpoints are ascending ``(x, y)`` tables interpolated by the scorer.
    Everything a credit analyst might want to retune lives here, not in code.
    """

    revenue_breakpoints: tuple[tuple[float, float], ...] = (
        (15_000, 0.0), (60_000, 0.5), (200_000, 0.9), (400_000, 1.0),
    )
    stability_cv_cap: float = 0.60          # weekly-revenue CV at which stability -> 0
    growth_scale_per_period: float = 0.012  # per-week growth that earns full marks
    cash_net_inflow_target: float = 0.35    # net-inflow ratio for full cash-flow marks
    cash_neg_day_penalty: float = 0.05      # per negative-balance day
    cash_returned_penalty: float = 0.10     # per returned payment
    settlement_cv_cap: float = 0.50         # settlement-amount CV at which regularity -> 0
    settlement_dispute_penalty: float = 3.0  # multiplier on (chargeback + dispute) rate
    repayment_prior_mean: float = 0.60      # neutral prior when history is thin/absent
    repayment_shrink_k: float = 1.0         # pseudo-count pulling thin history to prior
    concentration_breakpoints: tuple[tuple[float, float], ...] = (
        (0.35, 1.0), (0.60, 0.6), (0.85, 0.2), (1.0, 0.1),
    )
    neutral: float = 0.50                   # returned when a signal is missing


@dataclass(frozen=True)
class ConfidenceParams:
    """Weights and targets for the confidence model (A3).

    Confidence is orthogonal to risk: it measures how much we trust the
    assessment given data quality and coverage, not how good the merchant is.
    Weights must sum to 1.0.
    """

    w_completeness: float = 0.35
    w_history: float = 0.25
    w_coverage: float = 0.25
    w_track: float = 0.15
    target_weeks: int = 12            # weeks of revenue history for full depth
    target_tenure_months: int = 12
    target_prior_advances: int = 3    # advances for a full repayment track record
    high_band: float = 0.75
    medium_band: float = 0.55


# Sales platform names recognized in meta.sources_connected for confidence's
# source-coverage check (see confidence.py). Add new platforms here as they're
# integrated — this is data, not logic, so it never needs a code change elsewhere.
KNOWN_SALES_PLATFORMS: frozenset[str] = frozenset({
    "jahez", "foodics", "salla", "zid", "hungerstation",
})

@dataclass(frozen=True)
class ExplainParams:
    """Tunable parameters for the explainability layer (strengths/weaknesses/next steps)."""

    strength_threshold: float = 0.75  # sub-score at/above which a factor is a genuine strength
    impact_target: float = 0.90       # target sub-score used to estimate next-step score impact


THRESHOLDS = Thresholds()
PRODUCT = ProductParams()
SCORING = ScoringParams()
CONFIDENCE = ConfidenceParams()
EXPLAIN = ExplainParams()


def validate_config() -> None:
    """Fail fast at import time if weights are misconfigured."""
    total = round(sum(FACTOR_WEIGHTS.values()), 6)
    if total != 1.0:
        raise ValueError(f"FACTOR_WEIGHTS must sum to 1.0, got {total}")
    conf_total = round(
        CONFIDENCE.w_completeness + CONFIDENCE.w_history
        + CONFIDENCE.w_coverage + CONFIDENCE.w_track,
        6,
    )
    if conf_total != 1.0:
        raise ValueError(f"Confidence weights must sum to 1.0, got {conf_total}")

    # Grade bands and the approval threshold are configured independently.
    # If they ever drift apart, an "approved" decision could resolve to a grade
    # whose risk_multiplier is 0 -> recommended_amount=0 on an approval. Guard it.
    grade_at_threshold = None
    for min_score, grade, _ar, _en in GRADE_BANDS:
        if THRESHOLDS.approve_score >= min_score:
            grade_at_threshold = grade
            break
    if grade_at_threshold is None:
        raise ValueError("approve_score does not resolve to any configured grade band")
    multiplier = PRODUCT.risk_multiplier.get(grade_at_threshold, 0.0)
    if multiplier <= 0.0:
        raise ValueError(
            f"approve_score ({THRESHOLDS.approve_score}) resolves to grade "
            f"'{grade_at_threshold}', whose risk_multiplier is {multiplier}. "
            "An approved decision would get a 0 SAR advance. Align THRESHOLDS."
            "approve_score with a grade band that has a nonzero risk_multiplier."
        )


validate_config()
