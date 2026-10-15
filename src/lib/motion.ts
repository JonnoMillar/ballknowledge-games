import { flushSync } from 'react-dom';

/**
 * No teleports: a click that changes the screen moves it from before to
 * after instead of cutting. `smooth(update)` runs a React state update inside
 * a same-document view transition, so elements marked `.vt` glide to their
 * new place, new ones fade in, removed ones fade out (the CSS is under
 * MOTION in app/globals.css). Browsers without view transitions, and anyone
 * who asks for reduced motion, get the plain update.
 *
 * It waits for a transition already on screen (the page-to-page morph from
 * the hub, say), because starting a new one would cut that one short.
 */
export async function smooth(update: () => void) {
  type Vt = { finished: Promise<void> };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => Vt; activeViewTransition?: Vt | null };
  if (!doc.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) return update();
  // The page-to-page morph may still be running, before its animations even
  // exist, and then the page is still filling in (.vt-arrived): wait for both,
  // so a change made on load comes after, in order.
  for (let vt = doc.activeViewTransition; vt; vt = doc.activeViewTransition) await vt.finished.catch(() => {});
  await Promise.all(
    document.getAnimations()
      .filter((a) => (a as CSSAnimation).animationName === 'rise-in')
      .map((a) => a.finished.catch(() => {})),
  );
  document.documentElement.classList.remove('vt-arrived');
  const root = document.documentElement;
  root.classList.add('is-smoothing');
  const t = doc.startViewTransition(() => flushSync(update));
  t.finished.finally(() => root.classList.remove('is-smoothing'));
}
