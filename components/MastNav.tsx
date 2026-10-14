'use client';
import GradesKey from './GradesKey';

/** The links every Chain masthead carries: the collection and the key to the grades. Deep Cuts is archived (its route still works). */
export default function MastNav({ current }: { current?: 'deep' | 'collection' }) {
  return (
    <nav className="masthead__nav" aria-label="Album">
      <a className="masthead__button" href="/collection" aria-current={current === 'collection' ? 'page' : undefined}>Collection</a>
      <GradesKey />
    </nav>
  );
}
