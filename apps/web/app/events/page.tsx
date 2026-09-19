'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { eventsApi } from '../../lib/api';
import type { Event } from '../../lib/types';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.list();
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.1em' }}>
              STAGE<span style={{ color: 'var(--color-accent)' }}>SYNC</span>
            </span>
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Events Directory
          </span>
        </div>

        <div>
          <button className="btn btn--ghost btn--sm" onClick={loadEvents} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ flex: 1, padding: 'var(--space-8) var(--space-6)' }}>
        <div className="page-header" style={{ marginBottom: 'var(--space-8)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
              Live Events & Production Controls
            </h1>
            <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              Select an event to open its live broadcast control room, edit stage agenda, or view AI scripts.
            </p>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="panel skeleton"
                style={{ height: '180px', borderRadius: 'var(--radius-lg)' }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
            <button className="btn btn--primary btn--sm" onClick={loadEvents}>
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              No events found. Seed the database or check backend status.
            </p>
            <button className="btn btn--primary btn--sm" onClick={loadEvents}>
              Refresh
            </button>
          </div>
        )}

        {/* Event cards grid */}
        {!loading && !error && events.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-4)' }}>
            {events.map((evt) => {
              const isLive = evt.status === 'LIVE';

              return (
                <div
                  key={evt.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: isLive ? '3px solid var(--color-live)' : undefined,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                      <span className={`badge ${isLive ? 'badge--live' : 'badge--upcoming'}`}>
                        {isLive ? '● LIVE' : evt.status}
                      </span>
                      <span className="num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {formatDate(evt.date)}
                      </span>
                    </div>

                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, margin: 'var(--space-2) 0', color: 'var(--color-text)' }}>
                      {evt.name}
                    </h2>

                    {evt.venue && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-2)' }}>
                        📍 {evt.venue}
                      </p>
                    )}

                    {evt.description && (
                      <p
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-muted)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          margin: 0,
                        }}
                      >
                        {evt.description}
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'var(--space-6)',
                      paddingTop: 'var(--space-3)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Link href={`/events/${evt.id}/setup`} className="btn btn--ghost btn--sm">
                        Setup
                      </Link>
                      <Link href={`/events/${evt.id}/scripts`} className="btn btn--ghost btn--sm">
                        Scripts
                      </Link>
                    </div>

                    <Link href={`/events/${evt.id}/live`} className="btn btn--primary btn--sm">
                      {isLive ? '● Open Live' : 'Open Control Room'}
                    </Link>
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
