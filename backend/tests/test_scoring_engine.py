"""SaeedModel adapter: rafid-engine behind the frozen CreditScoringModel seam.

Verifies the ScoringFeatures -> MerchantFeatures -> Decision -> CreditDecision
mapping, that the rich engine output rides along on engine_decision, and that
the engine stays deterministic.
"""

from datetime import date, timedelta

from app.scoring.base import ScoringFeatures, UpcomingSettlement
from app.scoring.saeed import SaeedModel


def _features(**over) -> ScoringFeatures:
    today = date.today()
    base = dict(
        merchant_id="m_test",
        merchant_name="Test Merchant",
        sector="ecommerce",
        registration_verified=True,
        window_days=90,
        total_revenue_90d=270_000.0,
        avg_daily_revenue=3_000.0,
        revenue_volatility=0.15,
        revenue_trend=0.002,
        num_settlement_cycles=6,
        avg_settlement_days=14.0,
        held_receivables_total=85_000.0,
        chargeback_ratio=0.01,
        dispute_rate=0.005,
        account_age_days=540,
        platform_mix={"salla": 0.6, "zid": 0.4},
        weekly_revenue=[21_000.0] * 12,
        upcoming_settlements=[
            UpcomingSettlement(date=(today + timedelta(days=14 * i)).isoformat(), expected=20_000.0)
            for i in range(1, 6)
        ],
        net_inflow_ratio=0.35,
        sources_connected=["bank", "sales"],
        data_completeness=1.0,
        prior_advances=2,
        on_time_ratio=1.0,
    )
    base.update(over)
    return ScoringFeatures(**base)


def test_healthy_merchant_approved_with_rich_decision():
    d = SaeedModel().score(_features())
    assert d.approved
    assert d.risk_band in {"A", "B"}
    assert 300 <= d.score <= 850
    assert d.model_version.startswith("engine-")
    assert 0 < d.max_advance_amount <= 85_000.0

    ed = d.engine_decision
    assert ed is not None
    # bilingual explanation is present
    assert ed["explanation"]["summary"]["ar"]
    assert ed["explanation"]["summary"]["en"]
    # settlement-based repayment schedule is present for an approval
    assert ed["funding_recommendation"]["repayment"]["schedule"]


def test_engine_is_deterministic():
    a = SaeedModel().score(_features())
    b = SaeedModel().score(_features())
    assert a.score == b.score
    assert a.risk_band == b.risk_band
    assert a.max_advance_amount == b.max_advance_amount


def test_no_receivables_not_approved():
    d = SaeedModel().score(_features(held_receivables_total=0.0, upcoming_settlements=[]))
    assert d.max_advance_amount == 0.0
