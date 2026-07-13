"""Mock open-banking / sales providers (MVP path).

Stateless: consent sessions and tokens encode merchant + institution, so the
mock survives restarts and stays deterministic. Simulates the OAuth2 handshake
with fake authorize URLs and auth codes.
"""

import uuid
from datetime import date, datetime, timedelta

from app.providers.base import (
    BankAccount,
    ConsentSession,
    ProviderToken,
    SalesOrder,
    Settlement,
    Transaction,
)
from app.seed import synthetic


def _make_session(merchant_id: str, institution: str, kind: str) -> ConsentSession:
    session_id = f"mock.{kind}.{merchant_id}.{institution}.{uuid.uuid4().hex[:8]}"
    return ConsentSession(
        session_id=session_id,
        authorize_url=f"https://auth.mock-openbanking.sa/authorize?session={session_id}",
        institution=institution,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
    )


def _issue_token(session_id: str) -> ProviderToken:
    parts = session_id.split(".")
    if len(parts) != 5 or parts[0] != "mock":
        raise ValueError("unknown consent session")
    _, kind, merchant_id, institution, _ = parts
    return ProviderToken(
        access_token=f"mock-tok.{kind}.{merchant_id}.{institution}.{uuid.uuid4().hex[:8]}",
        refresh_token=f"mock-ref.{uuid.uuid4().hex[:8]}",
        institution=institution,
        scopes=["accounts", "transactions"] if kind == "bank" else ["sales", "settlements"],
        expires_at=datetime.utcnow() + timedelta(days=90),
    )


def _merchant_from_token(token: ProviderToken) -> str:
    parts = token.access_token.split(".")
    if len(parts) != 5 or parts[0] != "mock-tok":
        raise ValueError("invalid mock token")
    return parts[2]


class MockProvider:
    """OpenBankingProvider implementation over synthetic data."""

    async def start_consent(self, merchant_id: str, institution: str) -> ConsentSession:
        return _make_session(merchant_id, institution, "bank")

    async def complete_consent(self, session_id: str, auth_code: str) -> ProviderToken:
        # mock accepts any non-empty auth code
        if not auth_code:
            raise ValueError("missing auth code")
        return _issue_token(session_id)

    async def list_accounts(self, token: ProviderToken) -> list[BankAccount]:
        profile = synthetic.profile_for(_merchant_from_token(token))
        return [synthetic.generate_account(profile)]

    async def get_transactions(
        self, token: ProviderToken, since: date, until: date
    ) -> list[Transaction]:
        profile = synthetic.profile_for(_merchant_from_token(token))
        return synthetic.generate_transactions(profile, since, until)


class MockSalesProvider:
    """SalesPlatformProvider implementation over synthetic data."""

    async def start_consent(self, merchant_id: str, platform: str) -> ConsentSession:
        return _make_session(merchant_id, platform, "sales")

    async def complete_consent(self, session_id: str, auth_code: str) -> ProviderToken:
        if not auth_code:
            raise ValueError("missing auth code")
        return _issue_token(session_id)

    async def get_sales(
        self, token: ProviderToken, since: date, until: date
    ) -> list[SalesOrder]:
        merchant_id = _merchant_from_token(token)
        profile = synthetic.profile_for(merchant_id)
        platform = token.institution
        if platform not in profile.platforms:
            return []
        return synthetic.generate_sales(profile, platform, since, until)

    async def get_pending_settlements(self, token: ProviderToken) -> list[Settlement]:
        merchant_id = _merchant_from_token(token)
        profile = synthetic.profile_for(merchant_id)
        platform = token.institution
        if platform not in profile.platforms:
            return []
        today = date.today()
        since = today - timedelta(days=90)
        return [
            s
            for s in synthetic.generate_settlements(profile, platform, since, today)
            if s.status == "pending"
        ]
