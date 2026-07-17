// Reading the credit verdict off an assessment.
//
// The engine decides three ways — approve / review / decline — but the
// backend's frozen CreditDecision seam only carries a boolean `approved`, which
// collapses `review` into `false`. A merchant sent for underwriter review would
// otherwise be told they were declined, which is both wrong and the opposite of
// the product story (review = a human looks at it, see the annotate flow).
//
// The engine's own verdict is preserved verbatim on `engine_decision` — prefer
// it, and fall back to the boolean only when the engine payload is absent
// (stub/http scoring backends).

import type { CreditDecision, EngineOutcome } from './types';

export function outcomeOf(decision: CreditDecision): EngineOutcome {
  const engineOutcome = decision.engine_decision?.funding_recommendation?.decision;
  if (engineOutcome) return engineOutcome;
  return decision.approved ? 'approve' : 'decline';
}

/** Only an outright `approve` may proceed straight to an offer. */
export function canRequestOffer(decision: CreditDecision): boolean {
  return outcomeOf(decision) === 'approve';
}
