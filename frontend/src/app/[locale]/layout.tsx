import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { IBM_Plex_Sans_Arabic, Space_Grotesk, Space_Mono } from 'next/font/google';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import { routing } from '@/i18n/routing';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import './globals.css';

// Arabic subset is mandatory - omitting it silently drops Arabic glyph
// coverage (RESEARCH Pitfall 2). 500 now renders (chip weight, brand-system).
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-plex-arabic',
});

// Brand-system display + figure fonts. Latin-only by nature.
// adjustFontFallback:false is CRITICAL - next/font otherwise synthesises an
// Arial-based metric fallback, and Arial *has* Arabic glyphs, so Arabic text
// flowing through the --font-display / --font-mono chain would render in
// size-adjusted Arial instead of IBM Plex Sans Arabic (the "wrong Arabic font"
// bug). With it off, missing Arabic glyphs fall straight through to Plex Arabic,
// and in ar locale globals.css pins these tokens to Plex Arabic outright.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-space-grotesk',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-space-mono',
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
  // already carries the correct class - no client-side flash/hop.
  const cookieStore = await cookies();
  const theme = cookieStore.get('theme')?.value === 'dark' ? 'dark' : 'light';
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const t = await getTranslations('nav');

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${plexArabic.variable} ${spaceGrotesk.variable} ${spaceMono.variable} ${theme}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col bg-page-bg font-sans text-body-text antialiased">
        <NextIntlClientProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
