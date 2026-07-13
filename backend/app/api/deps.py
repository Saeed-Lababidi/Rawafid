from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.domain.enums import UserRole
from app.domain.models import Merchant, User
from app.security.auth import decode_token

bearer = HTTPBearer(auto_error=False)

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def get_current_user(
    session: SessionDep,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> User:
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    try:
        payload = decode_token(credentials.credentials, expected_type="access")
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e
    user = await session.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "user not found")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(role: UserRole):
    async def guard(user: CurrentUser) -> User:
        if user.role != role.value:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"requires role {role.value}")
        return user

    return guard


async def get_current_merchant(
    session: SessionDep, user: Annotated[User, Depends(require_role(UserRole.MERCHANT))]
) -> Merchant:
    # merchant scope always comes from the token, never from client input
    merchant = await session.get(Merchant, user.merchant_id)
    if merchant is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "no merchant profile")
    return merchant


CurrentMerchant = Annotated[Merchant, Depends(get_current_merchant)]
CurrentAdmin = Annotated[User, Depends(require_role(UserRole.BANK_ADMIN))]
