/** API response/error types shared between API and frontend */

export interface ApiError {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  path?: string;
  timestamp?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface CascadeChange {
  itemId: string;
  title?: string;
  oldStart: string; // ISO-8601
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

export interface ScheduleDomainEvent {
  type:
    | 'schedule.cascaded'
    | 'schedule.reverted'
    | 'agenda.created'
    | 'agenda.updated'
    | 'agenda.deleted'
    | 'demo.reset';
  eventId: string;
  at: string; // ISO-8601
  data: unknown;
}
