'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { eventsApi } from '@/lib/api';
import { useStageStore } from '@/store/useStageStore';
import type { Event, Script } from '@/lib/types';
import { EventNav } from '@/components/EventNav/EventNav';

function formatTimestamp(iso: string): { relative: string; absolute: string } {
  try {
    const d = new Date(iso);
    const absolute = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    let relative = 'Just now';
    if (diffSec >= 60 && diffSec < 3600) {
      relative = `${Math.floor(diffSec / 60)}m ago`;
    } else if (diffSec >= 3600) {
      relative = `${Math.floor(diffSec / 3600)}h ago`;
    }
    return { relative, absolute };
  } catch {
    return { relative: '', absolute: iso };
  }
}

export default function EventScriptsPage() {
  const params = useParams();
  const eventId = typeof params?.id === 'string' ? params.id : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Store scripts
  const storeScripts = useStageStore((s) => s.scripts);
  const markScriptUsed = useStageStore((s) => s.markScriptUsed);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    eventsApi.get(eventId)
      .then((ev) => {
        setEvent(ev);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load scripts');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventId]);

  const displayedScripts = useMemo(() => {
    return storeScripts.filter((sc) => {
      if (filterType === 'ALL') return true;
      return sc.type === filterType;
    });
  }, [storeScripts, filterType]);

  const handleCopy = async (id: string, text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link href="/events" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', fontSize: 'var(--text-sm)' }}>
              STAGE<span style={{ color: 'var(--color-accent)' }}>SYNC</span>
            </span>
          </Link>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
            {event?.name ?? 'Scripts History'}
          </span>
        </div>

        <Link href={`/events/${eventId}/live`} className="btn btn--primary btn--sm">
          ● Open Live Control Room
        </Link>
      </header>

      <EventNav eventId={eventId} eventName={event?.name} />

      <main className="container" style={{ flex: 1, padding: 'var(--space-6)' }}>
        <div className="page-header" style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>
              AI Broadcast Scripts Archive
            </h1>
            <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
              All stage teleprompter scripts, announcements, and transitions generated during this event.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {(['ALL', 'TRANSITION', 'ANNOUNCEMENT'] as const).map((t) => (
              <button
                key={t}
                className={`btn btn--sm ${filterType === t ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setFilterType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="panel skeleton" style={{ height: 100 }} />
            <div className="panel skeleton" style={{ height: 100 }} />
          </div>
        )}

        {error && !loading && (
          <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-danger)' }}>{error}</p>
          </div>
        )}

        {!loading && !error && displayedScripts.length === 0 && (
          <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              No scripts generated yet. Use the Live Dashboard to generate MC transition scripts or broadcast announcements.
            </p>
            <Link href={`/events/${eventId}/live`} className="btn btn--primary btn--sm">
              Open Live Dashboard
            </Link>
          </div>
        )}

        {!loading && displayedScripts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {displayedScripts.map((script) => {
              const isExpanded = expandedId === script.id;
              const { relative, absolute } = formatTimestamp(script.createdAt);
              const preview = script.content.slice(0, 140) + (script.content.length > 140 ? '...' : '');

              return (
                <div
                  key={script.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                    borderLeft: script.used ? '3px solid var(--color-border)' : '3px solid var(--color-accent)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <span className="badge badge--upcoming">
                        {script.type}
                      </span>
                      {script.used ? (
                        <span className="badge badge--completed">Used</span>
                      ) : (
                        <span className="badge badge--live">Ready</span>
                      )}
                      <span className="num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {relative} ({absolute})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {!script.used && (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => markScriptUsed(script.id)}
                        >
                          Mark Used
                        </button>
                      )}
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => handleCopy(script.id, script.content)}
                      >
                        {copiedId === script.id ? 'Copied ✓' : 'Copy'}
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setExpandedId(isExpanded ? null : script.id)}
                      >
                        {isExpanded ? 'Collapse ▲' : 'Expand ▼'}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-sm)',
                      lineHeight: 1.6,
                      color: 'var(--color-text)',
                      whiteSpace: isExpanded ? 'pre-wrap' : 'normal',
                    }}
                  >
                    {isExpanded ? script.content : preview}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
