from fastapi import APIRouter, HTTPException, status

from app.api.deps import CurrentUser, SessionDep
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenPair, UserOut
from app.security.auth import create_access_token, create_refresh_token, decode_token
from app.services import onboarding
from app.services.onboarding import OnboardingError

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_pair(user_id: str, role: str, merchant_id: str | None) -> TokenPair:
    return TokenPair(
        access_token=create_access_token(user_id, role, merchant_id),
        refresh_token=create_refresh_token(user_id, role, merchant_id),
    )


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest, session: SessionDep):
    try:
        user = await onboarding.register_merchant(session, req)
    except OnboardingError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from e
    return _token_pair(user.id, user.role, user.merchant_id)


@router.post("/login", response_model=TokenPair)
async def login(req: LoginRequest, session: SessionDep):
    try:
        user = await onboarding.authenticate(session, req.email, req.password)
    except OnboardingError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e
    return _token_pair(user.id, user.role, user.merchant_id)


@router.post("/refresh", response_model=TokenPair)
async def refresh(req: RefreshRequest):
    try:
        payload = decode_token(req.refresh_token, expected_type="refresh")
    except ValueError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(e)) from e
    return _token_pair(payload["sub"], payload["role"], payload.get("merchant_id"))


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUser):
    return user
