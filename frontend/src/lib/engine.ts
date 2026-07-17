// Helpers for rendering the rafid-engine Decision.
//
// The engine narrates every human-readable string natively in Arabic and
// English, so the UI picks a side rather than translating. This is why the
// engine payload matters for the Arabic-first story: the reasons a merchant
// reads are authored by the decision engine itself, not a frontend gloss.

import type { EngineDecision, Localized } from './types';
import type { Locale } from './format';

/** Read the active locale's side of a bilingual engine string. */
export function localized(value: Localized, locale: Locale): string {
  return locale === 'ar' ? value.ar : value.en;
}

/**
 * Engine score bounds (rafid_engine schema: value_850 is ge=300, le=850).
 *
 * The backend's scoring/base.py docstring still describes a legacy 0..1000
 * scale with A>=750/B>=600/C>=450 bands. That comment is stale: with
 * SCORING_BACKEND=module the persisted score is the engine's 300..850 value.
 * Rendering it against a /1000 axis understates every merchant.
 */
export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

/** Position of a score on the 300..850 ring, clamped to 0..1. */
export function scoreFraction(score: number): number {
  const span = SCORE_MAX - SCORE_MIN;
  return Math.max(0, Math.min(1, (score - SCORE_MIN) / span));
}

/**
 * Grade -> risk-band family, matching the backend adapter's `_band()`
 * (grade[0]), so the chip colour agrees with the persisted risk_band.
 */
export function bandOfGrade(grade: string): string {
  return grade ? grade[0] : 'D';
}

/** The engine payload is only present on the module scoring backend. */
export function engineOf(decision: {
  engine_decision?: EngineDecision | null;
}): EngineDecision | null {
  return decision.engine_decision ?? null;
}
