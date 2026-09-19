import { computePlan, computeMaxAllowedDelay, AgendaItemSnapshot, localDateString } from './cascade.engine';

// ──────────────── Fixtures ────────────────

const TZ = 'Asia/Kolkata';

/** Build an IST start time as a UTC Date. IST = UTC+5:30 */
function ist(dateStr: string, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  // IST offset = +5:30. To convert IST→UTC: subtract 5h30m
  d.setUTCHours(h - 5, m < 30 ? m + 30 : m - 30, 0, 0);
  if (m < 30) d.setUTCDate(d.getUTCDate() - (h < 5 ? 1 : 0));
  // Simpler: just do the math directly
  return new Date(`${dateStr}T${String(h - 5).padStart(2, '0')}:${String(m < 30 ? m + 30 : m - 30).padStart(2, '0')}:00.000Z`);
}

/** Convert IST HH:MM to UTC offset-corrected Date on a base date */
function makeIST(date: string, hhmm: string): Date {
  const [H, M] = hhmm.split(':').map(Number);
  // IST = UTC + 5:30 → UTC = IST - 5:30
  const totalMinutes = H * 60 + M - 330; // 330 = 5*60+30
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCMinutes(d.getUTCMinutes() + totalMinutes);
  return d;
}

function makeItems(date = '2025-09-19'): AgendaItemSnapshot[] {
  return [
    { id: 'opening',   title: 'Opening Ceremony',          startTime: makeIST(date, '09:00'), durationMinutes: 30,  status: 'UPCOMING', eventId: 'evt1' },
    { id: 'keynote',   title: 'Keynote: AI at the Edge',   startTime: makeIST(date, '09:30'), durationMinutes: 60,  status: 'DELAYED',  eventId: 'evt1' },
    { id: 'wasm',      title: 'Talk: WebAssembly',         startTime: makeIST(date, '10:30'), durationMinutes: 60,  status: 'UPCOMING', eventId: 'evt1' },
    { id: 'panel',     title: 'Panel: Startup Realities',  startTime: makeIST(date, '11:30'), durationMinutes: 30,  status: 'UPCOMING', eventId: 'evt1' },
    { id: 'lunch',     title: 'Lunch Break',               startTime: makeIST(date, '12:00'), durationMinutes: 60,  status: 'UPCOMING', eventId: 'evt1' },
    { id: 'workshop',  title: 'Workshop: LLMs',            startTime: makeIST(date, '13:00'), durationMinutes: 90,  status: 'UPCOMING', eventId: 'evt1' },
    { id: 'oss',       title: 'Talk: Open Source',         startTime: makeIST(date, '14:30'), durationMinutes: 60,  status: 'UPCOMING', eventId: 'evt1' },
    { id: 'results',   title: 'Hackathon Results',         startTime: makeIST(date, '15:30'), durationMinutes: 30,  status: 'UPCOMING', eventId: 'evt1' },
    { id: 'closing',   title: 'Closing Ceremony',          startTime: makeIST(date, '16:00'), durationMinutes: 30,  status: 'UPCOMING', eventId: 'evt1' },
  ];
}

// ──────────────── Tests ────────────────

