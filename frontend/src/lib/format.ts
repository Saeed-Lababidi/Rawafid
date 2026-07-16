// THE single entry point for number / currency / date formatting across Rafid
// (D-16, FOUND-05). Every server-provided figure is FORMATTED here — this
// module performs NO financial arithmetic (no score, fee, profit, or
// days-remaining is computed or derived here; those values arrive already
// calculated from the backend and are only rendered).
//
// Conventions:
// - Western/Latin digits in BOTH locales (Saudi fintech convention) via the
//   `-u-nu-latn` numbering-system extension.
// - Currency symbol position is locale-deterministic: `<amount> ر.س` in Arabic,
//   `SAR <amount>` in English.
// - Dates force the Gregorian calendar via `-u-ca-gregory`; the bare `ar-SA`
//   locale would default to the Islamic Umm al-Qura calendar and silently
//   mismatch the Gregorian backend dates.
//
// Every value returned by these functions is intended to be wrapped by the
// caller in a bidi-isolation boundary so that a run of Latin digits inside
// right-to-left Arabic text never visually reorders.

export type Locale = 'ar' | 'en';

// Fixed placeholder for absent values — never render 'NaN' or 'Invalid Date'.
const PLACEHOLDER = '—';

const numberLocale = (locale: Locale): string =>
  locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';

const dateLocale = (locale: Locale): string =>
  locale === 'ar' ? 'ar-SA-u-ca-gregory-nu-latn' : 'en-US';

export function formatNumber(
  value: number | null | undefined,
  locale: Locale,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return PLACEHOLDER;
  }
  return new Intl.NumberFormat(numberLocale(locale)).format(value);
}

export function formatCurrency(
  value: number | null | undefined,
  locale: Locale,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return PLACEHOLDER;
  }
  const formatted = new Intl.NumberFormat(numberLocale(locale), {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return locale === 'ar' ? `${formatted} ر.س` : `SAR ${formatted}`;
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: Locale,
): string {
  if (value === null || value === undefined) {
    return PLACEHOLDER;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return PLACEHOLDER;
  }
  return new Intl.DateTimeFormat(dateLocale(locale), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}
