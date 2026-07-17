'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/app/app-shell';
import { Button, Card, CardHeading, Chip, RiskChip } from '@/components/ui/primitives';
import { FinCard } from '@/components/brand';
import { IconGrowth, IconInvoice, IconRepeat, IconSharia } from '@/components/brand-icons';
import { QueryBoundary, Skeleton } from '@/components/ui/query-boundary';
import { ContributionBars, ScoreGauge } from '@/components/ui/charts';
import { bandColor } from '@/components/ui/charts';
import {
  AuditStrip,
  ConfidencePanel,
  ExplanationPanel,
  FactorBars,
  InsightsPanel,
  NextStepsPanel,
  RepaymentProjection,
} from '@/components/engine/engine-panels';
import { useToast } from '@/components/providers/toast-provider';
import {
  acceptOffer,
  generateOffer,
  getAssessment,
  getAssessments,
  getContract,
  getContracts,
  getOffers,
  getRepayments,
  rejectOffer,
  runAssessment,
} from '@/lib/api';
import { POLL, qk } from '@/lib/query';
import { MERCHANT_NAV } from '@/lib/nav';
import { outcomeOf } from '@/lib/decision';
import { engineOf, SCORE_MAX, scoreFraction } from '@/lib/engine';
import { formatCurrency, formatDate, type Locale } from '@/lib/format';
import type { AssessmentDetailOut, ContractDetailOut, OfferOut } from '@/lib/types';

const SCHEDULE_TONE = { paid: 'good', partial: 'warn', pending: 'neutral' } as const;

