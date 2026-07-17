'use client';

import { useLocale } from 'next-intl';
import { RafidMark } from '@/components/rafid-mark';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Faithful, self-contained mockups of the four implemented surfaces, drawn from
 * the same design tokens as the live app. They stand in for live screenshots in
 * the "one platform, four views" gallery: no backend, no network, always crisp
 * for slides. Text is kept numeric / iconic so both locales read cleanly.
 */

function MonoFig({ children }: { children: string }) {
  const ar = useLocale() === 'ar';
  const text = ar ? children.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]) : children;
  return <bdi className="font-mono">{text}</bdi>;
}

/* 1) Merchant dashboard — held-receivables FinCard + revenue sparkline + KPIs */
export function DashboardPreview() {
  const bars = [38, 52, 45, 63, 58, 72, 66, 81, 74, 88, 79, 94];
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-[#06192e] p-4 text-brand-cream">
        <div className="flex items-center justify-between">
          <span className="rounded-pill bg-brand-terra/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-brand-terra">
            SAR
          </span>
          <RafidMark className="h-4 w-6" strokeClassName="text-brand-terra" />
        </div>
        <div className="mt-2 font-display text-[26px] font-bold leading-none">
          <MonoFig>482,000</MonoFig>
        </div>
        <div className="mt-3 flex gap-5">
          {[
            ['90,000', 'terra'],
            ['A-', 'cream'],
            ['7', 'cream'],
          ].map(([v, tone], i) => (
            <div key={i} className="font-mono text-[9px] text-brand-cream/55">
              <div className={`font-display text-[13px] font-medium ${tone === 'terra' ? 'text-brand-terra' : 'text-white'}`}>
                <MonoFig>{v}</MonoFig>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-end rounded-2xl border border-hairline bg-card p-3">
        <div className="mb-2 h-1.5 w-16 rounded-full bg-hairline-strong" />
        <div className="flex h-full items-end gap-1.5">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-[3px] bg-gradient-to-t from-brand-terra/40 to-brand-terra"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* 2) Financing — contract FinCard with repayment progress + schedule rows */
export function FinancingPreview() {
  const rows = [
    ['good', 100],
    ['good', 100],
    ['warn', 55],
    ['muted', 0],
  ] as const;
  const dot = { good: 'bg-risk-a', warn: 'bg-brand-terra', muted: 'bg-hairline-strong' };
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navy to-[#06192e] p-4 text-brand-cream">
        <div className="flex items-center justify-between">
          <span className="rounded-pill bg-brand-terra/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-brand-terra">
            SAR
          </span>
          <RafidMark className="h-4 w-6" strokeClassName="text-brand-terra" />
        </div>
        <div className="mt-2 font-display text-[26px] font-bold leading-none">
          <MonoFig>90,000</MonoFig>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
          <div className="h-full rounded-full bg-brand-terra" style={{ width: '64%' }} />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[9px] text-brand-cream/55">
          <MonoFig>250,000</MonoFig>
          <MonoFig>64%</MonoFig>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 rounded-2xl border border-hairline bg-card p-3">
        {rows.map(([tone, pct], i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className={`h-6 w-6 shrink-0 rounded-full ${i < 3 ? 'bg-page-bg' : 'bg-page-bg'} flex items-center justify-center font-mono text-[9px] text-body-text-muted`}>
              {i + 1}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline-strong">
              <div className={`h-full rounded-full ${tone === 'good' ? 'bg-risk-a' : tone === 'warn' ? 'bg-brand-terra' : 'bg-hairline-strong'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot[tone]}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* 3) Explainable score — gauge + signed contribution bars + reasons */
export function EnginePreview() {
  const C = 2 * Math.PI * 34;
  const contrib = [0.9, 0.6, -0.35, 0.45, -0.2];
  return (
    <div className="flex h-full items-stretch gap-3 p-4">
      <div className="flex w-[42%] flex-col items-center justify-center rounded-2xl border border-hairline bg-card p-3">
        <svg viewBox="0 0 80 80" className="h-24 w-24 -rotate-90">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--color-hairline-strong)" strokeWidth="7" />
          <circle
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="var(--color-risk-a)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${C * 0.82} ${C}`}
          />
        </svg>
        <div className="-mt-16 mb-6 text-center">
          <div className="font-display text-[24px] font-bold text-brand-navy dark:text-brand-cream">
            <MonoFig>82</MonoFig>
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-risk-a">A-</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-2 rounded-2xl border border-hairline bg-card p-3">
        {contrib.map((v, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="flex h-2 flex-1 justify-end">
              {v < 0 ? <span className="h-full rounded-s-full bg-risk-d" style={{ width: `${Math.abs(v) * 100}%` }} /> : null}
            </div>
            <span className="h-3 w-px bg-hairline-strong" />
            <div className="flex h-2 flex-1 justify-start">
              {v > 0 ? <span className="h-full rounded-e-full bg-risk-a" style={{ width: `${v * 100}%` }} /> : null}
            </div>
          </div>
        ))}
        <div className="mt-1 flex flex-col gap-1">
          <span className="h-1.5 w-4/5 rounded-full bg-hairline-strong" />
          <span className="h-1.5 w-3/5 rounded-full bg-hairline-strong" />
        </div>
      </div>
    </div>
  );
}

/* 4) Bank portfolio — KPI tiles + funnel bars + risk donut */
export function BankPreview() {
  const funnel = [100, 82, 61, 44, 33];
  const donut = [
    ['var(--color-risk-a)', 45],
    ['var(--color-brand-terra)', 30],
    ['var(--color-brand-purple)', 25],
  ] as const;
  let acc = 0;
  const C = 2 * Math.PI * 26;
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="grid grid-cols-4 gap-2">
        {['128', '3.4M', '1.1M', '240K'].map((v, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-card p-2">
            <div className={`font-display text-[13px] font-bold ${i === 3 ? 'text-brand-terra' : 'text-brand-navy dark:text-brand-cream'}`}>
              <MonoFig>{v}</MonoFig>
            </div>
            <div className="mt-1 h-1 w-8 rounded-full bg-hairline-strong" />
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-[1.4fr_1fr] gap-2">
        <div className="flex flex-col justify-center gap-1.5 rounded-2xl border border-hairline bg-card p-3">
          {funnel.map((w, i) => (
            <div key={i} className="h-3 rounded-e-md bg-gradient-to-r from-brand-navy to-brand-terra" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="flex items-center justify-center rounded-2xl border border-hairline bg-card p-3">
          <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
            {donut.map(([color, pct], i) => {
              const seg = (pct / 100) * C;
              const el = (
                <circle
                  key={i}
                  cx="32"
                  cy="32"
                  r="26"
                  fill="none"
                  stroke={color}
                  strokeWidth="10"
                  strokeDasharray={`${seg} ${C}`}
                  strokeDashoffset={-acc}
                />
              );
              acc += seg;
              return el;
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
