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
    return new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
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

function getTrackCategory(title: string): { label: string; tone: string } {
  const t = title.toLowerCase();
  if (t.includes('keynote')) return { label: 'KEYNOTE', tone: 'keynote' };
  if (t.includes('panel')) return { label: 'PANEL', tone: 'panel' };
  if (t.includes('workshop')) return { label: 'WORKSHOP', tone: 'workshop' };
  if (t.includes('lunch') || t.includes('break') || t.includes('networking')) return { label: 'NETWORKING', tone: 'break' };
  if (t.includes('ceremony') || t.includes('awards') || t.includes('closing') || t.includes('hackathon')) return { label: 'CEREMONY', tone: 'ceremony' };
  return { label: 'DEEP DIVE', tone: 'talk' };
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

  // FLIP animation for row re-ordering / reflow — only runs when items array actually changes
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.getBoundingClientRect().top;
    const itemEls = containerRef.current.querySelectorAll<HTMLDivElement>('[data-item-id]');

    itemEls.forEach((el) => {
      const id = el.getAttribute('data-item-id')!;
      const newTop = el.getBoundingClientRect().top - containerTop;
      const oldTop = prevPositions.current.get(id);

      if (oldTop !== undefined && Math.abs(oldTop - newTop) > 1) {
        const deltaY = oldTop - newTop;
        el.style.transform = `translateY(${deltaY}px)`;
        el.style.transition = 'none';

        requestAnimationFrame(() => {
          el.style.transition = 'transform 300ms cubic-bezier(0.2, 0, 0, 1)';
          el.style.transform = '';
        });
      }

      prevPositions.current.set(id, newTop);
    });
  }, [items]);

  // Auto-scroll the live row into view once on mount without hiding under the fixed header
  const hasAutoScrolled = useRef(false);
  useEffect(() => {
    if (!hasAutoScrolled.current && liveRowRef.current) {
      hasAutoScrolled.current = true;
      const rect = liveRowRef.current.getBoundingClientRect();
      if (rect.top < 85 || rect.bottom > window.innerHeight) {
        liveRowRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="panel__title" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent' }}>
            Live Agenda Timeline
          </span>
          <span className="timeline__flow-indicator" title="Live Continuous Stage Stream">● CONTINUOUS</span>
        </div>
        <span className="timeline__count num">{items.length} sessions</span>
      </div>

      {/* Summary strip after cascade delay */}
      {lastDiff && (
        <div className="timeline__diff-strip" role="status">
          <span className="timeline__diff-title">
            <span>⚠ Schedule Cascade Updated · {lastDiff.impact.affectedCount} sessions shifted (+{lastDiff.delayMinutes} min)</span>
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
            const category = getTrackCategory(item.title);
            const initials = getInitials(item.speaker?.name);

            const statusBadge = isLive ? (
              <span className="badge badge--live">● ON AIR</span>
            ) : isDelayed ? (
              <span className="badge badge--delayed">DRIFT</span>
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
                {/* Time column with visual connector rail */}
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

                {/* Content column */}
                <div className="timeline__content-col">
                  <div className="timeline__tag-row">
                    <span className={`timeline__tag timeline__tag--${category.tone}`}>
                      {category.label}
                    </span>
                    {isLive && (
                      <span className="timeline__soundwave" title="Audio on stage">
                        <span /><span /><span /><span />
                      </span>
                    )}
                  </div>

                  <div className="timeline__title" title={item.title}>
                    {item.title}
                  </div>

                  <div className="timeline__speaker-row">
                    <div
                      className={`timeline__avatar ${isLive ? 'timeline__avatar--live' : ''}`}
                      title={item.speaker?.name ?? 'Speaker'}
                    >
                      {initials}
                    </div>
                    <div className="timeline__speaker-meta">
                      <span className="timeline__speaker-name">
                        {item.speaker?.name ?? 'No speaker assigned'}
                      </span>
                      {item.speaker?.organization && (
                        <span className="timeline__speaker-org">
                          {' · '}{item.speaker.organization}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meta column with Status Badge + Always-visible Mark Delay button */}
                <div className="timeline__meta-col">
                  {statusBadge}
                  {(isLive || isUpcoming || isDelayed) && (
                    <button
                      className="timeline__delay-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelayItem(item);
                      }}
                      title={`Mark timing delay for ${item.title}`}
                    >
                      <span className="timeline__delay-btn-icon" aria-hidden="true">⏱️</span>
                      <span className="timeline__delay-btn-label">Mark Delay</span>
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
