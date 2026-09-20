/**
 * Pure cascade engine — no Prisma, no I/O, no Date.now().
 * All inputs are explicit; all outputs are deterministic.
 * This is where all the scheduling math lives and where unit tests focus.
 */

export interface AgendaItemSnapshot {
  id: string;
  title: string;
  startTime: Date;
  durationMinutes: number;
  status: string;
  eventId: string;
}

export interface CascadeEngineChange {
  itemId: string;
  title: string;
  oldStart: Date;
  newStart: Date;
  oldEnd: Date;
  newEnd: Date;
}

export interface OverlapConflict {
  a: { id: string; title: string };
  b: { id: string; title: string };
  overlapMinutes: number;
}

export interface MidnightViolation {
  itemId: string;
  title: string;
  localDate: string; // original local date
  newLocalDate: string; // date after shift
}

export interface CascadeEngineResult {
  changes: CascadeEngineChange[];
  violations: {
    overlaps: OverlapConflict[];
    midnight: MidnightViolation[];
  };
  impact: {
    affectedCount: number;
    eventEndBefore: Date | null;
    eventEndAfter: Date | null;
  };
}

export interface ComputePlanInput {
  items: AgendaItemSnapshot[];
  anchorId: string;
  delayMinutes: number;
  cascade: boolean;
  timezone: string;
}

/** Get item end time (derived from startTime + durationMinutes) */
export function itemEndTime(item: AgendaItemSnapshot): Date {
  return new Date(item.startTime.getTime() + item.durationMinutes * 60_000);
}

/**
 * Get the local calendar date string for a UTC instant in a given timezone.
 * Format: YYYY-MM-DD. Uses Intl — no external date libraries.
 */
export function localDateString(utcDate: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utcDate);
}

/**
 * Compute what the schedule would look like after a cascade delay.
 * Returns changes, violations, and impact — writes NOTHING.
 */
export function computePlan(input: ComputePlanInput): CascadeEngineResult {
  const { items, anchorId, delayMinutes, cascade, timezone } = input;

  // Sort chronologically
  const sorted = [...items].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime() || a.id.localeCompare(b.id),
  );

  const anchorIdx = sorted.findIndex(i => i.id === anchorId);
  if (anchorIdx === -1) {
    return { changes: [], violations: { overlaps: [], midnight: [] }, impact: { affectedCount: 0, eventEndBefore: null, eventEndAfter: null } };
  }

  const anchor = sorted[anchorIdx];
  const shiftMs = delayMinutes * 60_000;

  // Determine which items to shift
  // cascade=true  → anchor + all downstream (start >= anchor.start, same event)
  // cascade=false → ONLY the anchor (shifts into its neighbour → triggers overlap)
  const toShift = new Set<string>();
  toShift.add(anchorId);
  if (cascade) {
    for (const item of sorted) {
      if (item.eventId === anchor.eventId && item.startTime >= anchor.startTime) {
        toShift.add(item.id);
      }
    }
  }

  // Build the resulting schedule (mutated copies)
  const resulting = sorted.map(item => {
    if (toShift.has(item.id)) {
      return {
        ...item,
        startTime: new Date(item.startTime.getTime() + shiftMs),
      };
    }
    return item;
  });

  // Compute changes array
  const changes: CascadeEngineChange[] = [];
  for (const orig of sorted) {
    if (toShift.has(orig.id)) {
      const shifted = resulting.find(r => r.id === orig.id)!;
      changes.push({
        itemId:   orig.id,
        title:    orig.title,
        oldStart: orig.startTime,
        newStart: shifted.startTime,
        oldEnd:   itemEndTime(orig),
        newEnd:   itemEndTime(shifted),
      });
    }
  }

  // --- Midnight validation ---
  const midnightViolations: MidnightViolation[] = [];
  for (const change of changes) {
    const origLocalDate = localDateString(change.oldStart, timezone);
    // Check both newStart and newEnd cross midnight
    const newEndLocalDate = localDateString(change.newEnd, timezone);
    if (origLocalDate !== newEndLocalDate) {
      midnightViolations.push({
        itemId:       change.itemId,
        title:        change.title,
        localDate:    origLocalDate,
        newLocalDate: newEndLocalDate,
      });
    }
  }

  // --- Overlap validation (full schedule) ---
  const overlapConflicts: OverlapConflict[] = [];
  // Only validate within the same event
  const sameEventItems = resulting.filter(i => i.eventId === anchor.eventId);
  const chronological = [...sameEventItems].sort(
    (a, b) => a.startTime.getTime() - b.startTime.getTime() || a.id.localeCompare(b.id),
  );

  for (let i = 0; i < chronological.length - 1; i++) {
    const a = chronological[i];
    const b = chronological[i + 1];
    const aEnd = new Date(a.startTime.getTime() + a.durationMinutes * 60_000);
    // Overlap = aEnd > bStart (touching boundary aEnd === bStart is allowed)
    if (aEnd > b.startTime) {
      const overlapMs = aEnd.getTime() - b.startTime.getTime();
      overlapConflicts.push({
        a: { id: a.id, title: a.title },
        b: { id: b.id, title: b.title },
        overlapMinutes: Math.ceil(overlapMs / 60_000),
      });
    }
  }

  // --- Impact ---
  const allSameEvent = resulting.filter(i => i.eventId === anchor.eventId);
  const origSameEvent = sorted.filter(i => i.eventId === anchor.eventId);
  const lastOrig    = origSameEvent[origSameEvent.length - 1];
  const lastResult  = allSameEvent.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).at(-1);

  const eventEndBefore = lastOrig ? itemEndTime(lastOrig) : null;
  const eventEndAfter  = lastResult ? itemEndTime(lastResult) : null;

  return {
    changes,
    violations: { overlaps: overlapConflicts, midnight: midnightViolations },
    impact: {
      affectedCount:  changes.length,
      eventEndBefore,
      eventEndAfter,
    },
  };
}

/**
 * Binary search: find the maximum delay (1..1440) that passes all validators.
 * Uses the same computePlan so it is guaranteed consistent with real validation.
 */
export function computeMaxAllowedDelay(
  items: AgendaItemSnapshot[],
  anchorId: string,
  cascade: boolean,
  timezone: string,
): number {
  let lo = 0;
  let hi = 1440;
  let best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (mid === 0) { lo = 1; continue; }
    const result = computePlan({ items, anchorId, delayMinutes: mid, cascade, timezone });
    const valid = result.violations.overlaps.length === 0 && result.violations.midnight.length === 0;
    if (valid) { best = mid; lo = mid + 1; }
    else { hi = mid - 1; }
  }
  return best;
}
