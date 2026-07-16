import { useTranslations } from 'next-intl';
import { LangToggle } from '@/components/lang-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  const t = useTranslations('brand');

  return (
    <header className="border-b border-hairline bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <span className="text-h1 font-bold text-brand-navy dark:text-brand-cream">{t('name')}</span>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
