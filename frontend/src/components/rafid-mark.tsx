/**
 * The confluence mark: three streams gathering into one terracotta delta -
 * doubles as the opening curve of ر (rāʾ), the first letter of رافد.
 */
export function RafidMark({
  className = '',
  strokeClassName = 'text-brand-navy dark:text-brand-cream',
}: {
  className?: string;
  strokeClassName?: string;
}) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g
        className={strokeClassName}
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
      >
        <path d="M18 26 C 44 30, 52 46, 74 48" />
        <path d="M14 46 C 46 48, 54 50, 74 52" />
        <path d="M18 68 C 48 66, 56 56, 74 54" />
      </g>
      <path
        d="M74 46 C 82 47, 86 49, 92 50 C 86 51, 82 53, 74 54 Z"
        className="fill-brand-terra"
      />
    </svg>
  );
}
