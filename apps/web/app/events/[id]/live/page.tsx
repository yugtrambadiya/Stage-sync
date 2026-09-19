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

      {/* Unified Broadcast Header */}
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
        {/* Left: Brand + Back + Event Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link
            href="/events"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              textDecoration: 'none',
              fontSize: 'var(--text-sm)',
              transition: 'all var(--dur-fast)',
            }}
            title="Return to Events Directory"
          >
            ←
          </Link>

          <Link href="/events" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '7px' }}>
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

          <span style={{ color: 'var(--color-border)', margin: '0 2px' }}>/</span>

          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-text)',
              maxWidth: 240,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '4px 10px',
              borderRadius: 'var(--radius-pill)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--color-border)',
            }}
            title={event?.name ?? 'Live Control Room'}
          >
            {event?.name ?? 'Live Stage'}
          </span>
        </div>

        {/* Center: Segmented Navigation Pills */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '4px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--color-border)',
          }}
          aria-label="Event views"
        >
          <Link
            href={`/events/${eventId}/live`}
            style={{
              padding: '5px 14px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--color-accent)',
              background: 'var(--color-accent-glow)',
              borderRadius: 'var(--radius-pill)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-live)',
                boxShadow: '0 0 8px var(--color-live)',
              }}
            />
            Live Stage
          </Link>

          <Link
            href={`/events/${eventId}/setup`}
            style={{
              padding: '5px 14px',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-pill)',
              textDecoration: 'none',
              transition: 'all var(--dur-fast)',
            }}
          >
            Setup & Agenda
          </Link>

          <Link
            href={`/events/${eventId}/scripts`}
            style={{
              padding: '5px 14px',
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-pill)',
              textDecoration: 'none',
              transition: 'all var(--dur-fast)',
            }}
          >
            AI Scripts
          </Link>
        </nav>

        {/* Right: Telemetry & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Monospace Clock Pill */}
          <div
            className="num"
            suppressHydrationWarning
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '5px 11px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
            title="Master Broadcast Wall Clock"
          >
            {mounted ? formatClock(now) : '--:--:--'}
          </div>

          {/* Drift Chip */}
          {totalDriftMinutes > 0 ? (
            <span className="badge badge--delayed" style={{ fontSize: '11px', padding: '3px 9px' }} title="Schedule is running behind">
              +{totalDriftMinutes}M DRIFT
            </span>
          ) : (
            <span className="badge badge--live" style={{ fontSize: '11px', padding: '3px 9px' }} title="Schedule running strictly on time">
              ON TIME
            </span>
          )}

          <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />

          {/* Log button */}
          <button
            className={`btn btn--sm ${showLogDrawer ? 'btn--secondary' : 'btn--ghost'}`}
            onClick={() => setShowLogDrawer((d) => !d)}
            style={{ fontSize: 'var(--text-xs)', padding: '5px 10px', height: 'auto' }}
            title="Toggle Live Broadcast Log"
          >
            📋 Log {activityLog.length > 0 && `(${activityLog.length})`}
          </button>

          {/* Reset button */}
          <button
            className="btn btn--ghost btn--sm"
            onClick={handleResetDemo}
            style={{ fontSize: 'var(--text-xs)', padding: '5px 10px', height: 'auto', color: 'var(--color-text-muted)' }}
            title="Restore default demo schedule"
          >
            ↺ Reset
          </button>

          {/* Realtime LiveSync pill */}
          <LiveStatusPill status={connStatus} lastSyncedAt={lastSyncedAt} />
        </div>
      </header>

      {/* Main Content Layout */}
      <main
        style={{
          flex: 1,
          padding: 'var(--space-5) var(--space-6)',
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
            gridTemplateColumns: 'minmax(380px, 1.25fr) minmax(320px, 0.95fr)',
            gap: 'var(--space-6)',
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
          <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', position: 'sticky', top: 'calc(60px + var(--space-4))' }}>
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
            <div className="panel" style={{ padding: 'var(--space-4)', background: 'rgba(13, 16, 26, 0.85)', backdropFilter: 'blur(16px)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', boxShadow: '0 12px 28px -8px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span className="panel__title" style={{ margin: 0, padding: 0, border: 'none', background: 'transparent', fontSize: 'var(--text-xs)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                  Stage Director Quick Actions
                </span>
                <span style={{ fontSize: '10px', color: 'var(--color-live)', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  HOTKEYS LIVE
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => handleOpenScript(0, 'TRANSITION')}
                  style={{
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                    fontWeight: 600,
                  }}
                >
                  <span>✨ Generate Script</span>
                  <span className="kbd" style={{ background: 'rgba(255,255,255,0.22)', borderColor: 'rgba(255,255,255,0.35)', color: '#fff', fontWeight: 700 }}>G</span>
                </button>
                <button
                  className="btn btn--sm"
                  onClick={handleOpenDelayForCurrent}
                  style={{
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fbbf24',
                    fontWeight: 600,
                  }}
                >
                  <span>⏱️ Mark Delay</span>
                  <span className="kbd" style={{ background: 'rgba(245, 158, 11, 0.25)', borderColor: 'rgba(245, 158, 11, 0.5)', color: '#fbbf24', fontWeight: 700 }}>D</span>
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setAnnounceModalOpen(true)}
                  style={{
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    color: '#22d3ee',
                    fontWeight: 600,
                  }}
                >
                  <span>📣 Announce</span>
                  <span className="kbd" style={{ background: 'rgba(6, 182, 212, 0.2)', borderColor: 'rgba(6, 182, 212, 0.4)', color: '#22d3ee', fontWeight: 700 }}>A</span>
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setShortcutsOpen(true)}
                  style={{
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  <span>⌨️ Shortcuts</span>
                  <span className="kbd" style={{ fontWeight: 700 }}>?</span>
                </button>
              </div>
            </div>
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
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal__header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>📣</span>
                  <h3 className="modal__title">Broadcast Announcement</h3>
                </div>
                <p className="modal__desc">
                  Push an instant visual banner to all stage monitors, control room, and connected hosts.
                </p>
              </div>
              <button
                type="button"
                className="modal__close"
                onClick={() => setAnnounceModalOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendAnnouncement} style={{ display: 'flex', flexDirection: 'column', flex: 1, margin: 0 }}>
              <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div>
                  <label className="label">Announcement Title</label>
                  <input
                    className="input"
                    placeholder="e.g. Break Extended / Keynote in 5 Minutes"
                    value={announceTitle}
                    onChange={(e) => setAnnounceTitle(e.target.value)}
                    autoFocus
                    required
                  />
                </div>

                <div>
                  <label className="label">Message Details (Optional)</label>
                  <textarea
                    className="input"
                    placeholder="Provide additional details or action instructions for stage staff..."
                    rows={3}
                    value={announceMsg}
                    onChange={(e) => setAnnounceMsg(e.target.value)}
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label className="label">Severity Level</label>
                  <select
                    className="select"
                    value={announceSeverity}
                    onChange={(e) => setAnnounceSeverity(e.target.value as 'info' | 'warn' | 'success' | 'danger')}
                  >
                    <option value="info">ℹ️ Info — Standard announcement</option>
                    <option value="warn">⚠️ Warning — Schedule drift / caution</option>
                    <option value="success">✅ Success — Program milestone / all clear</option>
                    <option value="danger">🚨 Critical — Urgent stage alert</option>
                  </select>
                </div>
              </div>

              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setAnnounceModalOpen(false)}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary btn--sm"
                  style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>📣</span>
                  <span>Send Broadcast Toast</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {shortcutsOpen && (
        <div className="modal-backdrop" onClick={() => setShortcutsOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal__header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>⌨️</span>
                  <h3 className="modal__title">Keyboard Shortcuts</h3>
                </div>
                <p className="modal__desc">
                  Director hotkeys for fast hands-on-keyboard stage execution.
                </p>
              </div>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShortcutsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="modal__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {[
                { label: 'Generate AI Transition Script', key: 'G', desc: 'Draft bridge speech or recovery line' },
                { label: 'Mark Delay on Active Session', key: 'D', desc: 'Trigger cascading agenda recalculation' },
                { label: 'Broadcast Stage Announcement', key: 'A', desc: 'Push room-wide notification banner' },
                { label: 'Close Active Modal', key: 'Esc', desc: 'Dismiss current popup' },
                { label: 'Toggle Shortcuts Help', key: '?', desc: 'Show / hide this dialog' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {item.desc}
                    </div>
                  </div>
                  <span
                    className="kbd"
                    style={{
                      padding: '4px 9px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: 'rgba(255, 255, 255, 0.08)',
                      borderColor: 'rgba(255, 255, 255, 0.18)',
                      color: 'var(--color-text)',
                    }}
                  >
                    {item.key}
                  </span>
                </div>
              ))}
            </div>

            <div className="modal__footer">
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setShortcutsOpen(false)}
                style={{ padding: '8px 18px' }}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Air Log Slide-Over Drawer */}
      {showLogDrawer && (
        <div
          className="modal-backdrop"
          onClick={() => setShowLogDrawer(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(4, 5, 8, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
            padding: 0,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              height: '100vh',
              background: 'rgba(14, 18, 28, 0.98)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: '-16px 0 48px rgba(0, 0, 0, 0.75)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'modal-spring-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Drawer Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-5) var(--space-6)',
                borderBottom: '1px solid var(--color-border)',
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>📋</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>
                    On-Air Broadcast Log
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Live audit trail of stage events & announcements
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowLogDrawer(false)}
                title="Close Log"
              >
                ✕
              </button>
            </div>

            {/* Log Records List */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 'var(--space-4) var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
              }}
            >
              {activityLog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                  No stage activity recorded yet in this session.
                </div>
              ) : (
                activityLog.map((log) => {
                  const isDelay = log.type === 'delay';
                  const isScript = log.type === 'script';
                  const isAnnounce = log.type === 'announce';

                  const badgeColor = isDelay
                    ? 'var(--color-warn)'
                    : isScript
                    ? 'var(--color-accent)'
                    : isAnnounce
                    ? 'var(--color-live)'
                    : 'var(--color-text-muted)';

                  const badgeBg = isDelay
                    ? 'rgba(245, 158, 11, 0.15)'
                    : isScript
                    ? 'rgba(99, 102, 241, 0.15)'
                    : isAnnounce
                    ? 'rgba(16, 185, 129, 0.15)'
                    : 'rgba(255, 255, 255, 0.05)';

                  return (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--color-border)',
                        animation: 'cascade-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: badgeColor,
                            background: badgeBg,
                            padding: '2px 7px',
                            borderRadius: 'var(--radius-pill)',
                          }}
                        >
                          {log.type}
                        </span>
                        <span className="num" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                          {new Date(log.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', lineHeight: 1.5, marginTop: '2px' }}>
                        {log.label}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: 'var(--space-3) var(--space-6)',
                borderTop: '1px solid var(--color-border)',
                background: 'rgba(255, 255, 255, 0.02)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: 'var(--color-text-muted)',
              }}
            >
              <span>Total Records: {activityLog.length}</span>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowLogDrawer(false)}
                style={{ padding: '4px 12px', fontSize: '11px' }}
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
