'use client';

// Lightweight hand-rolled SVG charts - no charting dependency. Every chart is
// purely presentational: it renders values the backend already computed and
// performs no financial arithmetic of its own (D-16), only min/max scaling.

export function AreaChart({ points }: { points: { label: string; value: number }[] }) {
  if (points.length === 0) return null;
  const w = 600;
  const h = 160;
  const pad = 4;
  const max = Math.max(...points.map((p) => p.value), 1);
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = pad + i * step;
    const y = h - pad - (p.value / max) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M ${coords.join(' L ')}`;
  const area = `${line} L ${(pad + (points.length - 1) * step).toFixed(1)},${h - pad} L ${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full" preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#revFill)" />
      <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

// Horizontal signed bars - feature contributions to a credit score. Positive
// contributions render terra/accent, negative render destructive-red.
export function ContributionBars({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => {
        const pct = (Math.abs(item.value) / max) * 100;
        const positive = item.value >= 0;
        return (
          <div key={item.label} className="grid grid-cols-[10rem_1fr] items-center gap-3">
            <span className="truncate text-meta text-body-text-muted">{item.label}</span>
            <div className="flex items-center gap-2">
              <div className="relative h-3 flex-1 overflow-hidden rounded-pill bg-hairline">
                <div
                  className="h-full rounded-pill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: positive ? 'var(--color-accent)' : 'var(--color-risk-d)',
                  }}
                />
              </div>
              <span
                className="w-12 text-end text-meta font-medium tabular-nums"
                style={{ color: positive ? 'var(--color-accent)' : 'var(--color-risk-d)' }}
              >
                <bdi>{positive ? '+' : ''}{Math.round(item.value)}</bdi>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Circular score gauge, 0..1000. Arc colour keyed to the risk band swatch.
export function ScoreGauge({ score, colorVar }: { score: number; colorVar: string }) {
  const size = 180;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 1000));
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-44 w-44" role="img">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-hairline-strong)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={colorVar}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-body-text)"
        style={{ fontSize: 40, fontWeight: 700 }}
      >
        {score}
      </text>
      <text
        x="50%"
        y="63%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--color-muted-text)"
        style={{ fontSize: 12 }}
      >
        / 1000
      </text>
    </svg>
  );
}

// Donut for risk-band distribution. Segments use the risk swatch variables.
const BAND_COLOR: Record<string, string> = {
  A: 'var(--color-risk-a)',
  B: '#5b8ac2',
  C: 'var(--color-risk-c)',
  D: 'var(--color-risk-d)',
};

export function Donut({ data }: { data: { key: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = 140;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="h-32 w-32" role="img">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-hairline)" strokeWidth={stroke} />
      {data.map((d) => {
        const frac = d.value / total;
        const dash = frac * c;
        const seg = (
          <circle
            key={d.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={BAND_COLOR[d.key] ?? 'var(--color-muted-text)'}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += dash;
        return seg;
      })}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fill="var(--color-body-text)" style={{ fontSize: 22, fontWeight: 700 }}>
        {total}
      </text>
    </svg>
  );
}

export const bandColor = (band: string): string => BAND_COLOR[band] ?? 'var(--color-muted-text)';

// Horizontal funnel bars - each stage width proportional to the top stage.
export function FunnelBars({ stages }: { stages: { label: string; value: number }[] }) {
  const max = Math.max(...stages.map((s) => s.value), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {stages.map((s) => (
        <div key={s.label} className="grid grid-cols-[7rem_1fr] items-center gap-3">
          <span className="truncate text-meta text-body-text-muted">{s.label}</span>
          <div className="flex items-center gap-2">
            <div className="h-6 flex-1 overflow-hidden rounded-tile bg-hairline">
              <div
                className="flex h-full items-center rounded-tile bg-brand-navy px-2 text-meta font-bold text-brand-cream transition-[width] duration-700 dark:bg-brand-purple"
                style={{ width: `${Math.max((s.value / max) * 100, 8)}%` }}
              >
                <bdi>{s.value}</bdi>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
