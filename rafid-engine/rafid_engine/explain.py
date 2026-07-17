"""Explainability — deterministic, bilingual, audience-aware.

Everything human-readable is rendered from factor reason codes; there is no
free-text generation and no model call, so output is reproducible and offline.

  - strengths   : the strongest factors, phrased positively
  - weaknesses  : the relatively weakest factors, phrased as room to improve
  - next_steps  : an action per addressable weakness, with an impact estimate
                  *computed from the scorecard* (weight x headroom x scale)
  - summary     : a short narrative, tailored per audience register

Adding a language or an audience register is additive — no logic changes.
"""
from __future__ import annotations

from dataclasses import dataclass

from . import config
from .scorecard import ScorecardResult
from .schema import (
    FactorContribution,
    FundingRecommendation,
    Insight,
    Localized,
    NextStep,
    Outcome,
)

# factor -> (strength reason code, weakness reason code)
_REASON_CODES: dict[str, tuple[str, str]] = {
    "REVENUE_SCALE": ("REV_STRONG", "REV_WEAK"),
    "REVENUE_STABILITY": ("STAB_STEADY", "STAB_VOLATILE"),
    "GROWTH_TREND": ("GROWTH_UP", "GROWTH_FLAT"),
    "CASH_FLOW_HEALTH": ("CASH_HEALTHY", "CASH_TIGHT"),
    "SETTLEMENT_RELIABILITY": ("SETTLE_RELIABLE", "SETTLE_IRREGULAR"),
    "REPAYMENT_HISTORY": ("REPAY_STRONG", "REPAY_LIMITED"),
    "CONCENTRATION": ("DIVERSIFIED", "CONCENTRATION_HIGH"),
}

_STRENGTH_TEXT: dict[str, Localized] = {
    "REV_STRONG": Localized(ar="إيراداتك الشهرية قوية وتدعم قدرتك على السداد",
                            en="Strong monthly revenue supports your repayment capacity"),
    "STAB_STEADY": Localized(ar="مبيعاتك مستقرة عبر الأسابيع", en="Steady week-to-week sales"),
    "GROWTH_UP": Localized(ar="اتجاه مبيعاتك تصاعدي", en="Your sales trend is rising"),
    "CASH_HEALTHY": Localized(ar="تدفقك النقدي صحي", en="Healthy cash flow"),
    "SETTLE_RELIABLE": Localized(ar="تسوياتك منتظمة وموثوقة", en="Regular, reliable settlements"),
    "REPAY_STRONG": Localized(ar="سجل سداد ممتاز", en="Excellent repayment record"),
    "DIVERSIFIED": Localized(ar="قنوات مبيعاتك متنوعة", en="Well-diversified sales channels"),
}

_WEAKNESS_TEXT: dict[str, Localized] = {
    "REV_WEAK": Localized(ar="إيراداتك الشهرية محدودة نسبيًا", en="Relatively limited monthly revenue"),
    "STAB_VOLATILE": Localized(ar="مبيعاتك متذبذبة بين الأسابيع", en="Week-to-week sales are volatile"),
    "GROWTH_FLAT": Localized(ar="نمو المبيعات بطيء", en="Sales growth is slow"),
    "CASH_TIGHT": Localized(ar="هامش التدفق النقدي محدود", en="Tight cash-flow margin"),
    "SETTLE_IRREGULAR": Localized(ar="انتظام التسويات يحتاج تحسينًا", en="Settlement regularity could improve"),
    "REPAY_LIMITED": Localized(ar="سجل السداد قصير", en="Short repayment history"),
    "CONCENTRATION_HIGH": Localized(ar="اعتماد مرتفع على قناة مبيعات واحدة",
                                    en="High reliance on a single sales channel"),
}

_NEXTSTEP_TEXT: dict[str, Localized] = {
    "REV_WEAK": Localized(ar="ركّز على رفع الإيراد الشهري", en="Focus on growing monthly revenue"),
    "STAB_VOLATILE": Localized(ar="اعمل على تثبيت مبيعاتك الأسبوعية", en="Work to stabilise weekly sales"),
    "GROWTH_FLAT": Localized(ar="زد وتيرة المبيعات لرفع اتجاه النمو",
                             en="Build sales momentum to lift your growth trend"),
    "CASH_TIGHT": Localized(ar="ارفع رصيدك التشغيلي لتقوية التدفق النقدي",
                            en="Build a larger operating balance to strengthen cash flow"),
    "SETTLE_IRREGULAR": Localized(ar="قلّل معدل النزاعات والمبالغ المستردة",
                                  en="Reduce your dispute and refund rate"),
    "REPAY_LIMITED": Localized(ar="ابدأ بتمويل أصغر لبناء سجل سداد",
                               en="Start with a smaller advance to build a repayment record"),
    "CONCENTRATION_HIGH": Localized(ar="اربط منصة مبيعات إضافية لتقليل التركّز",
                                    en="Connect another sales platform to reduce concentration"),
}

