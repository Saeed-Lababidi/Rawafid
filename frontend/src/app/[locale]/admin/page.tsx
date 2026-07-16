'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FastForward } from 'lucide-react';
import { AppShell } from '@/components/app/app-shell';
import { Button, Card, Chip, Spinner, StatTile } from '@/components/ui/primitives';
import { bandColor, Donut, FunnelBars } from '@/components/ui/charts';
import {
  getAdminAlerts,
  getAdminMerchants,
  getPortfolio,
  monitorTick,
} from '@/lib/api';
import { formatCurrency, type Locale } from '@/lib/format';
import type { MerchantOut, PortfolioOut, RiskAlertOut } from '@/lib/types';

const NAV = [{ href: '/admin', key: 'portfolio' }];
const BANDS = ['A', 'B', 'C', 'D'] as const;

export default function AdminPage() {
  const t = useTranslations('admin');
  const tNav = useTranslations('app');
  const tDash = useTranslations('dashboard');
  const locale = useLocale() as Locale;
  const nav = NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  const [portfolio, setPortfolio] = useState<PortfolioOut | null>(null);
  const [merchants, setMerchants] = useState<MerchantOut[]>([]);
  const [alerts, setAlerts] = useState<RiskAlertOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticking, setTicking] = useState(false);
  const [simDate, setSimDate] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [p, m, a] = await Promise.all([getPortfolio(), getAdminMerchants(), getAdminAlerts()]);
    setPortfolio(p);
    setMerchants(m);
    setAlerts(a);
  }, []);

  useEffect(() => {
    refresh()
      .then(() => setLoading(false))
      .catch(() => setLoading(false));
    const id = setInterval(() => {
      getPortfolio().then(setPortfolio).catch(() => {});
      getAdminAlerts().then(setAlerts).catch(() => {});
    }, 10_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function onTick() {
    setTicking(true);
    try {
      const res = await monitorTick();
      setSimDate(res.sim_date);
      await refresh();
    } catch {
      /* ignore */
    }
    setTicking(false);
  }

  return (
    <AppShell role="bank_admin" nav={nav}>
      {() =>
        loading || !portfolio ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-meta text-muted-text">{t('subtitle')}</span>
                <h1 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">{t('title')}</h1>
              </div>
              <div className="flex items-center gap-3">
                {simDate ? (
                  <span className="text-meta text-muted-text">{t('simDate', { date: simDate })}</span>
                ) : null}
                <Button variant="secondary" loading={ticking} onClick={onTick}>
                  <FastForward aria-hidden className="h-4 w-4" />
                  {t('advanceDay')}
                </Button>
              </div>
            </div>

            {/* Contract KPIs */}
            <div className="grid gap-4 sm:grid-cols-4">
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
                label={t('expectedRevenue')}
                value={formatCurrency(portfolio.contracts.expected_revenue, locale)}
                accent
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Funnel */}
              <Card className="flex flex-col gap-4">
                <h2 className="text-body font-bold text-body-text">{t('funnelTitle')}</h2>
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
                <h2 className="text-body font-bold text-body-text">{t('riskTitle')}</h2>
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
                <h2 className="text-body font-bold text-body-text">{t('alertsTitle')}</h2>
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

            {/* Merchant list */}
            <Card className="flex flex-col gap-4">
              <h2 className="text-body font-bold text-body-text">{t('merchantsTitle')}</h2>
              <div className="flex flex-col divide-y divide-hairline">
                {merchants.map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2.5">
                    <div className="flex flex-col">
                      <span className="text-body font-bold text-body-text"><bdi>{m.name}</bdi></span>
                      <span className="text-meta text-muted-text capitalize">
                        <bdi>{m.business_type}</bdi> · <bdi>{m.city}</bdi>
                      </span>
                    </div>
                    <Chip tone="good">{t('verified')}</Chip>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      }
    </AppShell>
  );
}
