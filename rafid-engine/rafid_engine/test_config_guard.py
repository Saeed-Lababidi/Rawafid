"""Tests for the config validation guard (critical fix 2.2).

Confirms the default config passes, and that misaligning approve_score with a
zero-risk-multiplier grade is actually caught rather than silently producing a
0 SAR "approved" decision.
"""
import importlib

import pytest

from rafid_engine import config


def test_default_config_passes_validation():
    # already validated at import time; re-running must also pass
    config.validate_config()


def test_guard_catches_misaligned_approve_threshold(monkeypatch):
    # Force approve_score down into grade C territory (risk_multiplier = 0.0)
    bad_thresholds = config.Thresholds(approve_score=610)
    monkeypatch.setattr(config, "THRESHOLDS", bad_thresholds)
    with pytest.raises(ValueError, match="risk_multiplier"):
        config.validate_config()


def test_guard_passes_when_threshold_aligned_with_nonzero_grade():
    ok_thresholds = config.Thresholds(approve_score=720)  # grade B+, multiplier 1.0
    original = config.THRESHOLDS
    try:
        config.THRESHOLDS = ok_thresholds
        config.validate_config()  # must not raise
    finally:
        config.THRESHOLDS = original
