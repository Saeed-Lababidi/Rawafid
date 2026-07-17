'use client';

// The business model, made visible on live data.
//
// The pricing section on the landing page claims Rafid bills on operational
// volume rather than financing volume. This card is that claim actually
// running: the tier is derived from the merchant's real order count, and no
// figure on it comes from a principal, fee, or receivable.

import { useLocale, useTranslations } from 'next-intl';
import { Card, CardHeading, Chip } from '@/components/ui/primitives';
import { IconRepeat } from '@/components/brand-icons';
import { formatNumber, type Locale } from '@/lib/format';
import type { TierUsage } from '@/lib/tiers';

export function PlanCard({ usage }: { usage: TierUsage }) {
  const t = useTranslations('plan');
  const tModel = useTranslations('model.tiers');
  const locale = useLocale() as Locale;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardHeading icon={<IconRepeat className="h-5 w-5" />}>{t('title')}</CardHeading>
          <p className="text-meta text-muted-text">{t('hint')}</p>
        </div>
        <Chip tone="info">{tModel(`${usage.tier}.name`)}</Chip>
      </div>

      <div className="flex flex-col gap-1">
        <span className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
          <bdi>{t('ordersPerMonth', { count: formatNumber(usage.ordersPerMonth, locale) })}</bdi>
        </span>
        <span className="text-meta text-body-text-muted">
          {usage.limit === null
            ? t('unlimited')
            : t('ofLimit', { limit: formatNumber(usage.limit, locale) })}
        </span>
      </div>

      {usage.usage !== null ? (
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-pill bg-hairline-strong">
            <div
              className="h-full rounded-pill bg-brand-purple transition-[width] duration-700"
              style={{ width: `${Math.round(usage.usage * 100)}%` }}
            />
          </div>
          {usage.next ? (
            <span className="font-mono text-meta text-muted-text">
              {t('nextTier', { tier: tModel(`${usage.next}.name`) })}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className="rounded-tile bg-page-bg px-3 py-2 text-meta text-body-text-muted">
        {t('shariaNote')}
      </p>
    </Card>
  );
}
