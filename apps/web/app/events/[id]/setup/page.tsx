'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { eventsApi, speakersApi, agendaApi, ApiRequestError } from '@/lib/api';
import type { Event, Speaker, AgendaItem } from '@/lib/types';
import { EventNav } from '@/components/EventNav/EventNav';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export default function EventSetupPage() {
  const params = useParams();
  const eventId = typeof params?.id === 'string' ? params.id : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Speaker form
  const [spkName, setSpkName] = useState('');
  const [spkDesignation, setSpkDesignation] = useState('');
  const [spkOrg, setSpkOrg] = useState('');
  const [spkBio, setSpkBio] = useState('');
  const [spkSubmitting, setSpkSubmitting] = useState(false);
  const [spkError, setSpkError] = useState<string | null>(null);

  // Agenda form
  const [agTitle, setAgTitle] = useState('');
  const [agSpeakerId, setAgSpeakerId] = useState('');
  const [agStartTime, setAgStartTime] = useState('2025-09-19T09:00');
  const [agDuration, setAgDuration] = useState(30);
  const [agSubmitting, setAgSubmitting] = useState(false);
  const [agError, setAgError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const ev = await eventsApi.get(eventId);
      setEvent(ev);
      setSpeakers(ev.speakers ?? []);
      setAgenda(
        (ev.agendaItems ?? []).sort(
          (a: AgendaItem, b: AgendaItem) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load event setup');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spkName.trim()) return;

    setSpkSubmitting(true);
    setSpkError(null);
    try {
      const created = await speakersApi.create({
        eventId,
        name: spkName.trim(),
        designation: spkDesignation.trim() || undefined,
        organization: spkOrg.trim() || undefined,
        biography: spkBio.trim() || undefined,
      });
      setSpeakers((prev) => [...prev, created]);
      setSpkName('');
      setSpkDesignation('');
      setSpkOrg('');
      setSpkBio('');
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setSpkError(err.message);
      } else {
        setSpkError((err as Error).message || 'Failed to add speaker');
      }
    } finally {
      setSpkSubmitting(false);
    }
  };

  const handleDeleteSpeaker = async (id: string) => {
    if (!confirm('Remove this speaker?')) return;
    try {
      await speakersApi.delete(id);
      setSpeakers((prev) => prev.filter((s) => s.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove speaker');
    }
  };

  const handleAddAgendaItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agTitle.trim()) return;

    setAgSubmitting(true);
    setAgError(null);
    try {
      const isoStart = new Date(agStartTime).toISOString();
      const created = await agendaApi.create({
        eventId,
        title: agTitle.trim(),
        startTime: isoStart,
        durationMinutes: agDuration,
        speakerId: agSpeakerId || undefined,
      });
      setAgenda((prev) =>
        [...prev, created].sort(
          (a: AgendaItem, b: AgendaItem) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
      );
      setAgTitle('');
      setAgSpeakerId('');
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setAgError(err.message);
      } else {
        setAgError((err as Error).message || 'Failed to add agenda item');
      }
    } finally {
      setAgSubmitting(false);
    }
  };

  const handleDeleteAgendaItem = async (id: string) => {
    if (!confirm('Remove this session?')) return;
    try {
      await agendaApi.delete(id);
      setAgenda((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove session');
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
            {event?.name ?? 'Event Setup'}
          </span>
        </div>

        <Link href={`/events/${eventId}/live`} className="btn btn--primary btn--sm">
          ● Open Live Control Room
        </Link>
      </header>

      <EventNav eventId={eventId} eventName={event?.name} />

      <main className="container" style={{ flex: 1, padding: 'var(--space-6)' }}>
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
            <div className="panel skeleton" style={{ height: 350 }} />
            <div className="panel skeleton" style={{ height: 350 }} />
          </div>
        )}

        {error && !loading && (
          <div className="panel" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
            <button className="btn btn--primary btn--sm" onClick={loadData}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--space-6)', alignItems: 'start' }}>
            {/* Panel 1: Speakers */}
            <div className="panel">
              <div className="panel__title">Speakers ({speakers.length})</div>

              {/* Add Speaker Form */}
              <form onSubmit={handleAddSpeaker} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                <input
                  className="input"
                  placeholder="Speaker full name *"
                  value={spkName}
                  onChange={(e) => setSpkName(e.target.value)}
                  required
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <input
                    className="input"
                    placeholder="Designation"
                    value={spkDesignation}
                    onChange={(e) => setSpkDesignation(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Organization"
                    value={spkOrg}
                    onChange={(e) => setSpkOrg(e.target.value)}
                  />
                </div>
                <textarea
                  className="input"
                  placeholder="Biography (optional)"
                  rows={2}
                  value={spkBio}
                  onChange={(e) => setSpkBio(e.target.value)}
                  style={{ resize: 'vertical' }}
                />

                {spkError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)' }}>{spkError}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn--ghost btn--sm" disabled={spkSubmitting}>
                    {spkSubmitting ? 'Adding...' : '+ Add Speaker'}
                  </button>
                </div>
              </form>

              {/* Speakers List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '420px', overflowY: 'auto' }}>
                {speakers.map((spk) => (
                  <div
                    key={spk.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{spk.name}</div>
                      <div style={{ color: 'var(--color-text-muted)' }}>
                        {[spk.designation, spk.organization].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleDeleteSpeaker(spk.id)}
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Agenda */}
            <div className="panel">
              <div className="panel__title">Agenda Schedule ({agenda.length} sessions)</div>

              {/* Add Agenda Item Form */}
              <form onSubmit={handleAddAgendaItem} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
                <input
                  className="input"
                  placeholder="Session title *"
                  value={agTitle}
                  onChange={(e) => setAgTitle(e.target.value)}
                  required
                />
                <select
                  className="select"
                  value={agSpeakerId}
                  onChange={(e) => setAgSpeakerId(e.target.value)}
                >
                  <option value="">No speaker / General Session</option>
                  {speakers.map((spk) => (
                    <option key={spk.id} value={spk.id}>
                      {spk.name} {spk.organization ? `(${spk.organization})` : ''}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 'var(--space-2)' }}>
                  <input
                    className="input"
                    type="datetime-local"
                    value={agStartTime}
                    onChange={(e) => setAgStartTime(e.target.value)}
                    required
                  />
                  <input
                    className="input num"
                    type="number"
                    min={5}
                    max={240}
                    placeholder="Minutes"
                    value={agDuration}
                    onChange={(e) => setAgDuration(parseInt(e.target.value, 10) || 30)}
                    required
                  />
                </div>

                {agError && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)' }}>{agError}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn--ghost btn--sm" disabled={agSubmitting}>
                    {agSubmitting ? 'Adding...' : '+ Add Session'}
                  </button>
                </div>
              </form>

              {/* Agenda Items List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '420px', overflowY: 'auto' }}>
                {agenda.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span className="num" style={{ fontWeight: 600, color: 'var(--color-accent)' }}>
                        {formatTime(item.startTime)}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{item.title}</div>
                        <div style={{ color: 'var(--color-text-muted)' }}>
                          {item.speaker?.name ?? 'No speaker'} · {item.durationMinutes}m
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleDeleteAgendaItem(item.id)}
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
