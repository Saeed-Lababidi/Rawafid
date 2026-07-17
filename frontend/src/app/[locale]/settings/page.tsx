'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Landmark, Store } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { AppShell } from '@/components/app/app-shell';
import { Button, Card, Chip } from '@/components/ui/primitives';
import { QueryBoundary, Skeleton } from '@/components/ui/query-boundary';
import { useToast } from '@/components/providers/toast-provider';
import { getConnections, getMerchant, revokeConnection, updateMerchant } from '@/lib/api';
import { qk } from '@/lib/query';
import { MERCHANT_NAV } from '@/lib/nav';
import type { ConnectionOut } from '@/lib/types';

const BUSINESS_TYPES = ['ecommerce', 'food', 'other'] as const;
const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Mecca', 'Medina'] as const;

export default function SettingsPage() {
  const t = useTranslations('settings');
  const tConnect = useTranslations('connect');
  const tNav = useTranslations('app');
  const queryClient = useQueryClient();
  const { toast, toastError } = useToast();

  const nav = MERCHANT_NAV.map((n) => ({ href: n.href, label: tNav(n.key) }));

  const merchantQ = useQuery({ queryKey: qk.merchant, queryFn: getMerchant });
  const connectionsQ = useQuery({ queryKey: qk.connections, queryFn: getConnections });

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState('ecommerce');
  const [city, setCity] = useState('Riyadh');
  const [confirming, setConfirming] = useState<ConnectionOut | null>(null);

  // Seed the form once the profile arrives. Keyed on id so switching accounts
  // (or a refetch after save) doesn't clobber in-progress edits.
  useEffect(() => {
    if (!merchantQ.data) return;
    setName(merchantQ.data.name);
    setBusinessType(merchantQ.data.business_type);
    setCity(merchantQ.data.city);
  }, [merchantQ.data?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveM = useMutation({
    mutationFn: updateMerchant,
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.merchant, updated);
      toast(t('saved'), 'success');
    },
    onError: (e) => toastError(e, t('error')),
  });

  const revokeM = useMutation({
    mutationFn: (id: string) => revokeConnection(id),
    onSuccess: () => {
      setConfirming(null);
      toast(t('revoked'), 'success');
      queryClient.invalidateQueries({ queryKey: qk.connections });
      // Revoked sources contribute nothing to future aggregations, so anything
      // derived from them is now stale.
      queryClient.invalidateQueries({ queryKey: qk.aggregate });
    },
    onError: (e) => {
      setConfirming(null);
      toastError(e, t('error'));
    },
  });

  const connections = connectionsQ.data ?? [];
  const merchant = merchantQ.data;
  const dirty =
    Boolean(merchant) &&
    (name !== merchant!.name ||
      businessType !== merchant!.business_type ||
      city !== merchant!.city);

  return (
    <AppShell role="merchant" nav={nav}>
      {() => (
        <QueryBoundary
          isLoading={merchantQ.isLoading || connectionsQ.isLoading}
          isError={merchantQ.isError || connectionsQ.isError}
          onRetry={() => {
            merchantQ.refetch();
            connectionsQ.refetch();
          }}
          skeleton={
            <div className="flex flex-col gap-6">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-56 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          }
        >
          <div className="flex flex-col gap-6">
            <h1 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">
              {t('title')}
            </h1>

            {/* Profile */}
            <Card className="flex flex-col gap-4">
              <h2 className="text-body font-bold text-body-text">{t('profileTitle')}</h2>

              <label className="flex flex-col gap-1.5">
                <span className="text-meta text-body-text-muted">{t('businessName')}</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-tile border border-hairline-strong bg-page-bg px-4 text-body text-body-text outline-none focus:border-accent"
                />
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

              <div className="flex items-center gap-3">
                <Button
                  loading={saveM.isPending}
                  disabled={!dirty}
                  onClick={() => saveM.mutate({ name, business_type: businessType, city })}
                >
                  {t('save')}
                </Button>
                <span className="text-meta text-muted-text">
                  {t('verification', {
                    status: merchant ? t(`verificationStatus.${merchant.verification_status}`) : '',
                  })}
                </span>
              </div>
            </Card>

            {/* Connections */}
            <Card className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-body font-bold text-body-text">{t('connectionsTitle')}</h2>
                <p className="text-meta text-muted-text">{t('connectionsHint')}</p>
              </div>

              {connections.length === 0 ? (
                <div className="flex flex-col items-start gap-3">
                  <span className="text-meta text-muted-text">{t('noConnections')}</span>
                  <Link
                    href="/connect"
                    className="inline-flex h-11 items-center rounded-pill bg-accent px-6 text-body font-bold text-accent-foreground hover:opacity-90"
                  >
                    {t('connectCta')}
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {connections.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-tile border border-hairline px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        {c.type === 'bank' ? (
                          <Landmark aria-hidden className="h-4 w-4 text-muted-text" />
                        ) : (
                          <Store aria-hidden className="h-4 w-4 text-muted-text" />
                        )}
                        <span className="text-body text-body-text">
                          <bdi>
                            {c.type === 'bank'
                              ? tConnect(`banks.${c.institution}`)
                              : tConnect(`platforms.${c.institution}`)}
                          </bdi>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Chip
                          tone={
                            c.status === 'active'
                              ? 'good'
                              : c.status === 'revoked'
                                ? 'destructive'
                                : 'neutral'
                          }
                        >
                          {tConnect(`status.${c.status}`)}
                        </Chip>
                        {c.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => setConfirming(c)}
                            className="rounded-pill border border-hairline px-3 py-1 text-meta text-body-text-muted transition-colors hover:border-risk-d hover:text-risk-d"
                          >
                            {t('revoke')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <ConfirmRevoke />
          </div>
        </QueryBoundary>
      )}
    </AppShell>
  );

  function ConfirmRevoke() {
    if (!confirming) return null;
    const label =
      confirming.type === 'bank'
        ? tConnect(`banks.${confirming.institution}`)
        : tConnect(`platforms.${confirming.institution}`);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/50 px-4">
        <Card className="flex w-full max-w-sm flex-col gap-4">
          <h2 className="text-body font-bold text-body-text">{t('revokeTitle')}</h2>
          <p className="text-body text-body-text-muted">{t('revokeBody', { institution: label })}</p>
          <div className="flex flex-wrap gap-3">
            <Button loading={revokeM.isPending} onClick={() => revokeM.mutate(confirming.id)}>
              {t('revokeConfirm')}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              {t('cancel')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}
