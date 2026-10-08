'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { localDate } from '../../src/lib/daily';

/** Today's board is the player's today, so the redirect happens in the browser. */
export default function PinToday() {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/pin/${localDate()}${window.location.search}`);
  }, [router]);
  return <div className="app pin" />;
}
