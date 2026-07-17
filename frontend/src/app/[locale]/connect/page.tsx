'use client';

// Open-banking consent wizard.
//
// The provider is a deterministic mock, so step 2 (the bank's own authorize
// page) doesn't really exist — any non-empty auth_code is accepted. We still
// render a consent screen, because the consent moment IS the product: it's
// where the merchant sees what they're handing over and agrees to it. Skipping
// straight from "pick a bank" to "connected" would hide the one interaction
// open banking is actually about.

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Landmark, ShieldCheck, Store, TriangleAlert } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { AppShell } from '@/components/app/app-shell';
import { Button, Card, Chip } from '@/components/ui/primitives';
import { QueryBoundary, Skeleton } from '@/components/ui/query-boundary';
import { useToast } from '@/components/providers/toast-provider';
import {
  aggregate,
  completeConsent,
  getConnections,
  startConsent,
} from '@/lib/api';
import { qk } from '@/lib/query';
import { MERCHANT_NAV } from '@/lib/nav';
import { formatCurrency, formatNumber, type Locale } from '@/lib/format';
import type { AggregateResponse, ConsentStartResponse } from '@/lib/types';

// From app/providers/base.py — the backend rejects anything else with a 400.
const BANKS = ['alinma', 'alrajhi_synth', 'riyad_synth'] as const;
const PLATFORMS = ['salla', 'zid', 'jahez', 'foodics'] as const;

type Stage = 'bank' | 'sales' | 'aggregate' | 'done';

