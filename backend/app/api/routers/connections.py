from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import CurrentMerchant, CurrentUser, SessionDep
from app.domain.enums import ConnectionType
from app.domain.models import Connection
from app.schemas.financing import (
    ConnectionOut,
    ConsentCompleteRequest,
    ConsentStartRequest,
    ConsentStartResponse,
)
from app.services import onboarding
from app.services.onboarding import OnboardingError

router = APIRouter(prefix="/connections", tags=["connections"])


@router.get("", response_model=list[ConnectionOut])
async def list_connections(merchant: CurrentMerchant, session: SessionDep):
    rows = await session.execute(
        select(Connection).where(Connection.merchant_id == merchant.id)
    )
    return list(rows.scalars())


async def _start(
    conn_type: ConnectionType, req: ConsentStartRequest,
    merchant, session, user,
) -> ConsentStartResponse:
    try:
        connection, consent, url = await onboarding.start_consent(
            session, merchant, conn_type, req.institution, actor_user_id=user.id
        )
    except OnboardingError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
    return ConsentStartResponse(
        session_id=consent.session_id,
        authorize_url=url,
        institution=req.institution,
        connection_id=connection.id,
    )


@router.post("/bank/consent/start", response_model=ConsentStartResponse)
async def start_bank_consent(
    req: ConsentStartRequest, merchant: CurrentMerchant, session: SessionDep, user: CurrentUser
):
    return await _start(ConnectionType.BANK, req, merchant, session, user)


@router.post("/sales/consent/start", response_model=ConsentStartResponse)
async def start_sales_consent(
    req: ConsentStartRequest, merchant: CurrentMerchant, session: SessionDep, user: CurrentUser
):
    return await _start(ConnectionType.SALES, req, merchant, session, user)


@router.post("/consent/complete", response_model=ConnectionOut)
async def complete_consent(
    req: ConsentCompleteRequest, merchant: CurrentMerchant, session: SessionDep,
    user: CurrentUser,
):
    try:
        return await onboarding.complete_consent(
            session, merchant, req.session_id, req.auth_code, actor_user_id=user.id
        )
    except OnboardingError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e


@router.post("/{connection_id}/revoke", response_model=ConnectionOut)
async def revoke(
    connection_id: str, merchant: CurrentMerchant, session: SessionDep, user: CurrentUser
):
    try:
        return await onboarding.revoke_connection(
            session, merchant, connection_id, actor_user_id=user.id
        )
    except OnboardingError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
