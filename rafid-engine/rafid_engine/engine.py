"""Engine core — the two pure functions the backend calls.

``assess(features) -> Decision`` and ``quote(basis, amount) -> Offer`` are the
entire integration surface. Both are pure: no database, no network.

Pipeline is complete: scorecard, confidence, decision gates, exposure/repayment,
and bilingual explanation all run for real. ``audit.stub`` is always ``False``.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from . import config
from .confidence import assess_confidence
from .decision import evaluate_decision
from . import exposure
from .explain import build_explanation
from .scorecard import run_scorecard
from .schema import (
    Audit,
    Confidence,
    CreditAssessment,
    Decision,
    Explanation,
    Fee,
    FundingRecommendation,
    MerchantFeatures,
    Offer,
    Outcome,
    Repayment,
    RiskScore,
)


def _new_assessment_id() -> str:
    return "as_" + uuid.uuid4().hex[:8]


def assess(features: MerchantFeatures, audience: str = "merchant") -> Decision:
    """Produce a financing Decision for one merchant.

    A5: the pipeline is complete — scorecard, confidence, decision, exposure, and
    a deterministic bilingual explanation. ``audience`` ('merchant' or 'bank')
    selects the narrative register for ``explanation.summary``.
    """
    now = datetime.now(timezone.utc)
    card = run_scorecard(features)
    conf = assess_confidence(features)
    outcome, decision_rules = evaluate_decision(card.score_850, conf.value, features)
    funding = _build_funding(outcome, card.grade, features)
    story = build_explanation(card, outcome, funding, decision_rules, audience)

    return Decision(
        engine_version=config.ENGINE_VERSION,
        assessment_id=_new_assessment_id(),
        as_of=features.meta.as_of,
        currency=features.revenue.currency,
        credit_assessment=CreditAssessment(
            health=card.health,
            health_label=card.health_label,
        ),
        risk_score=RiskScore(
            value_850=card.score_850,
            normalized=card.normalized,
            grade=card.grade,
            band=card.band,
            factors=card.factors,
        ),
        confidence=Confidence(value=conf.value, band=conf.band, drivers=conf.drivers),
        funding_recommendation=funding,
        explanation=Explanation(summary=story.summary),
        strengths=story.strengths,
        weaknesses=story.weaknesses,
        next_steps=story.next_steps,
        audit=Audit(
            rules_fired=["A2_SCORING", "A3_DECISION", "A4_EXPOSURE", "A5_EXPLAIN", *decision_rules],
            thresholds_version=config.THRESHOLDS_VERSION,
            generated_at=now,
            stub=False,
        ),
    )


def _build_funding(outcome: Outcome, grade: str, features: MerchantFeatures) -> FundingRecommendation:
    """Real exposure + repayment for approvals; zeros for review/decline."""
    rate = config.PRODUCT.murabaha_fee_rate
    currency = features.revenue.currency

    if outcome != Outcome.approve:
        return FundingRecommendation(
            decision=outcome,
            recommended_amount=0.0,
            max_amount=0.0,
            advance_rate_effective=0.0,
            currency=currency,
            fee=Fee(rate=rate, amount=0.0),
            total_repayment=0.0,
            repayment=Repayment(schedule=[], expected_payoff_date=None),
        )

    max_amount = exposure.max_advance(grade, features.settlements.confirmed_receivables)
    upcoming = [(u.date, u.expected) for u in features.settlements.upcoming]
    fee, total, schedule, payoff = exposure.price_advance(max_amount, upcoming)

    return FundingRecommendation(
        decision=outcome,
        recommended_amount=max_amount,
        max_amount=max_amount,
        advance_rate_effective=exposure.effective_advance_rate(grade),
        currency=currency,
        fee=Fee(rate=rate, amount=fee),
        total_repayment=total,
        repayment=Repayment(schedule=schedule, expected_payoff_date=payoff),
    )


def quote(basis: Decision, requested_amount: float) -> Offer:
    """Return offer terms for a merchant-chosen amount, capped at ``max_amount``.

    Self-contained: rebuilds the deduction schedule for the chosen amount from the
    settlement stream stored on ``basis`` — no need to re-fetch features.
    """
    rate = config.PRODUCT.murabaha_fee_rate
    max_amount = basis.funding_recommendation.max_amount
    approved = max(0.0, min(requested_amount, max_amount))

    upcoming = [
        (d.date, d.settlement_expected)
        for d in basis.funding_recommendation.repayment.schedule
    ]
    fee, total, schedule, payoff = exposure.price_advance(approved, upcoming)

    return Offer(
        assessment_id=basis.assessment_id,
        requested_amount=requested_amount,
        approved_amount=approved,
        currency=basis.currency,
        fee=Fee(rate=rate, amount=fee),
        total_repayment=total,
        repayment=Repayment(schedule=schedule, expected_payoff_date=payoff),
        within_limit=requested_amount <= max_amount,
    )
