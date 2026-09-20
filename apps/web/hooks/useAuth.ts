'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, fetchMe, logout as authLogout, clearToken } from '../lib/auth';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  logout: () => void;
  refresh: () => Promise<void>;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const me = await fetchMe();
      setUser(me);
      setError(null);
    } catch (err: any) {
      setUser(null);
      clearToken();
      setError(err.message || 'Failed to fetch user.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  return { user, loading, error, logout, refresh };
}
