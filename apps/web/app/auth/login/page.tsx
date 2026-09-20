'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login, isAuthenticated } from '../../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/');
    }
  }, [router]);

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
      router.push('/');
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
