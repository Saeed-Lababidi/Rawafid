'use client';

// The underwriter's desk: one merchant's whole file. Connections, every
// assessment the engine has produced, offers, contracts, and alerts — the
// evidence behind a lending decision, which is the thing Alinma is actually
// buying.

import { use, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppShell } from '@/components/app/app-shell';
import { Button, Card, CardHeading, Chip, RiskChip } from '@/components/ui/primitives';
import { QueryBoundary, Skeleton } from '@/components/ui/query-boundary';
import { ScoreGauge, bandColor } from '@/components/ui/charts';
import {
  AuditStrip,
  ConfidencePanel,
  ExplanationPanel,
  FactorBars,
  InsightsPanel,
  NextStepsPanel,
} from '@/components/engine/engine-panels';
import { IconApproved, IconConnect, IconRiskShield, IconSME } from '@/components/brand-icons';
import { useToast } from '@/components/providers/toast-provider';
import { annotateOffer, getAdminAssessment, getAdminMerchant } from '@/lib/api';
import { qk } from '@/lib/query';
import { ADMIN_NAV } from '@/lib/nav';
import { outcomeOf } from '@/lib/decision';
import { engineOf, SCORE_MAX, scoreFraction } from '@/lib/engine';
import { formatCurrency, formatDate, type Locale } from '@/lib/format';
import type { AlertSeverity, OfferOut } from '@/lib/types';

const SEVERITY_TONE: Record<AlertSeverity, 'destructive' | 'warn' | 'info'> = {
  high: 'destructive',
  medium: 'warn',
  low: 'info',
};

