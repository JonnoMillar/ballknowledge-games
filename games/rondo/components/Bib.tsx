/**
 * The bib. A training vest: what you wear in the middle of a rondo, and
 * what you collect for losing the ball. Solid when earned, an outline
 * while it is still to play for.
 */
export default function Bib({ earned, size = 18, className = '' }: { earned: boolean; size?: number; className?: string }) {
  return (
    <svg
      className={`bib ${earned ? 'bib--earned' : ''} ${className}`}
      width={size}
      height={size * 1.15}
      viewBox="0 0 20 23"
      aria-hidden
    >
      <path
        d="M5 1.5 C6.5 4 8 5 10 5 C12 5 13.5 4 15 1.5 L19 4.5 L17 9.5 L16 9 L16 21.5 L4 21.5 L4 9 L3 9.5 L1 4.5 Z"
        fill={earned ? 'var(--bib)' : 'none'}
        stroke={earned ? 'var(--bib-deep)' : 'var(--rule-strong)'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
