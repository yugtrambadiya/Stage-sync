'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, googleLogin, isAuthenticated } from '../../../lib/auth';

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
        };
      };
    };
  }
}

function getPasswordStrength(password: string): { level: string; score: number } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 'weak', score: 1 };
  if (score <= 2) return { level: 'fair', score: 2 };
  if (score <= 3) return { level: 'good', score: 3 };
  return { level: 'strong', score: 4 };
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

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
      setError(err.message || 'Google sign-up failed.');
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
    setError(null);

    // Validation
    if (!email.trim() || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await register(email.trim(), password, name.trim() || undefined);
      router.push('/events');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1 className="auth-card__title">Create your account</h1>
        <p className="auth-card__subtitle">
          Join StageSync and start managing your live events
        </p>
      </div>

      {/* Google Sign-Up */}
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
          <label className="auth-field__label" htmlFor="register-name">
            Full name <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            id="register-name"
            className="auth-field__input"
            type="text"
            placeholder="Jane Doe"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="register-email">
            Email address
          </label>
          <input
            id="register-email"
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
          <label className="auth-field__label" htmlFor="register-password">
            Password
          </label>
          <div className="auth-field__password-wrap">
            <input
              id="register-password"
              className="auth-field__input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
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

          {/* Password strength indicator */}
          {password.length > 0 && (
            <>
              <div className="auth-strength">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`auth-strength__bar${i <= strength.score ? ' auth-strength__bar--active' : ''}`}
                    data-level={strength.level}
                  />
                ))}
              </div>
              <div className="auth-strength__label">
                Password strength: {strength.level}
              </div>
            </>
          )}
        </div>

        <div className="auth-field">
          <label className="auth-field__label" htmlFor="register-confirm">
            Confirm password
          </label>
          <div className="auth-field__password-wrap">
            <input
              id="register-confirm"
              className={`auth-field__input${confirmPassword && confirmPassword !== password ? ' auth-field__input--error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {confirmPassword && confirmPassword !== password && (
            <div className="auth-field__error">
              <span>✕</span> Passwords do not match
            </div>
          )}
        </div>

        <button
          type="submit"
          className="auth-submit"
          disabled={loading || (!!confirmPassword && confirmPassword !== password)}
        >
          {loading ? (
            <span className="auth-submit__spinner" />
          ) : (
            'Create account'
          )}
        </button>
      </form>

      <div className="auth-card__footer">
        Already have an account?{' '}
        <Link href="/auth/login">Sign in</Link>
      </div>
    </div>
  );
}
