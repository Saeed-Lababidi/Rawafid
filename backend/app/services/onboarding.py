from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import (
    AuditAction,
    ConnectionStatus,
    ConnectionType,
    ConsentStatus,
    UserRole,
)
from app.domain.models import Connection, Consent, Merchant, User
from app.providers.base import BANK_INSTITUTIONS, SALES_PLATFORMS
from app.providers.factory import get_bank_provider, get_sales_provider
from app.schemas.auth import RegisterRequest
from app.security.auth import hash_password, verify_password
from app.security.crypto import encrypt_token
from app.services import audit


class OnboardingError(Exception):
    pass


async def register_merchant(session: AsyncSession, req: RegisterRequest) -> User:
    existing = await session.scalar(select(User).where(User.email == req.email))
    if existing:
        raise OnboardingError("email already registered")
    merchant = Merchant(
        name=req.business_name,
        business_type=req.business_type,
        city=req.city,
        established_at=req.established_at or (date.today() - timedelta(days=730)),
    )
    session.add(merchant)
    await session.flush()
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole.MERCHANT.value,
        merchant_id=merchant.id,
    )
    session.add(user)
    await session.flush()
    audit.record(
        session, AuditAction.REGISTER, "merchant", merchant.id,
        actor_user_id=user.id, merchant_id=merchant.id,
    )
    await session.commit()
    return user


async def authenticate(session: AsyncSession, email: str, password: str) -> User:
    user = await session.scalar(select(User).where(User.email == email))
    if not user or not verify_password(password, user.password_hash):
        raise OnboardingError("invalid credentials")
    return user


def _provider_for(conn_type: ConnectionType):
    return get_bank_provider() if conn_type == ConnectionType.BANK else get_sales_provider()


async def start_consent(
    session: AsyncSession,
    merchant: Merchant,
    conn_type: ConnectionType,
    institution: str,
    actor_user_id: str | None = None,
) -> tuple[Connection, Consent, str]:
    valid = BANK_INSTITUTIONS if conn_type == ConnectionType.BANK else SALES_PLATFORMS
    if institution not in valid:
        raise OnboardingError(f"unknown institution '{institution}'; expected one of {valid}")

    provider = _provider_for(conn_type)
    consent_session = await provider.start_consent(merchant.id, institution)

    connection = Connection(
        merchant_id=merchant.id,
        type=conn_type.value,
        institution=institution,
        status=ConnectionStatus.PENDING_CONSENT.value,
    )
    session.add(connection)
    await session.flush()
    consent = Consent(
        connection_id=connection.id,
        session_id=consent_session.session_id,
        scopes=",".join(["accounts", "transactions"] if conn_type == ConnectionType.BANK
                        else ["sales", "settlements"]),
        status=ConsentStatus.PENDING.value,
        expires_at=consent_session.expires_at,
    )
    session.add(consent)
    audit.record(
        session, AuditAction.CONSENT_START, "connection", connection.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
        details={"institution": institution, "type": conn_type.value},
    )
    await session.commit()
    return connection, consent, consent_session.authorize_url


async def complete_consent(
    session: AsyncSession,
    merchant: Merchant,
    session_id: str,
    auth_code: str,
    actor_user_id: str | None = None,
) -> Connection:
    consent = await session.scalar(select(Consent).where(Consent.session_id == session_id))
    if not consent:
        raise OnboardingError("unknown consent session")
    connection = await session.get(Connection, consent.connection_id)
    if connection.merchant_id != merchant.id:
        raise OnboardingError("consent session belongs to another merchant")
    if consent.status != ConsentStatus.PENDING.value:
        raise OnboardingError(f"consent already {consent.status}")

    provider = _provider_for(ConnectionType(connection.type))
    token = await provider.complete_consent(session_id, auth_code)

    connection.token_encrypted = encrypt_token(token)  # encrypted at rest
    connection.status = ConnectionStatus.ACTIVE.value
    consent.status = ConsentStatus.GRANTED.value
    consent.granted_at = datetime.utcnow()
    consent.expires_at = token.expires_at
    audit.record(
        session, AuditAction.CONSENT_GRANT, "connection", connection.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
        details={"institution": connection.institution},
    )
    await session.commit()
    return connection


async def revoke_connection(
    session: AsyncSession,
    merchant: Merchant,
    connection_id: str,
    actor_user_id: str | None = None,
) -> Connection:
    connection = await session.get(Connection, connection_id)
    if not connection or connection.merchant_id != merchant.id:
        raise OnboardingError("connection not found")
    if connection.status == ConnectionStatus.REVOKED.value:
        raise OnboardingError("connection already revoked")

    connection.status = ConnectionStatus.REVOKED.value
    connection.token_encrypted = None  # token invalidated
    for consent in (
        await session.execute(select(Consent).where(Consent.connection_id == connection.id))
    ).scalars():
        if consent.status != ConsentStatus.REVOKED.value:
            consent.status = ConsentStatus.REVOKED.value
            consent.revoked_at = datetime.utcnow()
    audit.record(
        session, AuditAction.CONSENT_REVOKE, "connection", connection.id,
        actor_user_id=actor_user_id, merchant_id=merchant.id,
    )
    await session.commit()
    return connection
