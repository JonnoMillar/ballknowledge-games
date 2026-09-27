'use client';
import GradesKey from './GradesKey';

/** The links every masthead carries: Deep Cuts, the collection, and the key to the grades. */
export default function MastNav({ current }: { current?: 'deep' | 'collection' }) {
  return (
    <nav className="masthead__nav" aria-label="Album">
      <a className="masthead__button" href="/deep" aria-current={current === 'deep' ? 'page' : undefined}>Deep Cuts</a>
      <a className="masthead__button" href="/collection" aria-current={current === 'collection' ? 'page' : undefined}>Collection</a>
      <GradesKey />
    </nav>
  );
}
