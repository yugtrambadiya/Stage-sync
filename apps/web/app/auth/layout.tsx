import type { Metadata } from 'next';
import './auth.css';
import AccountMenu from '../../components/AccountMenu';

export const metadata: Metadata = {
  title: 'StageSync — Sign In',
  description: 'Sign in to your StageSync account to access the live stage control room.',
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="auth-layout">
      {/* Animated background orbs */}
      <div className="auth-layout__orbs" aria-hidden="true">
        <div className="auth-orb auth-orb--1" />
        <div className="auth-orb auth-orb--2" />
        <div className="auth-orb auth-orb--3" />
      </div>

      {/* Branding header */}
      <header className="auth-layout__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '1200px', padding: '0 2rem' }}>
        <a href="/" className="auth-layout__brand">
          <span className="auth-layout__logo-icon" aria-hidden="true">◈</span>
          <span className="auth-layout__wordmark">StageSync</span>
        </a>
        <div style={{ position: 'relative' }}>
          <AccountMenu />
        </div>
      </header>

      {/* Centered auth card */}
      <main className="auth-layout__main">
        {children}
      </main>

      {/* Footer */}
      <footer className="auth-layout__footer">
        <span>© {new Date().getFullYear()} StageSync. Built for the stage.</span>
      </footer>
    </div>
  );
}
