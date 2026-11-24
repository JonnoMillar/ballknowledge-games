'use client';
import type { AnchorHTMLAttributes } from 'react';

/** Set by /hub while it is the player's home, in this tab; read by every link back "to the hub". */
export const HOME_KEY = 'home';

/**
 * A link to "/", the way home. `/` is still Chain's hub, so a player who
 * left from /hub goes back to /hub instead. ponytail: goes away when `/` becomes the new hub.
 */
export default function HomeLink({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <a
      {...rest}
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (href !== '/' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
        try {
          const home = sessionStorage.getItem(HOME_KEY);
          if (home) { e.preventDefault(); location.assign(home); }
        } catch { /* storage blocked: the plain link goes to / */ }
      }}
    />
  );
}
