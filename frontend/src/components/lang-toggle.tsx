'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';

export function LangToggle() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const nextLocale = locale === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: nextLocale })}
      aria-label={t('languageToggleAria')}
      className="flex h-11 min-w-11 items-center justify-center rounded-pill border border-hairline bg-card px-4 text-body font-bold text-body-text transition-colors hover:border-accent hover:text-accent"
    >
      {t('languageToggle')}
    </button>
  );
}
