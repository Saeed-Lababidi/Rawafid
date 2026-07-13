"""FROZEN SEAM (plan §6.1) — open-banking / sales-platform provider contract.

MockProvider implements this today; Lean/Tarabut drop in behind the same
interface later. DTO changes must be additive-only once frozen.
"""

from datetime import date, datetime
from typing import Protocol

from pydantic import BaseModel

BANK_INSTITUTIONS = ["alinma", "alrajhi_synth", "riyad_synth"]
SALES_PLATFORMS = ["salla", "zid", "jahez", "foodics"]


class ConsentSession(BaseModel):
    session_id: str
    authorize_url: str
    institution: str
    expires_at: datetime


class ProviderToken(BaseModel):
    access_token: str
    refresh_token: str | None = None
    institution: str
    scopes: list[str] = []
    expires_at: datetime


class BankAccount(BaseModel):
    external_id: str
    institution: str
    iban: str
    currency: str = "SAR"
    balance: float


class Transaction(BaseModel):
    external_id: str
    account_external_id: str
    date: date
    amount: float
    direction: str  # credit | debit
    description: str
    category: str | None = None


class SalesOrder(BaseModel):
    external_id: str
    platform: str
    order_date: date
    amount: float
    currency: str = "SAR"
    status: str  # completed | refunded


class Settlement(BaseModel):
    external_id: str
    platform: str
    amount: float
    expected_date: date
    status: str  # pending | received


class OpenBankingProvider(Protocol):
    async def start_consent(self, merchant_id: str, institution: str) -> ConsentSession: ...

    async def complete_consent(self, session_id: str, auth_code: str) -> ProviderToken: ...

    async def list_accounts(self, token: ProviderToken) -> list[BankAccount]: ...

    async def get_transactions(
        self, token: ProviderToken, since: date, until: date
    ) -> list[Transaction]: ...


class SalesPlatformProvider(Protocol):
    async def start_consent(self, merchant_id: str, platform: str) -> ConsentSession: ...

    async def complete_consent(self, session_id: str, auth_code: str) -> ProviderToken: ...

    async def get_sales(
        self, token: ProviderToken, since: date, until: date
    ) -> list[SalesOrder]: ...

    async def get_pending_settlements(self, token: ProviderToken) -> list[Settlement]: ...
