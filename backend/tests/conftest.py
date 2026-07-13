import os

# must be set before any app import (engine/settings resolve at import time)
os.environ["DATABASE_URL"] = "sqlite+aiosqlite://"
os.environ["MONITOR_ENABLED"] = "false"

import uuid
from datetime import date, timedelta

import pytest
from httpx import ASGITransport, AsyncClient

from app.db import SessionLocal, create_all, drop_all
from app.domain.enums import UserRole
from app.domain.models import Merchant, User
from app.main import app
from app.security.auth import hash_password
from app.seed.synthetic import profile_for

# fixed merchant id => deterministic synthetic profile (healthy, non-risky)
TEST_MERCHANT_EMAIL = "merchant03@rafid.sa"
TEST_MERCHANT_ID = uuid.uuid5(
    uuid.UUID("d3b07384-d9a0-4c9b-8f3a-2f0a4b1e9c11"), TEST_MERCHANT_EMAIL
).hex
PASSWORD = "TestPass123!"
ADMIN_EMAIL = "admin@test.sa"


@pytest.fixture
async def client():
    await create_all()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    await drop_all()


@pytest.fixture
async def seeded_users(client):
    """A merchant with a known-good synthetic profile + a bank admin."""
    profile = profile_for(TEST_MERCHANT_ID)
    async with SessionLocal() as session:
        merchant = Merchant(
            id=TEST_MERCHANT_ID,
            name="Test Merchant",
            established_at=date.today() - timedelta(days=profile.account_age_days),
        )
        session.add(merchant)
        await session.flush()
        session.add(
            User(
                email=TEST_MERCHANT_EMAIL,
                password_hash=hash_password(PASSWORD),
                role=UserRole.MERCHANT.value,
                merchant_id=merchant.id,
            )
        )
        session.add(
            User(
                email=ADMIN_EMAIL,
                password_hash=hash_password(PASSWORD),
                role=UserRole.BANK_ADMIN.value,
            )
        )
        await session.commit()
    return profile


async def login(client: AsyncClient, email: str, password: str = PASSWORD) -> dict:
    resp = await client.post("/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}
