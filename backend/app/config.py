from functools import lru_cache

from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings, SettingsConfigDict

# Stable dev-only key so encrypted tokens survive restarts without a configured
# FERNET_KEY. Any real deployment must set FERNET_KEY in the environment.
_DEV_FERNET_KEY = "yLJZ2p0fXcVh3nUq8mKw1TtR5aGdEbYs4CiOjPzM6No="


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Rafid API"
    env: str = "dev"

    # Comma-separated exact origins. Deployments override with their real frontend
    # origin; the default covers local Next.js dev only.
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    database_url: str = "postgresql+asyncpg://rafid:rafid@localhost:5433/rafid"
    auto_create_tables: bool = True

    # Auth
    jwt_secret: str = "rafid-dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_days: int = 7

    # Encryption at rest
    fernet_key: str = _DEV_FERNET_KEY

    # Abstraction seams
    provider: str = "mock"  # mock | lean
    scoring_backend: str = "stub"  # stub | module | http

    # Monitoring agent (1 tick = 1 simulated day)
    monitor_enabled: bool = True
    monitor_interval_seconds: int = 15

    # Fee schedule — PLACEHOLDERS until confirmed (plan §18)
    platform_fee_pct: float = 0.02
    success_fee_pct: float = 0.01
    murabaha_profit_pct: float = 0.06
    max_advance_ratio: float = 0.80
    offer_expiry_days: int = 7

    # Scoring window
    scoring_window_days: int = 90

    def fernet(self) -> Fernet:
        return Fernet(self.fernet_key.encode())


@lru_cache
def get_settings() -> Settings:
    return Settings()
