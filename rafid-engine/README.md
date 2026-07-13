# Rafid — AI Decision & Insights Engine

Transparent, explainable merchant-financing decisions. Pure, in-process, and
dependency-light (only `pydantic`). The backend integrates through **two
functions and two data types** — nothing else.

## Install

```bash
pip install -e ./engine          # from the repo root
```

## Integrate (the entire surface)

```python
from rafid_engine import assess, quote, MerchantFeatures, Decision

features = MerchantFeatures.model_validate(payload)  # payload: dict from your DB/adapters
decision: Decision = assess(features)                # score + full recommendation
offer = quote(decision, requested_amount=50_000)     # terms for a chosen amount
```

`assess()` and `quote()` are **pure** — no DB, no network. The backend gathers
`MerchantFeatures`, calls the engine, and persists/serves the `Decision`. The
frontend renders the `Decision` directly.

## Layout

| Path | Purpose |
|---|---|
| `rafid_engine/schema.py` | `MerchantFeatures` (input) + `Decision` / `Offer` (output) contracts |
| `rafid_engine/config.py` | Versioned weights, thresholds, product parameters, grade bands |
| `rafid_engine/registry.py` | Factor registry — the extensibility seam |
| `rafid_engine/engine.py` | `assess()` / `quote()` |
| `datasets/` | Synthetic merchant fixtures |
| `tests/` | Unit + smoke tests |

## Status

**Complete (A1–A5).** Transparent seven-factor scorecard on an 850 scale,
orthogonal confidence model, gated approve/review/decline decision, receivables-
driven exposure with serviceability-capped repayment scheduling, and a
deterministic bilingual (Arabic/English) explanation layer with audience
registers. Fully deterministic, offline, and reason-coded — no model calls.
48 tests passing.

## Test

```bash
pip install -e "./engine[dev]"
pytest engine/tests -v
```
