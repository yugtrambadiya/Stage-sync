'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '../lib/auth';

/**
 * Client-side auth guard — wraps protected pages and redirects to login if not authenticated.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
    }
  }, [router]);

  if (typeof window !== 'undefined' && !isAuthenticated()) {
    // Show nothing while redirecting
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="auth-submit__spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return <>{children}</>;
}
