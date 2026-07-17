'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQueries } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, PlugZap } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppShell } from '@/components/app/app-shell';
import { Card, CardHeading, Chip } from '@/components/ui/primitives';
import { FinCard } from '@/components/brand';
import { IconCashflow, IconGrowth, IconRiskShield } from '@/components/brand-icons';
import { QueryBoundary, Skeleton } from '@/components/ui/query-boundary';
import { AreaChart } from '@/components/ui/charts';
import {
  aggregate,
  getAlerts,
  getAssessments,
  getConnections,
  getContracts,
  getMerchant,
  getSales,
  getSettlements,
} from '@/lib/api';
import { POLL, qk } from '@/lib/query';
import { formatCurrency, formatDate, type Locale } from '@/lib/format';
import type { SalesOrderOut } from '@/lib/types';

const MERCHANT_NAV = [
  { href: '/dashboard', key: 'dashboard' },
  { href: '/financing', key: 'financing' },
  { href: '/settings', key: 'settings' },
];

// Group completed sales into a daily-revenue series for the area chart.
function dailyRevenue(sales: SalesOrderOut[]): { label: string; value: number }[] {
  const byDay = new Map<string, number>();
  for (const s of sales) {
    if (s.status !== 'completed') continue;
    byDay.set(s.order_date, (byDay.get(s.order_date) ?? 0) + s.amount);
  }
  return [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, value]) => ({ label, value }));
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tNav = useTranslations('app');
  const locale = useLocale() as Locale;
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  const nav = MERCHANT_NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  // `aggregate` is a POST but is idempotent/incremental — re-running returns
  // zero new rows and the current held-receivables total (FRONTEND_GUIDE §6.3),
  // which is the hero number here. Settlements/contracts poll because the
  // monitoring agent moves them on its own.
  const [
    merchantQ,
    aggregateQ,
    salesQ,
    settlementsQ,
    contractsQ,
    assessmentsQ,
    alertsQ,
    connectionsQ,
  ] = useQueries({
    queries: [
      { queryKey: qk.merchant, queryFn: getMerchant },
      { queryKey: qk.aggregate, queryFn: aggregate },
      { queryKey: qk.sales(5000), queryFn: () => getSales(5000) },
      { queryKey: qk.settlements, queryFn: getSettlements, refetchInterval: POLL.ambient },
      { queryKey: qk.contracts, queryFn: getContracts, refetchInterval: POLL.ambient },
      { queryKey: qk.assessments, queryFn: getAssessments },
      { queryKey: qk.alerts, queryFn: getAlerts, refetchInterval: POLL.ambient },
      { queryKey: qk.connections, queryFn: getConnections },
    ],
  });

  const isLoading =
    merchantQ.isLoading || aggregateQ.isLoading || salesQ.isLoading || connectionsQ.isLoading;
  const isError = merchantQ.isError || aggregateQ.isError;
  const retry = () => {
    merchantQ.refetch();
    aggregateQ.refetch();
    salesQ.refetch();
    connectionsQ.refetch();
  };

  // A merchant who registered but never finished onboarding has no active
  // source. Everything below (receivables, revenue, settlements) would render
  // as zeroes and read like a broken dashboard rather than an unfinished setup.
  const hasActiveConnection = (connectionsQ.data ?? []).some((c) => c.status === 'active');

  const merchant = merchantQ.data;
  const held = aggregateQ.data?.held_receivables_total ?? null;
  const activeContract = contractsQ.data?.find((c) => c.status === 'active');
  const assessment = assessmentsQ.data?.[0];
  const alerts = alertsQ.data ?? [];
  const pending = (settlementsQ.data ?? []).filter((s) => s.status === 'pending');
  const revenueSeries = dailyRevenue(salesQ.data ?? []);

  return (
    <AppShell role="merchant" nav={nav}>
      {() => (
        <QueryBoundary
          isLoading={isLoading}
          isError={isError}
          onRetry={retry}
          skeleton={
            <div className="flex flex-col gap-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-36 w-full" />
              <div className="grid gap-4 sm:grid-cols-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-56 w-full" />
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-text">{t('greeting')}</span>
              <h1 className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
                <bdi>{merchant?.name}</bdi>
              </h1>
            </div>

            {!hasActiveConnection ? (
              <Card className="flex flex-col items-center gap-5 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-pill bg-accent/10">
                  <PlugZap aria-hidden className="h-8 w-8 text-accent" />
                </div>
                <div className="flex max-w-md flex-col gap-2">
                  <h2 className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
                    {t('onboardTitle')}
                  </h2>
                  <p className="text-body text-body-text-muted">{t('onboardBody')}</p>
                </div>
                <Link
                  href="/connect"
                  locale={locale}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-accent px-6 text-body font-bold text-accent-foreground transition-opacity hover:opacity-90"
                >
                  {t('onboardCta')}
                  <Arrow aria-hidden className="h-4 w-4" />
                </Link>
              </Card>
            ) : (
              <>
            {/* Hero: held receivables - the signature financing card */}
            <FinCard
              badge={t('heldBadge')}
              amount={formatCurrency(held, locale)}
              rows={[
                {
                  label: t('activeOutstanding'),
                  value: activeContract ? formatCurrency(activeContract.outstanding, locale) : '-',
                },
                {
                  label: t('latestScore'),
                  value: assessment ? `${assessment.score} · ${assessment.risk_band}` : '-',
                },
                { label: t('pendingSettlements'), value: pending.length },
              ]}
              footer={
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="max-w-xs text-[13px] text-brand-cream/60">{t('heldHint')}</span>
                  <Link
                    href="/financing"
                    locale={locale}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-accent px-6 font-display text-body font-bold text-accent-foreground shadow-[0_12px_24px_-14px_rgba(195,107,78,0.9)] transition-transform hover:-translate-y-0.5"
                  >
                    {t('getFinancing')}
                    <Arrow aria-hidden className="h-4 w-4" />
                  </Link>
                </div>
              }
            />

            {/* Revenue chart */}
            <Card className="flex flex-col gap-4">
              <CardHeading icon={<IconGrowth className="h-5 w-5" />}>{t('revenueTitle')}</CardHeading>
              <AreaChart points={revenueSeries} />
              <span className="text-meta text-muted-text">{t('revenueHint')}</span>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Settlements */}
              <Card className="flex flex-col gap-4">
                <CardHeading icon={<IconCashflow className="h-5 w-5" />}>{t('upcomingSettlements')}</CardHeading>
                <div className="flex flex-col gap-2">
                  {pending.slice(0, 6).map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-tile border border-hairline px-3 py-2.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-body font-bold text-body-text capitalize">
                          <bdi>{s.platform}</bdi>
                        </span>
                        <span className="text-meta text-muted-text">
                          {formatDate(s.expected_date, locale)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {s.delayed ? <Chip tone="warn">{t('delayed')}</Chip> : null}
                        <span className="text-body font-bold text-body-text">
                          <bdi>{formatCurrency(s.amount, locale)}</bdi>
                        </span>
                      </div>
                    </div>
                  ))}
                  {pending.length === 0 ? (
                    <span className="text-meta text-muted-text">{t('noSettlements')}</span>
                  ) : null}
                </div>
              </Card>

              {/* Alerts */}
              <Card className="flex flex-col gap-4">
                <CardHeading icon={<IconRiskShield className="h-5 w-5" />}>{t('alertsTitle')}</CardHeading>
                <div className="flex flex-col gap-2">
                  {alerts.length === 0 ? (
                    <span className="text-meta text-muted-text">{t('noAlerts')}</span>
                  ) : (
                    alerts.slice(0, 5).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-start justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
                      >
                        <span className="text-body text-body-text">{a.message}</span>
                        <Chip tone={a.severity === 'high' ? 'destructive' : a.severity === 'medium' ? 'warn' : 'info'}>
                          {t(`severity.${a.severity}`)}
                        </Chip>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
              </>
            )}
          </div>
        </QueryBoundary>
      )}
    </AppShell>
  );
}
