"""Reference adapter: wire the engine's narration layer to Gemini 2.5 Flash.

This file lives OUTSIDE the engine package on purpose — the engine stays
dependency-light (pydantic only) and never holds an API key. The backend owns
this adapter and injects the resulting ``complete`` function into
``enrich_explanation``.

Setup:
    pip install google-genai
    export GEMINI_API_KEY=...        # from Google AI Studio (no card required)

Usage (backend):
    from rafid_engine import assess, enrich_explanation
    from gemini_adapter import make_gemini_complete

    decision = assess(features)               # pure, offline, always works
    if settings.LLM_NARRATION_ENABLED:
        complete = make_gemini_complete()
        decision = enrich_explanation(decision, complete=complete, audience="merchant")
    # if the API errors or rate-limits, `decision` is returned unchanged.

IMPORTANT — data privacy:
    On Gemini's FREE tier, Google may use prompts/outputs to improve its models
    and human reviewers may see them. That is fine for the hackathon with
    SYNTHETIC data, but for production with real merchant data use the paid tier
    or Vertex AI (which do not train on your data), or a private model.
"""
from __future__ import annotations

import os
from typing import Callable

Complete = Callable[[str], str]


def make_gemini_complete(
    model: str = "gemini-2.5-flash",
    api_key_env: str = "GEMINI_API_KEY",
    timeout_seconds: float = 8.0,
) -> Complete:
    """Return a ``complete(prompt) -> str`` backed by Gemini 2.5 Flash.

    Temperature is pinned to 0 for maximum reproducibility, and the model is asked
    to return JSON. The engine's numeric guard + template fallback mean any drift
    or failure is caught downstream — this adapter can stay simple.
    """
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=os.environ[api_key_env])

    def complete(prompt: str) -> str:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.0,
                response_mime_type="application/json",
                http_options=types.HttpOptions(timeout=int(timeout_seconds * 1000)),
            ),
        )
        return response.text or ""

    return complete
