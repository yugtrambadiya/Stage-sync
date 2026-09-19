'use client';

import { useEffect, useRef } from 'react';
import { useStageStore, selectAnnouncements } from '../../store/useStageStore';
import type { Announcement } from '../../lib/types';

const ICON: Record<string, string> = {
  info: 'ℹ',
  warn: '⚠',
  success: '✓',
  danger: '✕',
};

const AUTO_DISMISS_MS = 5_000;

function Toast({ ann, onDismiss }: { ann: Announcement; onDismiss: () => void }) {
  const hoverRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!hoverRef.current) onDismiss();
    }, AUTO_DISMISS_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`toast toast--${ann.severity}`}
      role={ann.severity === 'danger' ? 'alert' : 'status'}
      aria-live={ann.severity === 'danger' ? 'assertive' : 'polite'}
      onMouseEnter={() => { hoverRef.current = true; }}
      onMouseLeave={() => {
        hoverRef.current = false;
        timerRef.current = setTimeout(onDismiss, 1_500);
      }}
    >
      <span className="toast__icon" aria-hidden="true">{ICON[ann.severity] ?? 'ℹ'}</span>
      <div className="toast__body">
        <div className="toast__title">{ann.title}</div>
        {ann.message && <div className="toast__msg">{ann.message}</div>}
      </div>
      <button className="toast__close" onClick={onDismiss} aria-label="Dismiss">✕</button>
    </div>
  );
}

/** Stacked toast container — max 3 visible, slides from top */
export function AnnouncementToast() {
  const announcements = useStageStore(selectAnnouncements);
  const dismiss = useStageStore((s) => s.dismissAnnouncement);

  if (announcements.length === 0) return null;

  return (
    <div className="toast-stack">
      {announcements.map((ann) => (
        <Toast key={ann.id} ann={ann} onDismiss={() => dismiss(ann.id)} />
      ))}
    </div>
  );
}
