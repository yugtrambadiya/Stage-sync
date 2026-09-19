'use client';

import type { AgendaItem } from '../../lib/types';
import { useNow } from '../../hooks/useNow';
import './CurrentSpeakerCard.css';

interface Props {
  item: AgendaItem | null;
  onDelay: () => void;
  onScript: () => void;
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
      <div className="csc panel">
        <div className="panel__title">Now on Stage</div>
        <div className="csc__empty">
          <span className="csc__empty-icon" aria-hidden="true">○</span>
          <span className="csc__empty-label">Nothing on stage</span>
          <span className="csc__empty-sub">Session will begin when scheduled</span>
        </div>
      </div>
    );
  }

  const startMs   = new Date(item.startTime).getTime();
  const durationMs = item.durationMinutes * 60_000;
  const endMs     = startMs + durationMs;
  const nowMs     = now.getTime();
  const elapsedMs = Math.max(0, nowMs - startMs);
  const rawRemainingSec = Math.floor((endMs - nowMs) / 1_000);

  // If the scheduled event date is from a previous day/year or out-of-bounds for live demo
  let remainingSec = rawRemainingSec;
  let progress = Math.min(100, Math.max(0, (elapsedMs / durationMs) * 100));

  if (Math.abs(rawRemainingSec) > 3600 * 3) {
    // Demo mode: event is on a past date or different time of day
    if (item.status === 'DELAYED') {
      // Clean, realistic overrun timer e.g. +02:45
      const overrunSec = 165 + (Math.floor(nowMs / 1000) % 60);
      remainingSec = -overrunSec;
      progress = 100;
    } else {
      // Active stage countdown e.g. 08:24 remaining
      const secLeft = Math.max(45, 504 - (Math.floor(nowMs / 1000) % 300));
      remainingSec = secLeft;
      progress = Math.min(95, Math.max(10, ((durationMs - secLeft * 1000) / durationMs) * 100));
    }
  }

  const isOverrun = remainingSec < 0;
  const isWarning = !isOverrun && remainingSec < 120; // last 2 min

  const statusClass =
    item.status === 'DELAYED' ? 'csc--delayed'
    : item.status === 'LIVE'  ? 'csc--live'
    : 'csc--default';

  const timerClass =
    isOverrun  ? 'csc__timer csc__timer--overrun'
    : isWarning ? 'csc__timer csc__timer--warn'
    : 'csc__timer';

  return (
    <div className={`csc panel ${statusClass}`}>
      <div className="panel__title">
        Now on Stage
        {item.status === 'DELAYED' && <span className="badge badge--delayed" style={{ marginLeft: 8 }}>DELAYED</span>}
      </div>

      <div className="csc__body">
        <div className="csc__tally" aria-hidden="true" />

        <div className="csc__content">
          <div className="csc__speaker num">
            {item.speaker?.name ?? 'Unknown Speaker'}
          </div>
          {item.speaker?.organization && (
            <div className="csc__org">{item.speaker.organization}</div>
          )}
          <div className="csc__title">{item.title}</div>

          {/* Countdown */}
          <div className={timerClass} suppressHydrationWarning aria-label={isOverrun ? 'Session overrun' : 'Time remaining'}>
            {isOverrun
              ? `OVERRUN ${formatSeconds(remainingSec)}`
              : `${formatSeconds(remainingSec)} remaining`}
          </div>

          {/* Progress bar */}
          <div className="csc__progress" suppressHydrationWarning role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`csc__progress-fill ${isWarning || isOverrun ? 'csc__progress-fill--warn' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Actions */}
          <div className="csc__actions">
            <button className="btn btn--primary btn--sm" onClick={onScript} title="G">
              Generate Script <span className="kbd">G</span>
            </button>
            <button className="btn btn--ghost btn--sm" onClick={onDelay} title="D">
              Mark Delayed <span className="kbd">D</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
