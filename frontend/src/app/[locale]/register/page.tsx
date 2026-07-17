'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@/i18n/navigation';
import { ApiError, register, setTokens } from '@/lib/api';
import { Alert, Button, Card } from '@/components/ui/primitives';

// Mirrors app/schemas/auth.py RegisterRequest. `established_at` is omitted —
// the backend defaults it to ~2 years ago, and asking a merchant to date their
// own founding adds a field with no demo value.
const BUSINESS_TYPES = ['ecommerce', 'food', 'other'] as const;
const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina'] as const;

const PASSWORD_MIN = 8;

export default function RegisterPage() {
  const t = useTranslations('register');
  const router = useRouter();
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState<string>('ecommerce');
  const [city, setCity] = useState<string>('Riyadh');
  const [formError, setFormError] = useState<string | null>(null);
  // 422 field errors, keyed by the backend's field name (ApiError.fields).
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const registerM = useMutation({
    mutationFn: register,
    onSuccess: (pair) => {
      // Register returns a TokenPair — the merchant is signed in immediately.
      setTokens(pair);
      queryClient.clear();
      // A brand-new merchant has no connections yet, so onboarding is the only
      // sensible destination.
      router.replace('/connect');
    },
    onError: (e) => {
      setFieldErrors({});
      setFormError(null);
      if (e instanceof ApiError) {
        if (Object.keys(e.fields).length > 0) {
          setFieldErrors(e.fields);
          return;
        }
        // 409 = email already registered; 400 = business rule. Both presentable.
        if (e.status < 500) {
          setFormError(e.message);
          return;
        }
      }
      setFormError(t('genericError'));
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    registerM.mutate({
      email,
      password,
      business_name: businessName,
      business_type: businessType,
      city,
    });
  }

  const inputClass = (field: string) =>
    `h-11 rounded-tile border bg-page-bg px-4 text-body text-body-text outline-none focus:border-accent ${
      fieldErrors[field] ? 'border-risk-d' : 'border-hairline-strong'
    }`;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">{t('title')}</h1>
        <p className="text-body text-body-text-muted">{t('subtitle')}</p>
      </div>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta text-body-text-muted">{t('businessName')}</span>
            <input
              type="text"
              required
              minLength={2}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass('business_name')}
              placeholder={t('businessNamePlaceholder')}
            />
            {fieldErrors.business_name ? (
              <span className="text-meta text-risk-d">{fieldErrors.business_name}</span>
            ) : null}
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-meta text-body-text-muted">{t('businessType')}</span>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="h-11 rounded-tile border border-hairline-strong bg-page-bg px-3 text-body text-body-text outline-none focus:border-accent"
              >
                {BUSINESS_TYPES.map((b) => (
                  <option key={b} value={b}>
                    {t(`types.${b}`)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-meta text-body-text-muted">{t('city')}</span>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 rounded-tile border border-hairline-strong bg-page-bg px-3 text-body text-body-text outline-none focus:border-accent"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`cities.${c}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-meta text-body-text-muted">{t('email')}</span>
            <input
              type="email"
              required
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass('email')}
              placeholder="owner@shop.sa"
            />
            {fieldErrors.email ? (
              <span className="text-meta text-risk-d">{fieldErrors.email}</span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-meta text-body-text-muted">{t('password')}</span>
            <input
              type="password"
              required
              minLength={PASSWORD_MIN}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass('password')}
              placeholder="••••••••"
            />
            {fieldErrors.password ? (
              <span className="text-meta text-risk-d">{fieldErrors.password}</span>
            ) : (
              <span className="text-meta text-muted-text">
                {t('passwordHint', { min: PASSWORD_MIN })}
              </span>
            )}
          </label>

          {formError ? <Alert>{formError}</Alert> : null}

          <Button type="submit" loading={registerM.isPending} className="w-full">
            {t('submit')}
          </Button>
        </form>
      </Card>

      <p className="text-center text-meta text-body-text-muted">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-bold text-accent hover:underline">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}
