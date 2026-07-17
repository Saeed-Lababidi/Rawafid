import type { ReactNode } from 'react';
import { RafidMark } from '@/components/rafid-mark';
import { FlowLines } from '@/components/flow-lines';

/**
 * Section eyebrow - mono label with the terracotta tick (brand-system.html
 * .eyebrow / tokens.css). `tone` maps to the accent color used for the label
 * text; the tick is always terracotta.
 */
export function Eyebrow({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-mono text-[12px] font-medium uppercase tracking-[0.14em] ${className}`}
    >
      <span aria-hidden className="h-0.5 w-6 rounded-full bg-brand-terra" />
      {children}
    </span>
  );
}

/**
 * The financing card (brand-system.html §07 .fin-card): a dark navy→ink
 * gradient plate with drifting terracotta streaks, a status badge, a headline
 * amount, and a row of mono figures. The brand's hero money object - reused on
 * the landing tour, the merchant dashboard, and the financing surfaces.
 */
export function FinCard({
  badge,
  amount,
  amountCaption,
  rows,
  footer,
  className = '',
}: {
  badge: ReactNode;
  amount: ReactNode;
  amountCaption?: ReactNode;
  rows?: { label: ReactNode; value: ReactNode }[];
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-card bg-gradient-to-br from-brand-navy to-[#06192e] p-6 text-brand-cream shadow-[0_28px_60px_-30px_rgba(3,35,65,0.7)] ${className}`}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-50"
        viewBox="0 0 400 260"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g fill="none" stroke="#C36B4E" strokeWidth="1.4" strokeLinecap="round">
          <path d="M-10 60 C 120 50, 200 110, 420 90" />
          <path d="M-10 120 C 140 120, 220 150, 420 140" />
          <path d="M-10 190 C 150 185, 240 165, 420 175" />
        </g>
      </svg>

      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-terra/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-brand-terra">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-terra" />
          {badge}
        </span>
        <RafidMark className="h-5 w-7 shrink-0" strokeClassName="text-brand-terra" />
      </div>

      <div className="relative mt-5 flex items-baseline gap-2 font-display text-[38px] font-bold tracking-tight">
        <bdi>{amount}</bdi>
        {amountCaption ? (
          <span className="font-mono text-[13px] font-normal text-brand-cream/60">{amountCaption}</span>
        ) : null}
      </div>

      {rows && rows.length > 0 ? (
        <div className="relative mt-5 flex flex-wrap gap-x-7 gap-y-3">
          {rows.map((row, i) => (
            <div key={i} className="font-mono text-[11px] text-brand-cream/55">
              {row.label}
              <b className="mt-1 block font-display text-[15px] font-medium tracking-normal text-white">
                <bdi>{row.value}</bdi>
              </b>
            </div>
          ))}
        </div>
      ) : null}

      {footer ? <div className="relative mt-5">{footer}</div> : null}
    </div>
  );
}

/**
 * Status strip with a glowing dot (brand-system.html .status). Sits inside or
 * below a FinCard to signal application/contract state.
 */
export function StatusStrip({
  title,
  detail,
  tone = 'accent',
}: {
  title: ReactNode;
  detail?: ReactNode;
  tone?: 'accent' | 'good';
}) {
  const dot = tone === 'good' ? 'bg-risk-a shadow-[0_0_0_4px_rgba(47,97,64,0.18)]' : 'bg-brand-terra shadow-[0_0_0_4px_rgba(195,107,78,0.18)]';
  const ring = tone === 'good' ? 'border-chip-good-border bg-chip-good-bg/60' : 'border-brand-terra/30 bg-brand-terra/10';
  return (
    <div className={`flex items-center gap-3 rounded-tile border px-4 py-3 ${ring}`}>
      <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <div className="flex flex-col">
        <span className="text-body font-bold text-body-text">{title}</span>
        {detail ? <span className="text-meta text-body-text-muted">{detail}</span> : null}
      </div>
    </div>
  );
}

/**
 * A dark brand panel with the flow-line atmosphere behind it - used for hero
 * bands, the auth split, and CTA sections so the whole product shares one
 * recognisable "deep water" surface.
 */
export function DarkFlowSurface({
  children,
  className = '',
  idSuffix = 'surface',
}: {
  children: ReactNode;
  className?: string;
  idSuffix?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-brand-navy text-brand-cream ${className}`}>
      <FlowLines className="pointer-events-none absolute inset-0 h-full w-full opacity-90" idSuffix={idSuffix} />
      <div className="relative">{children}</div>
    </div>
  );
}
