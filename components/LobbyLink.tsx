/**
 * A big card on a game's front page that leads somewhere other than today:
 * an archive (a stack of album pages) or the collection (a fan of cards).
 * The same on every game. Never red: the page's one red button is today's.
 */
export default function LobbyLink({ href, title, line, icon = 'archive' }: {
  href: string;
  title: string;
  line: string;
  icon?: 'archive' | 'cards';
}) {
  return (
    <a className="lobby-card lobby-link" href={href}>
      {icon === 'archive' ? (
        <svg className="lobby-link__icon" viewBox="0 0 64 64" aria-hidden>
          <rect x="18" y="6" width="34" height="42" rx="3" transform="rotate(8 35 27)" />
          <rect x="12" y="10" width="34" height="42" rx="3" transform="rotate(-4 29 31)" />
          <rect x="15" y="14" width="34" height="42" rx="3" className="lobby-link__top" />
          <path d="M21 22h22M21 28h22M21 34h22M21 40h14" className="lobby-link__rules" />
        </svg>
      ) : (
        <svg className="lobby-link__icon lobby-link__icon--cards" viewBox="0 0 64 64" aria-hidden>
          <rect x="8" y="14" width="28" height="38" rx="3" transform="rotate(-14 22 33)" className="lobby-link__card" />
          <rect x="18" y="10" width="28" height="38" rx="3" transform="rotate(-2 32 29)" className="lobby-link__card lobby-link__card--gold" />
          <rect x="28" y="12" width="28" height="38" rx="3" transform="rotate(12 42 31)" className="lobby-link__card lobby-link__card--black" />
        </svg>
      )}
      <span className="lobby-link__text">
        <span className="lobby-link__title display">{title}</span>
        <span className="lobby-link__line">
          {line}
          <svg className="lobby-link__arrow" viewBox="0 0 20 12" aria-hidden><path d="M1 6h17M13 1.5 18 6l-5 4.5" /></svg>
        </span>
      </span>
    </a>
  );
}
