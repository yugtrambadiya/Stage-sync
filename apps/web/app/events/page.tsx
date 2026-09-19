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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Top Glass Header */}
      <header
        style={{
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-6)',
          background: 'rgba(13, 17, 23, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--color-accent)',
                boxShadow: '0 0 10px var(--color-accent)',
              }}
            />
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, letterSpacing: '0.08em', fontSize: 'var(--text-sm)' }}>
              STAGE<span style={{ color: 'var(--color-accent)' }}>SYNC</span>
            </span>
          </Link>
          <span style={{ color: 'var(--color-border)' }}>/</span>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              padding: '3px 9px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--color-border)',
            }}
          >
            Events Directory
          </span>
        </div>

        <div>
          <button
            className="btn btn--secondary btn--sm"
            onClick={loadEvents}
            disabled={loading}
            style={{ padding: '6px 14px', fontSize: 'var(--text-xs)' }}
          >
            ↺ Refresh
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="container" style={{ flex: 1, padding: 'var(--space-8) var(--space-6)', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-live)', display: 'inline-block', boxShadow: '0 0 8px var(--color-live)' }} />
            <span style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600 }}>
              Broadcast Production Hub
            </span>
          </div>
          <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Live Events & Stage Control
          </h1>
          <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Select an event to open its live broadcast control room, orchestrate real-time agenda changes, or inspect AI teleprompter scripts.
          </p>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-5)' }}>
            {[1, 2].map((i) => (
              <div
                key={i}
                className="panel skeleton"
                style={{ height: '220px', borderRadius: 'var(--radius-lg)' }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-8)', maxWidth: 500, margin: '0 auto' }}>
            <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
            <button className="btn btn--primary btn--sm" onClick={loadEvents}>
              Retry Connection
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && events.length === 0 && (
          <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-8)', maxWidth: 500, margin: '0 auto' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-5)' }}>
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
                    padding: 'var(--space-6)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {isLive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, var(--color-live) 0%, #34d399 100%)',
                        boxShadow: '0 0 12px var(--color-live)',
                      }}
                    />
                  )}

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                      <span className={`badge ${isLive ? 'badge--live' : 'badge--upcoming'}`} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {isLive && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />}
                        {isLive ? 'ON AIR' : evt.status}
                      </span>
                      <span className="num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        📅 {formatDate(evt.date)}
                      </span>
                    </div>

                    <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 600, margin: 'var(--space-3) 0 var(--space-2)', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                      {evt.name}
                    </h2>

                    {evt.venue && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', margin: '0 0 var(--space-3)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>📍</span> {evt.venue}
                      </p>
                    )}

                    {evt.description && (
                      <p
                        style={{
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-muted)',
                          lineHeight: 1.6,
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
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
                      paddingTop: 'var(--space-4)',
                      borderTop: '1px solid var(--color-border)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Link href={`/events/${evt.id}/setup`} className="btn btn--ghost btn--sm">
                        Agenda
                      </Link>
                      <Link href={`/events/${evt.id}/scripts`} className="btn btn--ghost btn--sm">
                        Scripts
                      </Link>
                    </div>

                    <Link href={`/events/${evt.id}/live`} className="btn btn--primary btn--sm" style={{ padding: '8px 16px' }}>
                      {isLive ? '● Open Live Stage' : 'Open Control Room'}
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
