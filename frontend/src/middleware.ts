import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Exclude /api, /_next, /_vercel and any file-with-extension so asset
  // requests are never locale-redirected (which would 404 them).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
