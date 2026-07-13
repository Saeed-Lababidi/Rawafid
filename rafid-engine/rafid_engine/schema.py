"""The engine's data contracts — the only surface the backend and frontend share.

``MerchantFeatures`` is the input the backend builds and hands in. ``Decision``
is the structured, bilingual output the backend persists and the frontend
renders one-to-one. ``Offer`` is the result of ``quote()`` for a chosen amount.

These models are the frozen boundary from Phase 2: if they don't change, the
three tracks never block each other. Input uses ``extra="forbid"`` so a typo in
an upstream field fails loudly instead of being silently ignored.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class Localized(BaseModel):
    """Bilingual human-readable string. Arabic-first, English mirror."""

    ar: str
    en: str


# --------------------------------------------------------------------------- #
# Enums
# --------------------------------------------------------------------------- #
class Sector(str, Enum):
    restaurants = "restaurants"
    ecommerce = "ecommerce"
    other = "other"


class HealthStatus(str, Enum):
    strong = "strong"
    stable = "stable"
    fragile = "fragile"
    distressed = "distressed"
    unknown = "unknown"


class Outcome(str, Enum):
    approve = "approve"
    review = "review"
    decline = "decline"


class ConfidenceBand(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Polarity(str, Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"


# --------------------------------------------------------------------------- #
# Input contract: MerchantFeatures
# --------------------------------------------------------------------------- #
class MerchantProfile(BaseModel):
    id: str
    name: str
    sector: Sector = Sector.other
    tenure_months: int = Field(ge=0)
    registration_verified: bool = False


class RevenueSignals(BaseModel):
    monthly_avg: float = Field(ge=0)
    weekly_series: list[float] = Field(default_factory=list)
    currency: str = "SAR"

    @field_validator("weekly_series")
    @classmethod
    def _non_negative(cls, v: list[float]) -> list[float]:
        if any(x < 0 for x in v):
            raise ValueError("weekly_series values must be non-negative")
        return v


class SalesSignals(BaseModel):
    by_platform: dict[str, float] = Field(default_factory=dict)
    orders_90d: int = Field(default=0, ge=0)
    refund_rate: float = Field(default=0.0, ge=0, le=1)

    @model_validator(mode="after")
    def _shares_sane(self) -> "SalesSignals":
        if self.by_platform:
            if any(not 0 <= s <= 1 for s in self.by_platform.values()):
                raise ValueError("each platform share must be in [0, 1]")
            if sum(self.by_platform.values()) > 1.01:
                raise ValueError("by_platform shares must sum to <= 1.0")
        return self


class BankingSignals(BaseModel):
    avg_balance: float = 0.0
    net_inflow_ratio: float = 0.0
    negative_balance_days: int = Field(default=0, ge=0)
    returned_payments: int = Field(default=0, ge=0)


class UpcomingSettlement(BaseModel):
    date: date
    expected: float = Field(ge=0)


class SettlementSignals(BaseModel):
    confirmed_receivables: float = Field(default=0.0, ge=0)
    upcoming: list[UpcomingSettlement] = Field(default_factory=list)
    chargeback_rate: float = Field(default=0.0, ge=0, le=1)
    dispute_rate: float = Field(default=0.0, ge=0, le=1)


class RepaymentSignals(BaseModel):
    prior_advances: int = Field(default=0, ge=0)
    # None means "no history" -> engine applies a neutral prior (A3), not a penalty
    on_time_ratio: Optional[float] = Field(default=None, ge=0, le=1)


class FeatureMeta(BaseModel):
    data_completeness: float = Field(default=1.0, ge=0, le=1)
    sources_connected: list[str] = Field(default_factory=list)
    as_of: date


class MerchantFeatures(BaseModel):
    """Everything the engine needs to assess one merchant, grouped by domain.

    ``extra_signals`` is the forward-compatibility hatch: new numeric inputs can
    arrive without a schema change until they graduate into a first-class field.
    """

    model_config = ConfigDict(extra="forbid")

    merchant: MerchantProfile
    revenue: RevenueSignals
    sales: SalesSignals = Field(default_factory=SalesSignals)
    banking: BankingSignals = Field(default_factory=BankingSignals)
    settlements: SettlementSignals = Field(default_factory=SettlementSignals)
    repayment: RepaymentSignals = Field(default_factory=RepaymentSignals)
    meta: FeatureMeta
    extra_signals: dict[str, float] = Field(default_factory=dict)


# --------------------------------------------------------------------------- #
# Output contract: Decision
# --------------------------------------------------------------------------- #
class FactorContribution(BaseModel):
    code: str
    name: Localized
    weight: float
    sub_score: float = Field(ge=0, le=1)
    contribution_pct: float
    polarity: Polarity
    detail: Localized


class CreditAssessment(BaseModel):
    health: HealthStatus
    health_label: Localized


class RiskScore(BaseModel):
    value_850: int = Field(ge=300, le=850)
    normalized: float = Field(ge=0, le=1)
    grade: str
    band: Localized
    factors: list[FactorContribution] = Field(default_factory=list)


class ConfidenceDriver(BaseModel):
    code: str
    detail: Localized


class Confidence(BaseModel):
    value: float = Field(ge=0, le=1)
    band: ConfidenceBand
    drivers: list[ConfidenceDriver] = Field(default_factory=list)


class Fee(BaseModel):
    type: str = "murabaha"
    rate: float = Field(ge=0)
    amount: float = Field(ge=0)


class Deduction(BaseModel):
    date: date
    settlement_expected: float = Field(ge=0)
    deduction: float = Field(ge=0)
    projected: bool = False  # True when scheduled against a forecast settlement cycle


class Repayment(BaseModel):
    method: str = "auto_deduction_from_settlements"
    schedule: list[Deduction] = Field(default_factory=list)
    expected_payoff_date: Optional[date] = None


class FundingRecommendation(BaseModel):
    decision: Outcome
    recommended_amount: float = Field(ge=0)
    max_amount: float = Field(ge=0)
    advance_rate_effective: float = Field(ge=0, le=1)
    currency: str = "SAR"
    fee: Fee
    total_repayment: float = Field(ge=0)
    repayment: Repayment


class Explanation(BaseModel):
    summary: Localized


class Insight(BaseModel):
    code: str
    text: Localized


class NextStep(BaseModel):
    code: str
    text: Localized
    potential_impact: Optional[str] = None


class Audit(BaseModel):
    rules_fired: list[str] = Field(default_factory=list)
    thresholds_version: str
    generated_at: datetime
    stub: bool = False


class Decision(BaseModel):
    """The complete, structured, human-readable financing decision."""

    engine_version: str
    assessment_id: str
    as_of: date
    currency: str = "SAR"

    credit_assessment: CreditAssessment
    risk_score: RiskScore
    confidence: Confidence
    funding_recommendation: FundingRecommendation
    explanation: Explanation
    strengths: list[Insight] = Field(default_factory=list)
    weaknesses: list[Insight] = Field(default_factory=list)
    next_steps: list[NextStep] = Field(default_factory=list)
    audit: Audit


class Offer(BaseModel):
    """Result of ``quote()`` for a merchant-chosen amount."""

    assessment_id: str
    requested_amount: float = Field(ge=0)
    approved_amount: float = Field(ge=0)
    currency: str = "SAR"
    fee: Fee
    total_repayment: float = Field(ge=0)
    repayment: Repayment
    within_limit: bool
