'use client';

import type { AgendaItem } from '../../lib/types';
import './NextUpCard.css';

interface Props {
  item: AgendaItem | null;
  onScript: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function NextUpCard({ item, onScript }: Props) {
  if (!item) {
    return (
      <div className="nuc">
        <div className="nuc__header">
          <span className="panel__title" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
            Next in Queue
          </span>
          <span className="badge badge--completed">END OF DAY</span>
        </div>
        <div className="nuc__empty">No further sessions on the agenda</div>
      </div>
    );
  }

  return (
    <div className="nuc">
      <div className="nuc__header">
        <span className="panel__title" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
          Next in Queue
        </span>
        <span className="badge badge--upcoming">UPCOMING</span>
      </div>

      <div className="nuc__body">
        <div className="nuc__left">
          <div className="nuc__time-badge">
            <span className="nuc__time">{formatTime(item.startTime)}</span>
            <span className="nuc__dur">{item.durationMinutes}m</span>
          </div>

          <div className="nuc__content">
            <div className="nuc__title" title={item.title}>{item.title}</div>
            <div className="nuc__speaker">
              {item.speaker?.name ?? 'Assigned Speaker'}
              {item.speaker?.organization ? ` · ${item.speaker.organization}` : ''}
            </div>
          </div>
        </div>

        <button className="btn btn--ghost btn--sm" onClick={onScript} title="Prepare speaker introduction draft">
          Pre-Draft Script
        </button>
      </div>
    </div>
  );
}
