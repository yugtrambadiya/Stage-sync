/* ─── StageSync API Layer ──────────────────────────────────────────────────
   Single typed fetch wrapper. All backend calls go through here.
   Base URL from NEXT_PUBLIC_API_URL env var.
   ─────────────────────────────────────────────────────────────────────────── */

import type {
  Event,
  AgendaItem,
  Speaker,
  Script,
  ScheduleChange,
  EventState,
  CascadeResult,
  TransitionRequest,
  TransitionResponse,
  ApiError,
} from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/* ── ApiError class ──────────────────────────────────────────────────────── */

export class ApiRequestError extends Error {
  status: number;
  code: string;
  body: ApiError;

  constructor(body: ApiError) {
    super(body.message ?? 'API request failed');
    this.status = body.statusCode;
    this.code = body.code;
    this.body = body;
  }
}

/* ── Core fetch wrapper ──────────────────────────────────────────────────── */

async function request<T>(
  path: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<T> {
  const { timeoutMs = 10_000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });

    if (!res.ok) {
      let body: ApiError;
      try {
        body = (await res.json()) as ApiError;
      } catch {
        body = {
          statusCode: res.status,
          error: res.statusText,
          code: 'UNKNOWN',
          message: `HTTP ${res.status} ${res.statusText}`,
        };
      }
      throw new ApiRequestError(body);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json() as Promise<T>;
  } catch (err) {
    if (err instanceof ApiRequestError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ApiRequestError({
        statusCode: 408,
        error: 'Timeout',
        code: 'REQUEST_TIMEOUT',
        message: `Request timed out after ${timeoutMs}ms`,
      });
    }
    throw new ApiRequestError({
      statusCode: 0,
      error: 'Network Error',
      code: 'NETWORK_ERROR',
      message: (err as Error).message ?? 'Network error',
    });
  } finally {
    clearTimeout(timer);
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const get  = <T>(path: string, opts?: RequestInit) =>
  request<T>(path, { method: 'GET', ...opts });

const post = <T>(path: string, body?: unknown, opts?: RequestInit & { timeoutMs?: number }) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...opts });

const patch = <T>(path: string, body?: unknown, opts?: RequestInit) =>
  request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined, ...opts });

const del = <T>(path: string, opts?: RequestInit) =>
  request<T>(path, { method: 'DELETE', ...opts });

/* ══════════════════════════════════════════════════════════════════════════
   EVENTS
   ══════════════════════════════════════════════════════════════════════════ */

export const eventsApi = {
  list: (q?: string) =>
    get<Event[]>(`/events${q ? `?q=${encodeURIComponent(q)}` : ''}`),

  get: (id: string) =>
    get<Event & { agendaItems: AgendaItem[]; speakers: Speaker[] }>(`/events/${id}`),

  getState: (id: string, at?: string) =>
    get<EventState>(`/events/${id}/state${at ? `?at=${encodeURIComponent(at)}` : ''}`),

  create: (data: {
    name: string;
    date: string;
    venue?: string;
    description?: string;
    timezone?: string;
  }) => post<Event>('/events', data),

  update: (id: string, data: Partial<Event>) =>
    patch<Event>(`/events/${id}`, data),

  delete: (id: string, cascade = false) =>
    del<void>(`/events/${id}${cascade ? '?cascade=true' : ''}`),
};

/* ══════════════════════════════════════════════════════════════════════════
   SPEAKERS
   ══════════════════════════════════════════════════════════════════════════ */

export const speakersApi = {
  list: (eventId?: string, q?: string) => {
    const params = new URLSearchParams();
    if (eventId) params.set('eventId', eventId);
    if (q) params.set('q', q);
    const qs = params.toString();
    return get<Speaker[]>(`/speakers${qs ? `?${qs}` : ''}`);
  },

  get: (id: string) => get<Speaker>(`/speakers/${id}`),

  create: (data: {
    eventId: string;
    name: string;
    designation?: string;
    organization?: string;
    biography?: string;
    expertise?: string[];
  }) => post<Speaker>('/speakers', data),

  update: (id: string, data: Partial<Speaker>) =>
    patch<Speaker>(`/speakers/${id}`, data),

  delete: (id: string) => del<void>(`/speakers/${id}`),
};

/* ══════════════════════════════════════════════════════════════════════════
   AGENDA
   ══════════════════════════════════════════════════════════════════════════ */

export const agendaApi = {
  list: (eventId?: string) =>
    get<AgendaItem[]>(`/agenda${eventId ? `?eventId=${eventId}` : ''}`),

  get: (id: string) => get<AgendaItem>(`/agenda/${id}`),

  create: (data: {
    eventId: string;
    title: string;
    startTime: string;
    durationMinutes: number;
    speakerId?: string;
    description?: string;
  }) => post<AgendaItem>('/agenda', data),

  update: (id: string, data: Partial<AgendaItem>) =>
    patch<AgendaItem>(`/agenda/${id}`, data),

  delete: (id: string) => del<void>(`/agenda/${id}`),

  /** Preview cascade delay — zero DB writes */
  previewDelay: (
    id: string,
    data: { delayMinutes: number; cascade?: boolean; reason?: string },
  ) => post<CascadeResult>(`/agenda/${id}/delay/preview`, data),

  /** Commit cascade delay — writes to DB */
  applyDelay: (
    id: string,
    data: { delayMinutes: number; cascade?: boolean; reason?: string },
    idempotencyKey?: string,
  ) =>
    post<CascadeResult>(`/agenda/${id}/delay`, data, {
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
    }),

  recoveryOptions: (id: string, delayMinutes = 15) =>
    get<unknown>(`/agenda/${id}/recovery-options?delayMinutes=${delayMinutes}`),
};

/* ══════════════════════════════════════════════════════════════════════════
   SCHEDULE CHANGES
   ══════════════════════════════════════════════════════════════════════════ */

export const scheduleChangesApi = {
  list: (eventId: string, limit = 50) =>
    get<ScheduleChange[]>(`/schedule-changes?eventId=${eventId}&limit=${limit}`),

  undo: (batchId: string) =>
    post<{ success: boolean; revertedCount: number }>(`/schedule-changes/${batchId}/undo`),
};

/* ══════════════════════════════════════════════════════════════════════════
   AI
   ══════════════════════════════════════════════════════════════════════════ */

export const aiApi = {
  /**
   * Generate MC transition/announcement script.
   * Uses POST /ai/transition.
   * Timeout is 12s as AI calls can be slow.
   */
  generateTransition: (data: TransitionRequest) =>
    post<TransitionResponse>('/ai/transition', data, { timeoutMs: 12_000 }),
};

/* ══════════════════════════════════════════════════════════════════════════
   SCRIPTS (stored scripts history — no dedicated endpoint yet;
   use GET /events/:id which includes scripts)
   ══════════════════════════════════════════════════════════════════════════ */

export const scriptsApi = {
  list: (eventId: string) =>
    get<Script[]>(`/events/${eventId}`).then(
      (ev: unknown) => ((ev as { scripts?: Script[] }).scripts ?? [])
    ),
};

/* ══════════════════════════════════════════════════════════════════════════
   SYSTEM
   ══════════════════════════════════════════════════════════════════════════ */

export const systemApi = {
  health: () => get<{ status: string; db: string }>('/health'),
  reset: () => post<{ success: boolean; message: string }>('/reset'),
};
