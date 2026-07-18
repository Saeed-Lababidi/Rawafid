'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { LangToggle } from '@/components/lang-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { RafidMark } from '@/components/rafid-mark';
import { isAppRoute } from '@/lib/nav';

export function Header() {
  const t = useTranslations('brand');
  const tNav = useTranslations('nav');
  const pathname = usePathname();

  // The landing page carries its own full-bleed hero nav, and every authed
  // surface carries AppShell's, so the global chrome steps aside for both.
  // It survives only on /login and /register, which have no chrome of their own.
  if (pathname === '/' || isAppRoute(pathname)) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-page-bg/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-brand-navy dark:text-brand-cream"
        >
          <RafidMark className="h-9 w-12" />
          <span className="font-display text-[18px] font-bold">{t('name')}</span>
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
