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
