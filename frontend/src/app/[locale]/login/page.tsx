'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@/i18n/navigation';
import { ApiError, login, roleFromToken, setTokens } from '@/lib/api';
import { Alert, Button, Card } from '@/components/ui/primitives';

const DEMO = [
  { key: 'merchantHealthy', email: 'merchant03@rafid.sa', password: 'MerchantPass123!' },
  { key: 'merchantRisky', email: 'merchant17@rafid.sa', password: 'MerchantPass123!' },
  { key: 'admin', email: 'admin@rafid.sa', password: 'AdminPass123!' },
];

export default function LoginPage() {
  const t = useTranslations('login');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loginM = useMutation({
    mutationFn: ({ email: e, password: p }: { email: string; password: string }) => login(e, p),
    onSuccess: (pair) => {
      setTokens(pair);
      // Drop any cache belonging to a previously signed-in account before the
      // new surface mounts and starts reading it.
      queryClient.clear();
      const role = roleFromToken(pair.access_token);
      router.replace(role === 'bank_admin' ? '/admin' : '/dashboard');
    },
    onError: (e) => {
      // 401 here means bad credentials — the backend's `detail` is presentable.
      // Anything else (500, network) gets the translated fallback.
      const presentable = e instanceof ApiError && e.status < 500;
      setError(presentable ? e.message : t('genericError'));
      setBusy(null);
    },
  });

  function submit(withEmail: string, withPassword: string, tag: string) {
    setError(null);
    setBusy(tag);
    loginM.mutate({ email: withEmail, password: withPassword });
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">{t('title')}</h1>
        <p className="text-body text-body-text-muted">{t('subtitle')}</p>
      </div>

      <Card className="flex flex-col gap-4">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit(email, password, 'form');
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-meta text-body-text-muted">{t('email')}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="h-11 rounded-tile border border-hairline-strong bg-page-bg px-4 text-body text-body-text outline-none focus:border-accent"
              placeholder="owner@shop.sa"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-meta text-body-text-muted">{t('password')}</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className="h-11 rounded-tile border border-hairline-strong bg-page-bg px-4 text-body text-body-text outline-none focus:border-accent"
              placeholder="••••••••"
            />
          </label>
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" loading={busy === 'form'} className="w-full">
            {t('signIn')}
          </Button>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        <span className="text-meta text-muted-text">{t('demoLabel')}</span>
        <div className="flex flex-col gap-2">
          {DEMO.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => submit(d.email, d.password, d.key)}
              disabled={busy !== null}
              className="flex items-center justify-between rounded-tile border border-hairline-strong bg-card px-4 py-3 text-start transition-colors hover:border-accent disabled:opacity-50"
            >
              <span className="flex flex-col">
                <span className="text-body font-bold text-body-text">{t(`demo.${d.key}.name`)}</span>
                <span className="text-meta text-muted-text">{t(`demo.${d.key}.desc`)}</span>
              </span>
              <span className="text-meta text-accent">{busy === d.key ? '…' : '→'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
