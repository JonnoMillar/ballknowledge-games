import Rondo from '../../components/rondo/Rondo';
import './rondo.css';

export const metadata = {
  title: 'Rondo',
  description: 'Keep the ball. A football passing game for two to four mates and one phone.',
};

/**
 * Rondo. One phone on the table; the album is the ref.
 * See docs/superpowers/specs/2026-09-20-rondo-design.md.
 */
export default function RondoPage() {
  return (
    <div className="app rondo">
      <header className="masthead masthead--rondo">
        <a className="masthead__brand display" href="/rondo">
          <RondoMark />
          Rondo
        </a>
        <div className="masthead__meta">
          <span className="masthead__tag">Keep the ball</span>
        </div>
      </header>
      <main className="rondo__main">
        <Rondo />
      </main>
    </div>
  );
}

/** The mark: a ball, ringed. */
function RondoMark() {
  return (
    <svg className="masthead__mark masthead__mark--rondo" viewBox="0 0 32 32" aria-hidden>
      <circle cx="16" cy="16" r="13.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeDasharray="7 4.5" />
      <circle cx="16" cy="16" r="5" fill="currentColor" />
    </svg>
  );
}
