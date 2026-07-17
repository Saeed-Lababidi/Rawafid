'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { ApiError } from '@/lib/api';

type ToastTone = 'success' | 'error' | 'info';
type Toast = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  toast: (message: string, tone?: ToastTone) => void;
  /**
   * Surface a thrown API failure. 400s carry a hand-authored, user-presentable
   * `detail` from the backend and are shown verbatim; anything else falls back
   * to the caller's translated copy so we never leak a raw 500/network string.
   */
  toastError: (error: unknown, fallback: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

const TONE_STYLE: Record<ToastTone, string> = {
  success: 'bg-chip-good-bg text-chip-good-text border-chip-good-border',
  error: 'bg-chip-destructive-bg text-chip-destructive-text border-chip-destructive-border',
  info: 'bg-chip-info-bg text-chip-info-text border-chip-info-border',
};

const TONE_ICON: Record<ToastTone, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
};

const TOAST_MS = 5_000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, tone, message }]);
      setTimeout(() => dismiss(id), TOAST_MS);
    },
    [dismiss],
  );

  const toastError = useCallback(
    (error: unknown, fallback: string) => {
      const message =
        error instanceof ApiError && error.isBusinessRule ? error.message : fallback;
      toast(message, 'error');
    },
    [toast],
  );

  const api = useMemo(() => ({ toast, toastError }), [toast, toastError]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => {
          const Icon = TONE_ICON[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-tile border px-4 py-3 shadow-lg ${TONE_STYLE[t.tone]}`}
            >
              <Icon aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 text-body">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-60 transition-opacity hover:opacity-100"
                aria-label="Dismiss"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
