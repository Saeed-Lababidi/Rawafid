/**
 * Login brand-panel visual: the Rafid confluence in miniature. Sales platforms
 * (top) stream into the Rafid hub, which then feeds the merchant and the bank
 * (bottom). Icon-free / abstract so it reads in any locale, and the streams
 * flow via the shared `.flow-line` animation (reduced-motion safe in globals).
 *
 * Pure SVG, self-contained, no state - drops straight into the dark auth panel.
 */

const SOURCE_TO_HUB = [
  'M55 55 C 90 100, 120 116, 148 138',
  'M150 50 C 150 95, 150 112, 150 132',
  'M245 55 C 210 100, 180 116, 152 138',
] as const;

const HUB_TO_OUT = [
  'M148 186 C 130 214, 112 238, 100 250',
  'M152 186 C 170 214, 188 238, 202 250',
] as const;

export function LoginVisual({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lv-stream" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C36B4E" stopOpacity="0.85" />
          <stop offset="1" stopColor="#8980BC" stopOpacity="0.75" />
        </linearGradient>
        <radialGradient id="lv-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#C36B4E" stopOpacity="0.45" />
          <stop offset="1" stopColor="#C36B4E" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* static connector structure */}
      <g stroke="url(#lv-stream)" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        {[...SOURCE_TO_HUB, ...HUB_TO_OUT].map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {/* flowing packets riding the same lines (reduced-motion -> frozen) */}
      <g stroke="#F6E7DC" strokeLinecap="round">
        {[...SOURCE_TO_HUB, ...HUB_TO_OUT].map((d, i) => (
          <path key={i} d={d} className="flow-line" style={{ strokeWidth: 2.6, opacity: 0.9 }} />
        ))}
      </g>

      {/* source nodes */}
      {[
        [55, 55],
        [150, 50],
        [245, 55],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="15" fill="#ffffff" fillOpacity="0.06" stroke="#C36B4E" strokeOpacity="0.5" strokeWidth="1.5" />
          <circle cx={cx} cy={cy} r="4" fill="#F6E7DC" fillOpacity="0.85" />
        </g>
      ))}

      {/* hub: glow + ring + Rafid mark */}
      <circle cx="150" cy="160" r="58" fill="url(#lv-glow)" />
      <circle cx="150" cy="160" r="33" fill="#0a2035" stroke="#C36B4E" strokeWidth="1.5" />
      <g transform="translate(129,139) scale(0.42)" fill="none" stroke="#F6E7DC" strokeWidth="7" strokeLinecap="round">
        <path d="M18 26 C 44 30, 52 46, 74 48" />
        <path d="M14 46 C 46 48, 54 50, 74 52" />
        <path d="M18 68 C 48 66, 56 56, 74 54" />
      </g>
      <path transform="translate(129,139) scale(0.42)" d="M74 46 C 82 47, 86 49, 92 50 C 86 51, 82 53, 74 54 Z" fill="#C36B4E" />

      {/* outcome nodes: merchant (terra) + bank (lavender) */}
      <g>
        <circle cx="100" cy="258" r="19" fill="#ffffff" fillOpacity="0.06" stroke="#C36B4E" strokeOpacity="0.7" strokeWidth="1.5" />
        <circle cx="100" cy="258" r="5" fill="#C36B4E" />
      </g>
      <g>
        <circle cx="200" cy="258" r="19" fill="#ffffff" fillOpacity="0.06" stroke="#8980BC" strokeOpacity="0.8" strokeWidth="1.5" />
        <circle cx="200" cy="258" r="5" fill="#8980BC" />
      </g>
    </svg>
  );
}
