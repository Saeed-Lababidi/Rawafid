async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_register_login_refresh(client):
    reg = await client.post(
        "/auth/register",
        json={
            "email": "new@merchant.sa",
            "password": "Secret123!",
            "business_name": "New Shop",
        },
    )
    assert reg.status_code == 201
    tokens = reg.json()

    dup = await client.post(
        "/auth/register",
        json={
            "email": "new@merchant.sa",
            "password": "Secret123!",
            "business_name": "New Shop",
        },
    )
    assert dup.status_code == 409

    login = await client.post(
        "/auth/login", json={"email": "new@merchant.sa", "password": "Secret123!"}
    )
    assert login.status_code == 200

    refreshed = await client.post(
        "/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]

    me = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert me.status_code == 200
    assert me.json()["role"] == "merchant"

    # access token must not work as refresh token
    bad = await client.post("/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert bad.status_code == 401


async def test_merchant_endpoints_require_auth(client):
    assert (await client.get("/merchants/me")).status_code == 401
    assert (await client.get("/admin/portfolio")).status_code == 401
