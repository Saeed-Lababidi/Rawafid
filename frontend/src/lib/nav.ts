// One nav definition per role, so a new screen can't drift out of the menu on
// one page and into it on another. `key` indexes the `app` message namespace.

export const MERCHANT_NAV = [
  { href: '/dashboard', key: 'dashboard' },
  { href: '/sales', key: 'sales' },
  { href: '/cashflow', key: 'cashflow' },
  { href: '/financing', key: 'financing' },
  { href: '/settings', key: 'settings' },
] as const;

export const ADMIN_NAV = [{ href: '/admin', key: 'portfolio' }] as const;

// Every authed surface renders its own AppShell chrome (logo, nav, sign-out),
// so the global marketing header must stay off them — otherwise the page shows
// two navbars, the second offering "Sign in" to someone already signed in.
//
// Derived from the nav definitions above so a new screen can't be added to the
// menu and forget to suppress the header. `/connect` is listed separately: it
// is an AppShell surface that is deliberately in no menu.
const APP_ROUTES: readonly string[] = [
  ...MERCHANT_NAV.map((n) => n.href),
  ...ADMIN_NAV.map((n) => n.href),
  '/connect',
];

/**
 * Whether `pathname` is an authed AppShell surface.
 *
 * Expects a locale-stripped pathname — what `usePathname` from
 * `@/i18n/navigation` returns (`/dashboard`, never `/en/dashboard`).
 * Prefix-matches so nested routes like `/admin/merchants/:id` are covered.
 */
export function isAppRoute(pathname: string): boolean {
  return APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}
