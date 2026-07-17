'use client';

// The unified sales view: every order from every aggregator in one feed, plus
// the bank side of the same story (balances and the payouts that actually
// landed). This is the surface the pitch calls "the product".

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { AppShell } from '@/components/app/app-shell';
import { Card, CardHeading, Chip } from '@/components/ui/primitives';
import { QueryBoundary, Skeleton } from '@/components/ui/query-boundary';
import { AreaChart } from '@/components/ui/charts';
import { PlatformBreakdown, platformColor } from '@/components/app/platform-breakdown';
import { IconGrowth, IconWallet } from '@/components/brand-icons';
import { getAccounts, getSales, getTransactions } from '@/lib/api';
import { qk } from '@/lib/query';
import { MERCHANT_NAV } from '@/lib/nav';
import { byPlatform, completedOrderCount, dailyRevenue, totalRevenue } from '@/lib/sales';
import { formatCurrency, formatDate, formatNumber, type Locale } from '@/lib/format';

const ORDERS_SHOWN = 40;

export default function SalesPage() {
  const t = useTranslations('sales');
  const tConnect = useTranslations('connect');
  const tNav = useTranslations('app');
  const locale = useLocale() as Locale;
  const nav = MERCHANT_NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  const [tab, setTab] = useState<'orders' | 'transactions' | 'accounts'>('orders');

  const [salesQ, txnsQ, accountsQ] = useQueries({
    queries: [
      { queryKey: qk.sales(5000), queryFn: () => getSales(5000) },
      { queryKey: qk.transactions(500), queryFn: () => getTransactions(500) },
      { queryKey: qk.accounts, queryFn: getAccounts },
    ],
  });

  const sales = salesQ.data ?? [];
  const platforms = byPlatform(sales);
  const series = dailyRevenue(sales);
  const revenue = totalRevenue(sales);
  const orders = completedOrderCount(sales);

  const platformLabel = (p: string) => {
    try {
      return tConnect(`platforms.${p}`);
    } catch {
      return p;
    }
  };

  const tabs = [
    { id: 'orders' as const, label: t('tabOrders') },
    { id: 'transactions' as const, label: t('tabTransactions') },
    { id: 'accounts' as const, label: t('tabAccounts') },
  ];

  return (
    <AppShell role="merchant" nav={nav}>
      {() => (
        <QueryBoundary
          isLoading={salesQ.isLoading}
          isError={salesQ.isError}
          onRetry={() => salesQ.refetch()}
          skeleton={
            <div className="flex flex-col gap-6">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
                {t('title')}
              </h1>
              <p className="text-body text-body-text-muted">{t('subtitle')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <SummaryTile label={t('revenue90d')} value={formatCurrency(revenue, locale)} />
              <SummaryTile label={t('orders90d')} value={formatNumber(orders, locale)} />
              <SummaryTile
                label={t('platformsConnected')}
                value={formatNumber(platforms.length, locale)}
              />
            </div>

            <Card className="flex flex-col gap-4">
              <CardHeading icon={<IconGrowth className="h-5 w-5" />}>
                {t('trendTitle')}
              </CardHeading>
              <AreaChart points={series} />
              <span className="text-meta text-muted-text">{t('trendHint')}</span>
            </Card>

            <PlatformBreakdown platforms={platforms} />

            {/* Raw feeds */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-1">
                {tabs.map((tb) => (
                  <button
                    key={tb.id}
                    type="button"
                    onClick={() => setTab(tb.id)}
                    className={`rounded-pill px-4 py-2 text-body font-bold transition-colors ${
                      tab === tb.id
                        ? 'bg-accent text-accent-foreground'
                        : 'text-body-text-muted hover:text-accent'
                    }`}
                  >
                    {tb.label}
                  </button>
                ))}
              </div>

              {tab === 'orders' ? (
                <Card className="flex flex-col gap-3">
                  <CardHeading icon={<IconGrowth className="h-5 w-5" />}>
                    {t('recentOrders', { count: ORDERS_SHOWN })}
                  </CardHeading>
                  {sales.length === 0 ? (
                    <span className="text-meta text-muted-text">{t('noOrders')}</span>
                  ) : (
                    <div className="flex flex-col divide-y divide-hairline">
                      {sales.slice(0, ORDERS_SHOWN).map((o) => (
                        <div key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              aria-hidden
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: platformColor(o.platform) }}
                            />
                            <div className="flex flex-col">
                              <span className="text-body text-body-text">
                                <bdi>{platformLabel(o.platform)}</bdi>
                              </span>
                              <span className="font-mono text-meta text-muted-text">
                                {formatDate(o.order_date, locale)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {o.status === 'refunded' ? (
                              <Chip tone="warn">{t('refundedOne')}</Chip>
                            ) : null}
                            <span
                              className={`text-body font-bold ${
                                o.status === 'refunded'
                                  ? 'text-muted-text line-through'
                                  : 'text-body-text'
                              }`}
                            >
                              <bdi>{formatCurrency(o.amount, locale)}</bdi>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ) : tab === 'transactions' ? (
                <Card className="flex flex-col gap-3">
                  <CardHeading icon={<IconWallet className="h-5 w-5" />}>
                    {t('transactionsTitle')}
                  </CardHeading>
                  <p className="text-meta text-muted-text">{t('transactionsHint')}</p>
                  <QueryBoundary
                    isLoading={txnsQ.isLoading}
                    isError={txnsQ.isError}
                    onRetry={() => txnsQ.refetch()}
                    skeleton={<Skeleton className="h-40 w-full" />}
                    isEmpty={(txnsQ.data ?? []).length === 0}
                    emptyTitle={t('noTransactions')}
                  >
                    <div className="flex flex-col divide-y divide-hairline">
                      {(txnsQ.data ?? []).slice(0, ORDERS_SHOWN).map((x) => (
                        <div key={x.id} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="flex flex-col">
                            <span className="text-body text-body-text">
                              <bdi>{x.description}</bdi>
                            </span>
                            <span className="font-mono text-meta text-muted-text">
                              {formatDate(x.date, locale)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {x.category === 'settlement' ? (
                              <Chip tone="info">{t('payout')}</Chip>
                            ) : null}
                            <span
                              className={`text-body font-bold ${
                                x.direction === 'credit' ? 'text-risk-a' : 'text-body-text'
                              }`}
                            >
                              <bdi>
                                {x.direction === 'credit' ? '+' : '-'}
                                {formatCurrency(x.amount, locale)}
                              </bdi>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </QueryBoundary>
                </Card>
              ) : (
                <Card className="flex flex-col gap-3">
                  <CardHeading icon={<IconWallet className="h-5 w-5" />}>
                    {t('accountsTitle')}
                  </CardHeading>
                  <QueryBoundary
                    isLoading={accountsQ.isLoading}
                    isError={accountsQ.isError}
                    onRetry={() => accountsQ.refetch()}
                    skeleton={<Skeleton className="h-24 w-full" />}
                    isEmpty={(accountsQ.data ?? []).length === 0}
                    emptyTitle={t('noAccounts')}
                  >
                    <div className="flex flex-col gap-2">
                      {(accountsQ.data ?? []).map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
                        >
                          <div className="flex flex-col">
                            <span className="text-body font-bold text-body-text capitalize">
                              <bdi>{a.institution.replace(/_synth$/, '')}</bdi>
                            </span>
                            <span className="font-mono text-meta text-muted-text" dir="ltr">
                              {a.iban}
                            </span>
                          </div>
                          <span className="text-body font-bold text-body-text">
                            <bdi>{formatCurrency(a.balance, locale)}</bdi>
                          </span>
                        </div>
                      ))}
                    </div>
                  </QueryBoundary>
                </Card>
              )}
            </div>
          </div>
        </QueryBoundary>
      )}
    </AppShell>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-tile border border-card-border bg-card p-4">
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-text">
        {label}
      </span>
      <span className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
        <bdi>{value}</bdi>
      </span>
    </div>
  );
}
