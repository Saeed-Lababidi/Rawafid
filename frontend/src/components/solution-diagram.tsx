import { RafidMark } from '@/components/rafid-mark';
import { IconCashflow, IconInvoice, IconSME, IconWallet, IconRiskShield } from '@/components/brand-icons';

/**
 * The twofold-solution diagram, rebuilt from scratch for simplicity.
 *
 * Three plain stages read start -> end: scattered sales platforms converge
 * through the Rafid confluence mark, then split into two outcomes (merchant /
 * Alinma). Built with flex + logical properties and HTML text (never SVG text),
 * so it reorders and mirrors automatically in RTL. The only SVG is the pair of
 * decorative converge / diverge current strokes, mirrored via [data-mirror].
 */
type Labels = {
  sourcesTitle: string;
  sourcesSub: string;
  src1: string;
  src2: string;
  src3: string;
  hubTitle: string;
  hubSub: string;
  out1Title: string;
  out1Sub: string;
  out2Title: string;
  out2Sub: string;
};

function Converge() {
  return (
    <svg data-mirror viewBox="0 0 100 140" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sd-merge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C36B4E" stopOpacity="0.15" />
          <stop offset="1" stopColor="#C36B4E" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#sd-merge)" strokeWidth="2.5" strokeLinecap="round" className="[stroke-dasharray:5_9] [animation:rafid-drift_7s_linear_infinite]">
        <path d="M0 26 C 46 34, 66 70, 100 70" />
        <path d="M0 70 C 44 70, 62 70, 100 70" />
        <path d="M0 114 C 46 106, 66 70, 100 70" />
      </g>
    </svg>
  );
}

function Diverge() {
  return (
    <svg data-mirror viewBox="0 0 100 140" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="sd-split" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6F67A8" />
          <stop offset="1" stopColor="#6F67A8" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#sd-split)" strokeWidth="2.5" strokeLinecap="round" className="[stroke-dasharray:5_9] [animation:rafid-drift_7s_linear_infinite]">
        <path d="M0 70 C 34 70, 58 40, 100 34" />
        <path d="M0 70 C 34 70, 58 100, 100 106" />
      </g>
    </svg>
  );
}

function SourceRow({ icon: Icon, label }: { icon: typeof IconCashflow; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-tile border border-hairline bg-page-bg/70 px-3 py-2">
      <Icon className="h-5 w-5 shrink-0 text-brand-navy" />
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-body-text-muted">{label}</span>
    </div>
  );
}

export function SolutionDiagram({ labels }: { labels: Labels }) {
  return (
    <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:gap-1">
      {/* Stage 1 - scattered sources */}
      <div data-reveal className="flex-1 rounded-[18px] border border-hairline bg-card p-5">
        <div className="mb-3">
          <div className="font-display text-[15px] font-bold text-brand-navy">{labels.sourcesTitle}</div>
          <div className="mt-1 font-mono text-[11px] text-body-text-muted">{labels.sourcesSub}</div>
        </div>
        <div className="flex flex-col gap-2">
          <SourceRow icon={IconCashflow} label={labels.src1} />
          <SourceRow icon={IconInvoice} label={labels.src2} />
          <SourceRow icon={IconSME} label={labels.src3} />
        </div>
      </div>

      {/* Connector: converge */}
      <div className="mx-auto h-8 w-px bg-gradient-to-b from-transparent via-brand-terra to-transparent md:h-32 md:w-16" >
        <div className="hidden h-full w-full md:block">
          <Converge />
        </div>
      </div>

      {/* Stage 2 - Rafid confluence hub */}
      <div data-reveal className="relative shrink-0 rounded-[20px] border border-brand-navy/15 bg-brand-navy px-6 py-7 text-center text-brand-cream shadow-[0_24px_50px_-28px_rgba(3,35,65,0.7)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
          <RafidMark className="h-8 w-12" strokeClassName="text-brand-terra" />
        </div>
        <div className="mt-3 font-display text-[20px] font-bold text-white">{labels.hubTitle}</div>
        <div className="mt-1 font-mono text-[11px] text-brand-cream/60">{labels.hubSub}</div>
      </div>

      {/* Connector: diverge */}
      <div className="mx-auto h-8 w-px bg-gradient-to-b from-transparent via-brand-purple to-transparent md:h-32 md:w-16">
        <div className="hidden h-full w-full md:block">
          <Diverge />
        </div>
      </div>

      {/* Stage 3 - two outcomes */}
      <div className="flex flex-1 flex-col gap-3">
        <div data-reveal className="flex items-start gap-3 rounded-[18px] border border-chip-warn-border bg-chip-warn-bg/50 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-card text-brand-terra">
            <IconWallet className="h-[22px] w-[22px]" />
          </span>
          <div>
            <div className="font-display text-[15px] font-bold text-brand-navy">{labels.out1Title}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-body-text-muted">{labels.out1Sub}</div>
          </div>
        </div>
        <div data-reveal className="flex items-start gap-3 rounded-[18px] border border-chip-good-border bg-chip-good-bg/50 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-tile bg-card text-risk-a">
            <IconRiskShield className="h-[22px] w-[22px]" />
          </span>
          <div>
            <div className="font-display text-[15px] font-bold text-brand-navy">{labels.out2Title}</div>
            <div className="mt-0.5 text-[12.5px] leading-snug text-body-text-muted">{labels.out2Sub}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
