"""Optional LLM narration — richer prose, zero risk to the decision.

This layer takes an already-computed ``Decision`` and rewrites only its
``explanation.summary`` into more natural language, tailored per audience. It is
strictly a *narrator over grounded facts*:

  - It runs AFTER ``assess()``, never inside it. ``assess()`` stays pure and
    offline; the decision never depends on an external API.
  - It rewrites ONE field. Every number, amount, score, decision, and reason code
    stays exactly as the engine computed it.
  - A numeric guard checks the output: any figure the model emits that the engine
    did not provide triggers an automatic fallback to the deterministic template.
    The model cannot introduce a wrong number into a financing decision.
  - Any failure (network, rate limit, malformed output, guard violation) returns
    the original Decision unchanged. Narration can only ever improve prose, never
    break the result.

The engine does not import any LLM SDK or hold an API key. The caller injects a
``complete(prompt) -> str`` function; the backend wires that to Gemini (see
``examples/gemini_adapter.py``).
"""
from __future__ import annotations

import json
import logging
import re
from typing import Callable, Optional

from .schema import Decision, Explanation, Localized, Outcome

logger = logging.getLogger("rafid_engine.narration")

Complete = Callable[[str], str]

_NUM = re.compile(r"\d+")

_GROUNDING_PROMPT = """You are a financial communications assistant for Rafid, a merchant-financing product.
Rewrite the assessment below into a clear, warm, professional summary for the audience: {audience}.

STRICT RULES:
- Use ONLY the facts in the JSON. Do not invent, add, remove, or alter any number, amount, date, score, or percentage.
- Do not promise anything beyond the facts. If a detail is not in the JSON, do not mention it.
- Keep it to 1-2 sentences in each language. Arabic first.
- Return STRICT JSON only, no markdown, no preamble: {{"ar": "<arabic>", "en": "<english>"}}

FACTS:
{facts}
"""


def _numbers(text: str, min_len: int = 3) -> set[str]:
    """Digit runs of at least ``min_len`` chars, commas ignored (67,600 -> 67600)."""
    return {n for n in _NUM.findall(text.replace(",", "")) if len(n) >= min_len}


def _build_context(decision: Decision, audience: str) -> dict:
    fr = decision.funding_recommendation
    return {
        "audience": audience,
        "decision": fr.decision.value,
        "grade": decision.risk_score.grade,
        "score_out_of_850": decision.risk_score.value_850,
        "recommended_amount": int(fr.recommended_amount),
        "currency": decision.currency,
        "advance_rate_pct": round(fr.advance_rate_effective * 100),
        "total_repayment": round(fr.total_repayment, 2),
        "payoff_date": str(fr.repayment.expected_payoff_date or ""),
        "strengths": [s.text.en for s in decision.strengths],
        "weaknesses": [w.text.en for w in decision.weaknesses],
    }


def _parse(raw: str) -> Optional[Localized]:
    text = raw.strip()
    if text.startswith("```"):  # tolerate accidental markdown fences
        text = text.strip("`")
        text = text[text.find("{"):]
    try:
        data = json.loads(text[text.find("{"): text.rfind("}") + 1])
    except (ValueError, json.JSONDecodeError):
        return None
    ar, en = data.get("ar"), data.get("en")
    if not isinstance(ar, str) or not isinstance(en, str) or not ar.strip() or not en.strip():
        return None
    return Localized(ar=ar.strip(), en=en.strip())


def _passes_guard(summary: Localized, decision: Decision, context: dict) -> bool:
    allowed = _numbers(json.dumps(context, ensure_ascii=False))
    emitted = _numbers(summary.ar) | _numbers(summary.en)
    if not emitted <= allowed:
        logger.warning(
            "narration guard rejected output: unrecognized figures %s (assessment_id=%s)",
            sorted(emitted - allowed), decision.assessment_id,
        )
        return False  # a figure the engine never provided -> reject
    # for approvals, the amount must actually appear (the model didn't drop it)
    if decision.funding_recommendation.decision == Outcome.approve:
        amount = str(int(decision.funding_recommendation.recommended_amount))
        if amount not in summary.en.replace(",", "") or amount not in summary.ar.replace(",", ""):
            logger.warning(
                "narration guard rejected output: recommended amount %s missing from summary "
                "(assessment_id=%s)", amount, decision.assessment_id,
            )
            return False
    return True


def enrich_explanation(
    decision: Decision,
    *,
    complete: Complete,
    audience: str = "merchant",
) -> Decision:
    """Return a copy of ``decision`` with an LLM-written summary, or the original.

    Never raises: any failure falls back to the deterministic summary already on
    ``decision``. Only ``explanation.summary`` can change; nothing else is touched.
    """
    try:
        context = _build_context(decision, audience)
        prompt = _GROUNDING_PROMPT.format(
            audience=audience, facts=json.dumps(context, ensure_ascii=False, indent=2)
        )
        raw = complete(prompt)
        summary = _parse(raw)
        if summary is None:
            logger.warning(
                "narration fallback: completion was not valid {ar, en} JSON "
                "(assessment_id=%s)", decision.assessment_id,
            )
            return decision
        if not _passes_guard(summary, decision, context):
            return decision  # _passes_guard already logged the specific reason
        return decision.model_copy(update={"explanation": Explanation(summary=summary)})
    except Exception:
        logger.exception(
            "narration fallback: completion call raised (assessment_id=%s)",
            decision.assessment_id,
        )
        return decision  # narration is best-effort; the decision is already complete
