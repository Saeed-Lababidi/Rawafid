"""Adapter: Saeed's rafid-engine behind the frozen CreditScoringModel seam.

The engine (``rafid_engine.assess``) is a pure, deterministic, transparent
seven-factor scorecard producing a rich bilingual Decision. This adapter:

1. maps the backend's flat ``ScoringFeatures`` -> the engine's nested
   ``MerchantFeatures`` input contract,
2. calls ``assess()``,
3. squashes the engine ``Decision`` into the backend's ``CreditDecision`` (so the
   scoring service, bands, and offer math keep working unchanged), AND
4. carries the FULL engine Decision on ``engine_decision`` so the frontend can
   render the explainable output (score 300-850, grade, confidence, AR/EN
   explanation, settlement repayment schedule).

Activated by ``SCORING_BACKEND=module`` (see app/scoring/factory.py).
"""

from datetime import date

from rafid_engine import MerchantFeatures, assess

from app.scoring.base import CreditDecision, CreditScoringModel, ScoringFeatures


# engine grade (A+/A/A-/B+/B/B-/C/D) -> backend risk band family (A/B/C/D)
def _band(grade: str) -> str:
    return grade[0] if grade else "D"


def _to_features(sf: ScoringFeatures) -> MerchantFeatures:
    return MerchantFeatures(
        merchant={
            "id": sf.merchant_id,
            "name": sf.merchant_name or sf.merchant_id,
            "sector": sf.sector,
            "tenure_months": sf.account_age_days // 30,
            "registration_verified": sf.registration_verified,
        },
        revenue={
            "monthly_avg": round(sf.avg_daily_revenue * 30, 2),
            "weekly_series": sf.weekly_revenue,
            "currency": "SAR",
        },
        sales={
            "by_platform": sf.platform_mix,
            "refund_rate": sf.chargeback_ratio,
        },
        banking={
            "avg_balance": sf.avg_balance,
            "net_inflow_ratio": sf.net_inflow_ratio,
            "negative_balance_days": sf.negative_balance_days,
            "returned_payments": sf.returned_payments,
        },
        settlements={
            "confirmed_receivables": sf.held_receivables_total,
            "upcoming": [
                {"date": u.date, "expected": u.expected} for u in sf.upcoming_settlements
            ],
            "chargeback_rate": sf.chargeback_ratio,
            "dispute_rate": sf.dispute_rate,
        },
        repayment={
            "prior_advances": sf.prior_advances,
            "on_time_ratio": sf.on_time_ratio,
        },
        meta={
            "data_completeness": sf.data_completeness,
            "sources_connected": sf.sources_connected,
            "as_of": date.today().isoformat(),
        },
    )


class SaeedModel(CreditScoringModel):
    def score(self, features: ScoringFeatures) -> CreditDecision:
        d = assess(_to_features(features))
        funding = d.funding_recommendation

        reasons = [d.explanation.summary.en]
        reasons += [s.text.en for s in d.strengths]
        reasons += [w.text.en for w in d.weaknesses]

        return CreditDecision(
            score=d.risk_score.value_850,
            risk_band=_band(d.risk_score.grade),
            approved=funding.decision.value == "approve",
            max_advance_ratio=funding.advance_rate_effective,
            max_advance_amount=funding.max_amount,
            reasons=reasons,
            feature_contributions={
                f.code: f.contribution_pct for f in d.risk_score.factors
            },
            model_version=f"engine-{d.engine_version}",
            engine_decision=d.model_dump(mode="json"),
        )
