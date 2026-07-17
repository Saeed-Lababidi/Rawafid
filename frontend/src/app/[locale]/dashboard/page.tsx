'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppShell } from '@/components/app/app-shell';
import { Card, CardHeading, Chip, Spinner } from '@/components/ui/primitives';
import { FinCard } from '@/components/brand';
import { IconCashflow, IconGrowth, IconRiskShield } from '@/components/brand-icons';
import { AreaChart } from '@/components/ui/charts';
import {
  aggregate,
  getAlerts,
  getAssessments,
  getContracts,
  getMerchant,
  getSales,
  getSettlements,
} from '@/lib/api';
import { formatCurrency, formatDate, type Locale } from '@/lib/format';
import type {
  AssessmentOut,
  ContractOut,
  MerchantOut,
  RiskAlertOut,
  SalesOrderOut,
  SettlementOut,
} from '@/lib/types';

const MERCHANT_NAV = [
  { href: '/dashboard', key: 'dashboard' },
  { href: '/financing', key: 'financing' },
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

  const [merchant, setMerchant] = useState<MerchantOut | null>(null);
  const [held, setHeld] = useState<number | null>(null);
  const [sales, setSales] = useState<SalesOrderOut[]>([]);
  const [settlements, setSettlements] = useState<SettlementOut[]>([]);
  const [contracts, setContracts] = useState<ContractOut[]>([]);
  const [assessment, setAssessment] = useState<AssessmentOut | null>(null);
  const [alerts, setAlerts] = useState<RiskAlertOut[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [m, agg, s, st, c, a, al] = await Promise.all([
        getMerchant(),
        aggregate(),
        getSales(),
        getSettlements(),
        getContracts(),
        getAssessments(),
        getAlerts(),
      ]);
      if (!alive) return;
      setMerchant(m);
      setHeld(agg.held_receivables_total);
      setSales(s);
      setSettlements(st);
      setContracts(c);
      setAssessment(a[0] ?? null);
      setAlerts(al);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
    const id = setInterval(() => {
      getSettlements().then((st) => alive && setSettlements(st)).catch(() => {});
      getContracts().then((c) => alive && setContracts(c)).catch(() => {});
    }, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const activeContract = contracts.find((c) => c.status === 'active');
  const pending = settlements.filter((s) => s.status === 'pending');
  const revenueSeries = dailyRevenue(sales);

  return (
    <AppShell role="merchant" nav={nav}>
      {() =>
        loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-text">{t('greeting')}</span>
              <h1 className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
                <bdi>{merchant?.name}</bdi>
              </h1>
            </div>

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
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-pill bg-accent px-6 font-display text-body font-bold text-accent-foreground shadow-[0_12px_24px_-14px_rgba(195,107,78,0.9)]"
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
          </div>
        )
      }
    </AppShell>
  );
}
