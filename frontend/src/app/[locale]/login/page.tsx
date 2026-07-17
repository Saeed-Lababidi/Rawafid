'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { ApiError, login, roleFromToken, setTokens } from '@/lib/api';
import { Alert, Button } from '@/components/ui/primitives';
import { RafidMark } from '@/components/rafid-mark';
import { FlowLines } from '@/components/flow-lines';

const DEMO = [
  { key: 'merchantHealthy', email: 'merchant03@rafid.sa', password: 'MerchantPass123!' },
  { key: 'merchantRisky', email: 'merchant17@rafid.sa', password: 'MerchantPass123!' },
  { key: 'admin', email: 'admin@rafid.sa', password: 'AdminPass123!' },
];

export default function LoginPage() {
  const t = useTranslations('login');
  const tBrand = useTranslations('brand');
  const tHero = useTranslations('hero');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function submit(withEmail: string, withPassword: string, tag: string) {
    setError(null);
    setBusy(tag);
    try {
      const pair = await login(withEmail, withPassword);
      setTokens(pair);
      const role = roleFromToken(pair.access_token);
      router.replace(role === 'bank_admin' ? '/admin' : '/dashboard');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('genericError'));
      setBusy(null);
    }
  }

  const inputClass =
    'h-11 rounded-tile border border-hairline-strong bg-page-bg px-4 text-body text-body-text outline-none transition-shadow focus:border-accent focus:shadow-[0_0_0_4px_rgba(195,107,78,0.15)]';

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:py-16">
      <div className="grid overflow-hidden rounded-card border border-card-border shadow-[0_28px_60px_-34px_rgba(3,35,65,0.5)] lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative flex min-h-[220px] flex-col justify-between overflow-hidden bg-brand-navy p-8 text-brand-cream">
          <FlowLines className="pointer-events-none absolute inset-0 h-full w-full opacity-80" idSuffix="login" />
          <div className="relative flex items-center gap-2.5 font-display text-[22px] font-bold">
            <RafidMark className="h-6 w-8" strokeClassName="text-brand-cream" />
            {tBrand('name')}
          </div>
          <div className="relative mt-8">
            <p className="max-w-[26ch] font-display text-[24px] font-bold leading-tight text-white">
              {tBrand('tagline')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {[tHero('meta.categoryValue'), tHero('meta.modelValue'), tHero('meta.builtForValue')].map((chip) => (
                <span
                  key={chip}
                  className="inline-flex items-center gap-1.5 rounded-pill border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[12.5px] font-medium text-brand-cream/90"
                >
                  <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-terra" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col gap-5 bg-card p-8">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-h1 font-bold text-brand-navy dark:text-brand-cream">
              {t('title')}
            </h1>
            <p className="text-body text-body-text-muted">{t('subtitle')}</p>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit(email, password, 'form');
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-body-text-muted">
                {t('email')}
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
                className={inputClass}
                placeholder="owner@shop.sa"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-body-text-muted">
                {t('password')}
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className={inputClass}
                placeholder="••••••••"
              />
            </label>
            {error ? <Alert>{error}</Alert> : null}
            <Button type="submit" loading={busy === 'form'} className="w-full">
              {t('signIn')}
            </Button>
          </form>

          <div className="flex flex-col gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-text">
              {t('demoLabel')}
            </span>
            <div className="flex flex-col gap-2">
              {DEMO.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => submit(d.email, d.password, d.key)}
                  disabled={busy !== null}
                  className="flex items-center justify-between rounded-tile border border-hairline-strong bg-page-bg px-4 py-3 text-start transition-colors hover:border-accent disabled:opacity-50"
                >
                  <span className="flex flex-col">
                    <span className="text-body font-bold text-body-text">{t(`demo.${d.key}.name`)}</span>
                    <span className="text-meta text-muted-text">{t(`demo.${d.key}.desc`)}</span>
                  </span>
                  <span className="font-mono text-body text-accent">{busy === d.key ? '…' : '→'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
