"""A4 tests: exposure sizing, repayment scheduling, quoting, prototype match."""
import pathlib
from datetime import date

from rafid_engine import MerchantFeatures, assess, config, quote
from rafid_engine import exposure
from rafid_engine.schema import Outcome

FIXTURE = pathlib.Path(__file__).parent.parent / "datasets" / "merchant_alosaila.json"


def _fixture() -> MerchantFeatures:
    return MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))


# ------------------------------ sizing ------------------------------------- #
def test_effective_rate_by_grade():
    assert exposure.effective_advance_rate("A-") == 0.80
    assert round(exposure.effective_advance_rate("B"), 4) == 0.56
    assert exposure.effective_advance_rate("D") == 0.0


def test_max_advance_reproduces_prototype():
    assert exposure.max_advance("A-", 84500) == 67600


def test_max_advance_clamped_to_max_ticket():
    assert exposure.max_advance("A-", 10_000_000) == config.PRODUCT.max_ticket


# ------------------------------ scheduling --------------------------------- #
def test_schedule_respects_40pct_cap():
    up = [(date(2026, 7, 8), 40000), (date(2026, 7, 15), 40000)]
    schedule, _ = exposure.build_repayment_schedule(30000, up)
    for d in schedule:
        assert d.deduction <= 0.40 * d.settlement_expected + 0.01


def test_schedule_sums_to_total():
    up = [(date(2026, 7, 8), 40000), (date(2026, 7, 15), 40000), (date(2026, 7, 22), 40000)]
    schedule, payoff = exposure.build_repayment_schedule(50000, up)
    assert abs(sum(d.deduction for d in schedule) - 50000) < 0.05
    assert payoff == schedule[-1].date


def test_schedule_projects_when_known_insufficient():
    up = [(date(2026, 7, 8), 10000)]  # 40% = 4000 per cycle, need 20000 -> must project
    schedule, payoff = exposure.build_repayment_schedule(20000, up)
    assert any(d.projected for d in schedule)
    assert abs(sum(d.deduction for d in schedule) - 20000) < 0.05
    assert payoff is not None


# ------------------------------ integration -------------------------------- #
def test_fixture_offer_matches_prototype():
    fr = assess(_fixture()).funding_recommendation
    assert fr.decision == Outcome.approve
    assert fr.recommended_amount == 67600
    assert fr.advance_rate_effective == 0.80
    assert round(fr.fee.amount, 2) == 1419.6
    assert round(fr.total_repayment, 2) == 69019.6
    assert fr.repayment.expected_payoff_date == date(2026, 8, 5)
    assert abs(sum(x.deduction for x in fr.repayment.schedule) - fr.total_repayment) < 0.05
    assert fr.repayment.schedule[0].projected is False
    assert any(x.projected for x in fr.repayment.schedule)


def test_quote_scales_and_caps():
    d = assess(_fixture())
    within = quote(d, 40000)
    assert within.approved_amount == 40000 and within.within_limit is True
    assert abs(sum(x.deduction for x in within.repayment.schedule) - within.total_repayment) < 0.05
    over = quote(d, 999999)
    assert over.approved_amount == 67600 and over.within_limit is False


def test_review_and_decline_have_zero_amounts():
    f = _fixture().model_copy(deep=True)
    f.meta.data_completeness = 0.4  # force a review
    fr = assess(f).funding_recommendation
    assert fr.decision == Outcome.review
    assert fr.recommended_amount == 0.0
    assert fr.repayment.schedule == []
