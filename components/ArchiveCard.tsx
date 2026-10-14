/**
 * The way back to days gone by: a big card with a stack of album pages,
 * the same on every game's front page. Never red: the page's one red
 * button is today's.
 */
export default function ArchiveCard({ href, title, line }: { href: string; title: string; line: string }) {
  return (
    <a className="lobby-card archcard" href={href}>
      <svg className="archcard__icon" viewBox="0 0 64 64" aria-hidden>
        <rect x="18" y="6" width="34" height="42" rx="3" transform="rotate(8 35 27)" />
        <rect x="12" y="10" width="34" height="42" rx="3" transform="rotate(-4 29 31)" />
        <rect x="15" y="14" width="34" height="42" rx="3" className="archcard__top" />
        <path d="M21 22h22M21 28h22M21 34h22M21 40h14" className="archcard__rules" />
      </svg>
      <span className="archcard__text">
        <span className="archcard__title display">{title}</span>
        <span className="archcard__line">
          {line}
          <svg className="archcard__arrow" viewBox="0 0 20 12" aria-hidden><path d="M1 6h17M13 1.5 18 6l-5 4.5" /></svg>
        </span>
      </span>
    </a>
  );
}
