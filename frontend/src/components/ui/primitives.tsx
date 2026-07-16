'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import type { RiskBand } from '@/lib/types';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-card-border bg-card p-5 sm:p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-tile border p-4 ${
        accent
          ? 'border-accent/30 bg-accent/5'
          : 'border-card-border bg-card'
      }`}
    >
      <span className="text-meta text-muted-text">{label}</span>
      <span
        className={`text-h1 font-bold ${accent ? 'text-accent' : 'text-brand-navy dark:text-brand-cream'}`}
      >
        <bdi>{value}</bdi>
      </span>
      {hint ? <span className="text-meta text-body-text-muted">{hint}</span> : null}
    </div>
  );
}

type ChipTone = 'good' | 'warn' | 'destructive' | 'info' | 'neutral';

const CHIP_TONE: Record<ChipTone, string> = {
  good: 'bg-chip-good-bg text-chip-good-text border-chip-good-border',
  warn: 'bg-chip-warn-bg text-chip-warn-text border-chip-warn-border',
  destructive: 'bg-chip-destructive-bg text-chip-destructive-text border-chip-destructive-border',
  info: 'bg-chip-info-bg text-chip-info-text border-chip-info-border',
  neutral: 'bg-hairline text-body-text-muted border-card-border',
};

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: ChipTone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill border px-3 py-0.5 text-meta font-medium ${CHIP_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

const BAND_TONE: Record<RiskBand, ChipTone> = { A: 'good', B: 'good', C: 'warn', D: 'destructive' };

export function RiskChip({ band }: { band: RiskBand }) {
  return <Chip tone={BAND_TONE[band]}>{band}</Chip>;
}

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}) {
  const base =
    'inline-flex h-11 items-center justify-center gap-2 rounded-pill px-6 text-body font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50';
  const styles = {
    primary: 'bg-accent text-accent-foreground hover:opacity-90',
    secondary: 'border border-hairline-strong bg-card text-body-text hover:border-accent hover:text-accent',
    ghost: 'text-body-text-muted hover:text-accent',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${styles} ${className}`}
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 aria-hidden className={`h-5 w-5 animate-spin text-muted-text ${className}`} />;
}

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-pill bg-hairline-strong">
      <div
        className="h-full rounded-pill bg-accent transition-[width] duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-h1 font-bold text-brand-navy dark:text-brand-cream">{children}</h2>
  );
}

export function Alert({ tone = 'destructive', children }: { tone?: ChipTone; children: ReactNode }) {
  return (
    <div className={`rounded-tile border px-4 py-3 text-body ${CHIP_TONE[tone]}`}>{children}</div>
  );
}
