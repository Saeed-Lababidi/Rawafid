// Shaping the raw sales feed into the views the product promises.
//
// The unified-view claim ("every order from every platform, merged into one
// live feed") is the whole pitch, so these groupings are the product, not a
// convenience. They are presentation-only: the backend owns every figure, and
// nothing here derives a credit, fee, or financing number — only sums and
// counts of rows the server already returned.

import type { SalesOrderOut, TransactionOut } from './types';

export type PlatformSummary = {
  platform: string;
  revenue: number;
  orders: number;
  refunded: number;
  /** Share of total completed revenue, 0..1. */
  share: number;
};

/**
 * Per-platform revenue/order rollup, biggest platform first.
 *
 * Refunded orders are counted separately rather than netted off: the engine
 * treats refund rate as its own risk factor, so hiding them inside a revenue
 * number would misrepresent what the merchant is being scored on.
 */
export function byPlatform(sales: SalesOrderOut[]): PlatformSummary[] {
  const acc = new Map<string, { revenue: number; orders: number; refunded: number }>();

  for (const s of sales) {
    const row = acc.get(s.platform) ?? { revenue: 0, orders: 0, refunded: 0 };
    if (s.status === 'refunded') {
      row.refunded += 1;
    } else {
      row.revenue += s.amount;
      row.orders += 1;
    }
    acc.set(s.platform, row);
  }

  const total = [...acc.values()].reduce((sum, r) => sum + r.revenue, 0);

  return [...acc.entries()]
    .map(([platform, r]) => ({
      platform,
      revenue: r.revenue,
      orders: r.orders,
      refunded: r.refunded,
      share: total > 0 ? r.revenue / total : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

/** Total completed revenue across every connected platform. */
export function totalRevenue(sales: SalesOrderOut[]): number {
  return sales.reduce((sum, s) => (s.status === 'completed' ? sum + s.amount : sum), 0);
}

export function completedOrderCount(sales: SalesOrderOut[]): number {
  return sales.reduce((n, s) => (s.status === 'completed' ? n + 1 : n), 0);
}

/** Daily completed-revenue series for the area chart, oldest first. */
export function dailyRevenue(sales: SalesOrderOut[]): { label: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const s of sales) {
    if (s.status !== 'completed') continue;
    byDay.set(s.order_date, (byDay.get(s.order_date) ?? 0) + s.amount);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value }));
}

/**
 * Platform payouts landing in the bank account. `category: "settlement"` rows
 * are what the aggregators actually released (FRONTEND_GUIDE §6.4).
 */
export function settlementTransactions(txns: TransactionOut[]): TransactionOut[] {
  return txns.filter((t) => t.category === 'settlement');
}
