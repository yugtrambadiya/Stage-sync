export interface Speaker {
  id: string;
  name: string;
  designation?: string | null;
  organization?: string | null;
  biography?: string | null;
  expertise: string[];
}

export interface AgendaItem {
  id: string;
  eventId: string;
  speakerId?: string | null;
  title: string;
  description?: string | null;
  startTime: string;
  durationMinutes: number;
  status: "UPCOMING" | "READY" | "LIVE" | "COMPLETED" | "DELAYED" | "SKIPPED" | "CANCELLED";
  speaker?: Speaker | null;
}

export interface Script {
  id: string;
  eventId: string;
  type: "OPENING" | "INTRODUCTION" | "TRANSITION" | "CLOSING" | "ANNOUNCEMENT";
  content: string;
  durationSec?: number | null;
  aiGenerated: boolean;
  createdAt: string;
}

export interface EventDetail {
  id: string;
  name: string;
  description?: string | null;
  venue?: string | null;
  date: string;
  timezone: string;
  status: "DRAFT" | "READY" | "LIVE" | "COMPLETED" | "CANCELLED";
  speakers: Speaker[];
  agendaItems: AgendaItem[];
  scripts: Script[];
  changes: Array<{
    id: string;
    reason: string;
    oldStart?: string | null;
    newStart?: string | null;
    createdAt: string;
  }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchEvents(): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE}/events`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch events");
    return await res.json();
  } catch (err) {
    console.error("fetchEvents error:", err);
    return [];
  }
}

export async function fetchEventById(id: string): Promise<EventDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/events/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch event ${id}`);
    return await res.json();
  } catch (err) {
    console.error("fetchEventById error:", err);
    return null;
  }
}

export async function seedDemoEvent(): Promise<EventDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/events/seed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Failed to seed demo event");
    return await res.json();
  } catch (err) {
    console.error("seedDemoEvent error:", err);
    return null;
  }
}

export async function createEvent(data: {
  name: string;
  description?: string;
  venue?: string;
  date?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function addAgendaItem(
  eventId: string,
  data: {
    title: string;
    description?: string;
    startTime: string;
    durationMinutes: number;
    speakerId?: string;
  }
): Promise<AgendaItem> {
  const res = await fetch(`${API_BASE}/events/${eventId}/agenda`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateAgendaItem(
  eventId: string,
  itemId: string,
  data: Partial<AgendaItem>
): Promise<AgendaItem> {
  const res = await fetch(`${API_BASE}/events/${eventId}/agenda/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteAgendaItem(eventId: string, itemId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}/agenda/${itemId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function applyScheduleDelay(
  eventId: string,
  itemId: string,
  delayMinutes: number
): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}/agenda/delay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, delayMinutes }),
  });
  return res.json();
}

export async function addSpeaker(
  eventId: string,
  data: {
    name: string;
    designation?: string;
    organization?: string;
    biography?: string;
    expertise?: string[];
  }
): Promise<Speaker> {
  const res = await fetch(`${API_BASE}/events/${eventId}/speakers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteSpeaker(eventId: string, speakerId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/events/${eventId}/speakers/${speakerId}`, {
    method: "DELETE",
  });
  return res.json();
}

export async function saveScript(
  eventId: string,
  data: {
    type: string;
    content: string;
    durationSec?: number;
    aiGenerated?: boolean;
  }
): Promise<Script> {
  const res = await fetch(`${API_BASE}/events/${eventId}/scripts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateAiScript(data: {
  type: string;
  tone?: string;
  eventName?: string;
  eventType?: string;
  speakerName?: string;
  speakerDesignation?: string;
  speakerOrg?: string;
  speakerTopic?: string;
  currentSession?: string;
  nextSession?: string;
  delayMinutes?: number;
  announcementDetails?: string;
}): Promise<{
  type: string;
  tone: string;
  content: string;
  stageDirections?: string[];
  estimatedSeconds: number;
  source: string;
}> {
  const res = await fetch(`${API_BASE}/ai/generate-script`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateDelayRecovery(data: {
  eventName?: string;
  delayedItemTitle: string;
  delayMinutes: number;
  delayReason?: string;
}): Promise<{
  alertType: string;
  delayMinutes: number;
  anchorSpeech: string;
  fillerActionItems: string[];
  suggestedBufferSeconds: number;
}> {
  const res = await fetch(`${API_BASE}/ai/delay-recovery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}
