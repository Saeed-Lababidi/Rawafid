'use client';

// Renders the rafid-engine Decision. Every string here is authored by the
// engine in the active language — the UI selects a side, it never translates,
// re-derives, or re-scores anything.

import { useLocale, useTranslations } from 'next-intl';
import { CircleCheck, CircleMinus, Lightbulb, TriangleAlert } from 'lucide-react';
import { Card, Chip } from '@/components/ui/primitives';
import { localized } from '@/lib/engine';
import { formatCurrency, formatDate, type Locale } from '@/lib/format';
import type {
  EngineAudit,
  EngineConfidence,
  EngineDecision,
  EngineInsight,
  EngineNextStep,
  EngineRiskScore,
  FactorContribution,
  HealthStatus,
} from '@/lib/types';

const HEALTH_TONE: Record<HealthStatus, 'good' | 'warn' | 'destructive' | 'info' | 'neutral'> = {
  strong: 'good',
  stable: 'good',
  fragile: 'warn',
  distressed: 'destructive',
  unknown: 'neutral',
};

export function HealthChip({
  health,
  label,
}: {
  health: HealthStatus;
  label: string;
}) {
  return <Chip tone={HEALTH_TONE[health]}>{label}</Chip>;
}

/** The engine's own plain-language verdict — the merchant-facing headline. */
export function ExplanationPanel({ decision }: { decision: EngineDecision }) {
  const locale = useLocale() as Locale;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <HealthChip
          health={decision.credit_assessment.health}
          label={localized(decision.credit_assessment.health_label, locale)}
        />
        <Chip tone="neutral">{localized(decision.risk_score.band, locale)}</Chip>
      </div>
      <p className="text-body text-body-text">
        {localized(decision.explanation.summary, locale)}
      </p>
    </Card>
  );
}

