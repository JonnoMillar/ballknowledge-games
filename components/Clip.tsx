'use client';

/**
 * The bulldog clip.
 *
 * The one flourish the sheet gets, and the reason it reads as an object you
 * were handed rather than a panel with a border-radius. It is the same clip on
 * the live board and on the sealed sheet, so it lives here rather than being
 * pasted into both.
 */
export default function Clip() {
  return (
    <div style={{ position: 'absolute', top: -17, left: '50%', transform: 'translateX(-50%)', zIndex: 6 }}>
      <svg width="146" height="36" viewBox="0 0 146 36" fill="none" aria-hidden>
        <rect x="1" y="7" width="144" height="21" rx="3" fill="#8e9298" />
        <rect x="1" y="7" width="144" height="10" rx="3" fill="#b9bec4" />
        <rect x="1" y="24" width="144" height="4" rx="2" fill="#6d7278" />
        <circle cx="26" cy="17" r="5.5" fill="#5d6268" />
        <circle cx="120" cy="17" r="5.5" fill="#5d6268" />
        <rect x="52" y="0" width="42" height="9" rx="4" fill="#a3a8ae" />
      </svg>
    </div>
  );
}
