"""A3 tests: confidence model, hard gates, and threshold decision logic."""
import pathlib

from rafid_engine import MerchantFeatures, assess, config
from rafid_engine.confidence import assess_confidence
from rafid_engine.decision import evaluate_decision
from rafid_engine.schema import ConfidenceBand, Outcome

FIXTURE = pathlib.Path(__file__).parent.parent / "datasets" / "merchant_alosaila.json"


def make_features(**overrides) -> MerchantFeatures:
    base = {
        "merchant": {"id": "t", "name": "t", "sector": "restaurants", "tenure_months": 12},
        "revenue": {"monthly_avg": 100000, "weekly_series": [], "currency": "SAR"},
        "sales": {"by_platform": {}, "orders_90d": 0, "refund_rate": 0.0},
        "banking": {"avg_balance": 0, "net_inflow_ratio": 0.0,
                    "negative_balance_days": 0, "returned_payments": 0},
        "settlements": {"confirmed_receivables": 50000, "upcoming": [],
                        "chargeback_rate": 0.0, "dispute_rate": 0.0},
        "repayment": {"prior_advances": 0, "on_time_ratio": None},
        "meta": {"data_completeness": 1.0, "sources_connected": [], "as_of": "2026-07-03"},
    }
    for k, v in overrides.items():
        base[k] = {**base[k], **v}
    return MerchantFeatures.model_validate(base)


# --------------------------- confidence model ------------------------------ #
def test_confidence_within_bounds():
    hi = assess_confidence(make_features(
        meta={"data_completeness": 1.0, "sources_connected": ["bank", "salla"], "as_of": "2026-07-03"},
        revenue={"monthly_avg": 100000, "weekly_series": [1] * 20},
        merchant={"id": "t", "name": "t", "tenure_months": 60},
        repayment={"prior_advances": 20, "on_time_ratio": 1.0}))
    assert 0.0 <= hi.value <= 1.0


def test_confidence_high_for_complete_merchant():
    f = MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))
    result = assess_confidence(f)
    assert result.value > 0.80
    assert result.band == ConfidenceBand.high
    assert len(result.drivers) == 4


def test_confidence_low_for_sparse_merchant():
    sparse = make_features(
        meta={"data_completeness": 0.2, "sources_connected": [], "as_of": "2026-07-03"},
        merchant={"id": "t", "name": "t", "tenure_months": 1},
        settlements={"confirmed_receivables": 0})
    result = assess_confidence(sparse)
    assert result.band == ConfidenceBand.low


# --------------------------- hard gates ------------------------------------ #
def test_gate_declines_excessive_disputes():
    f = make_features(settlements={"confirmed_receivables": 50000,
                                   "chargeback_rate": 0.04, "dispute_rate": 0.03})
    outcome, rules = evaluate_decision(800, 0.9, f)
    assert outcome == Outcome.decline and "DECLINE_FRAUD_RISK" in rules


def test_gate_declines_no_receivables():
    f = make_features(settlements={"confirmed_receivables": 500})
    outcome, rules = evaluate_decision(800, 0.9, f)
    assert outcome == Outcome.decline and "DECLINE_NO_RECEIVABLES" in rules


def test_gate_declines_severe_delinquency():
    f = make_features(repayment={"prior_advances": 3, "on_time_ratio": 0.30})
    outcome, rules = evaluate_decision(800, 0.9, f)
    assert outcome == Outcome.decline and "DECLINE_DELINQUENCY" in rules


def test_gate_reviews_short_tenure():
    f = make_features(merchant={"id": "t", "name": "t", "tenure_months": 1})
    outcome, rules = evaluate_decision(800, 0.9, f)
    assert outcome == Outcome.review and "REVIEW_INSUFFICIENT_HISTORY" in rules


def test_gate_reviews_incomplete_data():
    f = make_features(meta={"data_completeness": 0.4, "sources_connected": [], "as_of": "2026-07-03"})
    outcome, rules = evaluate_decision(800, 0.9, f)
    assert outcome == Outcome.review and "REVIEW_INSUFFICIENT_DATA" in rules


# --------------------------- thresholds ------------------------------------ #
def test_approve_when_score_and_confidence_high():
    outcome, rules = evaluate_decision(700, 0.80, make_features())
    assert outcome == Outcome.approve and "APPROVE_THRESHOLD" in rules


def test_review_when_confidence_low_despite_score():
    outcome, rules = evaluate_decision(700, 0.50, make_features())
    assert outcome == Outcome.review and "REVIEW_LOW_CONFIDENCE" in rules


def test_review_when_mid_score():
    outcome, rules = evaluate_decision(640, 0.90, make_features())
    assert outcome == Outcome.review and "REVIEW_SCORE_BAND" in rules


def test_decline_when_low_score():
    outcome, rules = evaluate_decision(550, 0.90, make_features())
    assert outcome == Outcome.decline and "DECLINE_LOW_SCORE" in rules


# --------------------------- integration ----------------------------------- #
def test_fixture_merchant_is_approved():
    f = MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))
    d = assess(f)
    assert d.funding_recommendation.decision == Outcome.approve
    assert d.confidence.band == ConfidenceBand.high
    assert "A3_DECISION" in d.audit.rules_fired
    assert "APPROVE_THRESHOLD" in d.audit.rules_fired
