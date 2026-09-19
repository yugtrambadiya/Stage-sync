/* ─── useLiveSync — Socket.io realtime hook ────────────────────────────────
   One socket per event room. Cleans up on unmount. Reconnects with
   exponential backoff. Falls back to REST if socket is unavailable.
   ─────────────────────────────────────────────────────────────────────────── */

'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStageStore } from '../store/useStageStore';
import { eventsApi } from '../lib/api';
import type { AgendaItem, EventState } from '../lib/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface LiveSyncState {
  status: 'connected' | 'reconnecting' | 'disconnected';
  lastSyncedAt: string | null;
}

export function useLiveSync(eventId: string | null): LiveSyncState {
  const socketRef = useRef<Socket | null>(null);
  const eventIdRef = useRef<string | null>(null);

  const {
    applySync,
    applyAgendaUpdate,
    pushAnnouncement,
    setConnection,
    logActivity,
  } = useStageStore.getState();

  const connection   = useStageStore((s) => s.connection);
  const lastSyncedAt = useStageStore((s) => s.lastSyncedAt);

  useEffect(() => {
    if (!eventId) return;

    // Avoid re-creating socket for the same eventId
    if (socketRef.current && eventIdRef.current === eventId) return;

    eventIdRef.current = eventId;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      randomizationFactor: 0.5,
    });

    socketRef.current = socket;

    /* ── REST fallback — fetch state when socket connect or reconnects ── */
    async function fetchAndSync() {
      try {
        const state = await eventsApi.getState(eventId!);
        applySync(state as EventState);
      } catch {
        // swallow — socket state:sync should arrive shortly
      }
    }

    /* ── Socket event handlers ─────────────────────────────────────────── */

    socket.on('connect', () => {
      setConnection('connected');
      // Join the event room
      socket.emit('join', { eventId });
      logActivity({ label: 'Socket connected', type: 'connection' });
      // REST fallback to ensure we're not stale
      fetchAndSync();
    });

    socket.on('disconnect', () => {
      setConnection('reconnecting');
      logActivity({ label: 'Socket disconnected — reconnecting', type: 'connection' });
    });

    socket.on('connect_error', () => {
      setConnection('reconnecting');
    });

    socket.on('reconnect_attempt', () => {
      setConnection('reconnecting');
    });

    socket.on('reconnect', () => {
      setConnection('connected');
      socket.emit('join', { eventId });
      logActivity({ label: 'Socket reconnected', type: 'connection' });
      fetchAndSync();
    });

    /* ── Domain events ─────────────────────────────────────────────────── */

    // Full state sync — highest priority, replaces everything
    socket.on('state:sync', (data: EventState) => {
      applySync(data);
    });

    // Agenda item updates from cascade delay or CRUD
    socket.on('agenda:update', (data: AgendaItem[] | { agenda: AgendaItem[] }) => {
      const items = Array.isArray(data) ? data : data.agenda;
      applyAgendaUpdate(items);
    });

    // schedule.cascaded / schedule.reverted domain events
    socket.on('schedule.cascaded', () => {
      logActivity({ label: 'Schedule cascade applied', type: 'delay' });
      fetchAndSync();
    });

    socket.on('schedule.reverted', () => {
      logActivity({ label: 'Schedule change reverted', type: 'delay' });
      fetchAndSync();
    });

    // agenda CRUD events
    socket.on('agenda.created', () => fetchAndSync());
    socket.on('agenda.updated', () => fetchAndSync());
    socket.on('agenda.deleted', () => fetchAndSync());

    // Announcements from server
    socket.on('announce:new', (data: { message?: string; title?: string; severity?: string }) => {
      pushAnnouncement({
        severity: (data.severity as 'info' | 'warn' | 'success' | 'danger') ?? 'info',
        title: data.title ?? 'Announcement',
        message: data.message,
      });
      logActivity({ label: `Announcement: ${data.title ?? data.message ?? ''}`, type: 'announce' });
    });

    // Demo reset
    socket.on('demo.reset', () => {
      logActivity({ label: 'Demo data reset', type: 'reset' });
      fetchAndSync();
    });

    return () => {
      socket.off();
      socket.disconnect();
      socketRef.current = null;
      eventIdRef.current = null;
      setConnection('disconnected');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return { status: connection, lastSyncedAt };
}
