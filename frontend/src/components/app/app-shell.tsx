'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { clearTokens, getAccess, me } from '@/lib/api';
import type { Role, UserOut } from '@/lib/types';
import { Spinner } from '@/components/ui/primitives';
import { RafidMark } from '@/components/rafid-mark';

type NavItem = { href: string; label: string };

// Client-side auth gate for every authed surface. Verifies the stored token
// against /auth/me, enforces the expected role, and renders a compact sub-nav.
export function AppShell({
  role,
  nav,
  children,
}: {
  role: Role;
  nav: NavItem[];
  children: (user: UserOut) => ReactNode;
}) {
  const t = useTranslations('app');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserOut | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'denied'>('loading');

  useEffect(() => {
    if (!getAccess()) {
      router.replace('/login');
      return;
    }
    me()
      .then((u) => {
        if (u.role !== role) {
          setState('denied');
          router.replace(u.role === 'bank_admin' ? '/admin' : '/dashboard');
          return;
        }
        setUser(u);
        setState('ok');
      })
      .catch(() => router.replace('/login'));
  }, [role, router]);

  function logout() {
    clearTokens();
    router.replace('/login');
  }

  if (state !== 'ok' || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <nav className="flex flex-wrap items-center gap-1">
          <span className="me-2 flex items-center gap-2 font-display text-body font-bold text-brand-navy dark:text-brand-cream">
            <RafidMark className="h-5 w-7" />
          </span>
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                locale={locale as 'ar' | 'en'}
                className={`rounded-pill px-4 py-2 text-body font-bold transition-colors ${
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-body-text-muted hover:text-accent'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-meta text-muted-text sm:inline">
            <bdi>{user.email}</bdi>
          </span>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-1.5 rounded-pill border border-hairline px-3 py-2 text-meta text-body-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            <LogOut aria-hidden className="h-4 w-4" />
            {t('logout')}
          </button>
        </div>
      </div>
      {children(user)}
    </div>
  );
}
