"""A5 tests: strengths/weaknesses/next-steps, impact math, audience registers."""
import pathlib

from rafid_engine import MerchantFeatures, assess
from rafid_engine.schema import Outcome

FIXTURE = pathlib.Path(__file__).parent.parent / "datasets" / "merchant_alosaila.json"


def _fixture() -> MerchantFeatures:
    return MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))


def test_pipeline_no_longer_stub():
    assert assess(_fixture()).audit.stub is False


def test_strengths_and_weaknesses_are_bilingual_and_disjoint():
    d = assess(_fixture())
    assert d.strengths and d.weaknesses
    for item in d.strengths + d.weaknesses:
        assert item.text.ar and item.text.en
    strong_codes = {s.code for s in d.strengths}
    weak_codes = {w.code for w in d.weaknesses}
    assert strong_codes.isdisjoint(weak_codes)


def test_next_steps_have_grounded_impact():
    d = assess(_fixture())
    assert d.next_steps
    for step in d.next_steps:
        assert step.text.ar and step.text.en
        assert step.potential_impact and "+" in step.potential_impact


def test_fixture_surfaces_concentration_as_a_weakness():
    # 52% on one platform -> should appear as a weakness with a diversify next-step
    d = assess(_fixture())
    weak_codes = {w.code for w in d.weaknesses}
    step_codes = {s.code for s in d.next_steps}
    assert "CONCENTRATION_HIGH" in weak_codes
    assert "CONCENTRATION_HIGH" in step_codes


def test_summary_mentions_amount_for_approved_merchant():
    d = assess(_fixture())
    assert d.funding_recommendation.decision == Outcome.approve
    assert "67,600" in d.explanation.summary.en
    assert "67,600" in d.explanation.summary.ar


def test_audience_registers_differ():
    merchant = assess(_fixture(), audience="merchant")
    bank = assess(_fixture(), audience="bank")
    assert merchant.explanation.summary.en != bank.explanation.summary.en
    # bank register is metric-first
    assert "850" in bank.explanation.summary.en


def test_decline_summary_states_reason():
    f = _fixture().model_copy(deep=True)
    f.settlements.chargeback_rate = 0.04
    f.settlements.dispute_rate = 0.03  # trip the fraud gate
    d = assess(f)
    assert d.funding_recommendation.decision == Outcome.decline
    assert d.explanation.summary.en  # non-empty, explains why
    assert "can't offer financing" in d.explanation.summary.en.lower()


def test_full_decision_round_trips_as_json():
    # the complete, non-stub Decision must serialize cleanly for the backend
    from rafid_engine.schema import Decision
    d = assess(_fixture())
    Decision.model_validate_json(d.model_dump_json())
