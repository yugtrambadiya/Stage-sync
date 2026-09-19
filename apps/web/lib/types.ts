/* ─── StageSync Frontend Types ─────────────────────────────────────────────
   Mirror of backend DTOs/responses. Keep in sync with API_CONTRACT.md.
   ─────────────────────────────────────────────────────────────────────────── */

export type EventStatus = 'DRAFT' | 'READY' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type AgendaStatus = 'UPCOMING' | 'READY' | 'LIVE' | 'COMPLETED' | 'DELAYED' | 'SKIPPED' | 'CANCELLED';
export type ScriptType = 'OPENING' | 'INTRODUCTION' | 'TRANSITION' | 'CLOSING' | 'ANNOUNCEMENT';
export type ConnectionStatus = 'connected' | 'reconnecting' | 'disconnected';
export type ToastSeverity = 'info' | 'warn' | 'success' | 'danger';

/* ── Core domain entities ──────────────────────────────────────────────── */

export interface Speaker {
  id: string;
  eventId: string;
  name: string;
  designation?: string | null;
  organization?: string | null;
  biography?: string | null;
  expertise: string[];
  createdAt: string;
}

export interface AgendaItem {
  id: string;
  eventId: string;
  speakerId?: string | null;
  title: string;
  description?: string | null;
  startTime: string;        // ISO-8601
  durationMinutes: number;
  status: AgendaStatus;
  speaker?: Speaker | null;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  name: string;
  description?: string | null;
  venue?: string | null;
  date: string;             // ISO-8601
  timezone: string;
  status: EventStatus;
  agendaItems?: AgendaItem[];
  speakers?: Speaker[];
  createdAt: string;
  updatedAt: string;
}

export interface Script {
  id: string;
  eventId: string;
  type: ScriptType;
  content: string;
  durationSec?: number | null;
  aiGenerated: boolean;
  used?: boolean;
  createdAt: string;
}

export interface ScheduleChange {
  id: string;
  eventId: string;
  agendaItemId?: string | null;
  batchId?: string | null;
  changeType: string;
  delayMinutes?: number | null;
  reason: string;
  oldStart?: string | null;
  newStart?: string | null;
  oldEnd?: string | null;
  newEnd?: string | null;
  approved: boolean;
  createdAt: string;
}

/* ── API response shapes ───────────────────────────────────────────────── */

export interface ApiError {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  path?: string;
  timestamp?: string;
  requestId?: string;
  conflicts?: Array<{
    a: { id: string; title: string };
    b: { id: string; title: string };
    overlapMinutes: number;
  }>;
}

export interface CascadeChange {
  itemId: string;
  title?: string;
  oldStart: string;
  newStart: string;
  oldEnd?: string;
  newEnd?: string;
}

export interface CascadeImpact {
  affectedCount: number;
  eventEndBefore?: string;
  eventEndAfter?: string;
  maxAllowedDelayMinutes: number;
}

export interface CascadeResult {
  agendaItemId: string;
  eventId: string;
  delayMinutes: number;
  cascade: boolean;
  dryRun: boolean;
  applied: boolean;
  batchId: string | null;
  changes: CascadeChange[];
  impact: CascadeImpact;
}

export interface EventHealth {
  status: 'ON_TIME' | 'AT_RISK' | 'DELAYED';
  delayedItemIds: string[];
  totalDelayMinutes: number;
  currentItemId: string | null;
  nextItemId: string | null;
  projectedEnd: string | null;
}

export interface EventState {
  event: Event;
  agenda: AgendaItem[];
  recentChanges: ScheduleChange[];
  health: EventHealth;
}

/* ── AI ────────────────────────────────────────────────────────────────── */

export interface TransitionRequest {
  current: string;
  next: string;
  delayMinutes?: number;
}

export interface TransitionResponse {
  type: string;
  draft: string;
  context: { delayMinutes: number };
  requiresApproval: boolean;
  cached?: boolean;
  fallback?: boolean;
}

/* ── UI-only ───────────────────────────────────────────────────────────── */

export interface Announcement {
  id: string;
  severity: ToastSeverity;
  title: string;
  message?: string;
  createdAt: string;
}

/** Kept in store after a delay is applied */
export interface DelayDiff {
  batchId: string | null;
  delayMinutes: number;
  changes: CascadeChange[];
  impact: CascadeImpact;
  appliedAt: string;
}

/** Socket.io domain event as received on the client */
export interface DomainEvent {
  type: string;
  eventId: string;
  at: string;
  data: unknown;
}
