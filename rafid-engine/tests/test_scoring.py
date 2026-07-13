"""A2 scoring tests: per-factor behaviour, bounds, edge cases, and aggregation."""
from datetime import date

import pathlib

import pytest

from rafid_engine import MerchantFeatures, assess, config
from rafid_engine.scorecard import grade_for, run_scorecard
from rafid_engine.scoring import SCORE_FUNCTIONS

FIXTURE = pathlib.Path(__file__).parent.parent / "datasets" / "merchant_alosaila.json"


def make_features(**overrides) -> MerchantFeatures:
    """Minimal valid MerchantFeatures with deep overrides by domain key."""
    base = {
        "merchant": {"id": "t", "name": "t", "sector": "restaurants", "tenure_months": 12},
        "revenue": {"monthly_avg": 100000, "weekly_series": [], "currency": "SAR"},
        "sales": {"by_platform": {}, "orders_90d": 0, "refund_rate": 0.0},
        "banking": {"avg_balance": 0, "net_inflow_ratio": 0.0,
                    "negative_balance_days": 0, "returned_payments": 0},
        "settlements": {"confirmed_receivables": 0, "upcoming": [],
                        "chargeback_rate": 0.0, "dispute_rate": 0.0},
        "repayment": {"prior_advances": 0, "on_time_ratio": None},
        "meta": {"data_completeness": 1.0, "sources_connected": [], "as_of": "2026-07-03"},
    }
    for k, v in overrides.items():
        base[k] = {**base[k], **v}
    return MerchantFeatures.model_validate(base)


# ---- every factor stays within [0, 1] on random-ish inputs -----------------
def test_all_factors_bounded():
    f = make_features(
        revenue={"monthly_avg": 999999, "weekly_series": [1, 100, 1, 100]},
        banking={"net_inflow_ratio": 5.0, "negative_balance_days": 40},
        settlements={"chargeback_rate": 0.9, "dispute_rate": 0.9},
    )
    for fn in SCORE_FUNCTIONS.values():
        assert 0.0 <= fn(f) <= 1.0


# ---- revenue scale: monotonic, saturating ----------------------------------
def test_revenue_scale_monotonic():
    fn = SCORE_FUNCTIONS["REVENUE_SCALE"]
    low = fn(make_features(revenue={"monthly_avg": 10000}))
    mid = fn(make_features(revenue={"monthly_avg": 100000}))
    high = fn(make_features(revenue={"monthly_avg": 500000}))
    assert low < mid < high
    assert low == 0.0 and high == 1.0


# ---- stability: steady beats volatile --------------------------------------
def test_stability_prefers_steady_revenue():
    fn = SCORE_FUNCTIONS["REVENUE_STABILITY"]
    steady = fn(make_features(revenue={"monthly_avg": 50000, "weekly_series": [50, 51, 49, 50, 51]}))
    volatile = fn(make_features(revenue={"monthly_avg": 50000, "weekly_series": [10, 90, 5, 95, 20]}))
    assert steady > volatile
    # insufficient data -> neutral
    assert fn(make_features(revenue={"monthly_avg": 50000, "weekly_series": [50]})) == config.SCORING.neutral


# ---- growth: up > flat > down ----------------------------------------------
def test_growth_direction():
    fn = SCORE_FUNCTIONS["GROWTH_TREND"]
    up = fn(make_features(revenue={"monthly_avg": 50000, "weekly_series": [40, 45, 50, 55, 60]}))
    flat = fn(make_features(revenue={"monthly_avg": 50000, "weekly_series": [50, 50, 50, 50, 50]}))
    down = fn(make_features(revenue={"monthly_avg": 50000, "weekly_series": [60, 55, 50, 45, 40]}))
    assert up > flat > down
    assert flat == pytest.approx(0.5, abs=1e-6)


# ---- cash flow: penalised by negative-balance days -------------------------
def test_cash_flow_penalties():
    fn = SCORE_FUNCTIONS["CASH_FLOW_HEALTH"]
    clean = fn(make_features(banking={"net_inflow_ratio": 0.35, "negative_balance_days": 0}))
    troubled = fn(make_features(banking={"net_inflow_ratio": 0.35, "negative_balance_days": 6}))
    assert clean == 1.0
    assert troubled < clean


# ---- settlement reliability: consistency up, chargebacks down --------------
def test_settlement_reliability():
    fn = SCORE_FUNCTIONS["SETTLEMENT_RELIABILITY"]
    consistent = fn(make_features(settlements={
        "upcoming": [{"date": "2026-07-08", "expected": 40000},
                     {"date": "2026-07-15", "expected": 41000},
                     {"date": "2026-07-22", "expected": 39500}]}))
    disputed = fn(make_features(settlements={
        "upcoming": [{"date": "2026-07-08", "expected": 40000},
                     {"date": "2026-07-15", "expected": 41000}],
        "chargeback_rate": 0.08, "dispute_rate": 0.08}))
    none = fn(make_features(settlements={"upcoming": []}))
    assert consistent > 0.8
    assert disputed < consistent
    assert none <= 0.30


# ---- repayment: neutral prior with no history, high with clean history -----
def test_repayment_history():
    fn = SCORE_FUNCTIONS["REPAYMENT_HISTORY"]
    no_history = fn(make_features(repayment={"prior_advances": 0, "on_time_ratio": None}))
    good = fn(make_features(repayment={"prior_advances": 10, "on_time_ratio": 1.0}))
    assert no_history == config.SCORING.repayment_prior_mean
    assert good > 0.9


# ---- concentration: single platform is worst -------------------------------
def test_concentration_penalises_single_platform():
    fn = SCORE_FUNCTIONS["CONCENTRATION"]
    single = fn(make_features(sales={"by_platform": {"jahez": 1.0}}))
    diversified = fn(make_features(sales={"by_platform": {"jahez": 0.34, "salla": 0.33, "zid": 0.33}}))
    assert diversified > single
    assert fn(make_features(sales={"by_platform": {}})) == config.SCORING.neutral


# ---- grade banding ---------------------------------------------------------
def test_grade_bands():
    assert grade_for(830)[0] == "A+"
    assert grade_for(765)[0] == "A-"
    assert grade_for(700)[0] == "B"
    assert grade_for(500)[0] == "D"


# ---- aggregate: the fixture merchant resolves to a high grade --------------
def test_fixture_merchant_scores_high():
    f = MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))
    card = run_scorecard(f)
    assert 750 <= card.score_850 <= 785       # A / A- territory, matching the prototype
    assert card.health.value == "strong"
    assert round(sum(fc.contribution_pct for fc in card.factors), 0) == 100
    assert len(card.factors) == 7


def test_scoring_is_deterministic():
    f = MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))
    a, b = assess(f), assess(f)
    assert a.risk_score.value_850 == b.risk_score.value_850
    assert a.risk_score.normalized == b.risk_score.normalized
