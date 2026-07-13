"""A1 smoke tests.

These prove the foundation is sound: the fixture validates against the input
contract, config is internally consistent, the registry is wired, and the stub
``assess``/``quote`` return contract-complete objects that round-trip through
JSON (which is exactly what the backend will do). Real scoring assertions arrive
with A2+.
"""
import pathlib

import pytest

from rafid_engine import Decision, MerchantFeatures, Offer, assess, config, quote
from rafid_engine.registry import build_default_registry

FIXTURE = pathlib.Path(__file__).parent.parent / "datasets" / "merchant_alosaila.json"


def _load() -> MerchantFeatures:
    return MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))


def test_fixture_parses_against_input_contract():
    f = _load()
    assert f.merchant.id == "m_10482"
    assert f.settlements.confirmed_receivables == 84500
    assert round(sum(f.sales.by_platform.values()), 6) == 1.0


def test_config_weights_sum_to_one():
    assert round(sum(config.FACTOR_WEIGHTS.values()), 6) == 1.0


def test_registry_has_seven_factors_totaling_full_weight():
    reg = build_default_registry()
    assert len(reg.all()) == 7
    assert reg.total_weight() == 1.0


def test_assess_returns_contract_complete_decision():
    d = assess(_load())
    assert isinstance(d, Decision)
    assert d.engine_version == config.ENGINE_VERSION
    assert config.SCORE_MIN <= d.risk_score.value_850 <= config.SCORE_MAX
    assert d.currency == "SAR"
    assert d.audit.stub is False  # A5: full pipeline is live
    # must round-trip through JSON exactly as the backend will serialize it
    Decision.model_validate_json(d.model_dump_json())


def test_quote_caps_at_max_amount():
    d = assess(_load())
    d.funding_recommendation.max_amount = 67600  # simulate a scored cap
    within = quote(d, 50000)
    assert isinstance(within, Offer)
    assert within.approved_amount == 50000
    assert within.within_limit is True
    over = quote(d, 90000)
    assert over.approved_amount == 67600
    assert over.within_limit is False


def test_input_rejects_unknown_field():
    with pytest.raises(Exception):
        MerchantFeatures.model_validate({"merchant": {}, "bogus_field": 1})


def test_input_rejects_out_of_range_rate():
    bad = {
        "merchant": {"id": "x", "name": "x", "tenure_months": 1},
        "revenue": {"monthly_avg": 1000},
        "settlements": {"chargeback_rate": 5.0},
        "meta": {"as_of": "2026-07-03"},
    }
    with pytest.raises(Exception):
        MerchantFeatures.model_validate(bad)
