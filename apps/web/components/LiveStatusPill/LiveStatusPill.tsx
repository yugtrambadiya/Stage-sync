'use client';

import { useState, useEffect } from 'react';
import type { ConnectionStatus } from '../../lib/types';

interface Props {
  status: ConnectionStatus;
  lastSyncedAt?: string | null;
}

/** Shows ● LIVE (green pulse) or ◌ RECONNECTING... (amber) */
export function LiveStatusPill({ status, lastSyncedAt }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isLive = status === 'connected';
  const isRecon = status === 'reconnecting';

  // Compute "synced N s ago"
  let syncLabel = '';
  if (mounted && lastSyncedAt && isLive) {
    const diffSec = Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 1_000);
    syncLabel = diffSec < 5 ? 'Synced just now' : `Synced ${diffSec}s ago`;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span
        className={isLive ? 'badge badge--live' : isRecon ? 'badge badge--delayed' : 'badge badge--info'}
        role="status"
        aria-live="polite"
      >
        {isLive ? '● LIVE' : isRecon ? '◌ RECONNECTING...' : '○ OFFLINE'}
      </span>
      {syncLabel && (
        <span suppressHydrationWarning style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
          {syncLabel}
        </span>
      )}
    </div>
  );
}
