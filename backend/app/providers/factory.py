from functools import lru_cache

from app.config import get_settings
from app.providers.base import OpenBankingProvider, SalesPlatformProvider
from app.providers.lean import LeanProvider, TarabutSalesProvider
from app.providers.mock import MockProvider, MockSalesProvider


@lru_cache
def get_bank_provider() -> OpenBankingProvider:
    if get_settings().provider == "lean":
        return LeanProvider()
    return MockProvider()


@lru_cache
def get_sales_provider() -> SalesPlatformProvider:
    if get_settings().provider == "lean":
        return TarabutSalesProvider()
    return MockSalesProvider()
