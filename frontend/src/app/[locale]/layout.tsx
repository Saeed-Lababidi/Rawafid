import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { QueryProvider } from '@/components/providers/query-provider';
import { ToastProvider } from '@/components/providers/toast-provider';
import './globals.css';

// FOUND-04: only 400/700 render in Phase 1 (weight 500 is a reserved token,
// see globals.css --font-weight-chip). Arabic subset is mandatory — omitting
// it silently drops Arabic glyph coverage (RESEARCH Pitfall 2).
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-plex-arabic',
});

export const metadata: Metadata = {
  title: 'رافد | Rafid',
  description: 'Sharia-compliant Murabaha financing for SMEs, powered by open banking.',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Server-resolved, flash-free theme (D-11/FOUND-02): the `theme` cookie
  // (written by ThemeToggle) is read here so the very first SSR paint
  // already carries the correct class — no client-side flash/hop.
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const t = await getTranslations('nav');

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${plexArabic.variable} ${theme}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-page-bg font-sans text-body-text antialiased">
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <QueryProvider>
              <ToastProvider>
                <a
                  href="#main-content"
                  className="sr-only focus:not-sr-only focus:absolute focus:inset-s-4 focus:top-4 focus:z-50 focus:rounded-pill focus:bg-accent focus:px-4 focus:py-2 focus:text-body focus:text-accent-foreground"
                >
                  {t('skipToContent')}
                </a>
                <Header />
                <main id="main-content" className="flex-1">
                  {children}
                </main>
                <Footer />
              </ToastProvider>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
