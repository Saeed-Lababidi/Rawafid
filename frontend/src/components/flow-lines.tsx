/**
 * The signature brand-system atmosphere: drifting tributary strokes on a
 * terracotta→lavender gradient, sized to slice-fill whatever dark surface it
 * sits behind. Animation + reduced-motion handling live in globals.css
 * (.flow-line). Purely decorative.
 */
export function FlowLines({ className = '', idSuffix = '' }: { className?: string; idSuffix?: string }) {
  const gid = `flow-grad-${idSuffix}`;
  return (
    <svg
      className={className}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#C36B4E" stopOpacity="0" />
          <stop offset="0.5" stopColor="#C36B4E" />
          <stop offset="1" stopColor="#6F67A8" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <g stroke={`url(#${gid})`}>
        <path className="flow-line" style={{ animationDelay: '0s' }} d="M-50 200 C 300 180, 520 360, 780 340 S 1200 300, 1500 420" />
        <path className="flow-line" style={{ animationDelay: '-1.2s' }} d="M-50 320 C 320 300, 540 300, 800 380 S 1180 470, 1500 440" />
        <path className="flow-line" style={{ animationDelay: '-2.4s' }} d="M-50 460 C 340 470, 560 420, 820 430 S 1220 400, 1500 470" />
        <path className="flow-line" style={{ animationDelay: '-3.1s' }} d="M-50 600 C 360 620, 560 520, 840 500 S 1200 520, 1500 500" />
        <path className="flow-line" style={{ animationDelay: '-4.0s' }} d="M-50 740 C 380 720, 600 600, 860 560 S 1220 560, 1500 540" />
        <path className="flow-line" style={{ animationDelay: '-2.0s' }} d="M-50 100 C 300 120, 520 260, 780 250 S 1200 210, 1500 360" />
      </g>
    </svg>
  );
}
