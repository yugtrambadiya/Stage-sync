'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { eventsApi, speakersApi, agendaApi, ApiRequestError } from '@/lib/api';
import { UnifiedEventHeader } from '@/components/UnifiedEventHeader/UnifiedEventHeader';
import type { Event, Speaker, AgendaItem } from '@/lib/types';
import './setup.css';

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

export default function EventSetupPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.id === 'string' ? params.id : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keyboard shortcut: Press L to jump straight to Live Control Room
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        router.push(`/events/${eventId}/live`);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [eventId, router]);

  const [activeTab, setActiveTab] = useState<'SPLIT' | 'AGENDA' | 'SPEAKERS'>('SPLIT');
  const [searchQuery, setSearchQuery] = useState('');

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
  const [agStartTime, setAgStartTime] = useState(() => {
    const now = new Date();
    const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const timePart = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
    return `${datePart}T${timePart}`;
  });
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
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''}`;
  }, [totalRuntimeMinutes]);

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
      setSpkName(''); setSpkDesignation(''); setSpkOrg(''); setSpkBio('');
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
    if (!confirm(`Remove ${name} from the speaker roster?`)) return;
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
      const matchedSpeaker = speakers.find((s) => s.id === agSpeakerId);
      const withSpeaker: AgendaItem = { ...created, speaker: matchedSpeaker };
      setAgenda((prev) =>
        [...prev, withSpeaker].sort(
          (a: AgendaItem, b: AgendaItem) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
      );
      setAgTitle(''); setAgSpeakerId('');
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
    if (!confirm(`Remove session: "${title}"?`)) return;
    try {
      await agendaApi.delete(id);
      setAgenda((prev) => prev.filter((i) => i.id !== id));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove session');
    }
  };

  return (
    <div className="setup-studio">
      {/* Unified Enterprise Header */}
      <UnifiedEventHeader
        eventId={eventId}
        eventName={event?.name}
        activeView="setup"
      />

      {/* ── Hero Command Area ── */}
      <section className="setup-hero">
        <div className="setup-hero__top">
          <div className="setup-hero__identity">
            <div className="setup-hero__meta">
              <span className="setup-hero__beacon" />
              <span className="setup-hero__eyebrow">Event Production Command Suite</span>
            </div>
            <h1 className="setup-hero__title">
              {event?.name ?? 'Stage Architecture Studio'}
            </h1>
            <p className="setup-hero__desc">
              Architect the master program timeline, curate your keynote roster, and configure every live session with precision.
            </p>
          </div>

          <div className="setup-hero__actions">
            <button className="setup-btn--primary" onClick={() => setAddSessionModalOpen(true)}>
              <span>＋</span> New Session
            </button>
            <button className="setup-btn--glass" onClick={() => setAddSpeakerModalOpen(true)}>
              <span>＋</span> Add Speaker
            </button>
          </div>
        </div>

        {/* Executive Metric Tiles */}
        <div className="setup-metrics">
          <div className="setup-metric-card setup-metric-card--accent">
            <div className="setup-metric-icon setup-metric-icon--indigo">📅</div>
            <div className="setup-metric-content">
              <span className="setup-metric-label">Scheduled Sessions</span>
              <span className="setup-metric-value num">{agenda.length}</span>
              <span className="setup-metric-sub">Keynotes &amp; Talks</span>
            </div>
          </div>

          <div className="setup-metric-card setup-metric-card--green">
            <div className="setup-metric-icon setup-metric-icon--green">🎙️</div>
            <div className="setup-metric-content">
              <span className="setup-metric-label">Speaker Roster</span>
              <span className="setup-metric-value num">{speakers.length}</span>
              <span className="setup-metric-sub">Registered Speakers</span>
            </div>
          </div>

          <div className="setup-metric-card setup-metric-card--amber">
            <div className="setup-metric-icon setup-metric-icon--amber">⏱️</div>
            <div className="setup-metric-content">
              <span className="setup-metric-label">Total Stage Runtime</span>
              <span className="setup-metric-value num">{totalRuntimeFormatted || '—'}</span>
              <span className="setup-metric-sub">Allotted Program</span>
            </div>
          </div>

          <div className="setup-metric-card">
            <div className="setup-metric-icon setup-metric-icon--slate">📡</div>
            <div className="setup-metric-content">
              <span className="setup-metric-label">Broadcast Telemetry</span>
              <span className="setup-metric-value" style={{ color: 'var(--color-live)', fontSize: '14px', fontWeight: 700 }}>READY TO AIR</span>
              <span className="setup-metric-sub">All systems nominal</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── View Switcher & Search ── */}
      <div className="setup-controls">
        <div className="setup-view-tabs" role="tablist">
          <button
            className={`setup-view-tab ${activeTab === 'SPLIT' ? 'setup-view-tab--active' : ''}`}
            onClick={() => setActiveTab('SPLIT')}
          >
            ⊞ Split View
          </button>
          <button
            className={`setup-view-tab ${activeTab === 'AGENDA' ? 'setup-view-tab--active' : ''}`}
            onClick={() => setActiveTab('AGENDA')}
          >
            📅 Agenda ({agenda.length})
          </button>
          <button
            className={`setup-view-tab ${activeTab === 'SPEAKERS' ? 'setup-view-tab--active' : ''}`}
            onClick={() => setActiveTab('SPEAKERS')}
          >
            🎙️ Speakers ({speakers.length})
          </button>
        </div>

        <div className="setup-search-box">
          <span style={{ color: 'var(--color-text-faint)', fontSize: '12px' }}>🔍</span>
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
              style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="setup-content">
        {loading && (
          <div className={activeTab === 'SPLIT' ? 'setup-split-grid' : 'setup-single-view'}>
            <div className="panel skeleton" style={{ height: 380 }} />
            {activeTab === 'SPLIT' && <div className="panel skeleton" style={{ height: 380 }} />}
          </div>
        )}

        {error && !loading && (
          <div className="setup-panel" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <p style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)', fontSize: '13px' }}>{error}</p>
            <button className="setup-btn--primary" onClick={loadData}>Retry Connection</button>
          </div>
        )}

        {!loading && !error && (
          <div className={activeTab === 'SPLIT' ? 'setup-split-grid' : 'setup-single-view'}>

            {/* ── AGENDA PANEL ── */}
            {(activeTab === 'SPLIT' || activeTab === 'AGENDA') && (
              <div className="setup-panel">
                <div className="setup-panel__header">
                  <div className="setup-panel__title">
                    <span>📅</span>
                    <span>Master Stage Timeline</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="setup-panel__count num">{filteredAgenda.length} Sessions</span>
                    <button
                      className="setup-btn--primary"
                      style={{ padding: '5px 12px', fontSize: '11.5px', borderRadius: '7px' }}
                      onClick={() => setAddSessionModalOpen(true)}
                    >
                      ＋ Add
                    </button>
                  </div>
                </div>

                {filteredAgenda.length === 0 ? (
                  <div className="setup-empty">
                    <span className="setup-empty-icon">📅</span>
                    <span className="setup-empty-title">
                      {searchQuery ? 'No matching sessions' : 'No sessions scheduled yet'}
                    </span>
                    <span className="setup-empty-sub">
                      {searchQuery ? 'Try a different search term.' : 'Add your first session to build the master agenda.'}
                    </span>
                    {!searchQuery && (
                      <button className="setup-btn--glass" style={{ marginTop: '4px' }} onClick={() => setAddSessionModalOpen(true)}>
                        ＋ Schedule First Session
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="setup-agenda-list">
                    {filteredAgenda.map((item) => {
                      const category = getTrackCategory(item.title);
                      const initials = getInitials(item.speaker?.name);

                      return (
                        <div key={item.id} className="setup-agenda-item">
                          <div className="setup-agenda-time-col">
                            <span className="setup-agenda-time">{formatTime(item.startTime)}</span>
                            <span className="setup-agenda-dur">{item.durationMinutes}m</span>
                          </div>

                          <div className="setup-agenda-content">
                            <div className="setup-agenda-tag-row">
                              <span className={`timeline__tag timeline__tag--${category.tone}`}>
                                {category.label}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'var(--font-mono)',
                                  fontSize: '9px',
                                  color: item.status === 'DELAYED' ? 'var(--color-warn)' : 'var(--color-text-faint)',
                                  letterSpacing: '0.06em',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  background: item.status === 'DELAYED' ? 'var(--color-warn-bg)' : 'var(--color-surface-elevated)',
                                  border: '1px solid',
                                  borderColor: item.status === 'DELAYED' ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.07)',
                                }}
                              >
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
                              title="Remove Session"
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

            {/* ── SPEAKERS PANEL ── */}
            {(activeTab === 'SPLIT' || activeTab === 'SPEAKERS') && (
              <div className="setup-panel">
                <div className="setup-panel__header">
                  <div className="setup-panel__title">
                    <span>🎙️</span>
                    <span>Speaker Roster</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="setup-panel__count num">{filteredSpeakers.length} Speakers</span>
                    <button
                      className="setup-btn--glass"
                      style={{ padding: '5px 12px', fontSize: '11.5px', borderRadius: '7px' }}
                      onClick={() => setAddSpeakerModalOpen(true)}
                    >
                      ＋ Add
                    </button>
                  </div>
                </div>

                {filteredSpeakers.length === 0 ? (
                  <div className="setup-empty">
                    <span className="setup-empty-icon">🎙️</span>
                    <span className="setup-empty-title">
                      {searchQuery ? 'No matching speakers' : 'No speakers on the roster'}
                    </span>
                    <span className="setup-empty-sub">
                      {searchQuery ? 'Try a different search term.' : 'Register speakers to assign them to sessions.'}
                    </span>
                    {!searchQuery && (
                      <button className="setup-btn--glass" style={{ marginTop: '4px' }} onClick={() => setAddSpeakerModalOpen(true)}>
                        ＋ Register First Speaker
                      </button>
                    )}
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
                                <div className="setup-speaker-assignment">
                                  ● {assignedSessions.length} {assignedSessions.length === 1 ? 'session' : 'sessions'} assigned
                                </div>
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

      {/* ── Modal: Add Session ── */}
      {addSessionModalOpen && (
        <div className="setup-modal-backdrop" onClick={() => setAddSessionModalOpen(false)}>
          <div className="setup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="setup-modal__header">
              <span className="setup-modal__title">
                <span>📅</span> Schedule New Session
              </span>
              <button className="setup-modal__close" onClick={() => setAddSessionModalOpen(false)}>✕</button>
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
                  <label className="setup-field-label">Assigned Speaker</label>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
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
                    <label className="setup-field-label">Duration (mins) *</label>
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

                <div className="setup-duration-presets">
                  <span className="setup-duration-label">Quick:</span>
                  {[15, 30, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      className={`setup-duration-pill ${agDuration === mins ? 'setup-duration-pill--active' : ''}`}
                      onClick={() => setAgDuration(mins)}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                {agError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '12px', background: 'var(--color-danger-bg, rgba(239,68,68,0.1))', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-danger)' }}>
                    {agError}
                  </div>
                )}
              </div>

              <div className="setup-modal__footer">
                <button type="button" className="setup-btn--glass" style={{ padding: '7px 16px', fontSize: '12px' }} onClick={() => setAddSessionModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="setup-btn--primary" style={{ padding: '7px 18px', fontSize: '12px' }} disabled={agSubmitting}>
                  {agSubmitting ? 'Creating…' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Speaker ── */}
      {addSpeakerModalOpen && (
        <div className="setup-modal-backdrop" onClick={() => setAddSpeakerModalOpen(false)}>
          <div className="setup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="setup-modal__header">
              <span className="setup-modal__title">
                <span>🎙️</span> Register Keynote Speaker
              </span>
              <button className="setup-modal__close" onClick={() => setAddSpeakerModalOpen(false)}>✕</button>
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="setup-field">
                    <label className="setup-field-label">Designation / Role</label>
                    <input
                      className="setup-field-input"
                      placeholder="Head of AI Lab"
                      value={spkDesignation}
                      onChange={(e) => setSpkDesignation(e.target.value)}
                    />
                  </div>
                  <div className="setup-field">
                    <label className="setup-field-label">Organization</label>
                    <input
                      className="setup-field-input"
                      placeholder="IIT Bombay"
                      value={spkOrg}
                      onChange={(e) => setSpkOrg(e.target.value)}
                    />
                  </div>
                </div>

                <div className="setup-field">
                  <label className="setup-field-label">Professional Biography</label>
                  <textarea
                    className="setup-field-textarea"
                    placeholder="Speaker background, domain expertise, and keynote introduction…"
                    value={spkBio}
                    onChange={(e) => setSpkBio(e.target.value)}
                  />
                </div>

                {spkError && (
                  <div style={{ color: 'var(--color-danger)', fontSize: '12px', background: 'var(--color-danger-bg, rgba(239,68,68,0.1))', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-danger)' }}>
                    {spkError}
                  </div>
                )}
              </div>

              <div className="setup-modal__footer">
                <button type="button" className="setup-btn--glass" style={{ padding: '7px 16px', fontSize: '12px' }} onClick={() => setAddSpeakerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="setup-btn--primary" style={{ padding: '7px 18px', fontSize: '12px' }} disabled={spkSubmitting}>
                  {spkSubmitting ? 'Registering…' : 'Register Speaker'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
