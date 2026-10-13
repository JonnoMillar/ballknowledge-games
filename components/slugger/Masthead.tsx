'use client';
import Back from '../Back';

/** A bat and a ball, in one stroke, for the band. */
function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 26 32" aria-hidden="true">
      <path d="M4 29 L19 4" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <circle cx="19" cy="24" r="5" fill="currentColor" />
    </svg>
  );
}

export default function Masthead({ children }: { children?: React.ReactNode }) {
  return (
    <header className="masthead slug-masthead">
      <Back href="/" label="All games" />
      <a className="masthead__brand display" href="/slugger">
        <Mark className="masthead__mark" />
        Slugger
      </a>
      <div className="masthead__meta">{children}</div>
    </header>
  );
}
