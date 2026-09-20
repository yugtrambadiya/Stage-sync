'use client';

import type { AgendaItem } from '../../lib/types';
import './NextUpCard.css';

interface Props {
  item: AgendaItem | null;
  onScript: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
}

function getInitials(name?: string): string {
  if (!name) return 'SP';
  const clean = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+/i, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

export function NextUpCard({ item, onScript }: Props) {
  if (!item) {
    return (
      <div className="nuc">
        <div className="nuc__header">
          <div className="nuc__header-left">
            <span className="nuc__radar" />
            <span className="panel__title" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
              Next in Queue
            </span>
          </div>
          <span className="badge badge--completed">END OF SCHEDULE</span>
        </div>
        <div className="nuc__empty">All scheduled sessions for today are complete</div>
      </div>
    );
  }

  const initials = getInitials(item.speaker?.name);

  return (
    <div className="nuc">
      <div className="nuc__header">
        <div className="nuc__header-left">
          <span className="nuc__radar" />
          <span className="panel__title" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
            Next in Queue
          </span>
        </div>
        <span className="badge badge--upcoming">READY TO AIR</span>
      </div>

      <div className="nuc__body">
        <div className="nuc__left">
          <div className="nuc__time-badge">
            <span className="nuc__time">{formatTime(item.startTime)}</span>
            <span className="nuc__dur num">{item.durationMinutes}m</span>
          </div>

          <div className="nuc__avatar" title={item.speaker?.name ?? 'Assigned Speaker'}>
            {initials}
          </div>

          <div className="nuc__content">
            <div className="nuc__title" title={item.title}>{item.title}</div>
            <div className="nuc__speaker">
              {item.speaker?.name ?? 'Assigned Speaker'}
              {item.speaker?.organization ? ` · ${item.speaker.organization}` : ''}
            </div>
          </div>
        </div>

        <button className="btn btn--ghost btn--sm nuc__draft-btn" onClick={onScript} title="Prepare speaker introduction draft">
          ✨ Pre-Draft Script
        </button>
      </div>
    </div>
  );
}
