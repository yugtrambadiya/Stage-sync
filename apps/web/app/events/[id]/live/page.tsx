'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStageStore, deriveCurrentSession, deriveNextSession } from '@/store/useStageStore';
import { useLiveSync } from '@/hooks/useLiveSync';
import { useNow } from '@/hooks/useNow';
import { eventsApi, systemApi } from '@/lib/api';
import type { AgendaItem, EventState } from '@/lib/types';

import { LiveStatusPill } from '@/components/LiveStatusPill/LiveStatusPill';
import { AnnouncementToast } from '@/components/AnnouncementToast/AnnouncementToast';
import { CurrentSpeakerCard } from '@/components/CurrentSpeakerCard/CurrentSpeakerCard';
import { NextUpCard } from '@/components/NextUpCard/NextUpCard';
import { AgendaTimeline } from '@/components/AgendaTimeline/AgendaTimeline';
import { ScriptModal } from '@/components/ScriptModal/ScriptModal';
import { DelayModal } from '@/components/DelayModal/DelayModal';
import { EventNav } from '@/components/EventNav/EventNav';

function formatClock(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

export default function LiveDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = typeof params?.id === 'string' ? params.id : '';

  // Realtime hook
  const { status: connStatus, lastSyncedAt } = useLiveSync(eventId || null);
  const now = useNow();

  // Store state
  const event = useStageStore((s) => s.event);
  const agenda = useStageStore((s) => s.agenda);
  const lastDiff = useStageStore((s) => s.lastDiff);
  const activityLog = useStageStore((s) => s.activityLog);
  const applySync = useStageStore((s) => s.applySync);
  const setLastDiff = useStageStore((s) => s.setLastDiff);
  const pushAnnouncement = useStageStore((s) => s.pushAnnouncement);
  const logActivity = useStageStore((s) => s.logActivity);

  // Local state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [scriptModalOpen, setScriptModalOpen] = useState(false);
  const [scriptTargetDelay, setScriptTargetDelay] = useState<number>(0);
  const [scriptType, setScriptType] = useState<'TRANSITION' | 'ANNOUNCEMENT'>('TRANSITION');

  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [targetDelayItem, setTargetDelayItem] = useState<AgendaItem | null>(null);

  const [announceModalOpen, setAnnounceModalOpen] = useState(false);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceSeverity, setAnnounceSeverity] = useState<'info' | 'warn' | 'success' | 'danger'>('info');

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initial load
  const loadState = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const state = await eventsApi.getState(eventId);
      applySync(state as EventState);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  }, [eventId, applySync]);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Derived current and next session
  const currentSession = useMemo(() => deriveCurrentSession(agenda, now), [agenda, now]);
  const nextSession = useMemo(() => deriveNextSession(agenda, currentSession, now), [agenda, currentSession, now]);

  // Drift computation
  const totalDriftMinutes = useMemo(() => {
    if (lastDiff) return lastDiff.delayMinutes;
    const delayed = agenda.filter((i) => i.status === 'DELAYED');
    if (delayed.length > 0) {
      return 15; // default reported drift
    }
    return 0;
  }, [agenda, lastDiff]);

  // Quick action triggers
  const handleOpenDelayForCurrent = () => {
    if (currentSession) {
      setTargetDelayItem(currentSession);
      setDelayModalOpen(true);
    } else if (nextSession) {
      setTargetDelayItem(nextSession);
      setDelayModalOpen(true);
    } else if (agenda.length > 0) {
      setTargetDelayItem(agenda[0]);
      setDelayModalOpen(true);
    }
  };

  const handleOpenScript = (delayMins = 0, type: 'TRANSITION' | 'ANNOUNCEMENT' = 'TRANSITION') => {
    setScriptTargetDelay(delayMins);
    setScriptType(type);
    setScriptModalOpen(true);
  };

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceTitle.trim()) return;

    pushAnnouncement({
      severity: announceSeverity,
      title: announceTitle,
      message: announceMsg.trim() ? announceMsg : undefined,
    });

    logActivity({
      label: `Announcement: ${announceTitle}`,
      type: 'announce',
    });

    setAnnounceTitle('');
    setAnnounceMsg('');
    setAnnounceModalOpen(false);
  };

  const handleResetDemo = async () => {
    try {
      await systemApi.reset();
      await loadState();
      logActivity({ label: 'Demo data reset executed', type: 'reset' });
      pushAnnouncement({
        severity: 'info',
        title: 'Demo Reset',
        message: 'Original schedule and state restored',
      });
    } catch {
      pushAnnouncement({
        severity: 'danger',
        title: 'Reset Failed',
        message: 'Could not reset demo state on server',
      });
    }
  };

  // Keyboard shortcuts (G, D, A, Esc, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when inside inputs / textareas
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        handleOpenScript(0, 'TRANSITION');
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        handleOpenDelayForCurrent();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setAnnounceModalOpen(true);
      } else if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen((o) => !o);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSession, nextSession, agenda]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--color-bg)' }}>
      {/* Toast Stack */}
      <AnnouncementToast />

      {/* Main Broadcast Header */}
      <header className="app-header" style={{ height: 'var(--header-h, 56px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link href="/events" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.08em', fontSize: 'var(--text-sm)' }}>
              STAGE<span style={{ color: 'var(--color-accent)' }}>SYNC</span>
            </span>
          </Link>
          <span style={{ color: 'var(--color-border)' }}>|</span>
          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)', maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {event?.name ?? 'Live Control Room'}
          </span>
        </div>

        {/* Center: Show Clock & Drift */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div
            className="num"
            suppressHydrationWarning
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              letterSpacing: '0.05em',
              background: 'var(--color-surface)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
            }}
            title="Wall clock"
          >
            {mounted ? formatClock(now) : '--:--:--'}
          </div>

          {/* Drift chip */}
          {totalDriftMinutes > 0 ? (
            <span className="badge badge--delayed" title="Current schedule drift">
              +{totalDriftMinutes} MIN DRIFT
            </span>
          ) : (
            <span className="badge badge--live" title="Schedule running strictly on time">
              ON TIME
            </span>
          )}
        </div>

        {/* Right: Pill, Activity toggle, Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => setShowLogDrawer((d) => !d)}
            style={{ fontSize: 'var(--text-xs)' }}
            title="Toggle On-Air Event Log"
          >
            Log ({activityLog.length})
          </button>

          <button
            className="btn btn--ghost btn--sm"
            onClick={handleResetDemo}
            style={{ fontSize: 'var(--text-xs)' }}
            title="Restore default demo schedule"
          >
            Reset
          </button>

          <LiveStatusPill status={connStatus} lastSyncedAt={lastSyncedAt} />
        </div>
      </header>

      {/* Navigation Sub-bar */}
      <EventNav eventId={eventId} />

      {/* Main Content Layout */}
      <main
        style={{
          flex: 1,
          padding: 'var(--space-4) var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Error banner */}
        {error && (
          <div className="panel" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--color-danger)', padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>{error}</span>
              <button className="btn btn--primary btn--sm" onClick={loadState}>Retry</button>
            </div>
          </div>
        )}

        {/* Two-column control room */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(380px, 1.2fr) minmax(320px, 0.9fr)',
            gap: 'var(--space-5)',
            alignItems: 'start',
          }}
          className="control-room-grid"
        >
          {/* Left Column: Agenda Timeline */}
          <section style={{ height: '100%' }}>
            <AgendaTimeline
              items={agenda}
              loading={loading}
              lastDiff={lastDiff}
              onDismissDiff={() => setLastDiff(null)}
              onDelayItem={(item) => {
                setTargetDelayItem(item);
                setDelayModalOpen(true);
              }}
            />
          </section>

          {/* Right Column: Stage Controls */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* 1. NOW ON STAGE */}
            <CurrentSpeakerCard
              item={currentSession}
              onDelay={handleOpenDelayForCurrent}
              onScript={() => handleOpenScript(0, 'TRANSITION')}
            />

            {/* 2. UP NEXT */}
            <NextUpCard
              item={nextSession}
              onScript={() => handleOpenScript(0, 'TRANSITION')}
            />

            {/* 3. BROADCAST ACTIONS PANEL */}
            <div className="panel">
              <div className="panel__title">Broadcast Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => handleOpenScript(0, 'TRANSITION')}
                >
                  Generate Script <span className="kbd">G</span>
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={handleOpenDelayForCurrent}
                >
                  Mark Delayed <span className="kbd">D</span>
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setAnnounceModalOpen(true)}
                >
                  Announce <span className="kbd">A</span>
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setShortcutsOpen(true)}
                >
                  Shortcuts <span className="kbd">?</span>
                </button>
              </div>
            </div>

            {/* 4. ON-AIR LOG (COLLAPSIBLE / SUMMARY) */}
            {showLogDrawer && (
              <div className="panel" style={{ animation: 'toast-in var(--dur-base) var(--ease-out)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span className="panel__title" style={{ margin: 0 }}>On-Air Log</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => setShowLogDrawer(false)}>✕</button>
                </div>
                {activityLog.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>No recent activity</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '180px', overflowY: 'auto' }}>
                    {activityLog.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          fontSize: 'var(--text-xs)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                          padding: '3px 0',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                        }}
                      >
                        <span className="num" style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>
                          {new Date(log.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span style={{ color: log.type === 'delay' ? 'var(--color-warn)' : log.type === 'script' ? 'var(--color-accent)' : 'var(--color-text)' }}>
                          {log.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Script Modal */}
      <ScriptModal
        isOpen={scriptModalOpen}
        onClose={() => setScriptModalOpen(false)}
        eventId={eventId}
        currentSpeaker={currentSession?.speaker?.name ?? currentSession?.title ?? 'Current Speaker'}
        nextSpeaker={nextSession?.speaker?.name ?? nextSession?.title ?? 'Next Speaker'}
        delayMinutes={scriptTargetDelay}
        scriptType={scriptType}
      />

      {/* Delay Modal */}
      <DelayModal
        isOpen={delayModalOpen}
        onClose={() => setDelayModalOpen(false)}
        item={targetDelayItem}
        onGenerateAnnouncement={(mins) => handleOpenScript(mins, 'ANNOUNCEMENT')}
        onGenerateScript={(mins) => handleOpenScript(mins, 'TRANSITION')}
      />

      {/* Announce Modal */}
      {announceModalOpen && (
        <div className="modal-backdrop" onClick={() => setAnnounceModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>Broadcast Announcement</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setAnnounceModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="label">Announcement Title</label>
                <input
                  className="input"
                  placeholder="e.g. Schedule Update / Break Extended"
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="label">Message (Optional)</label>
                <textarea
                  className="input"
                  placeholder="Details for the broadcast room..."
                  rows={3}
                  value={announceMsg}
                  onChange={(e) => setAnnounceMsg(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label className="label">Severity</label>
                <select
                  className="select"
                  value={announceSeverity}
                  onChange={(e) => setAnnounceSeverity(e.target.value as 'info' | 'warn' | 'success' | 'danger')}
                >
                  <option value="info">Info</option>
                  <option value="warn">Warning (Amber)</option>
                  <option value="success">Success (Green)</option>
                  <option value="danger">Critical (Red)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAnnounceModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary btn--sm">
                  Send Broadcast Toast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {shortcutsOpen && (
        <div className="modal-backdrop" onClick={() => setShortcutsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)' }}>Keyboard Shortcuts</h3>
              <button className="btn btn--ghost btn--sm" onClick={() => setShortcutsOpen(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Generate Transition Script</span>
                <span className="kbd">G</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Mark Delay on Current Session</span>
                <span className="kbd">D</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Broadcast Announcement</span>
                <span className="kbd">A</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Close Active Modal</span>
                <span className="kbd">Esc</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Show / Hide Shortcuts</span>
                <span className="kbd">?</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
