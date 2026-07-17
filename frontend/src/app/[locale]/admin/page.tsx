'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, FastForward } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppShell } from '@/components/app/app-shell';
import { Button, Card, CardHeading, Chip, StatTile } from '@/components/ui/primitives';
import { IconGrowth, IconRiskShield, IconSME } from '@/components/brand-icons';
import { QueryBoundary, Skeleton } from '@/components/ui/query-boundary';
import { bandColor, Donut, FunnelBars } from '@/components/ui/charts';
import { platformColor } from '@/components/app/platform-breakdown';
import { useToast } from '@/components/providers/toast-provider';
import {
  getAdminAlerts,
  getAdminMerchants,
  getPortfolio,
  monitorTick,
} from '@/lib/api';
import { POLL, qk } from '@/lib/query';
import { ADMIN_NAV } from '@/lib/nav';
import { formatCurrency, formatNumber, type Locale } from '@/lib/format';

const BANDS = ['A', 'B', 'C', 'D'] as const;

export default function AdminPage() {
  const t = useTranslations('admin');
  const tNav = useTranslations('app');
  const tDash = useTranslations('dashboard');
  const locale = useLocale() as Locale;
  const nav = ADMIN_NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;

  const queryClient = useQueryClient();
  const { toastError } = useToast();
  const [simDate, setSimDate] = useState<string | null>(null);

  const [portfolioQ, merchantsQ, alertsQ] = useQueries({
    queries: [
      { queryKey: qk.adminPortfolio, queryFn: getPortfolio, refetchInterval: POLL.ambient },
      { queryKey: qk.adminMerchants, queryFn: getAdminMerchants },
      { queryKey: qk.adminAlerts, queryFn: getAdminAlerts, refetchInterval: POLL.ambient },
    ],
  });

  // Manual day-advance: the presenter's control when the background scheduler
  // is disabled for a demo (MONITOR_ENABLED=false).
  const tickM = useMutation({
    mutationFn: monitorTick,
    onSuccess: (res) => {
      setSimDate(res.sim_date);
      queryClient.invalidateQueries({ queryKey: qk.adminPortfolio });
      queryClient.invalidateQueries({ queryKey: qk.adminAlerts });
      queryClient.invalidateQueries({ queryKey: qk.adminMerchants });
    },
    onError: (e) => toastError(e, t('tickError')),
  });

  const portfolio = portfolioQ.data;
  const merchants = merchantsQ.data ?? [];
  const alerts = alertsQ.data ?? [];

  return (
    <AppShell role="bank_admin" nav={nav}>
      {() => {
        // Guard before building the tree: JSX children are evaluated eagerly,
        // so `portfolio.contracts` would throw while the query is still in
        // flight if this were expressed as a wrapper around the content.
        if (!portfolio) {
          return (
            <QueryBoundary
              isLoading={portfolioQ.isLoading}
              isError={portfolioQ.isError}
              onRetry={() => portfolioQ.refetch()}
              skeleton={
                <div className="flex flex-col gap-6">
                  <Skeleton className="h-8 w-40" />
                  <div className="grid gap-4 sm:grid-cols-4">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>
                  <Skeleton className="h-56 w-full" />
                </div>
              }
            >
              {null}
            </QueryBoundary>
          );
        }

        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-text">{t('subtitle')}</span>
                <h1 className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">{t('title')}</h1>
              </div>
              <div className="flex items-center gap-3">
                {simDate ? (
                  <span className="text-meta text-muted-text">{t('simDate', { date: simDate })}</span>
                ) : null}
                <Button
                  variant="secondary"
                  loading={tickM.isPending}
                  onClick={() => tickM.mutate()}
                >
                  <FastForward aria-hidden className="h-4 w-4" />
                  {t('advanceDay')}
                </Button>
              </div>
            </div>

            {/* Portfolio KPIs: contract book + the underlying trading activity
                that feeds it (summed from the enriched merchant rows). */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatTile label={t('activeContracts')} value={portfolio.contracts.active} />
              <StatTile
                label={t('disbursed')}
                value={formatCurrency(portfolio.contracts.disbursed_total, locale)}
              />
              <StatTile
                label={t('outstanding')}
                value={formatCurrency(portfolio.contracts.outstanding_total, locale)}
              />
              <StatTile
                label={t('portfolioSales')}
                value={formatCurrency(
                  merchants.reduce((s, m) => s + m.sales_volume, 0),
                  locale,
                )}
                hint={t('portfolioSalesHint')}
              />
              <StatTile
                label={t('heldReceivables')}
                value={formatCurrency(
                  merchants.reduce((s, m) => s + m.held_receivables, 0),
                  locale,
                )}
                hint={t('heldReceivablesHint')}
              />
              <StatTile
                label={t('expectedReturn')}
                value={formatCurrency(portfolio.contracts.expected_revenue, locale)}
                hint={t('expectedReturnHint')}
                accent
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Funnel */}
              <Card className="flex flex-col gap-4">
                <CardHeading icon={<IconGrowth className="h-5 w-5" />}>{t('funnelTitle')}</CardHeading>
                <FunnelBars
                  stages={[
                    { label: t('funnel.registered'), value: portfolio.funnel.registered },
                    { label: t('funnel.connected'), value: portfolio.funnel.connected },
                    { label: t('funnel.scored'), value: portfolio.funnel.scored },
                    { label: t('funnel.offered'), value: portfolio.funnel.offered },
                    { label: t('funnel.accepted'), value: portfolio.funnel.accepted },
                  ]}
                />
              </Card>

              {/* Risk distribution */}
              <Card className="flex flex-col gap-4">
                <CardHeading icon={<IconRiskShield className="h-5 w-5" />}>{t('riskTitle')}</CardHeading>
                <div className="flex items-center gap-6">
                  <Donut
                    data={BANDS.map((b) => ({ key: b, value: portfolio.risk_distribution[b] ?? 0 })).filter(
                      (d) => d.value > 0,
                    )}
                  />
                  <div className="flex flex-col gap-2">
                    {BANDS.map((b) => (
                      <div key={b} className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: bandColor(b) }}
                        />
                        <span className="text-meta text-body-text-muted">
                          {t('bandLabel', { band: b })}
                        </span>
                        <span className="text-meta font-bold text-body-text">
                          <bdi>{portfolio.risk_distribution[b] ?? 0}</bdi>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>

            {/* Alerts */}
            <Card className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <CardHeading icon={<IconRiskShield className="h-5 w-5" />}>{t('alertsTitle')}</CardHeading>
                <Chip tone={portfolio.open_alerts > 0 ? 'warn' : 'good'}>
                  {t('openAlerts', { count: portfolio.open_alerts })}
                </Chip>
              </div>
              <div className="flex flex-col gap-2">
                {alerts.length === 0 ? (
                  <span className="text-meta text-muted-text">{t('noAlerts')}</span>
                ) : (
                  alerts.slice(0, 8).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-start justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
                    >
                      <span className="text-body text-body-text">{a.message}</span>
                      <Chip
                        tone={
                          a.severity === 'high'
                            ? 'destructive'
                            : a.severity === 'medium'
                              ? 'warn'
                              : 'info'
                        }
                      >
                        {tDash(`severity.${a.severity}`)}
                      </Chip>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Merchant list — each row opens the underwriter's full file */}
            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <CardHeading icon={<IconSME className="h-5 w-5" />}>
                  {t('merchantsTitle')}
                </CardHeading>
                <p className="text-meta text-muted-text">{t('merchantsHint')}</p>
              </div>
              <div className="flex flex-col divide-y divide-hairline">
                {merchants.map((m) => (
                  <Link
                    key={m.id}
                    href={`/admin/merchants/${m.id}`}
                    locale={locale}
                    className="group flex flex-wrap items-center gap-x-4 gap-y-2 py-3 transition-colors"
                  >
                    {/* Name, sector · city, and the latest risk band */}
                    <div className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-body font-bold text-body-text group-hover:text-accent">
                          <bdi>{m.name}</bdi>
                        </span>
                        {m.risk_band ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              aria-hidden
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: bandColor(m.risk_band[0]) }}
                            />
                            <span className="font-mono text-meta font-bold text-body-text">
                              {t('bandLabel', { band: m.risk_band })}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <span className="text-meta text-muted-text capitalize">
                        <bdi>{m.business_type}</bdi> · <bdi>{m.city}</bdi>
                        {m.score ? (
                          <>
                            {' · '}
                            <bdi>{t('merchantScore', { score: formatNumber(m.score, locale) })}</bdi>
                          </>
                        ) : (
                          <> · {t('notScored')}</>
                        )}
                      </span>
                    </div>

                    {/* Connected aggregators: a dot per channel + count */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center -space-x-1">
                        {m.platforms.map((p) => (
                          <span
                            key={p}
                            aria-hidden
                            title={p}
                            className="h-3 w-3 rounded-full ring-2 ring-card"
                            style={{ backgroundColor: platformColor(p) }}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-meta text-muted-text">
                        {t('channelsCount', { count: m.platform_count })}
                      </span>
                    </div>

                    {/* 90-day sales */}
                    <div className="flex w-32 flex-col items-end">
                      <span className="text-body font-bold text-body-text tabular-nums">
                        <bdi>{formatCurrency(m.sales_volume, locale)}</bdi>
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-text">
                        {t('colVolume')}
                      </span>
                    </div>

                    {/* Held receivables */}
                    <div className="flex w-32 flex-col items-end">
                      <span className="text-body font-bold text-body-text tabular-nums">
                        <bdi>{formatCurrency(m.held_receivables, locale)}</bdi>
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-text">
                        {t('colHeld')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {m.open_alerts > 0 ? (
                        <Chip tone="warn">{t('alertsCount', { count: m.open_alerts })}</Chip>
                      ) : null}
                      <Arrow
                        aria-hidden
                        className="h-4 w-4 text-muted-text group-hover:text-accent"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        );
      }}
    </AppShell>
  );
}
