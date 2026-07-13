"""Encryption at rest for provider tokens / consent secrets (Fernet)."""

from app.config import get_settings
from app.providers.base import ProviderToken


def encrypt_token(token: ProviderToken) -> str:
    return get_settings().fernet().encrypt(token.model_dump_json().encode()).decode()


def decrypt_token(blob: str) -> ProviderToken:
    raw = get_settings().fernet().decrypt(blob.encode())
    return ProviderToken.model_validate_json(raw)