export default function FinancingPage() {
  const t = useTranslations('financing');
  const tNav = useTranslations('app');
  const locale = useLocale() as Locale;
  const nav = MERCHANT_NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  const queryClient = useQueryClient();
  const { toast, toastError } = useToast();

  const contractsQ = useQuery({ queryKey: qk.contracts, queryFn: getContracts });
  const offersQ = useQuery({ queryKey: qk.offers, queryFn: getOffers });
  const assessmentsQ = useQuery({ queryKey: qk.assessments, queryFn: getAssessments });

  // Which of the four states this screen shows is derived from server data, not
  // held in local state — so an accepted offer or a settled contract can never
  // leave the UI showing a stale step.
  const activeContractRow =
    contractsQ.data?.find((c) => c.status === 'active') ?? contractsQ.data?.[0];
  const openOffer = offersQ.data?.find((o) => o.status === 'offered');
  const latestAssessmentId = assessmentsQ.data?.[0]?.id;

  // Poll the live outstanding balance only while a contract is actually active;
  // a repaid one is terminal and never changes again.
  const contractQ = useQuery({
    queryKey: qk.contract(activeContractRow?.id ?? ''),
    queryFn: () => getContract(activeContractRow!.id),
    enabled: Boolean(activeContractRow),
    refetchInterval: activeContractRow?.status === 'active' ? POLL.live : false,
  });

  // Which step to show is only knowable once contracts AND offers have both
  // answered: a merchant with an open offer must never flash the assessment
  // screen (or fetch its detail) just because `offers` hadn't landed yet.
  const stepResolved = contractsQ.isSuccess && offersQ.isSuccess && assessmentsQ.isSuccess;
  const needsAssessmentDetail =
    stepResolved && Boolean(latestAssessmentId) && !activeContractRow && !openOffer;
  const assessmentQ = useQuery({
    queryKey: qk.assessment(latestAssessmentId ?? ''),
    queryFn: () => getAssessment(latestAssessmentId!),
    enabled: needsAssessmentDetail,
  });

  const isLoading = contractsQ.isLoading || offersQ.isLoading || assessmentsQ.isLoading;
  const isError = contractsQ.isError || offersQ.isError || assessmentsQ.isError;
  const retry = () => {
    contractsQ.refetch();
    offersQ.refetch();
    assessmentsQ.refetch();
  };

  const runAssessmentM = useMutation({
    mutationFn: runAssessment,
    onSuccess: (detail) => {
      queryClient.setQueryData(qk.assessment(detail.id), detail);
      queryClient.invalidateQueries({ queryKey: qk.assessments });
    },
    onError: (e) => toastError(e, t('error')),
  });

  const generateOfferM = useMutation({
    mutationFn: generateOffer,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.offers }),
    onError: (e) => toastError(e, t('error')),
  });

  const acceptOfferM = useMutation({
    mutationFn: (id: string) => acceptOffer(id),
    onSuccess: () => {
      toast(t('acceptedToast'), 'success');
      queryClient.invalidateQueries({ queryKey: qk.offers });
      queryClient.invalidateQueries({ queryKey: qk.contracts });
    },
    onError: (e) => toastError(e, t('error')),
  });

  const rejectOfferM = useMutation({
    mutationFn: (id: string) => rejectOffer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.offers }),
    onError: (e) => toastError(e, t('error')),
  });

  const contract = contractQ.data;
  const offer = openOffer;
  const assessment = needsAssessmentDetail ? assessmentQ.data : undefined;
  const busy =
    runAssessmentM.isPending ||
    generateOfferM.isPending ||
    acceptOfferM.isPending ||
    rejectOfferM.isPending;

  return (
    <AppShell role="merchant" nav={nav}>
      {() => (
        <QueryBoundary
          isLoading={isLoading}
          isError={isError}
          onRetry={retry}
          skeleton={
            <div className="flex flex-col gap-6">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            <h1 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">{t('title')}</h1>

            {/* ---- Active contract view ---- */}
            {contract ? (
              <ContractView contract={contract} />
            ) : offer ? (
              /* ---- Offer view ---- */
              <OfferView
                offer={offer}
                busy={busy}
                onAccept={() => acceptOfferM.mutate(offer.id)}
                onReject={() => rejectOfferM.mutate(offer.id)}
                locale={locale}
              />
            ) : assessment ? (
              /* ---- Assessment result ---- */
              <AssessmentView
                assessment={assessment}
                busy={busy}
                onGenerateOffer={() => generateOfferM.mutate()}
                locale={locale}
              />
            ) : (
              /* ---- Intro / run assessment ---- */
              <Card className="flex flex-col items-center gap-5 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-pill bg-accent/10 text-accent">
                  <IconGrowth className="h-8 w-8" />
                </div>
                <div className="flex max-w-md flex-col gap-2">
                  <h2 className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
                    {t('introTitle')}
                  </h2>
                  <p className="text-body text-body-text-muted">{t('introBody')}</p>
                </div>
                <Button loading={busy} onClick={() => runAssessmentM.mutate()}>
                  {t('runAssessment')}
                </Button>
              </Card>
            )}
          </div>
        </QueryBoundary>
      )}
    </AppShell>
  );

  function ContractView({ contract }: { contract: ContractDetailOut }) {
    const progress = contract.total_due > 0 ? 1 - contract.outstanding / contract.total_due : 0;
    const repaid = contract.status === 'repaid';
    return (
      <div className="flex flex-col gap-6">
        <FinCard
          badge={repaid ? t('statusRepaid') : t('statusActive')}
          amount={formatCurrency(contract.outstanding, locale)}
          amountCaption={t('outstanding')}
          rows={[
            { label: t('costPrice'), value: formatCurrency(contract.cost_price, locale) },
            { label: t('profit'), value: formatCurrency(contract.profit_amount, locale) },
            { label: t('totalDue'), value: formatCurrency(contract.total_due, locale) },
          ]}
          footer={
            <div className="flex flex-col gap-2">
              <div className="h-2.5 w-full overflow-hidden rounded-pill bg-white/12">
                <div
                  className="h-full rounded-pill bg-brand-terra transition-[width] duration-700"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </div>
              <div className="flex justify-between font-mono text-[11px] text-brand-cream/60">
                <span>{t('repaidOf', { total: formatCurrency(contract.total_due, locale) })}</span>
                <span>
                  <bdi>{Math.round(progress * 100)}%</bdi>
                </span>
              </div>
            </div>
          }
        />

        <Card className="flex flex-col gap-4">
          <CardHeading icon={<IconInvoice className="h-5 w-5" />}>{t('scheduleTitle')}</CardHeading>
          <div className="flex flex-col gap-2">
            {contract.schedule.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-tile border border-hairline px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-pill bg-hairline text-meta font-bold text-body-text-muted">
                    <bdi>{item.seq}</bdi>
                  </span>
                  <span className="text-meta text-muted-text">{formatDate(item.due_date, locale)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-body text-body-text">
                    <bdi>{formatCurrency(item.paid_amount, locale)}</bdi>
                    <span className="text-muted-text"> / {formatCurrency(item.amount, locale)}</span>
                  </span>
                  <Chip tone={SCHEDULE_TONE[item.status]}>{t(`schedule.${item.status}`)}</Chip>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <RepaymentsLedger contractId={contract.id} />
      </div>
    );
  }
}

/**
 * The collection events themselves. The schedule above is the plan; this is
 * what was actually taken, and from which settlement — the proof behind
 * "repays itself". Polls alongside the contract because the monitoring agent
 * applies repayments on its own.
 */
function RepaymentsLedger({ contractId }: { contractId: string }) {
  const t = useTranslations('financing');
  const locale = useLocale() as Locale;

  const repaymentsQ = useQuery({
    queryKey: qk.repayments(contractId),
    queryFn: () => getRepayments(contractId),
    refetchInterval: POLL.live,
  });

  const repayments = repaymentsQ.data ?? [];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={<IconRepeat className="h-5 w-5" />}>{t('ledgerTitle')}</CardHeading>
        <p className="text-meta text-muted-text">{t('ledgerHint')}</p>
      </div>

      <QueryBoundary
        isLoading={repaymentsQ.isLoading}
        isError={repaymentsQ.isError}
        onRetry={() => repaymentsQ.refetch()}
        skeleton={<Skeleton className="h-20 w-full" />}
        isEmpty={repayments.length === 0}
        emptyTitle={t('ledgerEmpty')}
        emptyBody={t('ledgerEmptyBody')}
      >
        <div className="flex flex-col divide-y divide-hairline">
          {repayments.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex flex-col">
                <span className="text-body text-body-text">{t('collected')}</span>
                <span className="font-mono text-meta text-muted-text">
                  {formatDate(r.applied_at, locale)}
                </span>
              </div>
              <span className="text-body font-bold text-risk-a">
                <bdi>-{formatCurrency(r.amount, locale)}</bdi>
              </span>
            </div>
          ))}
        </div>
      </QueryBoundary>
    </Card>
  );
}

