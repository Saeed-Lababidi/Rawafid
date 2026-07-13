"""Stub seam: scoring model behind an HTTP service (post-hackathon option).

If the ML model moves out of process, implement this and set
SCORING_BACKEND=http — no service-layer change (plan §6.2).
"""

from app.scoring.base import CreditDecision, CreditScoringModel, ScoringFeatures


class HttpScoringModel(CreditScoringModel):
    def __init__(self, endpoint: str = "") -> None:
        self.endpoint = endpoint

    def score(self, features: ScoringFeatures) -> CreditDecision:
        raise NotImplementedError(
            "HttpScoringModel is a post-hackathon seam; set SCORING_BACKEND=stub"
        )
