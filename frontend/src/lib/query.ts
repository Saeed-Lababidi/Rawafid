'use client';

// Query keys + shared polling cadences. Every screen fetches through React
// Query so the cache dedupes concurrent readers, survives navigation, and
// refetches on window focus (useful when a demo laptop is left idle).
//
// The monitoring agent mutates server state on its own — one tick = one
// simulated day (FRONTEND_GUIDE §9) — so live screens poll rather than assume
// their cache is fresh.

export const POLL = {
  /** Contract outstanding / schedule — the "repays itself" beat. */
  live: 8_000,
  /** Dashboard-level aggregates and alerts. */
  ambient: 10_000,
} as const;

export const qk = {
  me: ['me'] as const,
  merchant: ['merchant'] as const,
  aggregate: ['aggregate'] as const,
  connections: ['connections'] as const,
  accounts: ['accounts'] as const,
  transactions: (limit: number) => ['transactions', limit] as const,
  sales: (limit: number) => ['sales', limit] as const,
  settlements: ['settlements'] as const,
  assessments: ['assessments'] as const,
  assessment: (id: string) => ['assessment', id] as const,
  offers: ['offers'] as const,
  contracts: ['contracts'] as const,
  contract: (id: string) => ['contract', id] as const,
  repayments: (id: string) => ['repayments', id] as const,
  alerts: ['alerts'] as const,
  adminPortfolio: ['admin', 'portfolio'] as const,
  adminMerchants: ['admin', 'merchants'] as const,
  adminMerchant: (id: string) => ['admin', 'merchant', id] as const,
  adminAssessment: (id: string) => ['admin', 'assessment', id] as const,
  adminAlerts: ['admin', 'alerts'] as const,
} as const;
