// ── StageSync Auth Client ────────────────────────────────────────────────────
// Handles login / register / Google OAuth and JWT token persistence.
// All functions call the NestJS /auth/* endpoints.

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── Token storage ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'stagesync_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ── API helpers ──────────────────────────────────────────────────────────────
interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

async function authFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Authentication failed.');
  }

  return data as T;
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<AuthResponse> {
  const data = await authFetch<AuthResponse>('/auth/register', { email, password, name });
  setToken(data.token);
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await authFetch<AuthResponse>('/auth/login', { email, password });
  setToken(data.token);
  return data;
}

export async function googleLogin(idToken: string): Promise<AuthResponse> {
  const data = await authFetch<AuthResponse>('/auth/google', { idToken });
  setToken(data.token);
  return data;
}

export async function fetchMe(): Promise<UserProfile> {
  const token = getToken();
  if (!token) throw new Error('Not authenticated.');

  const res = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearToken();
    throw new Error('Session expired.');
  }

  return res.json();
}

export function logout() {
  clearToken();
  window.location.href = '/auth/login';
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return authFetch<{ success: boolean; message: string }>('/auth/forgot-password', { email });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  return authFetch<{ success: boolean; message: string }>('/auth/reset-password', { token, newPassword });
}