function OfferView({
  offer,
  busy,
  onAccept,
  onReject,
  locale,
}: {
  offer: OfferOut;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
  locale: Locale;
}) {
  const t = useTranslations('financing');
  const rows: { key: string; value: number; strong?: boolean }[] = [
    { key: 'principal', value: offer.principal, strong: true },
    { key: 'profitAmount', value: offer.profit_amount },
    { key: 'platformFee', value: offer.platform_fee },
    { key: 'successFee', value: offer.success_fee },
    { key: 'totalRepayable', value: offer.total_repayable, strong: true },
  ];
  return (
    <div className="flex flex-col gap-6">
      <FinCard
        badge={t('offerCash')}
        amount={formatCurrency(offer.principal, locale)}
        amountCaption={t('advanceRatio', { pct: Math.round(offer.advance_ratio * 100) })}
      />

      <Card className="flex flex-col gap-3">
        <CardHeading icon={<IconSharia className="h-5 w-5" />}>{t('costBreakdown')}</CardHeading>
        <p className="text-meta text-body-text-muted">{t('murabahaNote')}</p>
        <div className="flex flex-col divide-y divide-hairline">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between py-2.5">
              <span className={`text-body ${r.strong ? 'font-bold text-body-text' : 'text-body-text-muted'}`}>
                {t(`offer.${r.key}`)}
              </span>
              <span className={`text-body ${r.strong ? 'font-bold text-body-text' : 'text-body-text'}`}>
                <bdi>{formatCurrency(r.value, locale)}</bdi>
              </span>
            </div>
          ))}
        </div>
        {offer.annotation ? (
          <div className="rounded-tile bg-chip-info-bg px-3 py-2 text-meta text-chip-info-text">
            {t('underwriterNote')}: {offer.annotation}
          </div>
        ) : null}
        <span className="text-meta text-muted-text">
          {t('expires', { date: formatDate(offer.expires_at, locale) })}
        </span>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button loading={busy} onClick={onAccept}>
          {t('acceptOffer')}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onReject}>
          {t('rejectOffer')}
        </Button>
      </div>
    </div>
  );
}

