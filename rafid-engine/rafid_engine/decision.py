"""Decision logic — approve / review / decline.

Two stages, evaluated in order:

1. Hard eligibility gates (knockouts). Deterministic rules that override the
   score entirely. Some force a decline (fraud-level disputes, nothing to secure
   against, severe past delinquency); others force a review because we can't
   assess confidently (too little trading history, incomplete data).

2. Score + confidence thresholds. Only reached if no gate fired. A passing score
   with insufficient confidence is downgraded to review rather than approved —
   that is the risk/confidence coupling from Phase 3.

Every path records the rule codes it fired, which flow into ``audit.rules_fired``
so any decision is fully traceable.
"""
from __future__ import annotations

from . import config
from .schema import MerchantFeatures, Outcome


def evaluate_decision(
    score_850: int, confidence_value: float, features: MerchantFeatures
) -> tuple[Outcome, list[str]]:
    T = config.THRESHOLDS
    rules: list[str] = []

    st = features.settlements
    rp = features.repayment
    merchant = features.merchant
    meta = features.meta

    # --- Stage 1a: hard DECLINE knockouts -------------------------------------
    if (st.chargeback_rate + st.dispute_rate) > T.max_chargeback_dispute:
        return Outcome.decline, ["DECLINE_FRAUD_RISK"]
    if st.confirmed_receivables < config.PRODUCT.min_ticket:
        return Outcome.decline, ["DECLINE_NO_RECEIVABLES"]
    if (
        rp.prior_advances > 0
        and rp.on_time_ratio is not None
        and rp.on_time_ratio < T.severe_delinquency_ratio
    ):
        return Outcome.decline, ["DECLINE_DELINQUENCY"]

    # --- Stage 1b: REVIEW knockouts (can't assess confidently) ----------------
    review_forced = False
    if merchant.tenure_months < T.min_tenure_months:
        rules.append("REVIEW_INSUFFICIENT_HISTORY")
        review_forced = True
    if meta.data_completeness < T.min_data_completeness:
        rules.append("REVIEW_INSUFFICIENT_DATA")
        review_forced = True
    if review_forced:
        return Outcome.review, rules

    # --- Stage 2: score + confidence thresholds -------------------------------
    if score_850 >= T.approve_score:
        if confidence_value >= T.approve_confidence:
            return Outcome.approve, ["APPROVE_THRESHOLD"]
        return Outcome.review, ["REVIEW_LOW_CONFIDENCE"]
    if score_850 >= T.review_score_floor:
        return Outcome.review, ["REVIEW_SCORE_BAND"]
    return Outcome.decline, ["DECLINE_LOW_SCORE"]
