'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { eventsApi, speakersApi, agendaApi, ApiRequestError } from '@/lib/api';
import type { Event, Speaker, AgendaItem } from '@/lib/types';
import './setup.css';

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
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

export default function EventSetupPage() {
  const params = useParams();
  const eventId = typeof params?.id === 'string' ? params.id : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state & search
  const [activeTab, setActiveTab] = useState<'SPLIT' | 'AGENDA' | 'SPEAKERS'>('SPLIT');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [addSessionModalOpen, setAddSessionModalOpen] = useState(false);
  const [addSpeakerModalOpen, setAddSpeakerModalOpen] = useState(false);

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

  // Derived metrics
  const totalRuntimeMinutes = useMemo(() => {
    return agenda.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
  }, [agenda]);

  const totalRuntimeFormatted = useMemo(() => {
    const hours = Math.floor(totalRuntimeMinutes / 60);
    const mins = totalRuntimeMinutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins > 0 ? `${mins}m` : ''}`;
  }, [totalRuntimeMinutes]);

  // Filtered lists
  const filteredAgenda = useMemo(() => {
    if (!searchQuery.trim()) return agenda;
    const q = searchQuery.toLowerCase();
    return agenda.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.speaker?.name?.toLowerCase().includes(q) ||
        item.speaker?.organization?.toLowerCase().includes(q)
    );
  }, [agenda, searchQuery]);

  const filteredSpeakers = useMemo(() => {
    if (!searchQuery.trim()) return speakers;
    const q = searchQuery.toLowerCase();
    return speakers.filter(
      (spk) =>
        spk.name.toLowerCase().includes(q) ||
        spk.organization?.toLowerCase().includes(q) ||
        spk.designation?.toLowerCase().includes(q)
    );
  }, [speakers, searchQuery]);

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
      setAddSpeakerModalOpen(false);
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

  const handleDeleteSpeaker = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;
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

      // Find speaker object if assigned to populate immediately
      const matchedSpeaker = speakers.find((s) => s.id === agSpeakerId);
      const withSpeaker: AgendaItem = {
        ...created,
        speaker: matchedSpeaker,
      };

      setAgenda((prev) =>
        [...prev, withSpeaker].sort(
          (a: AgendaItem, b: AgendaItem) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
      );
      setAgTitle('');
      setAgSpeakerId('');
      setAddSessionModalOpen(false);
    } catch (err: unknown) {
      if (err instanceof ApiRequestError) {
        setAgError(err.message);
      } else {
        setAgError((err as Error).message || 'Failed to add session');
      }
    } finally {
      setAgSubmitting(false);
    }
  };

  const handleDeleteAgendaItem = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove session: "${title}"?`)) return;
    try {
      await agendaApi.delete(id);
      setAgenda((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove session');
    }
  };

  return (
    <div className="setup-studio">
      {/* ── Single Unified Frosted Glass Header ── */}
      <header className="setup-header">
        <div className="setup-header__left">
          <Link href="/events" className="setup-header__brand">
            <span className="setup-header__logo-dot" />
            <span className="setup-header__logo-text">
              STAGE<span style={{ color: 'var(--color-accent)' }}>SYNC</span>
            </span>
          </Link>
          <span className="setup-header__sep">/</span>
          <span className="setup-header__event-tag" title={event?.name ?? 'Event Setup'}>
            {event?.name ?? 'Event Architecture'}
          </span>
        </div>

        {/* Center Segmented Navigation Pills */}
        <nav className="setup-header__nav" aria-label="Event views">
          <Link href={`/events/${eventId}/live`} className="setup-header__tab">
            Live Stage
          </Link>
          <Link href={`/events/${eventId}/setup`} className="setup-header__tab setup-header__tab--active">
            Setup & Agenda
          </Link>
          <Link href={`/events/${eventId}/scripts`} className="setup-header__tab">
            AI Scripts
          </Link>
        </nav>

        {/* Right Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href={`/events/${eventId}/live`} className="setup-btn--live-launch">
            <span>● Launch Live Control Room</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* ── Breathable Hero Header ── */}
      <section className="setup-hero">
        <div className="setup-hero__top">
          <div>
            <div className="setup-hero__meta">
              <span className="setup-hero__beacon" />
              <span className="setup-hero__eyebrow">Production Command Architecture</span>
            </div>
            <h1 className="setup-hero__title">
              {event?.name ?? 'Stage Architecture & Schedule Studio'}
            </h1>
            <p className="setup-hero__desc">
              Curate the master timetable, assign world-class keynote speakers, and configure live session transitions with millisecond precision.
            </p>
          </div>

          <div className="setup-hero__actions">
            <button
              className="setup-btn--primary"
              onClick={() => setAddSessionModalOpen(true)}
            >
              <span>+ Add New Session</span>
            </button>
            <button
              className="setup-btn--glass"
              onClick={() => setAddSpeakerModalOpen(true)}
            >
              <span>+ Add Speaker</span>
            </button>
          </div>
        </div>

        {/* ── 4 Executive Telemetry Metric Tiles ── */}
        <div className="setup-metrics">
          <div className="setup-metric-card">
            <div className="setup-metric-icon">📅</div>
            <div className="setup-metric-content">
              <span className="setup-metric-label">Scheduled Sessions</span>
              <span className="setup-metric-value num">{agenda.length} Keynotes & Talks</span>
            </div>
          </div>

          <div className="setup-metric-card">
            <div className="setup-metric-icon">🎙️</div>
            <div className="setup-metric-content">
              <span className="setup-metric-label">Keynote Roster</span>
              <span className="setup-metric-value num">{speakers.length} Speakers Registered</span>
            </div>
          </div>

          <div className="setup-metric-card">
            <div className="setup-metric-icon">⏱️</div>
            <div className="setup-metric-content">
              <span className="setup-metric-label">Total Stage Runtime</span>
              <span className="setup-metric-value num">{totalRuntimeFormatted} Allotted</span>
            </div>
          </div>

          <div className="setup-metric-card">
            <div className="setup-metric-icon" style={{ color: 'var(--color-live)' }}>📡</div>
            <div className="setup-metric-content">
              <span className="setup-metric-label">Broadcast Telemetry</span>
              <span className="setup-metric-value" style={{ color: 'var(--color-live)' }}>
                READY TO AIR
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Breathable View Switcher & Search Bar ── */}
      <div className="setup-controls">
        <div className="setup-view-tabs" role="tablist">
          <button
            className={`setup-view-tab ${activeTab === 'SPLIT' ? 'setup-view-tab--active' : ''}`}
            onClick={() => setActiveTab('SPLIT')}
          >
            ⊞ Studio Split View
          </button>
          <button
            className={`setup-view-tab ${activeTab === 'AGENDA' ? 'setup-view-tab--active' : ''}`}
            onClick={() => setActiveTab('AGENDA')}
          >
            📅 Master Agenda ({agenda.length})
          </button>
          <button
            className={`setup-view-tab ${activeTab === 'SPEAKERS' ? 'setup-view-tab--active' : ''}`}
            onClick={() => setActiveTab('SPEAKERS')}
          >
            🎙️ Speaker Directory ({speakers.length})
          </button>
        </div>

        <div className="setup-search-box">
          <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>🔍</span>
          <input
            className="setup-search-input"
            type="text"
            placeholder="Search sessions, speakers, organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '12px' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Main Studio Content ── */}
      <main className="setup-content">
        {loading && (
          <div className="setup-split-grid">
            <div className="panel skeleton" style={{ height: 420 }} />
            <div className="panel skeleton" style={{ height: 420 }} />
          </div>
        )}

        {error && !loading && (
          <div className="setup-panel" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }}>{error}</p>
            <button className="setup-btn--primary" onClick={loadData}>
              Retry Connection
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className={activeTab === 'SPLIT' ? 'setup-split-grid' : 'setup-single-view'}>
            {/* 1. AGENDA PANEL */}
            {(activeTab === 'SPLIT' || activeTab === 'AGENDA') && (
              <div className="setup-panel">
                <div className="setup-panel__header">
                  <div className="setup-panel__title">
                    <span>📅</span>
                    <span>Master Stage Agenda Timeline</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="setup-panel__count num">{filteredAgenda.length} Sessions</span>
                    <button
                      className="setup-btn--primary"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => setAddSessionModalOpen(true)}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {filteredAgenda.length === 0 ? (
                  <div className="setup-empty">
                    <span className="setup-empty-icon">📅</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {searchQuery ? 'No matching sessions found' : 'No agenda sessions configured yet'}
                    </span>
                    <button
                      className="setup-btn--glass"
                      style={{ marginTop: '8px' }}
                      onClick={() => setAddSessionModalOpen(true)}
                    >
                      + Add First Session
                    </button>
                  </div>
                ) : (
                  <div className="setup-agenda-list">
                    {filteredAgenda.map((item) => {
                      const category = getTrackCategory(item.title);
                      const initials = getInitials(item.speaker?.name);

                      return (
                        <div key={item.id} className="setup-agenda-item">
                          <div className="setup-agenda-time-col">
                            <span className="setup-agenda-time num">
                              {formatTime(item.startTime)}
                            </span>
                            <span className="setup-agenda-dur num">
                              {item.durationMinutes}m duration
                            </span>
                          </div>

                          <div className="setup-agenda-content">
                            <div className="setup-agenda-tag-row">
                              <span className={`timeline__tag timeline__tag--${category.tone}`}>
                                {category.label}
                              </span>
                              <span className="badge badge--upcoming" style={{ fontSize: '9px', padding: '1px 6px' }}>
                                {item.status}
                              </span>
                            </div>

                            <div className="setup-agenda-title" title={item.title}>
                              {item.title}
                            </div>

                            <div className="setup-agenda-speaker-row">
                              <div className="setup-agenda-avatar" title={item.speaker?.name ?? 'Unassigned'}>
                                {initials}
                              </div>
                              <span className="setup-agenda-speaker-name">
                                {item.speaker?.name ?? 'No speaker assigned'}
                                {item.speaker?.organization && ` · ${item.speaker.organization}`}
                              </span>
                            </div>
                          </div>

                          <div className="setup-agenda-actions">
                            <button
                              className="setup-delete-btn"
                              onClick={() => handleDeleteAgendaItem(item.id, item.title)}
                              title="Delete Session"
                            >
                              ✕ Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. SPEAKERS PANEL */}
            {(activeTab === 'SPLIT' || activeTab === 'SPEAKERS') && (
              <div className="setup-panel">
                <div className="setup-panel__header">
                  <div className="setup-panel__title">
                    <span>🎙️</span>
                    <span>Keynote & Guest Speaker Roster</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="setup-panel__count num">{filteredSpeakers.length} Speakers</span>
                    <button
                      className="setup-btn--glass"
                      style={{ padding: '4px 12px', fontSize: '12px' }}
                      onClick={() => setAddSpeakerModalOpen(true)}
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {filteredSpeakers.length === 0 ? (
                  <div className="setup-empty">
                    <span className="setup-empty-icon">🎙️</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {searchQuery ? 'No matching speakers found' : 'No speakers added to the roster yet'}
                    </span>
                    <button
                      className="setup-btn--glass"
                      style={{ marginTop: '8px' }}
                      onClick={() => setAddSpeakerModalOpen(true)}
                    >
                      + Register First Speaker
                    </button>
                  </div>
                ) : (
                  <div className="setup-speakers-list">
                    {filteredSpeakers.map((spk) => {
                      const initials = getInitials(spk.name);
                      const assignedSessions = agenda.filter((i) => i.speakerId === spk.id || i.speaker?.id === spk.id);

                      return (
                        <div key={spk.id} className="setup-speaker-item">
                          <div className="setup-speaker-left">
                            <div className="setup-speaker-avatar" title={spk.name}>
                              {initials}
                            </div>
                            <div className="setup-speaker-info">
                              <div className="setup-speaker-name">{spk.name}</div>
                              <div className="setup-speaker-role">
                                {[spk.designation, spk.organization].filter(Boolean).join(' · ')}
                              </div>
                              {assignedSessions.length > 0 && (
                                <span style={{ fontSize: '10px', color: 'var(--color-accent)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                                  ● {assignedSessions.length} {assignedSessions.length === 1 ? 'Session' : 'Sessions'} Assigned
                                </span>
                              )}
                              {spk.biography && (
                                <div className="setup-speaker-bio" title={spk.biography}>
                                  {spk.biography}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            className="setup-delete-btn"
                            onClick={() => handleDeleteSpeaker(spk.id, spk.name)}
                            title="Remove Speaker"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Glassmorphic Modal: Add Session ── */}
      {addSessionModalOpen && (
        <div className="setup-modal-backdrop" onClick={() => setAddSessionModalOpen(false)}>
          <div className="setup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="setup-modal__header">
              <span className="setup-modal__title">📅 Schedule New Agenda Session</span>
              <button className="setup-modal__close" onClick={() => setAddSessionModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddAgendaItem}>
              <div className="setup-modal__body">
                <div className="setup-field">
                  <label className="setup-field-label">Session Title *</label>
                  <input
                    className="setup-field-input"
                    placeholder="e.g. Keynote: Autonomous Systems at Scale"
                    value={agTitle}
                    onChange={(e) => setAgTitle(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="setup-field">
                  <label className="setup-field-label">Assigned Keynote Speaker</label>
                  <select
                    className="setup-field-select"
                    value={agSpeakerId}
                    onChange={(e) => setAgSpeakerId(e.target.value)}
                  >
                    <option value="">No speaker / General Stage Session</option>
                    {speakers.map((spk) => (
                      <option key={spk.id} value={spk.id}>
                        {spk.name} {spk.organization ? `(${spk.organization})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
                  <div className="setup-field">
                    <label className="setup-field-label">Scheduled Start Time *</label>
                    <input
                      className="setup-field-input num"
                      type="datetime-local"
                      value={agStartTime}
                      onChange={(e) => setAgStartTime(e.target.value)}
                      required
                    />
                  </div>
                  <div className="setup-field">
                    <label className="setup-field-label">Duration (Minutes) *</label>
                    <input
                      className="setup-field-input num"
                      type="number"
                      min={5}
                      max={360}
                      value={agDuration}
                      onChange={(e) => setAgDuration(parseInt(e.target.value, 10) || 30)}
                      required
                    />
                  </div>
                </div>

                {/* Duration Presets */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>PRESETS:</span>
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setAgDuration(mins)}
                      style={{
                        padding: '3px 9px',
                        fontSize: '11px',
                        borderRadius: 'var(--radius-pill)',
                        background: agDuration === mins ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)',
                        color: agDuration === mins ? '#fff' : 'var(--color-text-muted)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                      }}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                {agError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                    {agError}
                  </div>
                )}
              </div>

              <div className="setup-modal__footer">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setAddSessionModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="setup-btn--primary"
                  disabled={agSubmitting}
                >
                  {agSubmitting ? 'Creating Session...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Glassmorphic Modal: Add Speaker ── */}
      {addSpeakerModalOpen && (
        <div className="setup-modal-backdrop" onClick={() => setAddSpeakerModalOpen(false)}>
          <div className="setup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="setup-modal__header">
              <span className="setup-modal__title">🎙️ Register Keynote Speaker</span>
              <button className="setup-modal__close" onClick={() => setAddSpeakerModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSpeaker}>
              <div className="setup-modal__body">
                <div className="setup-field">
                  <label className="setup-field-label">Speaker Full Name *</label>
                  <input
                    className="setup-field-input"
                    placeholder="e.g. Dr. Rohan Verma"
                    value={spkName}
                    onChange={(e) => setSpkName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="setup-field">
                    <label className="setup-field-label">Designation / Role</label>
                    <input
                      className="setup-field-input"
                      placeholder="e.g. Head of AI Lab"
                      value={spkDesignation}
                      onChange={(e) => setSpkDesignation(e.target.value)}
                    />
                  </div>
                  <div className="setup-field">
                    <label className="setup-field-label">Organization / Affiliation</label>
                    <input
                      className="setup-field-input"
                      placeholder="e.g. IIT Bombay"
                      value={spkOrg}
                      onChange={(e) => setSpkOrg(e.target.value)}
                    />
                  </div>
                </div>

                <div className="setup-field">
                  <label className="setup-field-label">Professional Biography (Optional)</label>
                  <textarea
                    className="setup-field-textarea"
                    placeholder="Brief speaker background, domain expertise, and keynote introduction notes..."
                    value={spkBio}
                    onChange={(e) => setSpkBio(e.target.value)}
                  />
                </div>

                {spkError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: 'var(--text-xs)', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}>
                    {spkError}
                  </div>
                )}
              </div>

              <div className="setup-modal__footer">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setAddSpeakerModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="setup-btn--primary"
                  disabled={spkSubmitting}
                >
                  {spkSubmitting ? 'Registering...' : 'Register Speaker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