export default function AdminMerchantPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  // Next 16 delivers route params as a promise; `use` unwraps it in the client
  // component without an effect.
  const { id } = use(params);

  const t = useTranslations('adminMerchant');
  const tAdmin = useTranslations('admin');
  const tDash = useTranslations('dashboard');
  const tConnect = useTranslations('connect');
  const tNav = useTranslations('app');
  const locale = useLocale() as Locale;
  const Back = locale === 'ar' ? ArrowRight : ArrowLeft;

  const nav = ADMIN_NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  const detailQ = useQuery({
    queryKey: qk.adminMerchant(id),
    queryFn: () => getAdminMerchant(id),
  });

  // The underwriting panel opens against a specific assessment; default to the
  // newest once the file loads.
  const [openAssessmentId, setOpenAssessmentId] = useState<string | null>(null);
  const selectedId = openAssessmentId ?? detailQ.data?.assessments?.[0]?.id ?? null;

  const assessmentQ = useQuery({
    queryKey: qk.adminAssessment(selectedId ?? ''),
    queryFn: () => getAdminAssessment(selectedId!),
    enabled: Boolean(selectedId),
  });

  const detail = detailQ.data;

  return (
    <AppShell role="bank_admin" nav={nav}>
      {() => (
        <QueryBoundary
          isLoading={detailQ.isLoading}
          isError={detailQ.isError}
          onRetry={() => detailQ.refetch()}
          skeleton={
            <div className="flex flex-col gap-6">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          }
        >
          {!detail ? null : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-3">
                <Link
                  href="/admin"
                  locale={locale}
                  className="inline-flex w-fit items-center gap-1.5 font-mono text-meta text-muted-text transition-colors hover:text-accent"
                >
                  <Back aria-hidden className="h-3.5 w-3.5" />
                  {t('backToPortfolio')}
                </Link>
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h1 className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
                      <bdi>{detail.merchant.name}</bdi>
                    </h1>
                    <span className="font-mono text-meta text-muted-text">
                      <bdi className="capitalize">{detail.merchant.business_type}</bdi> ·{' '}
                      <bdi>{detail.merchant.city}</bdi> ·{' '}
                      {t('since', { date: formatDate(detail.merchant.established_at, locale) })}
                    </span>
                  </div>
                  <Chip tone="good">{tAdmin('verified')}</Chip>
                </div>
              </div>

              {/* File summary */}
              <div className="grid gap-4 sm:grid-cols-4">
                <Tile label={t('connections')} value={String(detail.connections.length)} />
                <Tile label={t('assessments')} value={String(detail.assessments.length)} />
                <Tile label={t('contracts')} value={String(detail.contracts.length)} />
                <Tile
                  label={t('openAlerts')}
                  value={String(detail.alerts.filter((a) => !a.resolved).length)}
                />
              </div>

              {/* Connections */}
              <Card className="flex flex-col gap-3">
                <CardHeading icon={<IconConnect className="h-5 w-5" />}>
                  {t('connectionsTitle')}
                </CardHeading>
                {detail.connections.length === 0 ? (
                  <span className="text-meta text-muted-text">{t('noConnections')}</span>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detail.connections.map((c) => {
                      let label = c.institution;
                      try {
                        label =
                          c.type === 'bank'
                            ? tConnect(`banks.${c.institution}`)
                            : tConnect(`platforms.${c.institution}`);
                      } catch {
                        /* unmapped institution: show the raw id */
                      }
                      return (
                        <Chip
                          key={c.id}
                          tone={
                            c.status === 'active'
                              ? 'good'
                              : c.status === 'revoked'
                                ? 'destructive'
                                : 'neutral'
                          }
                        >
                          <bdi>{label}</bdi>
                        </Chip>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Assessment history */}
              <Card className="flex flex-col gap-3">
                <CardHeading icon={<IconSME className="h-5 w-5" />}>
                  {t('assessmentsTitle')}
                </CardHeading>
                {detail.assessments.length === 0 ? (
                  <span className="text-meta text-muted-text">{t('noAssessments')}</span>
                ) : (
                  <div className="flex flex-col gap-2">
                    {detail.assessments.map((a) => {
                      const active = a.id === selectedId;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setOpenAssessmentId(a.id)}
                          className={`flex flex-wrap items-center justify-between gap-3 rounded-tile border px-3 py-2.5 text-start transition-colors ${
                            active
                              ? 'border-accent bg-accent/5'
                              : 'border-hairline hover:border-accent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <RiskChip band={a.risk_band} />
                            <span className="font-display text-body font-bold text-body-text">
                              <bdi>{a.score}</bdi>
                            </span>
                            <span className="font-mono text-meta text-muted-text">
                              {formatDate(a.created_at, locale)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-meta text-muted-text">
                              {a.model_version}
                            </span>
                            <Chip tone={a.approved ? 'good' : 'warn'}>
                              {a.approved ? t('approved') : t('notApproved')}
                            </Chip>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Underwriting view — the engine's full case for this merchant */}
              {selectedId ? (
                <QueryBoundary
                  isLoading={assessmentQ.isLoading}
                  isError={assessmentQ.isError}
                  onRetry={() => assessmentQ.refetch()}
                  skeleton={<Skeleton className="h-64 w-full" />}
                >
                  {assessmentQ.data ? <Underwriting detail={assessmentQ.data} /> : null}
                </QueryBoundary>
              ) : null}

              {/* Offers + annotation */}
              <Card className="flex flex-col gap-3">
                <CardHeading icon={<IconApproved className="h-5 w-5" />}>
                  {t('offersTitle')}
                </CardHeading>
                {detail.offers.length === 0 ? (
                  <span className="text-meta text-muted-text">{t('noOffers')}</span>
                ) : (
                  <div className="flex flex-col gap-3">
                    {detail.offers.map((o) => (
                      <OfferRow key={o.id} offer={o} merchantId={id} locale={locale} />
                    ))}
                  </div>
                )}
              </Card>

              {/* Contracts */}
              {detail.contracts.length > 0 ? (
                <Card className="flex flex-col gap-3">
                  <CardHeading icon={<IconApproved className="h-5 w-5" />}>
                    {t('contractsTitle')}
                  </CardHeading>
                  <div className="flex flex-col gap-2">
                    {detail.contracts.map((c) => (
                      <div
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
                      >
                        <div className="flex flex-col">
                          <span className="text-body font-bold text-body-text">
                            <bdi>{formatCurrency(c.cost_price, locale)}</bdi>
                          </span>
                          <span className="font-mono text-meta text-muted-text">
                            {t('disbursedOn', { date: formatDate(c.disbursed_at, locale) })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-meta text-muted-text">
                            {t('outstandingInline', {
                              amount: formatCurrency(c.outstanding, locale),
                            })}
                          </span>
                          <Chip tone={c.status === 'repaid' ? 'good' : 'info'}>
                            {t(`contractStatus.${c.status}`)}
                          </Chip>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {/* Alerts */}
              {detail.alerts.length > 0 ? (
                <Card className="flex flex-col gap-3">
                  <CardHeading icon={<IconRiskShield className="h-5 w-5" />}>
                    {t('alertsTitle')}
                  </CardHeading>
                  <div className="flex flex-col gap-2">
                    {detail.alerts.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-body text-body-text">{a.message}</span>
                          <span className="font-mono text-meta text-muted-text">
                            {formatDate(a.created_at, locale)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.resolved ? <Chip tone="good">{t('resolved')}</Chip> : null}
                          <Chip tone={SEVERITY_TONE[a.severity]}>
                            {tDash(`severity.${a.severity}`)}
                          </Chip>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </QueryBoundary>
      )}
    </AppShell>
  );
}

/** The same engine panels the merchant sees, for the underwriter. */
function Underwriting({ detail }: { detail: import('@/lib/types').AssessmentDetailOut }) {
  const t = useTranslations('adminMerchant');
  const tFin = useTranslations('financing');
  const locale = useLocale() as Locale;
  const decision = detail.decision;
  const engine = engineOf(decision);
  const outcome = outcomeOf(decision);
  const fraction = engine ? scoreFraction(detail.score) : detail.score / 1000;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-text">
              {t('underwritingTitle')}
            </span>
            <RiskChip band={detail.risk_band} />
            {engine ? <Chip tone="neutral">{engine.risk_score.grade}</Chip> : null}
          </div>
          <Chip
            tone={outcome === 'approve' ? 'good' : outcome === 'review' ? 'warn' : 'destructive'}
          >
            {tFin(
              outcome === 'approve' ? 'approvedShort' : outcome === 'review' ? 'underReview' : 'declined',
            )}
          </Chip>
          <span className="font-mono text-meta text-muted-text">
            {t('maxAdvance', { amount: formatCurrency(decision.max_advance_amount, locale) })}
          </span>
        </div>
        <ScoreGauge
          score={detail.score}
          fraction={fraction}
          maxLabel={engine ? `/ ${SCORE_MAX}` : '/ 1000'}
          colorVar={bandColor(detail.risk_band)}
        />
      </Card>

      {engine ? (
        <>
          <ExplanationPanel decision={engine} />
          <InsightsPanel strengths={engine.strengths} weaknesses={engine.weaknesses} />
          <FactorBars riskScore={engine.risk_score} />
          <ConfidencePanel confidence={engine.confidence} />
          <NextStepsPanel steps={engine.next_steps} />
          <AuditStrip audit={engine.audit} engineVersion={engine.engine_version} />
        </>
      ) : (
        <Card className="flex flex-col gap-3">
          <h2 className="text-body font-bold text-body-text">{tFin('whyTitle')}</h2>
          <ul className="flex flex-col gap-1.5">
            {decision.reasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-body text-body-text-muted">
                <span className="text-accent">•</span>
                {r}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/** An offer plus the underwriter note the merchant will see on their side. */
function OfferRow({
  offer,
  merchantId,
  locale,
}: {
  offer: OfferOut;
  merchantId: string;
  locale: Locale;
}) {
  const t = useTranslations('adminMerchant');
  const queryClient = useQueryClient();
  const { toast, toastError } = useToast();
  const [note, setNote] = useState(offer.annotation ?? '');
  const [editing, setEditing] = useState(false);

  const annotateM = useMutation({
    mutationFn: (text: string) => annotateOffer(offer.id, text),
    onSuccess: () => {
      toast(t('annotated'), 'success');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: qk.adminMerchant(merchantId) });
    },
    onError: (e) => toastError(e, t('error')),
  });

  return (
    <div className="flex flex-col gap-3 rounded-tile border border-hairline px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-body font-bold text-body-text">
            <bdi>{formatCurrency(offer.principal, locale)}</bdi>
          </span>
          <span className="font-mono text-meta text-muted-text">
            {t('advanceRate', { pct: Math.round(offer.advance_ratio * 100) })} ·{' '}
            {formatDate(offer.created_at, locale)}
          </span>
        </div>
        <Chip
          tone={
            offer.status === 'accepted'
              ? 'good'
              : offer.status === 'offered'
                ? 'info'
                : 'neutral'
          }
        >
          {t(`offerStatus.${offer.status}`)}
        </Chip>
      </div>

      {offer.annotation && !editing ? (
        <div className="rounded-tile bg-chip-info-bg px-3 py-2 text-meta text-chip-info-text">
          {offer.annotation}
        </div>
      ) : null}

      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t('notePlaceholder')}
            className="w-full rounded-tile border border-hairline-strong bg-page-bg px-3 py-2 text-body text-body-text outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-2">
            <Button loading={annotateM.isPending} onClick={() => annotateM.mutate(note)}>
              {t('saveNote')}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              {t('cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-fit font-mono text-meta text-muted-text underline transition-colors hover:text-accent"
        >
          {offer.annotation ? t('editNote') : t('addNote')}
        </button>
      )}
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
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
