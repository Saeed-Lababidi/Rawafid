/**
 * Rafid's custom icon set (brand-system.html §05 "One stroke, one current").
 * 24px grid · 2px rounded strokes · ink stroke inherits `currentColor` so the
 * caller controls it via text color · exactly ONE terracotta accent stroke per
 * icon (the "current") drawn in var(--color-brand-terra) so it flips with theme.
 */
import type { SVGProps } from 'react';

const ACCENT = 'var(--color-brand-terra)';

function Base({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconInvoice(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h10M7 13h6" />
      <path d="M3 16c4 1 6-2 10-1s5-1 8 0" stroke={ACCENT} />
    </Base>
  );
}

export function IconGrowth(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 18V9M9 18v-5M14 18v-8M19 18V6" />
      <path d="M3 21h18" />
      <path d="M4 12c4-4 7 1 11-3s4 0 4 0" stroke={ACCENT} />
    </Base>
  );
}

export function IconSharia(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z" />
      <path d="M8 12c2 2 4 2 8-2" stroke={ACCENT} />
    </Base>
  );
}

export function IconWallet(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="16" cy="12" r="2" />
      <path d="M3 11c4 1 6-1 9 0" stroke={ACCENT} />
    </Base>
  );
}

export function IconClock48(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M4 15c3 1 5-1 8 0" stroke={ACCENT} />
    </Base>
  );
}

export function IconCashflow(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 8h9l3 3 3-3M4 12h6" />
      <circle cx="18" cy="16" r="2" />
      <path d="M4 16c4 1 7-2 11 0" stroke={ACCENT} />
    </Base>
  );
}

export function IconSME(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M3 21V8l9-5 9 5v13" />
      <path d="M9 21v-6h6v6" />
      <path d="M3 14c4 1 6-2 10-1s5-1 8 0" stroke={ACCENT} />
    </Base>
  );
}

export function IconApproved(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M5 12l4 4 10-10" />
      <path d="M4 8c4-1 6 1 10-1" stroke={ACCENT} />
    </Base>
  );
}

export function IconConnect(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M10 8H7a4 4 0 0 0 0 8h3M14 16h3a4 4 0 0 0 0-8h-3" />
      <path d="M8 12c3-1 5 1 8 0" stroke={ACCENT} />
    </Base>
  );
}

export function IconRepeat(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M17 4l3 3-3 3M20 7H8a4 4 0 0 0-4 4M7 20l-3-3 3-3M4 17h12a4 4 0 0 0 4-4" stroke={ACCENT} />
      <path d="M4 11a4 4 0 0 1 4-4h12" />
    </Base>
  );
}

export function IconRiskShield(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6z" />
      <path d="M12 8v4" stroke={ACCENT} />
      <path d="M12 15h0.01" stroke={ACCENT} />
    </Base>
  );
}

export function IconLiveData(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 19V5M4 19h16" />
      <path d="M8 15l3-4 3 2 4-6" stroke={ACCENT} />
    </Base>
  );
}
