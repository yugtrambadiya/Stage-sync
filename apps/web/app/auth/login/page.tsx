'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, googleLogin, isAuthenticated } from '../../../lib/auth';

// Google Sign-In SVG icon
const GoogleIcon = () => (
  <svg className="auth-google__icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/events');
    }
  }, [router]);

  // Initialize Google Sign-In
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleResponse,
      });
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleResponse(response: { credential: string }) {
    setGoogleLoading(true);
    setError(null);
    try {
      await googleLogin(response.credential);
      router.push('/events');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleGoogleClick() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError('Google Sign-In is not configured. Please use email and password.');
      return;
    }
    window.google?.accounts.id.prompt();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      await login(email.trim(), password);
      router.push('/events');
    } catch (err: any) {
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1 className="auth-card__title">Welcome back</h1>
        <p className="auth-card__subtitle">
          Sign in to access your live stage control room
        </p>
      </div>

      {/* Google Sign-In */}
      <button
        type="button"
        className="auth-google"
        onClick={handleGoogleClick}
        disabled={googleLoading}
      >
        {googleLoading ? (
          <span className="auth-submit__spinner" />
        ) : (
          <>
            <GoogleIcon />
            Continue with Google
          </>
        )}
      </button>

      <div className="auth-divider">or</div>

      {error && (
        <div className="auth-alert" role="alert">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-field__label" htmlFor="login-email">
            Email address
          </label>
          <input
            id="login-email"
            className="auth-field__input"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="auth-field__label" htmlFor="login-password">
              Password
            </label>
            <Link href="/auth/forgot-password" style={{ fontSize: '12px', color: 'var(--color-accent)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <div className="auth-field__password-wrap">
            <input
              id="login-password"
              className="auth-field__input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="auth-field__toggle-vis"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '◉' : '○'}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="auth-submit"
          disabled={loading}
        >
          {loading ? (
            <span className="auth-submit__spinner" />
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      <div className="auth-card__footer">
        Don&apos;t have an account?{' '}
        <Link href="/auth/register">Create account</Link>
      </div>
    </div>
  );
}
