/* ─── StageSync Zustand Store ──────────────────────────────────────────────
   Centralised state for the live dashboard. Components must use narrow
   selectors to avoid unnecessary re-renders.
   ─────────────────────────────────────────────────────────────────────────── */

import { create } from 'zustand';
import type {
  Event,
  AgendaItem,
  Script,
  Announcement,
  ConnectionStatus,
  DelayDiff,
  EventState,
  ToastSeverity,
} from '../lib/types';

/* ── Derived selector helpers (not stored — computed on access) ──────────── */

export function deriveCurrentSession(agenda: AgendaItem[], now: Date): AgendaItem | null {
  // First check for explicitly LIVE item
  const liveItem = agenda.find((i) => i.status === 'LIVE');
  if (liveItem) return liveItem;

  // Then check for DELAYED items
  const delayedItem = agenda.find((i) => i.status === 'DELAYED');
  if (delayedItem) return delayedItem;

  // Then check what's currently running by time
  const nowMs = now.getTime();
  return (
    agenda.find((i) => {
      const start = new Date(i.startTime).getTime();
      const end = start + i.durationMinutes * 60_000;
      return nowMs >= start && nowMs < end && i.status !== 'COMPLETED';
    }) ?? null
  );
}

export function deriveNextSession(agenda: AgendaItem[], current: AgendaItem | null, now: Date): AgendaItem | null {
  const nowMs = now.getTime();
  const upcoming = agenda
    .filter((i) => i.status === 'UPCOMING' || i.status === 'READY')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (current) {
    const afterCurrent = upcoming.filter(
      (i) => new Date(i.startTime).getTime() > new Date(current.startTime).getTime(),
    );
    return afterCurrent[0] ?? null;
  }

  return upcoming.find((i) => new Date(i.startTime).getTime() > nowMs) ?? null;
}

/* ── Store state interface ─────────────────────────────────────────────── */

interface StageState {
  /** Loaded event */
  event: Event | null;
  /** Full sorted agenda */
  agenda: AgendaItem[];
  /** Cached scripts for this event */
  scripts: Script[];
  /** Active toast announcements */
  announcements: Announcement[];
  /** Socket connection status */
  connection: ConnectionStatus;
  /** ISO timestamp of last successful state:sync or agenda:update */
  lastSyncedAt: string | null;
  /** The last applied delay diff — shown in diff panel */
  lastDiff: DelayDiff | null;
  /** On-Air log entries (last 8) */
  activityLog: ActivityEntry[];

  /* ── Actions ─────────────────────────────────────────────────────────── */

  /** Full state replace — used on state:sync */
  applySync: (state: EventState, now?: Date) => void;
  /** Replace only the agenda items */
  applyAgendaUpdate: (items: AgendaItem[]) => void;
  /** Add a generated/stored script */
  addScript: (script: Script) => void;
  /** Mark a script as used */
  markScriptUsed: (scriptId: string) => void;
  /** Push a new announcement toast */
  pushAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt'>) => void;
  /** Remove an announcement by id */
  dismissAnnouncement: (id: string) => void;
  /** Update connection status */
  setConnection: (status: ConnectionStatus) => void;
  /** Save the last delay diff for display */
  setLastDiff: (diff: DelayDiff | null) => void;
  /** Append an activity log entry */
  logActivity: (entry: Omit<ActivityEntry, 'id' | 'at'>) => void;
}

export interface ActivityEntry {
  id: string;
  at: string;
  label: string;
  type: 'delay' | 'script' | 'announce' | 'connection' | 'reset';
}

/* ── Store ─────────────────────────────────────────────────────────────── */

let toastSeq = 0;

export const useStageStore = create<StageState>((set) => ({
  event: null,
  agenda: [],
  scripts: [],
  announcements: [],
  connection: 'disconnected',
  lastSyncedAt: null,
  lastDiff: null,
  activityLog: [],

  applySync: (state: EventState) =>
    set({
      event: state.event,
      agenda: [...state.agenda].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
      lastSyncedAt: new Date().toISOString(),
    }),

  applyAgendaUpdate: (items: AgendaItem[]) =>
    set({
      agenda: [...items].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      ),
      lastSyncedAt: new Date().toISOString(),
    }),

  addScript: (script: Script) =>
    set((s) => ({
      scripts: [script, ...s.scripts.filter((sc) => sc.id !== script.id)],
    })),

  markScriptUsed: (scriptId: string) =>
    set((s) => ({
      scripts: s.scripts.map((sc) =>
        sc.id === scriptId ? { ...sc, used: true } : sc,
      ),
    })),

  pushAnnouncement: (ann) => {
    const id = `ann-${++toastSeq}-${Date.now()}`;
    set((s) => ({
      announcements: [
        ...s.announcements.slice(-2), // max 3
        { ...ann, id, createdAt: new Date().toISOString() },
      ],
    }));
  },

  dismissAnnouncement: (id: string) =>
    set((s) => ({
      announcements: s.announcements.filter((a) => a.id !== id),
    })),

  setConnection: (status: ConnectionStatus) => set({ connection: status }),

  setLastDiff: (diff: DelayDiff | null) => set({ lastDiff: diff }),

  logActivity: (entry) =>
    set((s) => ({
      activityLog: [
        {
          ...entry,
          id: `log-${Date.now()}-${Math.random()}`,
          at: new Date().toISOString(),
        },
        ...s.activityLog,
      ].slice(0, 8),
    })),
}));

/* ── Narrow selectors ──────────────────────────────────────────────────── */

export const selectEvent      = (s: StageState) => s.event;
export const selectAgenda     = (s: StageState) => s.agenda;
export const selectScripts    = (s: StageState) => s.scripts;
export const selectAnnouncements = (s: StageState) => s.announcements;
export const selectConnection = (s: StageState) => s.connection;
export const selectLastSyncedAt = (s: StageState) => s.lastSyncedAt;
export const selectLastDiff   = (s: StageState) => s.lastDiff;
export const selectActivityLog = (s: StageState) => s.activityLog;

/** Helper for toast severity type narrowing */
export function toToastSeverity(level: string): ToastSeverity {
  if (level === 'warn' || level === 'success' || level === 'danger') return level;
  return 'info';
}
