"""Deterministic, transparent stub scoring model (ships with the MVP).

Saeed's real model replaces this behind the same CreditScoringModel interface.
Score scale 0-1000, bands A/B/C/D — placeholder convention (plan §18).
"""

from app.scoring.base import CreditDecision, CreditScoringModel, ScoringFeatures

MODEL_VERSION = "stub-1.0.0"

BAND_THRESHOLDS = [(750, "A"), (600, "B"), (450, "C")]  # else D
ADVANCE_RATIO_BY_BAND = {"A": 0.80, "B": 0.70, "C": 0.55, "D": 0.0}


def _band(score: int) -> str:
    for threshold, band in BAND_THRESHOLDS:
        if score >= threshold:
            return band
    return "D"


class StubScoringModel(CreditScoringModel):
    def score(self, features: ScoringFeatures) -> CreditDecision:
        contributions: dict[str, float] = {
            "base": 200.0,
            "revenue_volume": min(250.0, features.total_revenue_90d / 1000.0 * 0.9),
            "revenue_stability": (1 - min(features.revenue_volatility, 1.0)) * 200.0,
            "revenue_trend": max(-0.01, min(features.revenue_trend, 0.01)) * 15000.0,
            "chargebacks": -min(features.chargeback_ratio * 2500.0, 150.0),
            "account_age": min(features.account_age_days / 1825.0, 1.0) * 100.0,
            "settlement_regularity": min(features.num_settlement_cycles, 12) / 12.0 * 100.0,
        }
        contributions = {k: round(v, 1) for k, v in contributions.items()}
        score = int(max(0, min(1000, round(sum(contributions.values())))))
        band = _band(score)
        ratio = ADVANCE_RATIO_BY_BAND[band]
        approved = band != "D" and features.held_receivables_total > 0

        reasons: list[str] = [f"Score {score}/1000 -> risk band {band}."]
        if contributions["revenue_volume"] >= 150:
            reasons.append("Strong 90-day revenue volume.")
        elif contributions["revenue_volume"] < 50:
            reasons.append("Low 90-day revenue volume limits capacity.")
        if features.revenue_volatility > 0.6:
            reasons.append("High revenue volatility increases risk.")
        else:
            reasons.append("Stable daily revenue pattern.")
        if features.revenue_trend > 0.001:
            reasons.append("Revenue trending upward.")
        elif features.revenue_trend < -0.002:
            reasons.append("Revenue declining over the window.")
        if features.chargeback_ratio > 0.04:
            reasons.append("Elevated refund/chargeback ratio.")
        if not approved and band == "D":
            reasons.append("Below approval threshold: financing declined.")
        if not approved and features.held_receivables_total <= 0:
            reasons.append("No held receivables to finance against.")

        return CreditDecision(
            score=score,
            risk_band=band,
            approved=approved,
            max_advance_ratio=ratio,
            max_advance_amount=round(ratio * features.held_receivables_total, 2),
            reasons=reasons,
            feature_contributions=contributions,
            model_version=MODEL_VERSION,
        )
