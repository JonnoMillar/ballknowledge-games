import { redirect } from 'next/navigation';

/** The office was previewed here before it took `/` (2026-11-24). */
export default function HubRedirect() {
  redirect('/');
}
