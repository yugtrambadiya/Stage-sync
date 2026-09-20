'use client';

import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '../../../lib/auth';

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

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  if (!token) {
    return (
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">Invalid Link</h1>
          <p className="auth-card__subtitle">
            This password reset link is missing or invalid. Please request a new one.
          </p>
        </div>
        <div className="auth-card__footer">
          <Link href="/auth/forgot-password">Request new link</Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="auth-card">
        <div className="auth-card__header">
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h1 className="auth-card__title">Password reset complete</h1>
          <p className="auth-card__subtitle">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
        </div>
        
        <div className="auth-card__footer">
          <Link href="/auth/login" className="btn btn--primary" style={{ width: '100%' }}>
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

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
      await resetPassword(token!, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link might be expired.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <div className="auth-card__header">
        <h1 className="auth-card__title">Choose new password</h1>
        <p className="auth-card__subtitle">
          Create a strong password for your account.
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
          <label className="auth-field__label" htmlFor="new-password">
            New password
          </label>
          <div className="auth-field__password-wrap">
            <input
              id="new-password"
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
          <label className="auth-field__label" htmlFor="confirm-new-password">
            Confirm new password
          </label>
          <div className="auth-field__password-wrap">
            <input
              id="confirm-new-password"
              className={`auth-field__input${confirmPassword && confirmPassword !== password ? ' auth-field__input--error' : ''}`}
              type={showPassword ? 'text' : 'password'}
              placeholder="Re-enter your new password"
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
          style={{ marginTop: 8 }}
        >
          {loading ? (
            <span className="auth-submit__spinner" />
          ) : (
            'Reset password'
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-card"><div className="auth-submit__spinner" style={{ margin: 'auto' }} /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
