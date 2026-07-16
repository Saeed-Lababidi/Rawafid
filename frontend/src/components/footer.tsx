import { useTranslations } from 'next-intl';
import { HealthBadge } from '@/components/health-badge';

export function Footer() {
  const t = useTranslations('disclaimer');

  return (
    <footer className="border-t border-hairline bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-col flex-wrap items-start justify-between gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-6">
        <p className="max-w-3xl text-meta text-muted-text">{t('text')}</p>
        <HealthBadge />
      </div>
    </footer>
  );
}
