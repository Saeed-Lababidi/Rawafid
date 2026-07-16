'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // ~1 year

const noopSubscribe = () => () => {};

// Hydration-safe mount detection without an effect-driven setState (avoids
// the extra render pass react-hooks/set-state-in-effect flags): the server
// snapshot is always `false`, the client snapshot is always `true`.
function useHasMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('nav');
  // Avoid a hydration mismatch: `theme` is undefined on the server/first
  // client render (next-themes only knows it after mount). The <html> class
  // is already correct from the server-resolved cookie (D-11/FOUND-02) — we
  // only need `mounted` to safely read `theme` for the icon/label.
  const mounted = useHasMounted();

  const isDark = mounted && theme === 'dark';

  const handleToggle = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    // Mirror the choice into a cookie so the *next* request's server render
    // already resolves to `next` — next-themes only persists to localStorage.
    document.cookie = `theme=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax`;
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? t('themeToggleToLight') : t('themeToggleToDark')}
      className="flex h-11 w-11 items-center justify-center rounded-pill border border-hairline bg-card text-body-text transition-colors hover:border-accent hover:text-accent"
    >
      {isDark ? <Sun aria-hidden className="h-5 w-5" /> : <Moon aria-hidden className="h-5 w-5" />}
    </button>
  );
}
