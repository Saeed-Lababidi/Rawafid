from enum import StrEnum


class UserRole(StrEnum):
    MERCHANT = "merchant"
    BANK_ADMIN = "bank_admin"


class ConnectionType(StrEnum):
    BANK = "bank"
    SALES = "sales"


class ConnectionStatus(StrEnum):
    PENDING_CONSENT = "pending_consent"
    ACTIVE = "active"
    REVOKED = "revoked"


class ConsentStatus(StrEnum):
    PENDING = "pending"
    GRANTED = "granted"
    REVOKED = "revoked"


class SettlementStatus(StrEnum):
    PENDING = "pending"
    RECEIVED = "received"


class OfferStatus(StrEnum):
    OFFERED = "offered"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ContractStatus(StrEnum):
    ACTIVE = "active"
    REPAID = "repaid"
    DEFAULTED = "defaulted"


class ScheduleItemStatus(StrEnum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"


class AlertType(StrEnum):
    REVENUE_DROP = "revenue_drop"
    SETTLEMENT_DELAY = "settlement_delay"
    MISSED_REPAYMENT = "missed_repayment"


class AlertSeverity(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AuditAction(StrEnum):
    REGISTER = "register"
    CONSENT_START = "consent_start"
    CONSENT_GRANT = "consent_grant"
    CONSENT_REVOKE = "consent_revoke"
    AGGREGATE = "aggregate"
    SCORING_RUN = "scoring_run"
    OFFER_GENERATE = "offer_generate"
    OFFER_ACCEPT = "offer_accept"
    OFFER_REJECT = "offer_reject"
    OFFER_ANNOTATE = "offer_annotate"
    DISBURSE = "disburse"
    REPAYMENT = "repayment"
    CONTRACT_CLOSED = "contract_closed"
    MONITOR_TICK = "monitor_tick"
