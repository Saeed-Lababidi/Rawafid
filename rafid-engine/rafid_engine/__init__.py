"""Rafid AI Decision & Insights Engine.

The public surface is intentionally tiny — two pure functions and the contract
types. The backend needs nothing else to integrate::

    from rafid_engine import assess, quote, MerchantFeatures, Decision

    decision = assess(features)          # features: MerchantFeatures
    offer = quote(decision, 50_000)
"""
from .config import ENGINE_VERSION, THRESHOLDS_VERSION
from .engine import assess, quote
from .narration import enrich_explanation
from .schema import Decision, MerchantFeatures, Offer

__all__ = [
    "assess",
    "quote",
    "enrich_explanation",
    "MerchantFeatures",
    "Decision",
    "Offer",
    "ENGINE_VERSION",
    "THRESHOLDS_VERSION",
]
__version__ = ENGINE_VERSION
