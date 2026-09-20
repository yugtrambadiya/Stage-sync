'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import './UnifiedEventHeader.css';
import AccountMenu from '../AccountMenu';

interface UnifiedEventHeaderProps {
  eventId: string;
  eventName?: string;
  activeView: 'live' | 'setup' | 'scripts';
  extraRightActions?: React.ReactNode;
  showLaunchLiveButton?: boolean;
}

export function UnifiedEventHeader({
  eventId,
  eventName,
  activeView,
  extraRightActions,
  showLaunchLiveButton = activeView !== 'live',
}: UnifiedEventHeaderProps) {
  const [timecode, setTimecode] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimecode(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="unified-header">
      {/* ── Left: Brand + Back to Hub + Event Name Pill ── */}
      <div className="unified-header__left">
        <Link
          href="/events"
          className="unified-header__back-btn"
          title="Return to Events Directory"
        >
          ←
        </Link>

        <Link href="/events" className="unified-header__brand">
          <span className="unified-header__brand-dot" />
          <span className="unified-header__brand-text">
            STAGE<span style={{ color: 'var(--color-accent)' }}>SYNC</span>
          </span>
        </Link>

        <span className="unified-header__sep">/</span>

        <span
          className="unified-header__event-pill"
          title={eventName ?? 'Live Event Command'}
        >
          {eventName ?? 'TechNova Summit 2025'}
        </span>
      </div>

      {/* ── Center: Segmented Navigation Pills ── */}
      <nav className="unified-header__nav" aria-label="Event views">
        <Link
          href={`/events/${eventId}/live`}
          className={`unified-header__tab ${
            activeView === 'live'
              ? 'unified-header__tab--active unified-header__tab--live'
              : ''
          }`}
        >
          <span className="unified-header__live-beacon" />
          <span>Live Stage</span>
        </Link>

        <Link
          href={`/events/${eventId}/setup`}
          className={`unified-header__tab ${
            activeView === 'setup' ? 'unified-header__tab--active' : ''
          }`}
        >
          <span>📋</span>
          <span>Setup & Agenda</span>
        </Link>

        <Link
          href={`/events/${eventId}/scripts`}
          className={`unified-header__tab ${
            activeView === 'scripts' ? 'unified-header__tab--active' : ''
          }`}
        >
          <span>⚡</span>
          <span>AI Scripts</span>
        </Link>
      </nav>

      {/* ── Right: Realtime Timecode & Actions ── */}
      <div className="unified-header__right">
        {timecode && (
          <div className="unified-header__clock" title="Master Broadcast Timecode (Indian Standard Time · UTC+05:30)">
            <span className="unified-header__clock-dot" />
            <span>{timecode}</span>
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--color-accent)', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '1px 5px', borderRadius: '4px', letterSpacing: '0.05em' }}>IST</span>
          </div>
        )}

        {showLaunchLiveButton && (
          <Link
            href={`/events/${eventId}/live`}
            className="unified-header__launcher-btn"
            title="Launch Live Stage Control Room (Hotkey: L)"
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--color-live)',
                boxShadow: '0 0 8px var(--color-live)',
              }}
            />
            <span>● Live Control Room</span>
            <span className="unified-header__launcher-kbd">L</span>
            <span>→</span>
          </Link>
        )}

        {extraRightActions}

        <AccountMenu />
      </div>
    </header>
  );
}
