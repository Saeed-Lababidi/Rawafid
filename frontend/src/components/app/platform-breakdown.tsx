'use client';

// The unified view, made concrete: what each aggregator actually contributed.
// This is the merchant-facing answer to "where does my money come from", and
// the same concentration signal the engine scores as PLATFORM_CONCENTRATION.

import { useLocale, useTranslations } from 'next-intl';
import { Card, CardHeading, Chip } from '@/components/ui/primitives';
import { IconLiveData } from '@/components/brand-icons';
import { formatCurrency, formatNumber, type Locale } from '@/lib/format';
import type { PlatformSummary } from '@/lib/sales';

// Each aggregator gets a stable colour so a platform reads the same everywhere.
const PLATFORM_COLOR: Record<string, string> = {
  // retail
  salla: 'var(--color-brand-terra)',
  zid: 'var(--color-brand-purple)',
  noon: '#d99a2b',
  // food
  jahez: 'var(--color-risk-a)',
  hungerstation: '#e2703a',
  mrsool: '#0ea5a0',
  foodics: '#5b8ac2',
};

export const platformColor = (p: string): string =>
  PLATFORM_COLOR[p] ?? 'var(--color-muted-text)';

export function PlatformBreakdown({
  platforms,
  showBar = true,
}: {
  platforms: PlatformSummary[];
  showBar?: boolean;
}) {
  const t = useTranslations('sales');
  const tConnect = useTranslations('connect');
  const locale = useLocale() as Locale;

  if (platforms.length === 0) {
    return (
      <Card className="flex flex-col gap-3">
        <CardHeading icon={<IconLiveData className="h-5 w-5" />}>{t('byPlatformTitle')}</CardHeading>
        <span className="text-meta text-muted-text">{t('noPlatforms')}</span>
      </Card>
    );
  }

  const label = (p: string) => {
    // Platform keys come from a fixed backend enum; anything unmapped falls
    // back to its raw id rather than throwing on a missing message.
    try {
      return tConnect(`platforms.${p}`);
    } catch {
      return p;
    }
  };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <CardHeading icon={<IconLiveData className="h-5 w-5" />}>
          {t('byPlatformTitle')}
        </CardHeading>
        <p className="text-meta text-muted-text">{t('byPlatformHint')}</p>
      </div>

      {/* Single stacked bar: concentration at a glance. */}
      {showBar ? (
        <div className="flex h-3 w-full overflow-hidden rounded-pill bg-hairline">
          {platforms.map((p) => (
            <div
              key={p.platform}
              className="h-full first:rounded-s-pill last:rounded-e-pill"
              style={{ width: `${p.share * 100}%`, backgroundColor: platformColor(p.platform) }}
              title={`${label(p.platform)} ${Math.round(p.share * 100)}%`}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        {platforms.map((p) => (
          <div
            key={p.platform}
            className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
          >
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: platformColor(p.platform) }}
              />
              <span className="text-body font-bold text-body-text">
                <bdi>{label(p.platform)}</bdi>
              </span>
              <span className="font-mono text-meta text-muted-text">
                <bdi>{Math.round(p.share * 100)}%</bdi>
              </span>
              {p.refunded > 0 ? (
                <Chip tone="warn">{t('refunded', { count: p.refunded })}</Chip>
              ) : null}
            </div>
            <div className="flex flex-col items-end">
              <span className="text-body font-bold text-body-text">
                <bdi>{formatCurrency(p.revenue, locale)}</bdi>
              </span>
              <span className="font-mono text-meta text-muted-text">
                {t('ordersCount', { count: formatNumber(p.orders, locale) })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
