import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LangToggle } from '@/components/lang-toggle';
import { ThemeToggle } from '@/components/theme-toggle';

export function Header() {
  const t = useTranslations('brand');
  const tNav = useTranslations('nav');

  return (
    <header className="border-b border-hairline bg-card">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="text-h1 font-bold text-brand-navy dark:text-brand-cream">
          {t('name')}
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="flex h-11 items-center justify-center rounded-pill px-4 text-body font-bold text-body-text-muted transition-colors hover:text-accent"
          >
            {tNav('signIn')}
          </Link>
          <LangToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