/** Confidence is orthogonal to score: how much data backs the verdict. */
export function ConfidencePanel({ confidence }: { confidence: EngineConfidence }) {
  const t = useTranslations('engine');
  const locale = useLocale() as Locale;
  const pct = Math.round(confidence.value * 100);
  const tone =
    confidence.band === 'high' ? 'good' : confidence.band === 'medium' ? 'warn' : 'destructive';

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body font-bold text-body-text">{t('confidenceTitle')}</h2>
        <Chip tone={tone}>{t(`confidenceBand.${confidence.band}`)}</Chip>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-hairline-strong">
          <div
            className="h-full rounded-pill bg-brand-purple transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-body font-bold text-body-text tabular-nums">
          <bdi>{pct}%</bdi>
        </span>
      </div>

      <p className="text-meta text-muted-text">{t('confidenceHint')}</p>

      <ul className="flex flex-col gap-1.5">
        {confidence.drivers.map((d) => (
          <li key={d.code} className="flex gap-2 text-meta text-body-text-muted">
            <span className="text-brand-purple">•</span>
            <span>{localized(d.detail, locale)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Seven-factor breakdown. `contribution_pct` is the share of the score a factor
 * accounts for (a percentage summing to ~100 across factors) — not a signed
 * point delta. Bar length is that share; colour comes from the factor's own
 * polarity, which is the engine's judgement of whether it helped or hurt.
 */
export function FactorBars({ riskScore }: { riskScore: EngineRiskScore }) {
  const t = useTranslations('engine');
  const locale = useLocale() as Locale;
  const factors: FactorContribution[] = [...riskScore.factors].sort(
    (a, b) => b.contribution_pct - a.contribution_pct,
  );
  const max = Math.max(...factors.map((f) => f.contribution_pct), 1);

  const barColor = (p: FactorContribution['polarity']) =>
    p === 'positive'
      ? 'var(--color-risk-a)'
      : p === 'negative'
        ? 'var(--color-risk-d)'
        : 'var(--color-muted-text)';

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-bold text-body-text">{t('factorsTitle')}</h2>
        <p className="text-meta text-muted-text">{t('factorsHint')}</p>
      </div>

      <div className="flex flex-col gap-3">
        {factors.map((f) => (
          <div key={f.code} className="flex flex-col gap-1">
            <div className="flex items-center justify-between gap-3">
              <span className="text-meta text-body-text">{localized(f.name, locale)}</span>
              <div className="flex items-center gap-2">
                <span className="text-meta text-muted-text">{localized(f.detail, locale)}</span>
                <span className="w-12 text-end text-meta font-bold text-body-text tabular-nums">
                  <bdi>{f.contribution_pct.toFixed(1)}%</bdi>
                </span>
              </div>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-pill bg-hairline">
              <div
                className="h-full rounded-pill transition-[width] duration-700"
                style={{
                  width: `${(f.contribution_pct / max) * 100}%`,
                  backgroundColor: barColor(f.polarity),
                }}
              />
            </div>
            <span className="text-meta text-muted-text">
              {t('factorWeight', { pct: Math.round(f.weight * 100) })}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function InsightsPanel({
  strengths,
  weaknesses,
}: {
  strengths: EngineInsight[];
  weaknesses: EngineInsight[];
}) {
  const t = useTranslations('engine');
  const locale = useLocale() as Locale;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-body font-bold text-body-text">
          <CircleCheck aria-hidden className="h-4 w-4 text-risk-a" />
          {t('strengthsTitle')}
        </h2>
        {strengths.length === 0 ? (
          <span className="text-meta text-muted-text">{t('none')}</span>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {strengths.map((s) => (
              <li key={s.code} className="flex gap-2 text-body text-body-text-muted">
                <span className="text-risk-a">•</span>
                <span>{localized(s.text, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-body font-bold text-body-text">
          <TriangleAlert aria-hidden className="h-4 w-4 text-chip-warn-text" />
          {t('weaknessesTitle')}
        </h2>
        {weaknesses.length === 0 ? (
          <span className="text-meta text-muted-text">{t('none')}</span>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {weaknesses.map((w) => (
              <li key={w.code} className="flex gap-2 text-body text-body-text-muted">
                <span className="text-chip-warn-text">•</span>
                <span>{localized(w.text, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Actionable, engine-authored guidance — "do this, score moves roughly that". */
export function NextStepsPanel({ steps }: { steps: EngineNextStep[] }) {
  const t = useTranslations('engine');
  const locale = useLocale() as Locale;
  if (steps.length === 0) return null;

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-body font-bold text-body-text">
        <Lightbulb aria-hidden className="h-4 w-4 text-brand-purple" />
        {t('nextStepsTitle')}
      </h2>
      <div className="flex flex-col gap-2">
        {steps.map((s) => (
          <div
            key={s.code}
            className="flex items-start justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
          >
            <span className="text-body text-body-text">{localized(s.text, locale)}</span>
            {s.potential_impact ? (
              <Chip tone="info">
                <bdi>{s.potential_impact}</bdi>
              </Chip>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

/**
 * Indicative repayment projection.
 *
 * IMPORTANT: these figures come from the engine's own quote — its single 2.1%
 * Murabaha fee applied to its recommended amount. The offer the merchant
 * actually contracts on is priced separately by the backend
 * (services/offers.py: platform 2% + success 1% + profit 6%, against live held
 * receivables). The two therefore disagree, so this panel deliberately shows
 * only the repayment *shape* — which settlements it collects from and when it
 * pays off — and never a fee or total. Binding money lives on the offer screen.
 */
export function RepaymentProjection({
  repayment,
}: {
  repayment: EngineDecision['funding_recommendation']['repayment'];
}) {
  const t = useTranslations('engine');
  const locale = useLocale() as Locale;
  if (repayment.schedule.length === 0) return null;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-bold text-body-text">{t('repaymentTitle')}</h2>
        <p className="text-meta text-muted-text">{t('repaymentHint')}</p>
      </div>

      <div className="flex flex-col gap-2">
        {repayment.schedule.map((d, i) => (
          <div
            key={`${d.date}-${i}`}
            className="flex items-center justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
          >
            <div className="flex items-center gap-2">
              <span className="text-meta text-body-text">{formatDate(d.date, locale)}</span>
              {d.projected ? <Chip tone="neutral">{t('projected')}</Chip> : null}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-body font-bold text-body-text">
                <bdi>{formatCurrency(d.deduction, locale)}</bdi>
              </span>
              <span className="text-meta text-muted-text">
                {t('ofSettlement', { amount: formatCurrency(d.settlement_expected, locale) })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {repayment.expected_payoff_date ? (
        <p className="text-meta text-body-text-muted">
          {t('payoffBy', { date: formatDate(repayment.expected_payoff_date, locale) })}
        </p>
      ) : null}
    </Card>
  );
}

/**
 * Provenance strip. Cheap to render and it is the difference between a judge
 * believing there is a real decision engine and assuming the number is faked:
 * version, ruleset, and the named rules that actually fired for this merchant.
 */
export function AuditStrip({
  audit,
  engineVersion,
}: {
  audit: EngineAudit;
  engineVersion: string;
}) {
  const t = useTranslations('engine');

  return (
    <div className="flex flex-col gap-2 rounded-card border border-card-border bg-card px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-muted-text">
        <span className="flex items-center gap-1.5">
          <CircleMinus aria-hidden className="h-3.5 w-3.5" />
          {t('poweredBy', { version: engineVersion })}
        </span>
        <span>{t('thresholds', { version: audit.thresholds_version })}</span>
        <span>{t('rulesFired', { count: audit.rules_fired.length })}</span>
      </div>
      {audit.rules_fired.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {audit.rules_fired.map((rule) => (
            <span
              key={rule}
              className="rounded-pill bg-hairline px-2 py-0.5 font-mono text-meta text-body-text-muted"
            >
              {rule}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
