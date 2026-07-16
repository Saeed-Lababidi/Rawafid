'use client';

import { useEffect, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { clearTokens, getAccess, me, onAuthExpired } from '@/lib/api';
import { qk } from '@/lib/query';
import type { Role, UserOut } from '@/lib/types';
import { Spinner } from '@/components/ui/primitives';

type NavItem = { href: string; label: string };

/**
 * Auth gate for every authed surface: resolves the session via /auth/me,
 * enforces the expected role, and renders the sub-nav.
 *
 * This is UX routing, not security — the backend re-derives identity from the
 * token on every request and owns the actual authorization decision.
 */
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
  const queryClient = useQueryClient();

  const hasToken = typeof window !== 'undefined' && Boolean(getAccess());

  const { data: user, isError } = useQuery({
    queryKey: qk.me,
    queryFn: me,
    enabled: hasToken,
    staleTime: 60_000,
    retry: false,
  });

  // The transport layer clears tokens and fires this once when refresh fails
  // terminally; it has no router access, so the redirect lands here.
  useEffect(() => {
    return onAuthExpired(() => {
      queryClient.clear();
      router.replace('/login');
    });
  }, [queryClient, router]);

  useEffect(() => {
    if (!hasToken || isError) router.replace('/login');
  }, [hasToken, isError, router]);

  // Wrong surface for this role: send the user to their own home rather than
  // showing a 403 they can do nothing about.
  useEffect(() => {
    if (user && user.role !== role) {
      router.replace(user.role === 'bank_admin' ? '/admin' : '/dashboard');
    }
  }, [user, role, router]);

  function logout() {
    clearTokens();
    queryClient.clear();
    router.replace('/login');
  }

  if (!user || user.role !== role) {
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
