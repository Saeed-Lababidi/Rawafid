from app.scoring.base import ScoringFeatures
from app.scoring.stub import StubScoringModel


def _features(**overrides) -> ScoringFeatures:
    base = dict(
        merchant_id="m1",
        window_days=90,
        total_revenue_90d=400_000,
        avg_daily_revenue=4400,
        revenue_volatility=0.2,
        revenue_trend=0.002,
        num_settlement_cycles=10,
        avg_settlement_days=9,
        held_receivables_total=80_000,
        chargeback_ratio=0.01,
        account_age_days=900,
        platform_mix={"salla": 1.0},
    )
    base.update(overrides)
    return ScoringFeatures(**base)


def test_deterministic():
    model = StubScoringModel()
    a, b = model.score(_features()), model.score(_features())
    assert a == b


def test_healthy_merchant_approved():
    decision = StubScoringModel().score(_features())
    assert decision.approved
    assert decision.risk_band in {"A", "B"}
    assert decision.max_advance_ratio <= 0.80
    assert decision.max_advance_amount <= 0.80 * 80_000 + 0.01
    assert decision.reasons
    assert decision.feature_contributions


def test_weak_merchant_declined():
    decision = StubScoringModel().score(
        _features(
            total_revenue_90d=8_000,
            avg_daily_revenue=90,
            revenue_volatility=1.4,
            revenue_trend=-0.01,
            chargeback_ratio=0.09,
            account_age_days=120,
            num_settlement_cycles=2,
        )
    )
    assert decision.risk_band == "D"
    assert not decision.approved
    assert decision.max_advance_ratio == 0.0


def test_no_receivables_not_financeable():
    decision = StubScoringModel().score(_features(held_receivables_total=0))
    assert not decision.approved
    assert decision.max_advance_amount == 0
