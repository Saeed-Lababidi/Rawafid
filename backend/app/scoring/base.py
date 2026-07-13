"""FROZEN SEAM (plan §6.2) — credit scoring model contract.

Hand to Saeed: ScoringFeatures (input), CreditDecision (output), score()
signature. Backend owns feature engineering; the model may ignore extras.
ScoringFeatures changes are additive-only once frozen.

Score convention (placeholder until confirmed, plan §18):
  score 0..1000; risk bands A >= 750, B >= 600, C >= 450, else D.
"""

from typing import Protocol

from pydantic import BaseModel


class ScoringFeatures(BaseModel):
    merchant_id: str
    window_days: int  # 90
    total_revenue_90d: float
    avg_daily_revenue: float
    revenue_volatility: float  # std/mean of daily revenue
    revenue_trend: float  # normalized linear slope (per-day slope / avg daily)
    num_settlement_cycles: int
    avg_settlement_days: float
    held_receivables_total: float
    chargeback_ratio: float  # refunded amount / total sales
    account_age_days: int
    platform_mix: dict[str, float]  # revenue share per platform
    # extend freely; additive-only once frozen


class CreditDecision(BaseModel):
    score: int  # 0..1000
    risk_band: str  # A | B | C | D
    approved: bool
    max_advance_ratio: float  # e.g. 0.80
    max_advance_amount: float
    reasons: list[str]  # human-readable explainability
    feature_contributions: dict[str, float]
    model_version: str


class CreditScoringModel(Protocol):
    def score(self, features: ScoringFeatures) -> CreditDecision: ...
