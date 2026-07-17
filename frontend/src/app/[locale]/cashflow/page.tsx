'use client';

// Cashflow: what each aggregator is holding, when it releases, and the alerts
// raised against it. This is the "your earnings sit locked for weeks" problem
// rendered as a screen.

import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/app/app-shell';
import { Button, Card, CardHeading, Chip } from '@/components/ui/primitives';
import { QueryBoundary, Skeleton } from '@/components/ui/query-boundary';
import { platformColor } from '@/components/app/platform-breakdown';
import { IconCashflow, IconClock48, IconRiskShield } from '@/components/brand-icons';
import { useToast } from '@/components/providers/toast-provider';
import { getAlerts, getSettlements, receiveSettlement } from '@/lib/api';
import { POLL, qk } from '@/lib/query';
import { MERCHANT_NAV } from '@/lib/nav';
import { formatCurrency, formatDate, type Locale } from '@/lib/format';
import type { AlertSeverity, SettlementOut } from '@/lib/types';

const SEVERITY_TONE: Record<AlertSeverity, 'destructive' | 'warn' | 'info'> = {
  high: 'destructive',
  medium: 'warn',
  low: 'info',
};

export default function CashflowPage() {
  const t = useTranslations('cashflow');
  const tDash = useTranslations('dashboard');
  const tConnect = useTranslations('connect');
  const tNav = useTranslations('app');
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const { toast, toastError } = useToast();

  const nav = MERCHANT_NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  const [settlementsQ, alertsQ] = useQueries({
    queries: [
      { queryKey: qk.settlements, queryFn: getSettlements, refetchInterval: POLL.ambient },
      { queryKey: qk.alerts, queryFn: getAlerts, refetchInterval: POLL.ambient },
    ],
  });

  // Forces a pending payout to land now. Any repayment due against it is
  // applied server-side immediately, so the contract balance moves too.
  const receiveM = useMutation({
    mutationFn: (id: string) => receiveSettlement(id),
    onSuccess: (s) => {
      toast(t('receivedToast', { amount: formatCurrency(s.amount, locale) }), 'success');
      queryClient.invalidateQueries({ queryKey: qk.settlements });
      queryClient.invalidateQueries({ queryKey: qk.contracts });
      queryClient.invalidateQueries({ queryKey: qk.aggregate });
    },
    onError: (e) => toastError(e, t('error')),
  });

  const settlements = settlementsQ.data ?? [];
  const pending = settlements.filter((s) => s.status === 'pending');
  const received = settlements.filter((s) => s.status === 'received');
  const alerts = alertsQ.data ?? [];

  const heldTotal = pending.reduce((sum, s) => sum + s.amount, 0);

  const platformLabel = (p: string) => {
    try {
      return tConnect(`platforms.${p}`);
    } catch {
      return p;
    }
  };

  return (
    <AppShell role="merchant" nav={nav}>
      {() => (
        <QueryBoundary
          isLoading={settlementsQ.isLoading}
          isError={settlementsQ.isError}
          onRetry={() => settlementsQ.refetch()}
          skeleton={
            <div className="flex flex-col gap-6">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-56 w-full" />
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
              <Tile label={t('heldNow')} value={formatCurrency(heldTotal, locale)} accent />
              <Tile label={t('pendingCount')} value={String(pending.length)} />
              <Tile label={t('receivedCount')} value={String(received.length)} />
            </div>

            {/* Pending payouts */}
            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <CardHeading icon={<IconClock48 className="h-5 w-5" />}>
                  {t('pendingTitle')}
                </CardHeading>
                <p className="text-meta text-muted-text">{t('pendingHint')}</p>
              </div>

              {pending.length === 0 ? (
                <span className="text-meta text-muted-text">{t('noPending')}</span>
              ) : (
                <div className="flex flex-col gap-2">
                  {pending.map((s) => (
                    <SettlementRow
                      key={s.id}
                      settlement={s}
                      locale={locale}
                      label={platformLabel(s.platform)}
                      delayedLabel={t('delayed')}
                      expectedLabel={t('expected')}
                      action={
                        <Button
                          variant="secondary"
                          loading={receiveM.isPending && receiveM.variables === s.id}
                          disabled={receiveM.isPending}
                          onClick={() => receiveM.mutate(s.id)}
                        >
                          {t('receiveNow')}
                        </Button>
                      }
                    />
                  ))}
                </div>
              )}
            </Card>

            {/* Alerts */}
            <Card className="flex flex-col gap-4">
              <CardHeading icon={<IconRiskShield className="h-5 w-5" />}>
                {t('alertsTitle')}
              </CardHeading>
              {alerts.length === 0 ? (
                <span className="text-meta text-muted-text">{tDash('noAlerts')}</span>
              ) : (
                <div className="flex flex-col gap-2">
                  {alerts.map((a) => (
                    <div
                      key={a.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-body text-body-text">{a.message}</span>
                        <span className="font-mono text-meta text-muted-text">
                          {t(`alertType.${a.type}`)} · {formatDate(a.created_at, locale)}
                        </span>
                      </div>
                      <Chip tone={SEVERITY_TONE[a.severity]}>
                        {tDash(`severity.${a.severity}`)}
                      </Chip>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Received history */}
            {received.length > 0 ? (
              <Card className="flex flex-col gap-4">
                <CardHeading icon={<IconCashflow className="h-5 w-5" />}>
                  {t('receivedTitle')}
                </CardHeading>
                <div className="flex flex-col gap-2">
                  {received.slice(0, 10).map((s) => (
                    <SettlementRow
                      key={s.id}
                      settlement={s}
                      locale={locale}
                      label={platformLabel(s.platform)}
                      delayedLabel={t('delayed')}
                      expectedLabel={t('receivedOn')}
                      action={<Chip tone="good">{t('receivedChip')}</Chip>}
                    />
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </QueryBoundary>
      )}
    </AppShell>
  );
}

function SettlementRow({
  settlement: s,
  locale,
  label,
  delayedLabel,
  expectedLabel,
  action,
}: {
  settlement: SettlementOut;
  locale: Locale;
  label: string;
  delayedLabel: string;
  expectedLabel: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: platformColor(s.platform) }}
        />
        <div className="flex flex-col">
          <span className="text-body font-bold text-body-text">
            <bdi>{label}</bdi>
          </span>
          <span className="font-mono text-meta text-muted-text">
            {expectedLabel} {formatDate(s.received_date ?? s.expected_date, locale)}
          </span>
        </div>
        {s.delayed ? <Chip tone="warn">{delayedLabel}</Chip> : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-body font-bold text-body-text">
          <bdi>{formatCurrency(s.amount, locale)}</bdi>
        </span>
        {action}
      </div>
    </div>
  );
}

function Tile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-tile border p-4 ${
        accent ? 'border-accent/30 bg-accent/5' : 'border-card-border bg-card'
      }`}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-text">
        {label}
      </span>
      <span
        className={`font-display text-h1 font-bold ${
          accent ? 'text-accent' : 'text-brand-navy dark:text-brand-cream'
        }`}
      >
        <bdi>{value}</bdi>
      </span>
    </div>
  );
}
