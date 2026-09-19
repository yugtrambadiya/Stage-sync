'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import type { AgendaItem, DelayDiff } from '../../lib/types';
import './AgendaTimeline.css';

interface Props {
  items: AgendaItem[];
  loading?: boolean;
  onDelayItem: (item: AgendaItem) => void;
  lastDiff?: DelayDiff | null;
  onDismissDiff?: () => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export function AgendaTimeline({
  items,
  loading = false,
  onDelayItem,
  lastDiff,
  onDismissDiff,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRowRef = useRef<HTMLDivElement>(null);
  const prevPositions = useRef<Map<string, number>>(new Map());

  // Track ghost times: itemId -> oldStartTime
  const prevTimesRef = useRef<Map<string, string>>(new Map());
  const [ghostTimes, setGhostTimes] = useState<Record<string, string>>({});

  // Detect time shifts for ghost times
  useEffect(() => {
    const newGhostTimes: Record<string, string> = {};
    let hasChanges = false;

    items.forEach((item) => {
      const prev = prevTimesRef.current.get(item.id);
      if (prev && prev !== item.startTime) {
        newGhostTimes[item.id] = prev;
        hasChanges = true;
      }
      prevTimesRef.current.set(item.id, item.startTime);
    });

    if (hasChanges) {
      setGhostTimes(newGhostTimes);
      const timer = setTimeout(() => {
        setGhostTimes({});
      }, 4_000);
      return () => clearTimeout(timer);
    }
  }, [items]);

  // FLIP animation for row re-ordering / reflow
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const itemEls = containerRef.current.querySelectorAll<HTMLDivElement>('[data-item-id]');

    itemEls.forEach((el) => {
      const id = el.getAttribute('data-item-id')!;
      const newTop = el.getBoundingClientRect().top;
      const oldTop = prevPositions.current.get(id);

      if (oldTop !== undefined && oldTop !== newTop) {
        const deltaY = oldTop - newTop;
        el.style.transform = `translateY(${deltaY}px)`;
        el.style.transition = 'none';

        requestAnimationFrame(() => {
          el.style.transition = 'transform 300ms ease';
          el.style.transform = '';
        });
      }

      prevPositions.current.set(id, newTop);
    });
  });

  // Auto-scroll the live row into view
  useEffect(() => {
    if (liveRowRef.current) {
      liveRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [items]);

  if (loading) {
    return (
      <div className="timeline panel">
        <div className="panel__title">Agenda Timeline</div>
        <div className="timeline__list">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="timeline__skeleton-item skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="timeline panel" ref={containerRef}>
      <div className="timeline__header">
        <span className="panel__title" style={{ margin: 0 }}>Agenda Timeline</span>
        <span className="timeline__count num">{items.length} sessions</span>
      </div>

      {/* Summary strip after cascade delay */}
      {lastDiff && (
        <div className="timeline__diff-strip" role="status">
          <span className="timeline__diff-title">
            <span>⚠ Schedule Updated · {lastDiff.impact.affectedCount} items shifted (+{lastDiff.delayMinutes} min)</span>
          </span>
          {onDismissDiff && (
            <button
              className="timeline__diff-close"
              onClick={onDismissDiff}
              aria-label="Dismiss summary"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="timeline__empty">No agenda items scheduled</div>
      ) : (
        <div className="timeline__list">
          {items.map((item) => {
            const isLive = item.status === 'LIVE';
            const isDelayed = item.status === 'DELAYED';
            const isCompleted = item.status === 'COMPLETED';
            const isUpcoming = item.status === 'UPCOMING' || item.status === 'READY';
            const ghostTime = ghostTimes[item.id];

            const statusBadge = isLive ? (
              <span className="badge badge--live">● LIVE</span>
            ) : isDelayed ? (
              <span className="badge badge--delayed">DELAYED</span>
            ) : isCompleted ? (
              <span className="badge badge--completed">DONE</span>
            ) : (
              <span className="badge badge--upcoming">UPCOMING</span>
            );

            return (
              <div
                key={item.id}
                data-item-id={item.id}
                ref={isLive ? liveRowRef : undefined}
                className={`timeline__item ${
                  isLive
                    ? 'timeline__item--live'
                    : isDelayed
                    ? 'timeline__item--delayed'
                    : isCompleted
                    ? 'timeline__item--completed'
                    : ''
                }`}
              >
                {/* Time col */}
                <div className="timeline__time-col">
                  {ghostTime && (
                    <span className="timeline__ghost-time">
                      {formatTime(ghostTime)}
                    </span>
                  )}
                  <span className="timeline__time">
                    {formatTime(item.startTime)}
                  </span>
                  <span className="timeline__dur num">
                    {item.durationMinutes}m
                  </span>
                </div>

                {/* Content col */}
                <div className="timeline__content-col">
                  <div className="timeline__title" title={item.title}>
                    {item.title}
                  </div>
                  <div className="timeline__speaker">
                    {item.speaker?.name ?? 'No speaker assigned'}
                    {item.speaker?.organization ? ` · ${item.speaker.organization}` : ''}
                  </div>
                </div>

                {/* Meta col */}
                <div className="timeline__meta-col">
                  {statusBadge}
                  {(isLive || isUpcoming || isDelayed) && (
                    <button
                      className="btn btn--ghost btn--sm timeline__delay-btn"
                      onClick={() => onDelayItem(item)}
                      title="Adjust timing"
                    >
                      Delay
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
