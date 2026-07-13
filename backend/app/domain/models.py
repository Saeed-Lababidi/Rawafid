import uuid
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def _uuid() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(20))  # UserRole
    merchant_id: Mapped[str | None] = mapped_column(ForeignKey("merchants.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    merchant: Mapped["Merchant | None"] = relationship(back_populates="users")


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255))
    business_type: Mapped[str] = mapped_column(String(50), default="ecommerce")
    city: Mapped[str] = mapped_column(String(100), default="Riyadh")
    # simulated KYC — always "verified" for the MVP
    verification_status: Mapped[str] = mapped_column(String(20), default="verified")
    established_at: Mapped[date] = mapped_column(Date)  # basis of account_age_days
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    users: Mapped[list[User]] = relationship(back_populates="merchant")
    connections: Mapped[list["Connection"]] = relationship(back_populates="merchant")


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    type: Mapped[str] = mapped_column(String(10))  # ConnectionType
    provider: Mapped[str] = mapped_column(String(20), default="mock")
    institution: Mapped[str] = mapped_column(String(50))  # bank name or sales platform
    status: Mapped[str] = mapped_column(String(20), default="pending_consent")
    # Fernet-encrypted ProviderToken JSON (encryption at rest)
    token_encrypted: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    merchant: Mapped[Merchant] = relationship(back_populates="connections")
    consents: Mapped[list["Consent"]] = relationship(back_populates="connection")


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    connection_id: Mapped[str] = mapped_column(ForeignKey("connections.id"), index=True)
    session_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    scopes: Mapped[str] = mapped_column(String(255), default="accounts,transactions")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # ConsentStatus
    granted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    connection: Mapped[Connection] = relationship(back_populates="consents")


class BankAccountRow(Base):
    __tablename__ = "bank_accounts"
    __table_args__ = (UniqueConstraint("merchant_id", "external_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    connection_id: Mapped[str] = mapped_column(ForeignKey("connections.id"))
    external_id: Mapped[str] = mapped_column(String(64))
    institution: Mapped[str] = mapped_column(String(50))
    iban: Mapped[str] = mapped_column(String(34))
    currency: Mapped[str] = mapped_column(String(3), default="SAR")
    balance: Mapped[float] = mapped_column(Float, default=0)


class TransactionRow(Base):
    __tablename__ = "transactions"
    __table_args__ = (UniqueConstraint("merchant_id", "external_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    account_external_id: Mapped[str] = mapped_column(String(64))
    external_id: Mapped[str] = mapped_column(String(64))
    date: Mapped[date] = mapped_column(Date, index=True)
    amount: Mapped[float] = mapped_column(Float)
    direction: Mapped[str] = mapped_column(String(10))  # credit | debit
    description: Mapped[str] = mapped_column(String(255))
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)


class SalesOrderRow(Base):
    __tablename__ = "sales_orders"
    __table_args__ = (UniqueConstraint("merchant_id", "external_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    external_id: Mapped[str] = mapped_column(String(64))
    platform: Mapped[str] = mapped_column(String(20))
    order_date: Mapped[date] = mapped_column(Date, index=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="SAR")
    status: Mapped[str] = mapped_column(String(20), default="completed")  # completed | refunded


class SettlementRow(Base):
    __tablename__ = "settlements"
    __table_args__ = (UniqueConstraint("merchant_id", "external_id"),)

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    external_id: Mapped[str] = mapped_column(String(64))
    platform: Mapped[str] = mapped_column(String(20))
    amount: Mapped[float] = mapped_column(Float)
    expected_date: Mapped[date] = mapped_column(Date, index=True)
    received_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # SettlementStatus
    delayed: Mapped[bool] = mapped_column(Boolean, default=False)


class CreditAssessment(Base):
    __tablename__ = "credit_assessments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    features: Mapped[dict] = mapped_column(JSON)  # ScoringFeatures snapshot
    decision: Mapped[dict] = mapped_column(JSON)  # CreditDecision snapshot
    score: Mapped[int] = mapped_column(Integer)
    risk_band: Mapped[str] = mapped_column(String(2))
    approved: Mapped[bool] = mapped_column(Boolean)
    model_version: Mapped[str] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class FinancingOffer(Base):
    __tablename__ = "financing_offers"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    assessment_id: Mapped[str] = mapped_column(ForeignKey("credit_assessments.id"))
    principal: Mapped[float] = mapped_column(Float)  # advance amount (Murabaha cost price)
    advance_ratio: Mapped[float] = mapped_column(Float)
    platform_fee: Mapped[float] = mapped_column(Float)
    success_fee: Mapped[float] = mapped_column(Float)
    profit_amount: Mapped[float] = mapped_column(Float)  # disclosed Murabaha profit
    total_repayable: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="SAR")
    status: Mapped[str] = mapped_column(String(20), default="offered")  # OfferStatus
    annotation: Mapped[str | None] = mapped_column(Text, nullable=True)  # underwriter note
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class MurabahaContract(Base):
    __tablename__ = "murabaha_contracts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    offer_id: Mapped[str] = mapped_column(ForeignKey("financing_offers.id"), unique=True)
    cost_price: Mapped[float] = mapped_column(Float)  # bank's purchase cost (= principal)
    profit_amount: Mapped[float] = mapped_column(Float)  # disclosed up front
    sale_price: Mapped[float] = mapped_column(Float)  # cost + profit
    fees_total: Mapped[float] = mapped_column(Float)  # platform + success fees
    total_due: Mapped[float] = mapped_column(Float)  # sale_price + fees_total
    outstanding: Mapped[float] = mapped_column(Float)
    disbursed_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    status: Mapped[str] = mapped_column(String(20), default="active")  # ContractStatus
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    schedule: Mapped[list["RepaymentScheduleItem"]] = relationship(back_populates="contract")


class RepaymentScheduleItem(Base):
    __tablename__ = "repayment_schedule_items"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    contract_id: Mapped[str] = mapped_column(ForeignKey("murabaha_contracts.id"), index=True)
    seq: Mapped[int] = mapped_column(Integer)
    due_date: Mapped[date] = mapped_column(Date)
    amount: Mapped[float] = mapped_column(Float)
    paid_amount: Mapped[float] = mapped_column(Float, default=0)
    settlement_id: Mapped[str | None] = mapped_column(ForeignKey("settlements.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # ScheduleItemStatus

    contract: Mapped[MurabahaContract] = relationship(back_populates="schedule")


class Repayment(Base):
    __tablename__ = "repayments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    contract_id: Mapped[str] = mapped_column(ForeignKey("murabaha_contracts.id"), index=True)
    schedule_item_id: Mapped[str] = mapped_column(ForeignKey("repayment_schedule_items.id"))
    settlement_id: Mapped[str] = mapped_column(ForeignKey("settlements.id"))
    amount: Mapped[float] = mapped_column(Float)
    applied_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    merchant_id: Mapped[str] = mapped_column(ForeignKey("merchants.id"), index=True)
    contract_id: Mapped[str | None] = mapped_column(
        ForeignKey("murabaha_contracts.id"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(30))  # AlertType
    severity: Mapped[str] = mapped_column(String(10))  # AlertSeverity
    message: Mapped[str] = mapped_column(String(500))
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    actor_user_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    merchant_id: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    action: Mapped[str] = mapped_column(String(30))  # AuditAction
    entity_type: Mapped[str] = mapped_column(String(50))
    entity_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class SystemState(Base):
    """Key-value store for the monitoring agent's simulated clock."""

    __tablename__ = "system_state"

    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[str] = mapped_column(String(255))
