"""End-to-end merchant happy path (plan §8):

register/login -> consent (bank + sales) -> aggregate -> score -> offer ->
accept Murabaha -> monitoring ticks -> repayments reduce outstanding.
"""

from tests.conftest import ADMIN_EMAIL, TEST_MERCHANT_EMAIL, login


async def test_full_financing_lifecycle(client, seeded_users):
    profile = seeded_users
    headers = await login(client, TEST_MERCHANT_EMAIL)
    admin_headers = await login(client, ADMIN_EMAIL)

    # --- consent: bank + every sales platform in the profile
    for path, institutions in [
        ("bank", [profile.bank]),
        ("sales", profile.platforms),
    ]:
        for institution in institutions:
            start = await client.post(
                f"/connections/{path}/consent/start",
                json={"institution": institution},
                headers=headers,
            )
            assert start.status_code == 200, start.text
            body = start.json()
            assert body["authorize_url"].startswith("https://")
            complete = await client.post(
                "/connections/consent/complete",
                json={"session_id": body["session_id"], "auth_code": "demo-code"},
                headers=headers,
            )
            assert complete.status_code == 200, complete.text
            assert complete.json()["status"] == "active"

    conns = (await client.get("/connections", headers=headers)).json()
    assert len(conns) == 1 + len(profile.platforms)

    # --- aggregate 90 days
    agg = await client.post("/merchants/me/aggregate", headers=headers)
    assert agg.status_code == 200, agg.text
    summary = agg.json()
    assert summary["transactions"] > 0
    assert summary["sales_orders"] > 0
    assert summary["settlements"] > 0
    assert summary["held_receivables_total"] > 0

    # --- score
    assessment = await client.post("/assessments/run", headers=headers)
    assert assessment.status_code == 201, assessment.text
    decision = assessment.json()
    assert 0 <= decision["score"] <= 1000
    assert decision["approved"], f"test profile should be approved: {decision}"
    assert decision["decision"]["reasons"]
    assert decision["features"]["held_receivables_total"] > 0

    # --- offer (<= 80% of held receivables)
    offer_resp = await client.post("/offers/generate", headers=headers)
    assert offer_resp.status_code == 201, offer_resp.text
    offer = offer_resp.json()
    assert offer["principal"] <= 0.80 * summary["held_receivables_total"] + 0.01
    assert offer["total_repayable"] > offer["principal"]
    expected_total = (
        offer["principal"]
        + offer["profit_amount"]
        + offer["platform_fee"]
        + offer["success_fee"]
    )
    assert abs(offer["total_repayable"] - expected_total) < 0.05

    # --- accept -> Murabaha contract + schedule
    accept = await client.post(f"/offers/{offer['id']}/accept", headers=headers)
    assert accept.status_code == 200, accept.text
    contract = accept.json()
    assert contract["status"] == "active"
    assert contract["sale_price"] == contract["cost_price"] + contract["profit_amount"]
    assert contract["outstanding"] == contract["total_due"]

    detail = (await client.get(f"/contracts/{contract['id']}", headers=headers)).json()
    assert len(detail["schedule"]) >= 1
    scheduled_total = sum(i["amount"] for i in detail["schedule"])
    assert abs(scheduled_total - contract["total_due"]) < 0.05

    # accepted offer can't be accepted twice
    again = await client.post(f"/offers/{offer['id']}/accept", headers=headers)
    assert again.status_code == 400

    # --- monitoring ticks: settlements arrive, repayments auto-apply
    outstanding = contract["outstanding"]
    for _ in range(40):
        tick = await client.post("/admin/monitor/tick", headers=admin_headers)
        assert tick.status_code == 200, tick.text
        current = (await client.get("/contracts/me", headers=headers)).json()[0]
        if current["status"] == "repaid":
            break
    current = (await client.get("/contracts/me", headers=headers)).json()[0]
    assert current["outstanding"] < outstanding, "repayments should reduce outstanding"

    repayments = (
        await client.get(f"/contracts/{contract['id']}/repayments", headers=headers)
    ).json()
    assert repayments, "at least one repayment applied"

    # --- admin dashboard reflects the portfolio
    portfolio = (await client.get("/admin/portfolio", headers=admin_headers)).json()
    assert portfolio["funnel"]["accepted"] == 1
    assert portfolio["contracts"]["disbursed_total"] == contract["cost_price"]

    detail = (
        await client.get(f"/admin/merchants/{decision['merchant_id']}", headers=admin_headers)
    ).json()
    assert detail["contracts"]

    annotate = await client.post(
        f"/admin/offers/{offer['id']}/annotate",
        json={"annotation": "Verified funnel: healthy revenue, approved."},
        headers=admin_headers,
    )
    assert annotate.status_code == 200
    assert annotate.json()["annotation"]

    # merchant cannot hit admin endpoints
    assert (await client.get("/admin/portfolio", headers=headers)).status_code == 403


async def test_consent_revoke_blocks_aggregation(client, seeded_users):
    profile = seeded_users
    headers = await login(client, TEST_MERCHANT_EMAIL)

    start = (
        await client.post(
            "/connections/sales/consent/start",
            json={"institution": profile.platforms[0]},
            headers=headers,
        )
    ).json()
    conn = (
        await client.post(
            "/connections/consent/complete",
            json={"session_id": start["session_id"], "auth_code": "x"},
            headers=headers,
        )
    ).json()

    revoked = await client.post(f"/connections/{conn['id']}/revoke", headers=headers)
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"

    agg = (await client.post("/merchants/me/aggregate", headers=headers)).json()
    assert agg["sales_orders"] == 0  # revoked connection contributes nothing