export default function ConnectPage() {
  const t = useTranslations('connect');
  const tNav = useTranslations('app');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toastError } = useToast();

  const nav = MERCHANT_NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  const connectionsQ = useQuery({ queryKey: qk.connections, queryFn: getConnections });
  const connections = connectionsQ.data ?? [];
  const activeBank = connections.find((c) => c.type === 'bank' && c.status === 'active');
  const activeSales = connections.filter((c) => c.type === 'sales' && c.status === 'active');

  // Pending consent — the institution whose consent screen is showing.
  const [pending, setPending] = useState<
    (ConsentStartResponse & { kind: 'bank' | 'sales' }) | null
  >(null);
  const [aggregateResult, setAggregateResult] = useState<AggregateResponse | null>(null);

  // Wizard position is derived from what's actually connected, so a refresh or
  // a half-finished run resumes where the merchant left off.
  const stage: Stage = aggregateResult
    ? 'done'
    : !activeBank
      ? 'bank'
      : activeSales.length === 0
        ? 'sales'
        : 'aggregate';

  const startM = useMutation({
    mutationFn: ({ kind, institution }: { kind: 'bank' | 'sales'; institution: string }) =>
      startConsent(kind, institution).then((r) => ({ ...r, kind })),
    onSuccess: (r) => setPending(r),
    onError: (e) => toastError(e, t('error')),
  });

  const completeM = useMutation({
    mutationFn: (session_id: string) => completeConsent(session_id, 'demo'),
    onSuccess: () => {
      setPending(null);
      queryClient.invalidateQueries({ queryKey: qk.connections });
    },
    onError: (e) => toastError(e, t('error')),
  });

  const aggregateM = useMutation({
    mutationFn: aggregate,
    onSuccess: (res) => {
      setAggregateResult(res);
      // The dashboard's hero number comes from this call — make sure it re-reads.
      queryClient.invalidateQueries({ queryKey: qk.aggregate });
      queryClient.invalidateQueries({ queryKey: qk.settlements });
      queryClient.invalidateQueries({ queryKey: qk.sales(5000) });
    },
    onError: (e) => toastError(e, t('error')),
  });

  const busy = startM.isPending || completeM.isPending;

  // A connected platform can legitimately return no orders: the mock provider
  // only generates data for the platforms in a merchant's own synthetic
  // profile, so a self-registered merchant who picks a platform it didn't
  // assign gets an empty pull. Aggregation still reports success, and the
  // failure would otherwise only surface two screens later as "no aggregated
  // sales data" on the assessment. Say so here, where it can be acted on.
  const aggregatedNothing =
    aggregateResult !== null &&
    aggregateResult.sales_orders === 0 &&
    aggregateResult.held_receivables_total === 0;

  const unconnectedPlatforms = PLATFORMS.filter(
    (p) => !activeSales.some((c) => c.institution === p),
  );

  return (
    <AppShell role="merchant" nav={nav}>
      {() => (
        <QueryBoundary
          isLoading={connectionsQ.isLoading}
          isError={connectionsQ.isError}
          onRetry={() => connectionsQ.refetch()}
          skeleton={
            <div className="flex flex-col gap-6">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-40 w-full" />
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h1 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">
                {t('title')}
              </h1>
              <p className="text-body text-body-text-muted">{t('subtitle')}</p>
            </div>

            <StepIndicator stage={stage} />

            {/* Consent screen takes over whenever a handshake is mid-flight. */}
            {pending ? (
              <ConsentScreen
                institution={pending.institution}
                kind={pending.kind}
                busy={completeM.isPending}
                onApprove={() => completeM.mutate(pending.session_id)}
                onCancel={() => setPending(null)}
              />
            ) : stage === 'bank' ? (
              <InstitutionPicker
                title={t('pickBank')}
                hint={t('pickBankHint')}
                items={BANKS.map((b) => ({ id: b, label: t(`banks.${b}`) }))}
                icon={Landmark}
                busy={busy}
                onPick={(institution) => startM.mutate({ kind: 'bank', institution })}
              />
            ) : stage === 'sales' ? (
              <InstitutionPicker
                title={t('pickPlatform')}
                hint={t('pickPlatformHint')}
                items={PLATFORMS.map((p) => ({ id: p, label: t(`platforms.${p}`) }))}
                icon={Store}
                busy={busy}
                onPick={(institution) => startM.mutate({ kind: 'sales', institution })}
              />
            ) : stage === 'aggregate' ? (
              <Card className="flex flex-col items-center gap-5 py-10 text-center">
                <Building2 aria-hidden className="h-10 w-10 text-accent" />
                <div className="flex max-w-md flex-col gap-2">
                  <h2 className="text-body font-bold text-body-text">{t('aggregateTitle')}</h2>
                  <p className="text-body text-body-text-muted">{t('aggregateBody')}</p>
                </div>
                <Button loading={aggregateM.isPending} onClick={() => aggregateM.mutate()}>
                  {t('aggregateCta')}
                </Button>
              </Card>
            ) : aggregatedNothing ? (
              <Card className="flex flex-col items-center gap-5 py-10 text-center">
                <TriangleAlert aria-hidden className="h-10 w-10 text-chip-warn-text" />
                <div className="flex max-w-md flex-col gap-2">
                  <h2 className="text-body font-bold text-body-text">{t('emptyPullTitle')}</h2>
                  <p className="text-body text-body-text-muted">{t('emptyPullBody')}</p>
                </div>
                {unconnectedPlatforms.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {unconnectedPlatforms.map((p) => (
                      <Button
                        key={p}
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          setAggregateResult(null);
                          startM.mutate({ kind: 'sales', institution: p });
                        }}
                      >
                        {t(`platforms.${p}`)}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <span className="text-meta text-muted-text">{t('emptyPullExhausted')}</span>
                )}
              </Card>
            ) : aggregateResult ? (
              <AggregateResult
                result={aggregateResult}
                locale={locale}
                onContinue={() => router.push('/financing')}
              />
            ) : null}

            {/* What's connected so far */}
            {connections.length > 0 ? (
              <Card className="flex flex-col gap-3">
                <h2 className="text-body font-bold text-body-text">{t('connectedTitle')}</h2>
                <div className="flex flex-col gap-2">
                  {connections.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-tile border border-hairline px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        {c.type === 'bank' ? (
                          <Landmark aria-hidden className="h-4 w-4 text-muted-text" />
                        ) : (
                          <Store aria-hidden className="h-4 w-4 text-muted-text" />
                        )}
                        <span className="text-body text-body-text">
                          <bdi>
                            {c.type === 'bank'
                              ? t(`banks.${c.institution}`)
                              : t(`platforms.${c.institution}`)}
                          </bdi>
                        </span>
                      </div>
                      <Chip
                        tone={
                          c.status === 'active'
                            ? 'good'
                            : c.status === 'revoked'
                              ? 'destructive'
                              : 'neutral'
                        }
                      >
                        {t(`status.${c.status}`)}
                      </Chip>
                    </div>
                  ))}
                </div>

                {/* Once a bank + one platform are live, more platforms are
                    optional — let the merchant add or move on. */}
                {stage === 'aggregate' || stage === 'done' ? (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    className="self-start"
                    onClick={() => {
                      const next = PLATFORMS.find(
                        (p) => !activeSales.some((c) => c.institution === p),
                      );
                      if (next) startM.mutate({ kind: 'sales', institution: next });
                    }}
                  >
                    {t('addPlatform')}
                  </Button>
                ) : null}
              </Card>
            ) : null}
          </div>
        </QueryBoundary>
      )}
    </AppShell>
  );
}

