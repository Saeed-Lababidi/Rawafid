'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { AppShell } from '@/components/app/app-shell';
import { Alert, Button, Card, CardHeading, Chip, RiskChip, Spinner } from '@/components/ui/primitives';
import { FinCard } from '@/components/brand';
import { IconGrowth, IconInvoice, IconSharia } from '@/components/brand-icons';
import { ContributionBars, ScoreGauge } from '@/components/ui/charts';
import { bandColor } from '@/components/ui/charts';
import {
  acceptOffer,
  ApiError,
  generateOffer,
  getAssessment,
  getAssessments,
  getContract,
  getContracts,
  getOffers,
  rejectOffer,
  runAssessment,
} from '@/lib/api';
import { formatCurrency, formatDate, type Locale } from '@/lib/format';
import type {
  AssessmentDetailOut,
  ContractDetailOut,
  OfferOut,
} from '@/lib/types';

const NAV = [
  { href: '/dashboard', key: 'dashboard' },
  { href: '/financing', key: 'financing' },
];

const SCHEDULE_TONE = { paid: 'good', partial: 'warn', pending: 'neutral' } as const;

export default function FinancingPage() {
  const t = useTranslations('financing');
  const tNav = useTranslations('app');
  const tDash = useTranslations('dashboard');
  const locale = useLocale() as Locale;
  const nav = NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  const [assessment, setAssessment] = useState<AssessmentDetailOut | null>(null);
  const [offer, setOffer] = useState<OfferOut | null>(null);
  const [contract, setContract] = useState<ContractDetailOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshContract = useCallback(async (id: string) => {
    const c = await getContract(id);
    setContract(c);
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      const [assessments, offers, contracts] = await Promise.all([
        getAssessments(),
        getOffers(),
        getContracts(),
      ]);
      if (!alive) return;
      const active = contracts.find((c) => c.status === 'active') ?? contracts[0];
      if (active) {
        setContract(await getContract(active.id));
      }
      const open = offers.find((o) => o.status === 'offered');
      if (open) setOffer(open);
      // Load the latest assessment's full detail only when there's no contract
      // and no open offer yet - that's the only state that renders it.
      if (!active && !open && assessments[0]) {
        setAssessment(await getAssessment(assessments[0].id));
      }
      setLoading(false);
    }
    load().catch(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Poll the live outstanding balance while a contract is active.
  useEffect(() => {
    if (!contract || contract.status !== 'active') return;
    const id = setInterval(() => refreshContract(contract.id).catch(() => {}), 8000);
    return () => clearInterval(id);
  }, [contract, refreshContract]);

  async function onRunAssessment() {
    setBusy(true);
    setError(null);
    try {
      setAssessment(await runAssessment());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('error'));
    }
    setBusy(false);
  }

  async function onGenerateOffer() {
    setBusy(true);
    setError(null);
    try {
      setOffer(await generateOffer());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('error'));
    }
    setBusy(false);
  }

  async function onAccept() {
    if (!offer) return;
    setBusy(true);
    setError(null);
    try {
      const c = await acceptOffer(offer.id);
      setContract(await getContract(c.id));
      setOffer(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('error'));
    }
    setBusy(false);
  }

  async function onReject() {
    if (!offer) return;
    setBusy(true);
    try {
      await rejectOffer(offer.id);
      setOffer(null);
    } catch {
      /* ignore */
    }
    setBusy(false);
  }

  return (
    <AppShell role="merchant" nav={nav}>
      {() =>
        loading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner className="h-7 w-7" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <h1 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">{t('title')}</h1>
            {error ? <Alert>{error}</Alert> : null}

            {/* ---- Active contract view ---- */}
            {contract ? (
              <ContractView contract={contract} />
            ) : offer ? (
              /* ---- Offer view ---- */
              <OfferView
                offer={offer}
                busy={busy}
                onAccept={onAccept}
                onReject={onReject}
                locale={locale}
              />
            ) : assessment ? (
              /* ---- Assessment result ---- */
              <AssessmentView
                assessment={assessment}
                busy={busy}
                onGenerateOffer={onGenerateOffer}
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
                <Button loading={busy} onClick={onRunAssessment}>
                  {t('runAssessment')}
                </Button>
              </Card>
            )}
          </div>
        )
      }
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
      </div>
    );
  }
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
  const { decision } = assessment;
  const contributions = Object.entries(decision.feature_contributions)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <div className="flex items-center gap-2">
            <span className="text-meta text-body-text-muted">{t('yourScore')}</span>
            <RiskChip band={assessment.risk_band} />
          </div>
          {decision.approved ? (
            <div className="flex items-center gap-2 text-risk-a">
              <CheckCircle2 aria-hidden className="h-5 w-5" />
              <span className="text-body font-bold">
                {t('approvedUpTo', { amount: formatCurrency(decision.max_advance_amount, locale) })}
              </span>
            </div>
          ) : (
            <span className="text-body font-bold text-risk-d">{t('declined')}</span>
          )}
        </div>
        <ScoreGauge score={assessment.score} colorVar={bandColor(assessment.risk_band)} />
      </Card>

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
        <ContributionBars items={contributions} />
      </Card>

      {decision.approved ? (
        <Button loading={busy} onClick={onGenerateOffer} className="self-start">
          {t('generateOffer')}
        </Button>
      ) : null}
    </div>
  );
}