# decisive rule -> short bilingual reason, for review/decline summaries
_RULE_REASON: dict[str, Localized] = {
    "REVIEW_INSUFFICIENT_HISTORY": Localized(ar="سجل النشاط أقل من 90 يومًا",
                                             en="Trading history is under 90 days"),
    "REVIEW_INSUFFICIENT_DATA": Localized(ar="البيانات غير مكتملة بما يكفي للتقييم",
                                          en="Data is too incomplete to assess confidently"),
    "REVIEW_LOW_CONFIDENCE": Localized(ar="درجة الثقة في البيانات منخفضة",
                                       en="Confidence in the available data is low"),
    "REVIEW_SCORE_BAND": Localized(ar="الدرجة الائتمانية في النطاق الحدّي",
                                   en="The score falls in the borderline band"),
    "DECLINE_FRAUD_RISK": Localized(ar="معدل النزاعات والمبالغ المستردة مرتفع جدًا",
                                    en="Dispute and chargeback rates are too high"),
    "DECLINE_NO_RECEIVABLES": Localized(ar="لا توجد مستحقات مؤكدة كافية للتمويل",
                                        en="There aren't enough confirmed receivables to finance"),
    "DECLINE_DELINQUENCY": Localized(ar="تعثّر واضح في سداد تمويلات سابقة",
                                     en="Serious delinquency on prior advances"),
    "DECLINE_LOW_SCORE": Localized(ar="الدرجة الائتمانية دون الحد الأدنى",
                                   en="The score is below the minimum threshold"),
}


@dataclass
class ExplanationBundle:
    summary: Localized
    strengths: list[Insight]
    weaknesses: list[Insight]
    next_steps: list[NextStep]


def _impact(factor: FactorContribution, target: float | None = None) -> int:
    """Score points unlocked if this factor improved to `target` — grounded in the math."""
    target = config.EXPLAIN.impact_target if target is None else target
    headroom = max(0.0, target - factor.sub_score)
    return max(1, round(factor.weight * headroom * config.SCORE_SPAN))


def _insights(card: ScorecardResult) -> tuple[list[Insight], list[Insight], list[NextStep]]:
    threshold = config.EXPLAIN.strength_threshold
    strong = [f for f in card.factors if f.sub_score >= threshold]
    weak = [f for f in card.factors if f.sub_score < threshold]
    strong.sort(key=lambda f: f.contribution_pct, reverse=True)
    weak.sort(key=lambda f: f.sub_score)

    strengths = [
        Insight(code=_REASON_CODES[f.code][0], text=_STRENGTH_TEXT[_REASON_CODES[f.code][0]])
        for f in strong[:3]
    ]
    weaknesses = [
        Insight(code=_REASON_CODES[f.code][1], text=_WEAKNESS_TEXT[_REASON_CODES[f.code][1]])
        for f in weak[:3]
    ]
    next_steps = [
        NextStep(
            code=_REASON_CODES[f.code][1],
            text=_NEXTSTEP_TEXT[_REASON_CODES[f.code][1]],
            potential_impact=f"\u2248 +{_impact(f)} pts",
        )
        for f in weak[:3]
    ]
    return strengths, weaknesses, next_steps


def _summary(
    audience: str,
    outcome: Outcome,
    card: ScorecardResult,
    funding: FundingRecommendation,
    decision_rules: list[str],
    strengths: list[Insight],
) -> Localized:
    top = strengths[0].text if strengths else Localized(ar="أداء متوازن", en="a balanced profile")
    amount = f"{int(funding.recommended_amount):,}"
    currency = funding.currency
    payoff = funding.repayment.expected_payoff_date
    reason = next((_RULE_REASON[r] for r in decision_rules if r in _RULE_REASON),
                  Localized(ar="", en=""))

    if outcome == Outcome.approve:
        if audience == "bank":
            n = len(funding.repayment.schedule)
            return Localized(
                ar=f"التاجر بدرجة {card.grade} ({card.score_850}/850). يُوصى بتمويل {amount} {currency} "
                   f"بنسبة {int(funding.advance_rate_effective * 100)}% من المستحقات المؤكدة، "
                   f"يُسدَّد آليًا عبر {n} دورات تسوية حتى {payoff}.",
                en=f"Merchant graded {card.grade} ({card.score_850}/850). Recommend {amount} {currency} "
                   f"at {int(funding.advance_rate_effective * 100)}% of confirmed receivables, "
                   f"auto-repaid across {n} settlement cycles to {payoff}.",
            )
        return Localized(
            ar=f"أداء نشاطك قوي — {top.ar}. تم اعتماد تمويل حتى {amount} {currency} مقابل مستحقاتك "
               f"المؤكدة، يُسدَّد آليًا من تسوياتك القادمة حتى {payoff}.",
            en=f"Your business is performing well — {top.en.lower()}. You're approved for up to "
               f"{amount} {currency} against your confirmed receivables, repaid automatically from "
               f"upcoming settlements through {payoff}.",
        )
    if outcome == Outcome.review:
        return Localized(
            ar=f"نشاطك واعد، لكن نحتاج مراجعة إضافية قبل التمويل: {reason.ar}.",
            en=f"Your business looks promising, but we need an extra review before financing: {reason.en}.",
        )
    return Localized(
        ar=f"لا يمكننا تقديم تمويل حاليًا: {reason.ar}.",
        en=f"We can't offer financing right now: {reason.en}.",
    )


def build_explanation(
    card: ScorecardResult,
    outcome: Outcome,
    funding: FundingRecommendation,
    decision_rules: list[str],
    audience: str = "merchant",
) -> ExplanationBundle:
    strengths, weaknesses, next_steps = _insights(card)
    summary = _summary(audience, outcome, card, funding, decision_rules, strengths)
    return ExplanationBundle(
        summary=summary,
        strengths=strengths,
        weaknesses=weaknesses,
        next_steps=next_steps,
    )