function StepIndicator({ stage }: { stage: Stage }) {
  const t = useTranslations('connect');
  const steps: { key: Stage; label: string }[] = [
    { key: 'bank', label: t('stepBank') },
    { key: 'sales', label: t('stepSales') },
    { key: 'aggregate', label: t('stepAggregate') },
  ];
  const order: Stage[] = ['bank', 'sales', 'aggregate', 'done'];
  const currentIndex = order.indexOf(stage);

  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((s, i) => {
        const done = currentIndex > i;
        const active = currentIndex === i;
        return (
          <li key={s.key} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-pill text-meta font-bold ${
                done
                  ? 'bg-risk-a text-accent-foreground'
                  : active
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-hairline text-muted-text'
              }`}
            >
              {done ? <Check aria-hidden className="h-3.5 w-3.5" /> : <bdi>{i + 1}</bdi>}
            </span>
            <span
              className={`text-meta ${active ? 'font-bold text-body-text' : 'text-muted-text'}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 ? <span className="text-muted-text">·</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function InstitutionPicker({
  title,
  hint,
  items,
  icon: Icon,
  busy,
  onPick,
}: {
  title: string;
  hint: string;
  items: { id: string; label: string }[];
  icon: typeof Landmark;
  busy: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-bold text-body-text">{title}</h2>
        <p className="text-meta text-muted-text">{hint}</p>
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            onClick={() => onPick(item.id)}
            className="flex items-center gap-3 rounded-tile border border-hairline-strong bg-card px-4 py-4 text-start transition-colors hover:border-accent disabled:opacity-50"
          >
            <Icon aria-hidden className="h-5 w-5 shrink-0 text-accent" />
            <span className="text-body font-bold text-body-text">
              <bdi>{item.label}</bdi>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

/**
 * Simulated authorize step. The mock provider accepts any auth_code, so this
 * screen is theatre — but it's honest theatre: it states exactly which scopes
 * the backend will read, and the disclaimer keeps the demo framing explicit.
 */
function ConsentScreen({
  institution,
  kind,
  busy,
  onApprove,
  onCancel,
}: {
  institution: string;
  kind: 'bank' | 'sales';
  busy: boolean;
  onApprove: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('connect');
  const label = kind === 'bank' ? t(`banks.${institution}`) : t(`platforms.${institution}`);
  const scopes = kind === 'bank' ? ['scopeAccounts', 'scopeTransactions'] : ['scopeOrders', 'scopeSettlements'];

  return (
    <Card className="flex flex-col gap-5 border-accent/30">
      <div className="flex items-center gap-3">
        <ShieldCheck aria-hidden className="h-6 w-6 text-accent" />
        <div className="flex flex-col">
          <h2 className="text-body font-bold text-body-text">
            {t('consentTitle', { institution: label })}
          </h2>
          <span className="text-meta text-muted-text">{t('consentSubtitle')}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-tile bg-page-bg px-4 py-3">
        <span className="text-meta font-bold text-body-text">{t('consentGrants')}</span>
        <ul className="flex flex-col gap-1.5">
          {scopes.map((s) => (
            <li key={s} className="flex items-start gap-2 text-meta text-body-text-muted">
              <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-a" />
              <span>{t(s)}</span>
            </li>
          ))}
          <li className="flex items-start gap-2 text-meta text-body-text-muted">
            <Check aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-risk-a" />
            <span>{t('scopeRevoke')}</span>
          </li>
        </ul>
      </div>

      <p className="text-meta text-muted-text">{t('consentDemoNote')}</p>

      <div className="flex flex-wrap gap-3">
        <Button loading={busy} onClick={onApprove}>
          {t('consentApprove')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>
          {t('consentCancel')}
        </Button>
      </div>
    </Card>
  );
}

function AggregateResult({
  result,
  locale,
  onContinue,
}: {
  result: AggregateResponse;
  locale: Locale;
  onContinue: () => void;
}) {
  const t = useTranslations('connect');
  const rows = [
    { key: 'accounts', value: result.accounts },
    { key: 'transactions', value: result.transactions },
    { key: 'salesOrders', value: result.sales_orders },
    { key: 'settlements', value: result.settlements },
  ];

  return (
    <Card className="flex flex-col gap-5 border-accent/30 bg-gradient-to-br from-accent/10 to-transparent">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-bold text-body-text">{t('doneTitle')}</h2>
        <p className="text-meta text-body-text-muted">{t('doneBody')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-col gap-0.5 rounded-tile bg-card px-3 py-2.5">
            <span className="text-h1 font-bold text-brand-navy dark:text-brand-cream">
              <bdi>{formatNumber(r.value, locale)}</bdi>
            </span>
            <span className="text-meta text-muted-text">{t(`counts.${r.key}`)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-meta text-body-text-muted">{t('heldReceivables')}</span>
        <span className="text-display font-bold text-accent">
          <bdi>{formatCurrency(result.held_receivables_total, locale)}</bdi>
        </span>
      </div>

      <Button onClick={onContinue} className="self-start">
        {t('doneCta')}
      </Button>
    </Card>
  );
}
