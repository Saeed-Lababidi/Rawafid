// Subscription tiers.
//
// Rafid bills on OPERATIONAL volume — how many orders we process — never on
// financing volume. Pricing off the financed amount would be bay' al-dayn
// (selling debt), which the product explicitly refuses; more orders simply
// means more work on our side, and that is the only thing the tiers track.
//
// Consequently nothing here reads a principal, fee, profit, or receivable. The
// only input is a count of orders. The thresholds mirror the landing page's
// pricing section (messages `model.tiers`), so the two cannot drift apart.

import type { SalesOrderOut } from './types';

export type TierId = 'starter' | 'growth' | 'scale';

/** Monthly order ceilings; `scale` is unbounded. Mirrors `model.tiers`. */
export const TIER_LIMITS: { id: TierId; maxOrdersPerMonth: number | null }[] = [
  { id: 'starter', maxOrdersPerMonth: 1_000 },
  { id: 'growth', maxOrdersPerMonth: 10_000 },
  { id: 'scale', maxOrdersPerMonth: null },
];

/** The aggregation window the backend pulls, in days (FRONTEND_GUIDE §6.3). */
const WINDOW_DAYS = 90;
const DAYS_PER_MONTH = 30;

export type TierUsage = {
  tier: TierId;
  /** Orders per month, extrapolated from the 90-day window. */
  ordersPerMonth: number;
  /** Ceiling of the current tier; null on the unbounded top tier. */
  limit: number | null;
  /** Progress toward the current tier's ceiling, 0..1; null when unbounded. */
  usage: number | null;
  next: TierId | null;
};

/**
 * Which tier a merchant's real trading volume puts them on.
 *
 * Counts completed orders only: a refunded order is work we did, but billing a
 * merchant for sales that unwound is a fight nobody wants on a demo stage, and
 * the conservative read is the defensible one.
 */
export function tierFor(sales: SalesOrderOut[]): TierUsage {
  const completed = sales.reduce((n, s) => (s.status === 'completed' ? n + 1 : n), 0);
  const ordersPerMonth = Math.round((completed / WINDOW_DAYS) * DAYS_PER_MONTH);

  const index = TIER_LIMITS.findIndex(
    (t) => t.maxOrdersPerMonth === null || ordersPerMonth <= t.maxOrdersPerMonth,
  );
  const current = TIER_LIMITS[index];
  const limit = current.maxOrdersPerMonth;

  return {
    tier: current.id,
    ordersPerMonth,
    limit,
    usage: limit === null ? null : Math.min(1, ordersPerMonth / limit),
    next: TIER_LIMITS[index + 1]?.id ?? null,
  };
}
