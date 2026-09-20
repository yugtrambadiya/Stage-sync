'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventsApi } from '@/lib/api';
import { useStageStore } from '@/store/useStageStore';
import { speakBroadcastScript, stopBroadcastSpeech } from '@/lib/speech';
import type { Event, Script } from '@/lib/types';
import './scripts.css';

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

function computeReadTime(text: string): { words: number; seconds: number; formatted: string } {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // Professional broadcast reading rate ~130-140 words/min (approx 2.2 words/sec)
  const seconds = Math.max(10, Math.round((words / 135) * 60));
  const formatted = seconds >= 60 ? `~${Math.round(seconds / 60)}m read` : `~${seconds}s read`;
  return { words, seconds, formatted };
}

const DEFAULT_SCRIPTS: Script[] = [
  {
    id: 'scr-demo-1',
    eventId: 'evt_technova_2025',
    type: 'TRANSITION',
    content: "Please join me in giving another immense round of applause for Dr. Rohan Verma for that groundbreaking keynote on Edge AI architectures! We are deeply appreciative of his brilliant insights. Next up, we are privileged to welcome Ananya Krishnan, Senior Staff Engineer at Flipkart, who will take us deep into 'WebAssembly in Production'. Let's give Ananya a warm TechNova welcome!",
    aiGenerated: true,
    used: false,
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'scr-demo-2',
    eventId: 'evt_technova_2025',
    type: 'ANNOUNCEMENT',
    content: "Attention delegates and attendees: The interactive workshop on 'Building Production Apps with LLMs' led by Google's Kiran Desai will commence at 13:15 in Auditorium B. Please take your seats early as seating is limited.",
    aiGenerated: true,
    used: true,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: 'scr-demo-3',
    eventId: 'evt_technova_2025',
    type: 'TRANSITION',
    content: "Thank you so much to Ananya Krishnan for that masterclass on WebAssembly performance! Next on our main stage is a premier executive panel: 'Startup Realities — From Dorm Room to Series B', moderated by Arjun Malhotra. Please welcome our esteemed panelists to the stage!",
    aiGenerated: true,
    used: false,
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
];

export default function EventScriptsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.id === 'string' ? params.id : '';

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Card State (first script in Teleprompter HUD by default for immediate preview)
  const [expandedId, setExpandedId] = useState<string | null>('scr-demo-1');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Store scripts
  const storeScripts = useStageStore((s) => s.scripts);
  const addScript = useStageStore((s) => s.addScript);
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

  // Seed default scripts on first visit if none generated yet
  useEffect(() => {
    if (storeScripts.length === 0 && eventId) {
      DEFAULT_SCRIPTS.forEach((sc) => addScript({ ...sc, eventId }));
    }
  }, [storeScripts.length, eventId, addScript]);

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

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopBroadcastSpeech();
    };
  }, []);

  // Filtered list
  const displayedScripts = useMemo(() => {
    return storeScripts.filter((sc) => {
      const matchesType = filterType === 'ALL' ? true : sc.type === filterType;
      const matchesSearch = searchQuery.trim()
        ? sc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sc.type.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchesType && matchesSearch;
    });
  }, [storeScripts, filterType, searchQuery]);

  // Total read time
  const totalReadSeconds = useMemo(() => {
    return storeScripts.reduce((acc, sc) => acc + computeReadTime(sc.content).seconds, 0);
  }, [storeScripts]);

  const totalReadFormatted = useMemo(() => {
    const mins = Math.round(totalReadSeconds / 60);
    return mins > 0 ? `~${mins} mins` : `${totalReadSeconds}s`;
  }, [totalReadSeconds]);

  const readyCount = useMemo(() => {
    return storeScripts.filter((s) => !s.used).length;
  }, [storeScripts]);

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

  const handleAudioToggle = useCallback((id: string, text: string) => {
    if (speakingId === id) {
      stopBroadcastSpeech();
      setSpeakingId(null);
    } else {
      setSpeakingId(id);
      speakBroadcastScript(
        text,
        () => setSpeakingId(null),
        () => setSpeakingId(null)
      );
    }
  }, [speakingId]);

  return (
    <div className="scripts-studio">
      {/* ── Unified Frosted Glass Header ── */}
      <header className="scripts-header">
        <div className="scripts-header__left">
          <Link href="/events" className="scripts-header__brand">
            <span className="scripts-header__logo-dot" />
            <span className="scripts-header__logo-text">
              STAGE<span style={{ color: 'var(--color-accent)' }}>SYNC</span>
            </span>
          </Link>
          <span className="scripts-header__sep">/</span>
          <span className="scripts-header__event-tag" title={event?.name ?? 'Scripts Studio'}>
            {event?.name ?? 'Live Scripts Studio'}
          </span>
        </div>

        {/* Center Segmented Navigation */}
        <nav className="scripts-header__nav" aria-label="Event views">
          <Link href={`/events/${eventId}/live`} className="scripts-header__tab">
            Live Stage
          </Link>
          <Link href={`/events/${eventId}/setup`} className="scripts-header__tab">
            Setup & Agenda
          </Link>
          <Link href={`/events/${eventId}/scripts`} className="scripts-header__tab scripts-header__tab--active">
            AI Scripts
          </Link>
        </nav>

        {/* Next-To-Next Level Live Control Room Launcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href={`/events/${eventId}/live`}
            className="scripts-launcher-btn"
            title="Launch Live Broadcast Control Room (Hotkey: L)"
          >
            <span className="scripts-launcher-beacon" />
            <span>● Launch Live Control Room</span>
            <span className="scripts-launcher-kbd">L</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* ── Hero Studio Section ── */}
      <section className="scripts-hero">
        <div className="scripts-hero__top">
          <div>
            <div className="scripts-hero__meta">
              <span className="scripts-hero__beacon" />
              <span className="scripts-hero__eyebrow">AI Teleprompter & Speech Intelligence</span>
            </div>
            <h1 className="scripts-hero__title">
              AI Broadcast Scripts Archive
            </h1>
            <p className="scripts-hero__desc">
              All stage teleprompter scripts, announcements, and transitions generated during this event. Audio playback powered by humanized keynote voice synthesis.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href={`/events/${eventId}/live`}
              className="setup-btn--primary"
              style={{ padding: '9px 18px' }}
            >
              <span>✨ Generate New in Control Room</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* ── 4 Executive Metrics ── */}
        <div className="scripts-metrics">
          <div className="scripts-metric-card">
            <div className="scripts-metric-icon">📜</div>
            <div className="scripts-metric-content">
              <span className="scripts-metric-label">Archived Scripts</span>
              <span className="scripts-metric-value num">{storeScripts.length} Generated</span>
            </div>
          </div>

          <div className="scripts-metric-card">
            <div className="scripts-metric-icon">⚡</div>
            <div className="scripts-metric-content">
              <span className="scripts-metric-label">Stage Ready Prompters</span>
              <span className="scripts-metric-value num" style={{ color: 'var(--color-live)' }}>
                {readyCount} Ready to Air
              </span>
            </div>
          </div>

          <div className="scripts-metric-card">
            <div className="scripts-metric-icon">⏱️</div>
            <div className="scripts-metric-content">
              <span className="scripts-metric-label">Total Prompter Cadence</span>
              <span className="scripts-metric-value num">{totalReadFormatted}</span>
            </div>
          </div>

          <div className="scripts-metric-card">
            <div className="scripts-metric-icon" style={{ color: 'var(--color-accent)' }}>🎙️</div>
            <div className="scripts-metric-content">
              <span className="scripts-metric-label">Voice Synthesizer</span>
              <span className="scripts-metric-value" style={{ color: 'var(--color-accent)', fontSize: '13px' }}>
                NEURAL MC VOICE
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Controls & Filter Bar ── */}
      <div className="scripts-controls">
        <div className="scripts-filter-pills" role="tablist">
          {(['ALL', 'TRANSITION', 'ANNOUNCEMENT'] as const).map((t) => (
            <button
              key={t}
              className={`scripts-filter-pill ${filterType === t ? 'scripts-filter-pill--active' : ''}`}
              onClick={() => setFilterType(t)}
            >
              {t === 'ALL' ? `All Scripts (${storeScripts.length})` : t === 'TRANSITION' ? 'Transitions' : 'Announcements'}
            </button>
          ))}
        </div>

        <div className="scripts-search-box">
          <span style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>🔍</span>
          <input
            className="scripts-search-input"
            type="text"
            placeholder="Search teleprompter scripts by keyword or topic..."
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

      {/* ── Main Structured Scripts Container ── */}
      <main className="scripts-container">
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="panel skeleton" style={{ height: 140, borderRadius: 'var(--radius-xl)' }} />
            <div className="panel skeleton" style={{ height: 140, borderRadius: 'var(--radius-xl)' }} />
          </div>
        )}

        {error && !loading && (
          <div className="scripts-empty">
            <p style={{ color: 'var(--color-danger)' }}>{error}</p>
            <Link href={`/events/${eventId}/live`} className="setup-btn--primary">
              Return to Live Control Room
            </Link>
          </div>
        )}

        {!loading && displayedScripts.length === 0 && (
          <div className="scripts-empty">
            <span className="scripts-empty-icon">🎙️</span>
            <span style={{ fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              {searchQuery ? 'No matching broadcast scripts found' : 'No teleprompter scripts generated yet'}
            </span>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', maxWidth: 480 }}>
              {searchQuery
                ? 'Try refining your search keyword or clearing the filter.'
                : 'Open the Live Broadcast Control Room and press [G] to generate celebratory AI keynote speaker transitions or announcements on demand.'}
            </p>
            <Link href={`/events/${eventId}/live`} className="scripts-launcher-btn" style={{ marginTop: '10px' }}>
              <span className="scripts-launcher-beacon" />
              <span>Launch Live Control Room</span>
              <span>→</span>
            </Link>
          </div>
        )}

        {!loading && displayedScripts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayedScripts.map((script) => {
              const isExpanded = expandedId === script.id;
              const isSpeaking = speakingId === script.id;
              const { relative, absolute } = formatTimestamp(script.createdAt);
              const { words, formatted: readTimeFormatted } = computeReadTime(script.content);

              const preview =
                script.content.length > 180
                  ? script.content.slice(0, 180) + '...'
                  : script.content;

              return (
                <article
                  key={script.id}
                  className={`script-card ${isExpanded ? 'script-card--expanded' : ''}`}
                >
                  {/* Card Header with Badges and Actions */}
                  <div className="script-card__header">
                    <div className="script-card__badges">
                      <span className={`script-type-tag ${script.type === 'ANNOUNCEMENT' ? 'script-type-tag--announcement' : 'script-type-tag--transition'}`}>
                        {script.type === 'ANNOUNCEMENT' ? '📣 STAGE ANNOUNCEMENT' : '🎙️ MC TRANSITION'}
                      </span>

                      {script.used ? (
                        <span className="badge badge--completed">✓ Used On Stage</span>
                      ) : (
                        <span className="badge badge--live">● Broadcast Ready</span>
                      )}

                      <span className="script-read-time num">
                        ⏱️ {readTimeFormatted} · {words} Words
                      </span>

                      <span className="num" style={{ fontSize: '11px', color: 'var(--color-text-faint)' }}>
                        {relative} ({absolute})
                      </span>
                    </div>

                    <div className="script-card__actions">
                      {/* Humanized Professional Read Aloud Button */}
                      <button
                        className={`script-action-btn ${isSpeaking ? 'script-action-btn--audio' : ''}`}
                        onClick={() => handleAudioToggle(script.id, script.content)}
                        title="Listen to humanized professional presenter audio playback"
                      >
                        {isSpeaking ? (
                          <>
                            <span className="script-audio-eq">
                              <span /><span /><span />
                            </span>
                            <span>⏹️ Stop Audio</span>
                          </>
                        ) : (
                          <>
                            <span>🔊</span>
                            <span>Read Aloud</span>
                          </>
                        )}
                      </button>

                      {/* Copy Script */}
                      <button
                        className="script-action-btn"
                        onClick={() => handleCopy(script.id, script.content)}
                        title="Copy script to clipboard"
                      >
                        <span>{copiedId === script.id ? '✓ Copied' : '📋 Copy'}</span>
                      </button>

                      {/* Mark Used */}
                      {!script.used && (
                        <button
                          className="script-action-btn"
                          onClick={() => markScriptUsed(script.id)}
                          title="Mark this script as delivered on stage"
                        >
                          <span>✓ Mark Used</span>
                        </button>
                      )}

                      {/* Modernized Teleprompter HUD Button (replaces boring Expand/Collapse) */}
                      <button
                        className="script-action-btn script-action-btn--prompter"
                        onClick={() => setExpandedId(isExpanded ? null : script.id)}
                        title={isExpanded ? 'Minimize Teleprompter HUD' : 'Open Full Teleprompter HUD View'}
                      >
                        <span>{isExpanded ? '▲ Exit Prompter HUD' : '⚡ Teleprompter HUD ▼'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Body & Teleprompter Text Display */}
                  <div className="script-card__body">
                    {isExpanded ? (
                      <div className="script-text--prompter">
                        <div className="script-prompter-guide">
                          <span className="script-prompter-label">● STAGE TELEPROMPTER ACTIVE</span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                            EST. PACE: 135 WPM · KEYNOTE POLISH
                          </span>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {script.content}
                        </div>
                      </div>
                    ) : (
                      <div className="script-text">
                        {preview}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
