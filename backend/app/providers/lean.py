"""Stub seam for a real open-banking aggregator (Lean / Tarabut).

Post-hackathon: fill these in with real API calls; nothing else changes
(plan §6.1). Selected via PROVIDER=lean.
"""

from datetime import date

from app.providers.base import (
    BankAccount,
    ConsentSession,
    ProviderToken,
    SalesOrder,
    Settlement,
    Transaction,
)

_MSG = "LeanProvider is a post-hackathon seam; set PROVIDER=mock for the MVP"


class LeanProvider:
    async def start_consent(self, merchant_id: str, institution: str) -> ConsentSession:
        raise NotImplementedError(_MSG)

    async def complete_consent(self, session_id: str, auth_code: str) -> ProviderToken:
        raise NotImplementedError(_MSG)

    async def list_accounts(self, token: ProviderToken) -> list[BankAccount]:
        raise NotImplementedError(_MSG)

    async def get_transactions(
        self, token: ProviderToken, since: date, until: date
    ) -> list[Transaction]:
        raise NotImplementedError(_MSG)


class TarabutSalesProvider:
    async def start_consent(self, merchant_id: str, platform: str) -> ConsentSession:
        raise NotImplementedError(_MSG)

    async def complete_consent(self, session_id: str, auth_code: str) -> ProviderToken:
        raise NotImplementedError(_MSG)

    async def get_sales(
        self, token: ProviderToken, since: date, until: date
    ) -> list[SalesOrder]:
        raise NotImplementedError(_MSG)

    async def get_pending_settlements(self, token: ProviderToken) -> list[Settlement]:
        raise NotImplementedError(_MSG)
