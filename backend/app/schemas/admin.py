from pydantic import BaseModel

from app.schemas.auth import MerchantOut
from app.schemas.common import RiskAlertOut
from app.schemas.financing import AssessmentOut, ConnectionOut, ContractOut, OfferOut


class FunnelOut(BaseModel):
    registered: int
    connected: int
    scored: int
    offered: int
    accepted: int


class ContractsSummaryOut(BaseModel):
    active: int
    disbursed_total: float
    outstanding_total: float
    expected_revenue: float


class PortfolioOut(BaseModel):
    funnel: FunnelOut
    risk_distribution: dict[str, int]
    contracts: ContractsSummaryOut
    subscription_revenue: float  # Rafid's monthly subscription revenue, all merchants
    open_alerts: int


class AdminMerchantOut(MerchantOut):
    # latest assessment (None until the merchant has been scored)
    score: int | None = None
    risk_band: str | None = None
    approved: bool | None = None
    # live sales channels + 90-day activity, for the portfolio table
    platforms: list[str] = []
    platform_count: int = 0
    sales_volume: float = 0.0
    held_receivables: float = 0.0
    outstanding: float = 0.0
    open_alerts: int = 0


class AdminMerchantDetailOut(BaseModel):
    merchant: MerchantOut
    connections: list[ConnectionOut]
    assessments: list[AssessmentOut]
    offers: list[OfferOut]
    contracts: list[ContractOut]
    alerts: list[RiskAlertOut]
