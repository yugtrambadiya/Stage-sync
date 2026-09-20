'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { eventsApi } from '@/lib/api';
import { useStageStore } from '@/store/useStageStore';
import {
  speakBroadcastScript,
  stopBroadcastSpeech,
  getAvailablePresenterVoices,
  getBestBroadcastVoice,
  prepareScriptSentences,
  type PresenterVoice,
} from '@/lib/speech';
import { UnifiedEventHeader } from '@/components/UnifiedEventHeader/UnifiedEventHeader';
import type { Event, Script } from '@/lib/types';
import './scripts.css';

function formatTimestamp(iso: string): { relative: string; absolute: string } {
  try {
    const d = new Date(iso);
    const absolute = d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' IST';
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
  const [prompterFontSize, setPrompterFontSize] = useState<number>(18);

  // High-End Speech Synthesis State
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [speakingSentenceIndex, setSpeakingSentenceIndex] = useState<number>(-1);
  const [speakingTotalSentences, setSpeakingTotalSentences] = useState<number>(0);
  const [availableVoices, setAvailableVoices] = useState<PresenterVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [speechRate, setSpeechRate] = useState<number>(0.91);
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);

  // Store scripts
  const storeScripts = useStageStore((s) => s.scripts);
  const addScript = useStageStore((s) => s.addScript);
  const markScriptUsed = useStageStore((s) => s.markScriptUsed);

  // Load Event
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

  // Load and refresh speech voices
  useEffect(() => {
    const refreshVoices = () => {
      const voices = getAvailablePresenterVoices();
      setAvailableVoices(voices);
      if (voices.length > 0 && !selectedVoiceName) {
        const best = getBestBroadcastVoice();
        if (best) setSelectedVoiceName(best.name);
      }
    };

    refreshVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }
  }, [selectedVoiceName]);

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
      setSpeakingSentenceIndex(-1);
    } else {
      setSpeakingId(id);
      setSpeakingSentenceIndex(0);
      speakBroadcastScript(text, {
        voiceName: selectedVoiceName || undefined,
        rate: speechRate,
        onSentenceChange: (idx, total) => {
          setSpeakingSentenceIndex(idx);
          setSpeakingTotalSentences(total);
        },
        onEnd: () => {
          setSpeakingId(null);
          setSpeakingSentenceIndex(-1);
        },
        onError: () => {
          setSpeakingId(null);
          setSpeakingSentenceIndex(-1);
        },
      });
    }
  }, [speakingId, selectedVoiceName, speechRate]);

  const handleTestVoice = useCallback(() => {
    speakBroadcastScript(
      "Welcome to the keynote broadcast. Voice engine is calibrated and natural speech synthesis is active.",
      {
        voiceName: selectedVoiceName || undefined,
        rate: speechRate,
      }
    );
  }, [selectedVoiceName, speechRate]);

  const activeVoiceObj = useMemo(() => {
    return availableVoices.find((v) => v.name === selectedVoiceName) || availableVoices[0];
  }, [availableVoices, selectedVoiceName]);

  return (
    <div className="scripts-studio">
      {/* ── Multi-Billion Company Unified Enterprise Header ── */}
      <UnifiedEventHeader
        eventId={eventId}
        eventName={event?.name}
        activeView="scripts"
      />

      {/* ── Studio Hero Section ── */}
      <section className="scripts-hero">
        <div className="scripts-hero__top">
          <div>
            <div className="scripts-hero__meta">
              <span className="scripts-hero__beacon" />
              <span className="scripts-hero__eyebrow">ENTERPRISE TELEPROMPTER & SPEECH INTELLIGENCE</span>
            </div>
            <h1 className="scripts-hero__title">
              AI Broadcast Scripts Archive
            </h1>
            <p className="scripts-hero__desc">
              Executive teleprompter scripts, stage introductions, and keynote transitions. Featuring ultra-humanized voice synthesis with deliberate keynote cadence and live sentence tracking.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link
              href={`/events/${eventId}/live`}
              className="setup-btn--primary"
              style={{ padding: '9px 18px', textDecoration: 'none' }}
            >
              <span>✨ Generate in Live Control Room</span>
              <span>→</span>
            </Link>
          </div>
        </div>

        {/* ── 4 Executive Studio Metrics & Voice Selector Card ── */}
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
              <span className="scripts-metric-label">Prompter Cadence</span>
              <span className="scripts-metric-value num">{totalReadFormatted} · 135 WPM</span>
            </div>
          </div>

          {/* Voice Synthesizer Interactive Engine Selector */}
          <div
            className="scripts-metric-card"
            style={{
              cursor: 'pointer',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              background: 'rgba(99, 102, 241, 0.08)',
              position: 'relative',
            }}
            onClick={() => setIsVoicePickerOpen(!isVoicePickerOpen)}
            title="Configure humanized broadcast presenter voice"
          >
            <div className="scripts-metric-icon" style={{ color: 'var(--color-accent)' }}>🎙️</div>
            <div className="scripts-metric-content" style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span className="scripts-metric-label">Voice Engine</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: activeVoiceObj?.tier === 'neural' ? 'var(--color-live-bg)' : 'var(--color-accent-bg)',
                    color: activeVoiceObj?.tier === 'neural' ? 'var(--color-live)' : 'var(--color-accent)',
                  }}
                >
                  {activeVoiceObj?.tier === 'neural' ? '⚡ NEURAL' : '🎙️ HD STUDIO'}
                </span>
              </div>
              <span
                className="scripts-metric-value"
                style={{
                  color: 'var(--color-text)',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {activeVoiceObj ? activeVoiceObj.name : 'Humanized Keynote'}
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>▾</span>
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Voice Engine Customizer Drawer */}
        {isVoicePickerOpen && (
          <div
            style={{
              marginTop: '16px',
              padding: '18px 22px',
              background: 'var(--color-surface-elevated)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 16px 36px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'cascade-enter var(--dur-fast) var(--ease-out)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 300px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text)', letterSpacing: '0.04em' }}>
                SELECT BROADCAST PRESENTER VOICE PERSONA
              </span>
              <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
                StageSync prioritizes natural neural & high-definition voices for humanized speech inflection and cadence.
              </p>
              <select
                className="select"
                style={{ marginTop: '4px', maxWidth: 420 }}
                value={selectedVoiceName}
                onChange={(e) => {
                  setSelectedVoiceName(e.target.value);
                  try {
                    localStorage.setItem('stagesync_preferred_voice', e.target.value);
                  } catch {
                    // ignore
                  }
                }}
              >
                {availableVoices.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.label} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                  PRESENTER CADENCE
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[
                    { label: 'Deliberate (0.86x)', val: 0.86 },
                    { label: 'Keynote Polish (0.91x)', val: 0.91 },
                    { label: 'Standard (1.0x)', val: 1.0 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      onClick={() => setSpeechRate(s.val)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: 'var(--radius-sm)',
                        background: speechRate === s.val ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                        color: speechRate === s.val ? '#fff' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        cursor: 'pointer',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleTestVoice}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'var(--color-live-bg)',
                  border: '1px solid var(--color-live)',
                  color: 'var(--color-live)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🔊</span>
                <span>Test Voice Sample</span>
              </button>

              <button
                onClick={() => setIsVoicePickerOpen(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-pill)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Controls & Search Bar ── */}
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
            placeholder="Search teleprompter scripts by keyword, topic, or speaker..."
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
              const sentences = prepareScriptSentences(script.content);

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
                            {speakingSentenceIndex >= 0 && (
                              <span style={{ fontSize: '10px', opacity: 0.8, fontFamily: 'var(--font-mono)' }}>
                                ({speakingSentenceIndex + 1}/{speakingTotalSentences})
                              </span>
                            )}
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

                      {/* Modernized Teleprompter HUD Button */}
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="script-prompter-label">● STAGE TELEPROMPTER ACTIVE</span>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                              EST. PACE: 135 WPM · KEYNOTE POLISH
                            </span>
                          </div>

                          {/* Prompter Font Size Controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Font:</span>
                            <button
                              onClick={() => setPrompterFontSize((s) => Math.max(14, s - 2))}
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                              title="Decrease font size"
                            >
                              Aa-
                            </button>
                            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', minWidth: 26, textAlign: 'center' }}>
                              {prompterFontSize}px
                            </span>
                            <button
                              onClick={() => setPrompterFontSize((s) => Math.min(32, s + 2))}
                              style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--color-text-secondary)',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                              title="Increase font size"
                            >
                              Aa+
                            </button>
                          </div>
                        </div>

                        {/* Sentence by sentence display with active sentence highlight during speech playback */}
                        <div
                          style={{
                            fontSize: `${prompterFontSize}px`,
                            lineHeight: 1.8,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                          }}
                        >
                          {sentences.map((sent, sIdx) => {
                            const isCurrent = isSpeaking && speakingSentenceIndex === sIdx;
                            return (
                              <span
                                key={sIdx}
                                style={{
                                  padding: isCurrent ? '8px 12px' : '2px 0',
                                  borderRadius: 'var(--radius-sm)',
                                  background: isCurrent ? 'var(--color-warn-bg)' : 'transparent',
                                  borderLeft: isCurrent ? '3px solid var(--color-warn)' : '3px solid transparent',
                                  color: isCurrent ? 'var(--color-warn)' : isSpeaking ? 'var(--color-text-muted)' : 'var(--color-text)',
                                  boxShadow: isCurrent ? '0 0 20px rgba(245, 158, 11, 0.2)' : 'none',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                {sent}{' '}
                              </span>
                            );
                          })}
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
