export const EVENT_STATUSES = [
  "DRAFT",
  "READY",
  "LIVE",
  "COMPLETED",
  "CANCELLED"
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];
