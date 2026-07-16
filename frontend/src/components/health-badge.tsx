'use client';

import { useSyncExternalStore } from 'react';
import { CircleAlert, CircleCheck, CircleDashed } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Status = 'checking' | 'live' | 'down';

// Polling cadence is Claude's discretion per CONTEXT.md — 30s keeps the badge
// fresh without hammering the free-tier backend host.
const POLL_INTERVAL_MS = 30_000;

// Module-level external store: polling lives outside React state so the
// subscription (not an effect body) is what starts/stops the interval —
// idiomatic "subscribe to an external system" usage of useSyncExternalStore,
// avoiding a setState-in-effect footgun for something that runs forever.
function createHealthStore() {
  let status: Status = 'checking';
  let intervalId: ReturnType<typeof setInterval> | undefined;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((listener) => listener());

  const check = async () => {
    // D-04 / DEPLOY-02: never fall back to a hardcoded host. If the env var
    // is missing at build/runtime, render the offline state immediately.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      status = 'down';
      notify();
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/health`, { cache: 'no-store' });
      status = res.ok ? 'live' : 'down';
    } catch {
      status = 'down';
    }
    notify();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (!intervalId) {
        check();
        intervalId = setInterval(check, POLL_INTERVAL_MS);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && intervalId) {
          clearInterval(intervalId);
          intervalId = undefined;
        }
      };
    },
    getSnapshot: () => status,
  };
}

const healthStore = createHealthStore();
const getServerSnapshot = (): Status => 'checking';

export function HealthBadge() {
  const t = useTranslations('health');
  const status = useSyncExternalStore(
    healthStore.subscribe,
    healthStore.getSnapshot,
    getServerSnapshot,
  );

  const label = status === 'live' ? t('live') : status === 'down' ? t('offline') : t('checking');
  const Icon = status === 'live' ? CircleCheck : status === 'down' ? CircleAlert : CircleDashed;
  const colorClass =
    status === 'live' ? 'text-risk-a' : status === 'down' ? 'text-risk-d' : 'text-muted-text';

  return (
    <span
      className="inline-flex items-center gap-1 text-meta text-muted-text"
      title={status === 'down' ? t('offlineTooltip') : undefined}
    >
      <Icon aria-hidden className={`h-3.5 w-3.5 shrink-0 ${colorClass}`} />
      <bdi>{label}</bdi>
    </span>
  );
}
