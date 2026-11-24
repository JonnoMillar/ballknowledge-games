/**
 * The way out, first thing in every masthead so it is always in the same
 * spot: a board goes back to its game, a game goes back to the hub.
 */
export default function Back({ href, label }: { href: string; label: string }) {
  return (
    <a className="masthead__back" href={href} aria-label={label} title={label}>
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
        <path d="M12.5 4 6.5 10l6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
