from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Message(BaseModel):
    detail: str


class BankAccountOut(ORMModel):
    id: str
    external_id: str
    institution: str
    iban: str
    currency: str
    balance: float


class TransactionOut(ORMModel):
    id: str
    account_external_id: str
    date: date
    amount: float
    direction: str
    description: str
    category: str | None


class SalesOrderOut(ORMModel):
    id: str
    platform: str
    order_date: date
    amount: float
    currency: str
    status: str


class SettlementOut(ORMModel):
    id: str
    platform: str
    amount: float
    expected_date: date
    received_date: date | None
    status: str
    delayed: bool


class RiskAlertOut(ORMModel):
    id: str
    merchant_id: str
    contract_id: str | None
    type: str
    severity: str
    message: str
    resolved: bool
    created_at: datetime
