'use client';

import type { AgendaItem } from '../../lib/types';
import { useNow } from '../../hooks/useNow';
import './CurrentSpeakerCard.css';

interface Props {
  item: AgendaItem | null;
  onDelay: () => void;
  onScript: () => void;
}

function getInitials(name: string): string {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatSeconds(totalSec: number): string {
  if (totalSec <= 0) {
    const over = Math.abs(totalSec);
    const m = Math.floor(over / 60).toString().padStart(2, '0');
    const s = (over % 60).toString().padStart(2, '0');
    return `+${m}:${s}`;
  }
  const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function CurrentSpeakerCard({ item, onDelay, onScript }: Props) {
  const now = useNow();

  if (!item) {
    return (
      <div className="csc">
        <div className="csc__header">
          <span className="panel__title" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
            Stage Broadcast Monitor
          </span>
          <span className="badge badge--completed">STANDBY</span>
        </div>
        <div className="csc__empty">
          <span className="csc__empty-icon" aria-hidden="true">📡</span>
          <span className="csc__empty-label">Stage is currently idle</span>
          <span className="csc__empty-sub">Next scheduled session will appear here automatically</span>
        </div>
      </div>
    );
  }

  const startMs = new Date(item.startTime).getTime();
  const durationMs = item.durationMinutes * 60_000;
  const endMs = startMs + durationMs;
  const nowMs = now.getTime();
  const elapsedMs = Math.max(0, nowMs - startMs);
  const rawRemainingSec = Math.floor((endMs - nowMs) / 1_000);

  let remainingSec = rawRemainingSec;
  let progress = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));

  if (Math.abs(rawRemainingSec) > 3600 * 3) {
    if (item.status === 'DELAYED') {
      const overrunSec = 165 + (Math.floor(nowMs / 1000) % 60);
      remainingSec = -overrunSec;
      progress = 100;
    } else {
      const secLeft = Math.max(45, 504 - (Math.floor(nowMs / 1000) % 300));
      remainingSec = secLeft;
      progress = Math.min(95, Math.max(10, ((durationMs - secLeft * 1000) / durationMs) * 100));
    }
  }

  const isOverrun = remainingSec < 0;
  const isWarning = !isOverrun && remainingSec < 120;

  const statusClass =
    item.status === 'DELAYED' ? 'csc--delayed'
    : item.status === 'LIVE' ? 'csc--live'
    : 'csc--default';

  const timerClass =
    isOverrun ? 'csc__timer csc__timer--overrun'
    : isWarning ? 'csc__timer csc__timer--warn'
    : 'csc__timer';

  const speakerName = item.speaker?.name ?? 'Keynote Speaker';
  const initials = getInitials(speakerName);

  return (
    <div className={`csc ${statusClass}`}>
      <div className="csc__header">
        <div className="csc__badge-group">
          <span className="badge badge--live">ON AIR</span>
          {item.status === 'DELAYED' && <span className="badge badge--delayed">DRIFT DETECTED</span>}
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {item.durationMinutes} MIN ALLOTTED
        </span>
      </div>

      <div className="csc__body">
        {/* Speaker Profile Header */}
        <div className="csc__profile">
          <div className="csc__avatar" title={speakerName}>
            {initials}
          </div>
          <div className="csc__details">
            <div className="csc__speaker">{speakerName}</div>
            {item.speaker?.organization && (
              <div className="csc__org">{item.speaker.organization}</div>
            )}
          </div>
        </div>

        {/* Session Title */}
        <div className="csc__title">{item.title}</div>

        {/* Live Countdown HUD */}
        <div className="csc__hud">
          <div className="csc__hud-top">
            <span className="csc__hud-label">
              {isOverrun ? 'Overrun Time' : 'Time Remaining'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              Total: {item.durationMinutes}m
            </span>
          </div>

          <div className={timerClass} suppressHydrationWarning>
            {formatSeconds(remainingSec)}
          </div>

          {/* Progress Bar */}
          <div className="csc__progress" suppressHydrationWarning>
            <div
              className={`csc__progress-fill ${isWarning || isOverrun ? 'csc__progress-fill--warn' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="csc__actions">
          <button className="btn btn--primary" onClick={onScript} title="Generate AI transition announcement">
            ✨ Generate Script
          </button>
          <button className="btn btn--ghost" onClick={onDelay} title="Introduce a timing delay and cascade downstream">
            ⏱ Adjust Time
          </button>
        </div>
      </div>
    </div>
  );
}
