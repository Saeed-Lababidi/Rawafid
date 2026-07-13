"""FROZEN SEAM (plan §6.2) — credit scoring model contract.

Hand to Saeed: ScoringFeatures (input), CreditDecision (output), score()
signature. Backend owns feature engineering; the model may ignore extras.
ScoringFeatures changes are additive-only once frozen.

Score convention (placeholder until confirmed, plan §18):
  score 0..1000; risk bands A >= 750, B >= 600, C >= 450, else D.
"""

from typing import Protocol

from pydantic import BaseModel


class UpcomingSettlement(BaseModel):
    date: str  # ISO date; the future settlement the advance is repaid from
    expected: float


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

    # --- additive extensions (frozen seam, additive-only) — richer signals the
    # rafid-engine consumes; the stub/http models ignore them safely. ---
    merchant_name: str = ""
    sector: str = "other"  # restaurants | ecommerce | other
    registration_verified: bool = False
    weekly_revenue: list[float] = []  # completed-revenue series, one point per week
    upcoming_settlements: list[UpcomingSettlement] = []  # repayment source stream
    dispute_rate: float = 0.0
    net_inflow_ratio: float = 0.0
    avg_balance: float = 0.0
    negative_balance_days: int = 0
    returned_payments: int = 0
    on_time_ratio: float | None = None  # None = no history (engine applies neutral prior)
    prior_advances: int = 0
    sources_connected: list[str] = []  # e.g. ["bank", "salla"]
    data_completeness: float = 1.0  # 0..1 coverage of the signals above
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
    # Full rafid-engine Decision (score 300-850, grade, confidence, bilingual
    # AR/EN explanation, settlement repayment schedule). None for stub/http.
    # Persisted verbatim so the frontend can render the rich, explainable output.
    engine_decision: dict | None = None


class CreditScoringModel(Protocol):
    def score(self, features: ScoringFeatures) -> CreditDecision: ...
