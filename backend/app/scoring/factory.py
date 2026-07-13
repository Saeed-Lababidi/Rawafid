from functools import lru_cache

from app.config import get_settings
from app.scoring.base import CreditScoringModel
from app.scoring.http import HttpScoringModel
from app.scoring.stub import StubScoringModel


@lru_cache
def get_scoring_model() -> CreditScoringModel:
    backend = get_settings().scoring_backend
    if backend == "http":
        return HttpScoringModel()
    if backend == "module":
        # Saeed's in-process model: drop his module in and import it here.
        # from app.scoring.saeed import SaeedModel; return SaeedModel()
        raise NotImplementedError("module backend awaits Saeed's model; use stub")
    return StubScoringModel()
