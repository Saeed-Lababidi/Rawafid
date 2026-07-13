from datetime import datetime, timedelta

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def _create_token(user_id: str, role: str, merchant_id: str | None, ttl: timedelta,
                  token_type: str) -> str:
    settings = get_settings()
    payload = {
        "sub": user_id,
        "role": role,
        "merchant_id": merchant_id,
        "type": token_type,
        "exp": datetime.utcnow() + ttl,
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str, role: str, merchant_id: str | None) -> str:
    ttl = timedelta(minutes=get_settings().access_token_ttl_minutes)
    return _create_token(user_id, role, merchant_id, ttl, "access")


def create_refresh_token(user_id: str, role: str, merchant_id: str | None) -> str:
    ttl = timedelta(days=get_settings().refresh_token_ttl_days)
    return _create_token(user_id, role, merchant_id, ttl, "refresh")


def decode_token(token: str, expected_type: str = "access") -> dict:
    """Returns payload or raises ValueError."""
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as e:
        raise ValueError("invalid token") from e
    if payload.get("type") != expected_type:
        raise ValueError("wrong token type")
    return payload
