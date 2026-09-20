'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, isAuthenticated } from '../../../lib/auth';

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
  const [error, setError] = useState<string | null>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/events');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim() || !email.trim() || !password) {
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
      await register(email.trim(), password, name.trim());
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

      {error && (
        <div className="auth-alert" role="alert">
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="auth-field">
          <label className="auth-field__label" htmlFor="register-name">
            Full name
          </label>
          <input
            id="register-name"
            className="auth-field__input"
            type="text"
            placeholder="Jane Doe"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
