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
  const clean = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
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
      {/* ── Compact Top Strip ── */}
      <div className="csc__header">
        <div className="csc__badge-group">
          <span className="badge badge--live">
            <span className="csc__live-dot" />
            ON AIR
          </span>
          <div className="csc__audio-wave" title="Stage Mic Active">
            <span /><span /><span /><span /><span />
          </div>
          {item.status === 'DELAYED' && <span className="badge badge--delayed">DRIFT DETECTED</span>}
        </div>
        <div className="csc__header-meta">
          <span className="csc__allotted-tag num">
            {item.durationMinutes} MIN ALLOTTED
          </span>
        </div>
      </div>

      {/* ── Structured Command Body ── */}
      <div className="csc__body">
        {/* Upper Deck: Speaker Identity (Left) & Broadcast Timecode + Quick Actions (Right) */}
        <div className="csc__upper">
          {/* Left: Speaker Identity */}
          <div className="csc__speaker-block">
            <div className="csc__avatar" title={speakerName}>
              {initials}
              <span className="csc__avatar-mic" title="Mic Live" />
            </div>
            <div className="csc__speaker-info">
              <div className="csc__speaker-name">{speakerName}</div>
              <div className="csc__speaker-role">
                {item.speaker?.organization ? item.speaker.organization : 'Featured Keynote Speaker'}
              </div>
            </div>
          </div>

          {/* Right: Broadcast Timer & Direct Director Actions */}
          <div className="csc__timer-block">
            <div className="csc__timer-header">
              <span className="csc__timer-label">
                <span className={`csc__hud-indicator ${isOverrun ? 'csc__hud-indicator--overrun' : isWarning ? 'csc__hud-indicator--warn' : 'csc__hud-indicator--live'}`} />
                {isOverrun ? 'OVERRUN' : 'REMAINING'}
              </span>
              <span className="csc__timer-total num">Total: {item.durationMinutes}m</span>
            </div>

            <div className={timerClass} suppressHydrationWarning>
              {formatSeconds(remainingSec)}
            </div>

            <div className="csc__timer-actions">
              <button className="csc__action-btn csc__action-btn--hero" onClick={onScript} title="Generate AI transition announcement">
                <span>✨ Script</span>
                <kbd className="csc__kbd">G</kbd>
              </button>
              <button className="csc__delay-action-btn" onClick={onDelay} title="Mark schedule delay and cascade downstream">
                <span className="csc__delay-action-text">⏱ Delay</span>
                <kbd className="csc__kbd csc__kbd--warn">D</kbd>
              </button>
            </div>
          </div>
        </div>

        {/* Hairline horizontal separator */}
        <div className="csc__separator" />

        {/* Lower Deck: Session Title & Live Progress Telemetry */}
        <div className="csc__lower">
          <div className="csc__session-strip">
            <span className="csc__title-tag">NOW PRESENTING</span>
            <div className="csc__title" title={item.title}>{item.title}</div>
          </div>

          <div className="csc__progress-container">
            <div className="csc__progress" suppressHydrationWarning>
              <div
                className={`csc__progress-fill ${isWarning || isOverrun ? 'csc__progress-fill--warn' : ''}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="csc__progress-labels">
              <span className="csc__progress-sub">
                {isOverrun ? '⚠️ Schedule delayed downstream — cascade active' : 'Active presentation pace on schedule'}
              </span>
              <span className="csc__progress-pct num" suppressHydrationWarning>
                {Math.round(progress)}% {isOverrun ? 'OVERRUN' : 'ELAPSED'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
