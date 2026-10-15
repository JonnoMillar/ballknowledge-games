import { Fragment, type CSSProperties } from 'react';

/**
 * A line split into words, each its own box with its place in `--i`, so a
 * page arriving from the hub can raise its headline word by word (MOTION in
 * app/globals.css). Reads as the plain line everywhere else.
 */
export default function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <Fragment key={i}>
          {i ? ' ' : null}
          <span className="word" style={{ '--i': i } as CSSProperties}>{w}</span>
        </Fragment>
      ))}
    </>
  );
}
