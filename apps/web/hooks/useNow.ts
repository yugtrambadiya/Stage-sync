/* ─── useNow — shared 1-second ticker ─────────────────────────────────────
   One setInterval for the entire app. Components subscribe to the current
   Date without creating per-component timers.
   ─────────────────────────────────────────────────────────────────────────── */

'use client';

import { useEffect, useRef, useState } from 'react';

/** Returns the current Date that updates once per second. */
export function useNow(): Date {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);

  return now;
}

/** Returns elapsed seconds between two ISO timestamps. */
export function useElapsed(startIso: string): number {
  const now = useNow();
  const startMs = useRef(new Date(startIso).getTime());
  return Math.max(0, Math.floor((now.getTime() - startMs.current) / 1_000));
}