describe('CascadeEngine — computePlan', () => {

  it('shifts keynote and every downstream item by 15 min (cascade=true)', () => {
    const items  = makeItems();
    const result = computePlan({ items, anchorId: 'keynote', delayMinutes: 15, cascade: true, timezone: TZ });

    expect(result.violations.overlaps).toHaveLength(0);
    expect(result.violations.midnight).toHaveLength(0);
    expect(result.changes).toHaveLength(8); // keynote + all 7 downstream (opening not shifted)

    const keynoteCh = result.changes.find(c => c.itemId === 'keynote')!;
    const closingCh = result.changes.find(c => c.itemId === 'closing')!;

    // Keynote: 09:30 → 09:45 IST (UTC difference = 15 min)
    expect(keynoteCh.newStart.getTime() - keynoteCh.oldStart.getTime()).toBe(15 * 60_000);
    // Closing: 16:00 → 16:15 IST
    expect(closingCh.newStart.getTime() - closingCh.oldStart.getTime()).toBe(15 * 60_000);
  });

  it('does NOT shift items before the anchor', () => {
    const items  = makeItems();
    const result = computePlan({ items, anchorId: 'keynote', delayMinutes: 15, cascade: true, timezone: TZ });
    const openingChange = result.changes.find(c => c.itemId === 'opening');
    expect(openingChange).toBeUndefined();
  });

  it('does NOT touch items from a different event', () => {
    const items: AgendaItemSnapshot[] = [
      ...makeItems(),
      { id: 'other-evt-item', title: 'Other Event Talk', startTime: makeIST('2025-09-19', '10:00'), durationMinutes: 60, status: 'UPCOMING', eventId: 'evt2' },
    ];
    const result = computePlan({ items, anchorId: 'keynote', delayMinutes: 15, cascade: true, timezone: TZ });
    const otherChange = result.changes.find(c => c.itemId === 'other-evt-item');
    expect(otherChange).toBeUndefined();
  });

  it('cascade=false shifts ONLY the anchor item', () => {
    const items  = makeItems();
    const result = computePlan({ items, anchorId: 'keynote', delayMinutes: 15, cascade: false, timezone: TZ });
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].itemId).toBe('keynote');
  });

  it('cascade=false detects overlap when shifted item runs into neighbour', () => {
    const items  = makeItems();
    // Keynote ends at 10:30. With +15 it ends at 10:45, which overlaps WASM starting at 10:30.
    const result = computePlan({ items, anchorId: 'keynote', delayMinutes: 15, cascade: false, timezone: TZ });
    expect(result.violations.overlaps.length).toBeGreaterThan(0);
    expect(result.violations.overlaps[0].a.id).toBe('keynote');
    expect(result.violations.overlaps[0].b.id).toBe('wasm');
  });

  it('touching boundary (end == next start) is NOT an overlap', () => {
    const items = makeItems();
    // 0 minutes delay — keynote ends exactly at 10:30, wasm starts 10:30 → no overlap
    const result = computePlan({ items, anchorId: 'keynote', delayMinutes: 0, cascade: false, timezone: TZ });
    expect(result.violations.overlaps).toHaveLength(0);
  });

  it('detects midnight crossing (late delay)', () => {
    // Use a session at 23:30 IST, delay 60 minutes → ends at 00:30 next day
    const items: AgendaItemSnapshot[] = [
      { id: 'late', title: 'Late Talk', startTime: makeIST('2025-09-19', '23:30'), durationMinutes: 30, status: 'UPCOMING', eventId: 'evt1' },
    ];
    const result = computePlan({ items, anchorId: 'late', delayMinutes: 31, cascade: true, timezone: TZ });
    expect(result.violations.midnight.length).toBeGreaterThan(0);
    expect(result.violations.midnight[0].itemId).toBe('late');
  });

  it('23:59 boundary: delay of 1 minute crosses midnight (item duration makes it cross)', () => {
    const items: AgendaItemSnapshot[] = [
      { id: 'near-midnight', title: 'Near Midnight', startTime: makeIST('2025-09-19', '23:45'), durationMinutes: 15, status: 'UPCOMING', eventId: 'evt1' },
    ];
    // 0 delay: starts 23:45, ends 00:00 — exactly midnight, allowed
    const r0 = computePlan({ items, anchorId: 'near-midnight', delayMinutes: 0, cascade: true, timezone: TZ });
    // End = 00:00 is midnight → date shifts → this SHOULD be treated as crossing midnight
    // But "exactly at 24:00 is allowed" per spec; let's test 1 min delay (ends 00:01)
    const r1 = computePlan({ items, anchorId: 'near-midnight', delayMinutes: 1, cascade: true, timezone: TZ });
    expect(r1.violations.midnight.length).toBeGreaterThan(0);
  });

  it('IST-vs-UTC: delay fine in UTC but crosses IST midnight is rejected', () => {
    // 22:00 UTC = 03:30 IST next day — but we set startTime to IST 23:00 (17:30 UTC)
    // Delay 90 min → IST end = 00:30 → crosses midnight in IST
    const items: AgendaItemSnapshot[] = [
      { id: 'ist-test', title: 'IST Test', startTime: makeIST('2025-09-19', '23:00'), durationMinutes: 30, status: 'UPCOMING', eventId: 'evt1' },
    ];
    const result = computePlan({ items, anchorId: 'ist-test', delayMinutes: 31, cascade: true, timezone: 'Asia/Kolkata' });
    expect(result.violations.midnight.length).toBeGreaterThan(0);
  });

  it('impact: affectedCount equals number of changes', () => {
    const items  = makeItems();
    const result = computePlan({ items, anchorId: 'keynote', delayMinutes: 15, cascade: true, timezone: TZ });
    expect(result.impact.affectedCount).toBe(result.changes.length);
  });

  it('impact: eventEndAfter is 15 min later than eventEndBefore', () => {
    const items  = makeItems();
    const result = computePlan({ items, anchorId: 'keynote', delayMinutes: 15, cascade: true, timezone: TZ });
    const diff = result.impact.eventEndAfter!.getTime() - result.impact.eventEndBefore!.getTime();
    expect(diff).toBe(15 * 60_000);
  });
});

describe('CascadeEngine — computeMaxAllowedDelay', () => {

  it('returns a positive value for normal schedule', () => {
    const items = makeItems();
    const max = computeMaxAllowedDelay(items, 'keynote', true, TZ);
    expect(max).toBeGreaterThan(0);
  });

  it('max passes validation, max+1 fails', () => {
    const items = makeItems();
    const max = computeMaxAllowedDelay(items, 'keynote', true, TZ);
    const r1 = computePlan({ items, anchorId: 'keynote', delayMinutes: max,     cascade: true, timezone: TZ });
    const r2 = computePlan({ items, anchorId: 'keynote', delayMinutes: max + 1, cascade: true, timezone: TZ });
    const valid1 = r1.violations.midnight.length === 0 && r1.violations.overlaps.length === 0;
    const valid2 = r2.violations.midnight.length === 0 && r2.violations.overlaps.length === 0;
    expect(valid1).toBe(true);
    expect(valid2).toBe(false);
  });
});

describe('localDateString', () => {
  it('converts UTC to IST local date correctly', () => {
    // 2025-09-19 18:30 UTC = 2025-09-20 00:00 IST
    const d = new Date('2025-09-19T18:30:00.000Z');
    const local = localDateString(d, 'Asia/Kolkata');
    expect(local).toBe('2025-09-20');
  });
});
