'use client';
import GradesKey from './GradesKey';

/**
 * What every Chain masthead carries: the key to the grades. The collection
 * is a card on Chain's hub (Jonno, 2026-10-14), not a masthead button.
 */
export default function MastNav() {
  return (
    <nav className="masthead__nav" aria-label="Album">
      <GradesKey />
    </nav>
  );
}
