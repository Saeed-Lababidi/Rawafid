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
    open_alerts: int


class AdminMerchantOut(MerchantOut):
    pass


class AdminMerchantDetailOut(BaseModel):
    merchant: MerchantOut
    connections: list[ConnectionOut]
    assessments: list[AssessmentOut]
    offers: list[OfferOut]
    contracts: list[ContractOut]
    alerts: list[RiskAlertOut]
