'use client';

import { useState } from 'react';
import Link from 'next/link';
import { forgotPassword } from '../../../lib/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    try {
      await forgotPassword(email.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-card">
        <div className="auth-card__header">
          <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
          <h1 className="auth-card__title">Check your email</h1>
          <p className="auth-card__subtitle">
            We've sent a password reset link to <strong>{email}</strong>.
          </p>
        </div>
        
        <div className="auth-card__footer">
          <Link href="/auth/login">Return to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1 className="auth-card__title">Reset your password</h1>
        <p className="auth-card__subtitle">
          Enter your email address and we'll send you a link to reset your password.
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
          <label className="auth-field__label" htmlFor="reset-email">
            Email address
          </label>
          <input
            id="reset-email"
            className="auth-field__input"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="auth-submit"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? (
            <span className="auth-submit__spinner" />
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <div className="auth-card__footer">
        Remember your password?{' '}
        <Link href="/auth/login">Sign in</Link>
      </div>
    </div>
  );
}
