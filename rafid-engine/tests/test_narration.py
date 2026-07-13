"""Tests for the optional LLM narration layer (with mocked completions).

The engine never calls a real API in tests. These verify the narrator only ever
improves prose and always falls back safely, and that no number can leak through.
"""
import pathlib

from rafid_engine import MerchantFeatures, assess, enrich_explanation

FIXTURE = pathlib.Path(__file__).parent.parent / "datasets" / "merchant_alosaila.json"


def _decision():
    f = MerchantFeatures.model_validate_json(FIXTURE.read_text(encoding="utf-8"))
    return assess(f)


def _good(_prompt: str) -> str:
    # valid, grounded: uses only the amount (67,600) and the payoff year (2026)
    return (
        '{"ar": "أداؤك قوي؛ تم اعتماد تمويل حتى 67,600 ريال يُسدَّد حتى 2026-08-05.",'
        ' "en": "Strong performance; approved for up to 67,600 SAR, repaid by 2026-08-05."}'
    )


def test_narration_replaces_summary_on_valid_output():
    d = _decision()
    original_amount = d.funding_recommendation.recommended_amount
    enriched = enrich_explanation(d, complete=_good, audience="merchant")
    assert "Strong performance" in enriched.explanation.summary.en
    # every hard fact is untouched
    assert enriched.funding_recommendation.recommended_amount == original_amount
    assert enriched.risk_score.value_850 == d.risk_score.value_850
    assert enriched.funding_recommendation.decision == d.funding_recommendation.decision


def test_fallback_when_completion_raises():
    d = _decision()
    template_summary = d.explanation.summary.en

    def boom(_):
        raise RuntimeError("network down")

    out = enrich_explanation(d, complete=boom, audience="merchant")
    assert out.explanation.summary.en == template_summary  # unchanged


def test_fallback_on_malformed_json():
    d = _decision()
    template = d.explanation.summary.en
    out = enrich_explanation(d, complete=lambda _: "not json at all", audience="merchant")
    assert out.explanation.summary.en == template


def test_fallback_on_empty_strings():
    d = _decision()
    template = d.explanation.summary.en
    out = enrich_explanation(d, complete=lambda _: '{"ar": "", "en": ""}', audience="merchant")
    assert out.explanation.summary.en == template


def test_guard_rejects_hallucinated_number():
    d = _decision()
    template = d.explanation.summary.en
    # 75,000 is NOT a figure the engine provided -> must be rejected
    bad = '{"ar": "تم اعتماد 75,000 ريال.", "en": "Approved for 75,000 SAR."}'
    out = enrich_explanation(d, complete=lambda _: bad, audience="merchant")
    assert out.explanation.summary.en == template


def test_guard_rejects_dropped_amount_on_approval():
    d = _decision()
    template = d.explanation.summary.en
    # grounded but omits the amount entirely on an approval -> reject
    vague = '{"ar": "أداؤك ممتاز.", "en": "Your performance is excellent."}'
    out = enrich_explanation(d, complete=lambda _: vague, audience="merchant")
    assert out.explanation.summary.en == template
