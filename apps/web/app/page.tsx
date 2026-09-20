import Link from 'next/link';
import type { Metadata } from 'next';
import './landing.css';
import AccountMenu from '../components/AccountMenu';

export const metadata: Metadata = {
  title: 'StageSync — Live Stage Coordination. Zero Dead Air.',
  description:
    'Realtime agenda sync, AI-generated MC scripts, one-click delay recovery. The broadcast control room built for live events.',
};

export default function HomePage() {
  return (
    <main className="landing">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <header className="app-header">
        <Link href="/" className="app-header__wordmark">
          STAGE-SYNC
        </Link>
        <div className="app-header__actions">
          <AccountMenu />
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="landing__hero">
        <div className="container">
          <div className="landing__hero-inner">
            <div className="landing__copy">
              <span className="landing__eyebrow">
                <span className="status-dot status-dot--live" aria-hidden="true" />
                Broadcast Control Room
              </span>

              <h1 className="landing__wordmark">StageSync</h1>

              <p className="landing__tagline">
                Live stage coordination.&nbsp;Zero dead air.
              </p>

              <p className="landing__sub">
                Realtime agenda sync across all devices. AI-generated MC
                scripts in seconds. One-click delay recovery with cascade
                scheduling — so nothing slips when things go wrong.
              </p>

              <div className="landing__ctas">
                <Link href="/auth/login" className="btn btn--primary btn--lg">
                  Get Started
                </Link>
                <a href="#features" className="btn btn--ghost btn--lg">
                  See how it works
                </a>
              </div>
            </div>

            {/* ── CSS-only control room mock ────────────────────────────── */}
            <div className="mock-room" aria-hidden="true">
              {/* Header bar */}
              <div className="mock-room__header">
                <span className="mock-room__logo">STAGE-SYNC</span>
                <span className="badge badge--live">LIVE</span>
                <span className="mock-room__clock num">02:14:33</span>
              </div>

              {/* Now on stage */}
              <div className="mock-room__panel">
                <div className="panel__title">Now on Stage</div>
                <div className="mock-room__current">
                  <div className="mock-room__tally" />
                  <div className="mock-room__current-info">
                    <div className="mock-room__speaker">Dr. Priya Iyer</div>
                    <div className="mock-room__talk">Keynote: AI at the Edge</div>
                    <div className="mock-room__timer num">08:24 remaining</div>
                    <div className="mock-room__progress">
                      <div className="mock-room__progress-fill" style={{ width: '65%' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Agenda rows — CSS animation shows delay recovery */}
              <div className="mock-room__agenda">
                <div className="panel__title">Agenda</div>
                {[
                  { time: '09:00', newTime: '09:15', title: 'WebAssembly in Production', delayed: true },
                  { time: '10:00', newTime: '10:15', title: 'LLM Workshop', delayed: true },
                  { time: '11:00', title: 'Closing Ceremony', delayed: false },
                ].map((row, i) => (
                  <div key={i} className={`mock-agenda-row${row.delayed ? ' mock-agenda-row--shifted' : ''}`}>
                    <span className="mock-agenda-row__time num">
                      {row.delayed && (
                        <span className="time-old">{row.time}</span>
                      )}
                      {row.delayed ? row.newTime : row.time}
                    </span>
                    <span className="mock-agenda-row__title">{row.title}</span>
                    {row.delayed && (
                      <span className="badge badge--delayed">+15m</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Controls row */}
              <div className="mock-room__controls">
                <button className="btn btn--primary btn--sm" tabIndex={-1}>Generate Script</button>
                <button className="btn btn--ghost btn--sm" tabIndex={-1}>Mark Delayed</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature tiles ─────────────────────────────────────────────────── */}
      <section className="landing__features" id="features">
        <div className="container">
          <div className="landing__features-grid">
            {[
              {
                icon: '⟳',
                title: 'Realtime Agenda Sync',
                desc: 'Every schedule change propagates instantly to all connected devices. No refresh, no lag, no confusion.',
              },
              {
                icon: '✦',
                title: 'AI-Generated Scripts',
                desc: 'Generate contextual MC announcements and transition scripts in seconds, with a cached fallback when offline.',
              },
              {
                icon: '⬦',
                title: 'One-Click Delay Recovery',
                desc: 'Cascade a delay across all downstream sessions automatically, with a full inline diff before you commit.',
              },
              {
                icon: '◉',
                title: 'Built for a Control Room',
                desc: 'Tally lights, live counters, keyboard shortcuts, and a reconnection guard — so nothing breaks on stage.',
              },
            ].map((f) => (
              <div key={f.title} className="feature-tile">
                <span className="feature-tile__icon" aria-hidden="true">{f.icon}</span>
                <h3 className="feature-tile__title">{f.title}</h3>
                <p className="feature-tile__desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="landing__footer">
        <div className="container">
          <span className="landing__footer-brand">StageSync</span>
          <span className="landing__footer-copy">
            Built for the stage. Trusted when it matters.
          </span>
        </div>
      </footer>
    </main>
  );
}
