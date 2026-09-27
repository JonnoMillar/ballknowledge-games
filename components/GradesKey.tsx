'use client';
import { useRef } from 'react';
import { GradeChip } from './Slab';
import { GRADES, GRADE_LINE } from '../src/lib/chain/grade';

/**
 * The key to the grades, reachable from every masthead: a button that opens
 * the six cases, rarest first, and what earns each.
 */
export default function GradesKey({ className = '' }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={`masthead__button ${className}`} onClick={() => dialog.current?.showModal()}>
        Grades
      </button>
      <dialog
        ref={dialog}
        className="key"
        aria-labelledby="grades-key-head"
        onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}
      >
        <div className="key__sheet">
          <button type="button" className="key__close" aria-label="Close" onClick={() => dialog.current?.close()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <h2 id="grades-key-head" className="key__head display">The grades</h2>
          <p className="key__intro">
            On a Deep Cuts board, every pick that holds is graded when you seal: the deeper the answer, the rarer
            the case you keep it in. The page takes the grade of its weakest plate.
          </p>
          <ul className="key__list">
            {[...GRADES].reverse().map((g) => (
              <li key={g} className="key__row">
                <GradeChip grade={g} />
                <span>{GRADE_LINE[g]}</span>
              </li>
            ))}
          </ul>
          <p className="key__links">
            <a href="/deep">Play Deep Cuts</a>
            <a href="/collection">Your collection</a>
          </p>
        </div>
      </dialog>
    </>
  );
}
