import { defineRouting } from 'next-intl/routing';

// Locale-prefixed routing foundation (D-08, FOUND-01).
// Arabic is the default locale; every route is always prefixed (/ar/... or
// /en/...) - the bare "/" redirects to /ar. next-intl's middleware records the
// resolved locale in a cookie, so a returning visitor's choice persists across
// a refresh (cookie takes priority over Accept-Language).
export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always',
});
