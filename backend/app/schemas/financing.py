from datetime import date, datetime

from pydantic import BaseModel

from app.schemas.common import ORMModel
from app.scoring.base import CreditDecision, ScoringFeatures


class ConsentStartRequest(BaseModel):
    institution: str  # bank name for /bank, platform for /sales


class ConsentStartResponse(BaseModel):
    session_id: str
    authorize_url: str
    institution: str
    connection_id: str


class ConsentCompleteRequest(BaseModel):
    session_id: str
    auth_code: str


class ConnectionOut(ORMModel):
    id: str
    type: str
    provider: str
    institution: str
    status: str
    created_at: datetime


class AggregateResponse(BaseModel):
    accounts: int
    transactions: int
    sales_orders: int
    settlements: int
    held_receivables_total: float


class AssessmentOut(ORMModel):
    id: str
    merchant_id: str
    score: int
    risk_band: str
    approved: bool
    model_version: str
    created_at: datetime


class AssessmentDetailOut(AssessmentOut):
    features: ScoringFeatures
    decision: CreditDecision


class OfferOut(ORMModel):
    id: str
    merchant_id: str
    assessment_id: str
    principal: float
    advance_ratio: float
    platform_fee: float
    success_fee: float
    profit_amount: float
    total_repayable: float
    currency: str
    status: str
    annotation: str | None
    expires_at: datetime
    created_at: datetime


class ScheduleItemOut(ORMModel):
    id: str
    seq: int
    due_date: date
    amount: float
    paid_amount: float
    settlement_id: str | None
    status: str


class ContractOut(ORMModel):
    id: str
    merchant_id: str
    offer_id: str
    cost_price: float
    profit_amount: float
    sale_price: float
    fees_total: float
    total_due: float
    outstanding: float
    disbursed_at: datetime
    status: str


class ContractDetailOut(ContractOut):
    schedule: list[ScheduleItemOut]


class RepaymentOut(ORMModel):
    id: str
    contract_id: str
    schedule_item_id: str
    settlement_id: str
    amount: float
    applied_at: datetime


class AnnotateRequest(BaseModel):
    annotation: str


class TickResponse(BaseModel):
    sim_date: date
    settlements_received: int
    settlements_delayed: int
    repayments_applied: int
    contracts_closed: int
    alerts_raised: int