function AssessmentView({
  assessment,
  busy,
  onGenerateOffer,
  locale,
}: {
  assessment: AssessmentDetailOut;
  busy: boolean;
  onGenerateOffer: () => void;
  locale: Locale;
}) {
  const t = useTranslations('financing');
  const tEngine = useTranslations('engine');
  const { decision } = assessment;
  // The engine decides approve / review / decline; `decision.approved` folds
  // `review` into false, which would tell a reviewable merchant they were
  // rejected. Read the engine's real verdict instead.
  const outcome = outcomeOf(decision);
  const engine = engineOf(decision);

  // Grade ("A-") is finer-grained than the persisted risk_band ("A"); prefer it
  // when the engine payload is present.
  const grade = engine?.risk_score.grade ?? assessment.risk_band;
  const fraction = engine ? scoreFraction(assessment.score) : assessment.score / 1000;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <div className="flex items-center gap-2">
            <span className="text-meta text-body-text-muted">{t('yourScore')}</span>
            <RiskChip band={assessment.risk_band} />
            {engine ? <Chip tone="neutral">{grade}</Chip> : null}
          </div>
          {outcome === 'approve' ? (
            <div className="flex items-center gap-2 text-risk-a">
              <CheckCircle2 aria-hidden className="h-5 w-5" />
              <span className="text-body font-bold">
                {t('approvedUpTo', { amount: formatCurrency(decision.max_advance_amount, locale) })}
              </span>
            </div>
          ) : outcome === 'review' ? (
            <div className="flex items-center gap-2 text-chip-warn-text">
              <ClipboardCheck aria-hidden className="h-5 w-5" />
              <span className="text-body font-bold">{t('underReview')}</span>
            </div>
          ) : (
            <span className="text-body font-bold text-risk-d">{t('declined')}</span>
          )}
        </div>
        <ScoreGauge
          score={assessment.score}
          fraction={fraction}
          maxLabel={engine ? `/ ${SCORE_MAX}` : '/ 1000'}
          colorVar={bandColor(assessment.risk_band)}
        />
      </Card>

      {outcome === 'review' ? (
        <Card className="border-chip-warn-border bg-chip-warn-bg">
          <p className="text-body text-chip-warn-text">{t('underReviewBody')}</p>
        </Card>
      ) : null}

      {engine ? (
        <>
          <ExplanationPanel decision={engine} />
          <InsightsPanel strengths={engine.strengths} weaknesses={engine.weaknesses} />
          <FactorBars riskScore={engine.risk_score} />
          <ConfidencePanel confidence={engine.confidence} />
          <NextStepsPanel steps={engine.next_steps} />
          <RepaymentProjection repayment={engine.funding_recommendation.repayment} />
        </>
      ) : (
        /* Stub/http scoring backend: no engine payload, fall back to the flat
           reasons list and unsigned contribution bars. */
        <>
          <Card className="flex flex-col gap-3">
            <CardHeading icon={<IconSharia className="h-5 w-5" />}>{t('whyTitle')}</CardHeading>
            <ul className="flex flex-col gap-1.5">
              {decision.reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-body text-body-text-muted">
                  <span className="text-accent">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-col gap-4">
            <CardHeading icon={<IconGrowth className="h-5 w-5" />}>{t('contributionsTitle')}</CardHeading>
            <ContributionBars
              items={Object.entries(decision.feature_contributions)
                .map(([label, value]) => ({ label, value }))
                .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))}
            />
          </Card>
        </>
      )}

      {outcome === 'approve' ? (
        <Button loading={busy} onClick={onGenerateOffer} className="self-start">
          {t('generateOffer')}
        </Button>
      ) : null}

      {engine ? (
        <AuditStrip audit={engine.audit} engineVersion={engine.engine_version} />
      ) : (
        <p className="text-meta text-muted-text">
          {tEngine('modelVersion', { version: decision.model_version })}
        </p>
      )}
    </div>
  );
}
