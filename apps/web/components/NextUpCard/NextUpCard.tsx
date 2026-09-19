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
      <div className="nuc panel">
        <div className="panel__title">Up Next</div>
        <div className="nuc__empty">No upcoming sessions</div>
      </div>
    );
  }

  return (
    <div className="nuc panel">
      <div className="panel__title">Up Next</div>
      <div className="nuc__body">
        <div className="nuc__time num">{formatTime(item.startTime)}</div>
        <div className="nuc__title">{item.title}</div>
        {item.speaker && (
          <div className="nuc__speaker">{item.speaker.name}</div>
        )}
        <div className="nuc__meta num">{item.durationMinutes} min</div>
        <button className="btn btn--ghost btn--sm nuc__btn" onClick={onScript}>
          Prepare Script
        </button>
      </div>
    </div>
  );
}
