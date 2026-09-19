/**
 * StageSync Backend Core Smoke Test Suite
 * Run: pnpm smoke:backend-core
 * Reads BASE_URL from env (default: http://localhost:4000)
 */

interface TestResult {
  suite: string;
  scenario: string;
  expected: string;
  actual: string;
  passed: boolean;
}

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000';
const results: TestResult[] = [];

function record(suite: string, scenario: string, expected: string, actual: string, passed: boolean) {
  results.push({ suite, scenario, expected, actual, passed });
}

async function request(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  });
  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, headers: res.headers, body: data };
}

async function main() {
  console.log(`\n🚀  Running StageSync Backend Core Smoke Test Suite against ${BASE_URL}\n`);

  // Verify server is up
  try {
    const health = await request('/health');
    record('Health', 'GET /health connectivity', 'status=200, db=up', `status=${health.status}, db=${health.body?.db}`, health.status === 200 && health.body?.db === 'up');
  } catch (err: any) {
    console.error(`❌  Cannot connect to server at ${BASE_URL}. Ensure the API is running (pnpm dev).`);
    console.error(err.message);
    process.exit(1);
  }

  const suffix = Date.now().toString().slice(-6);
  let eventId: string = '';
  let speakerId: string = '';
  let otherEventId: string = '';
  let otherItemId: string = '';
  let item1Id: string = '';
  let item2Id: string = '';
  let item3Id: string = '';

  try {
    // ──────────── 1. EVENTS ────────────
    // Create Event
    const createEvt = await request('/events', {
      method: 'POST',
      body: JSON.stringify({
        name: `Smoke Event ${suffix}`,
        description: 'Smoke test event',
        venue: 'Hall Smoke',
        date: '2025-09-19T00:00:00.000Z',
        timezone: 'Asia/Kolkata',
        status: 'LIVE',
      }),
    });
    eventId = createEvt.body?.id;
    record('Events', 'Create event', '201 with id', `${createEvt.status} id=${eventId}`, createEvt.status === 201 && !!eventId);

    // List Events
    const listEvt = await request('/events');
    const hasEvt = Array.isArray(listEvt.body) && listEvt.body.some((e: any) => e.id === eventId);
    record('Events', 'List events', '200 array contains event', `${listEvt.status} found=${hasEvt}`, listEvt.status === 200 && hasEvt);

    // Get Event
    const getEvt = await request(`/events/${eventId}`);
    record('Events', 'Get event by id', '200 with name', `${getEvt.status} name=${getEvt.body?.name}`, getEvt.status === 200 && getEvt.body?.id === eventId);

    // Update Event
    const patchEvt = await request(`/events/${eventId}`, {
      method: 'PATCH',
      body: JSON.stringify({ venue: 'Hall Smoke Updated' }),
    });
    record('Events', 'Update event', '200 venue updated', `${patchEvt.status} venue=${patchEvt.body?.venue}`, patchEvt.status === 200 && patchEvt.body?.venue === 'Hall Smoke Updated');

    // 404 Event
    const notFoundEvt = await request('/events/evt_does_not_exist_smoke');
    record('Events', '404 unknown event', '404 EVENT_NOT_FOUND', `${notFoundEvt.status} code=${notFoundEvt.body?.code}`, notFoundEvt.status === 404 && notFoundEvt.body?.code === 'EVENT_NOT_FOUND');

    // Create Second Event for Cross-Event Isolation Tests
    const createOtherEvt = await request('/events', {
      method: 'POST',
      body: JSON.stringify({
        name: `Other Event ${suffix}`,
        date: '2025-09-19T00:00:00.000Z',
      }),
    });
    otherEventId = createOtherEvt.body?.id;

    // ──────────── 2. SPEAKERS ────────────
    // Create Speaker
    const createSpk = await request('/speakers', {
      method: 'POST',
      body: JSON.stringify({
        name: `Smoke Speaker ${suffix}`,
        designation: 'Architect',
        organization: 'Smoke Inc',
        expertise: ['Distributed Systems'],
        eventId,
      }),
    });
    speakerId = createSpk.body?.id;
    record('Speakers', 'Create speaker', '201 with id', `${createSpk.status} id=${speakerId}`, createSpk.status === 201 && !!speakerId);

    // List Speakers
    const listSpk = await request(`/speakers?eventId=${eventId}`);
    const hasSpk = Array.isArray(listSpk.body) && listSpk.body.some((s: any) => s.id === speakerId);
    record('Speakers', 'List speakers by event', '200 contains speaker', `${listSpk.status} found=${hasSpk}`, listSpk.status === 200 && hasSpk);

    // Get Speaker
    const getSpk = await request(`/speakers/${speakerId}`);
    record('Speakers', 'Get speaker by id', '200 with name', `${getSpk.status} name=${getSpk.body?.name}`, getSpk.status === 200 && getSpk.body?.id === speakerId);

    // Update Speaker
    const patchSpk = await request(`/speakers/${speakerId}`, {
      method: 'PATCH',
      body: JSON.stringify({ designation: 'Lead Architect' }),
    });
    record('Speakers', 'Update speaker', '200 designation updated', `${patchSpk.status} desig=${patchSpk.body?.designation}`, patchSpk.status === 200 && patchSpk.body?.designation === 'Lead Architect');

    // 404 Speaker
    const notFoundSpk = await request('/speakers/spk_non_existent_smoke');
    record('Speakers', '404 unknown speaker', '404 SPEAKER_NOT_FOUND', `${notFoundSpk.status} code=${notFoundSpk.body?.code}`, notFoundSpk.status === 404 && notFoundSpk.body?.code === 'SPEAKER_NOT_FOUND');

    // ──────────── 3. AGENDA ITEMS ────────────
    // Create Item 1: 09:00 - 10:00 IST (UTC 03:30 - 04:30)
    const createAg1 = await request('/agenda', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Morning Keynote',
        eventId,
        speakerId,
        startTime: '2025-09-19T03:30:00.000Z',
        durationMinutes: 60,
        status: 'UPCOMING',
      }),
    });
    item1Id = createAg1.body?.id;

    // Create Item 2: 10:00 - 11:00 IST (UTC 04:30 - 05:30)
    const createAg2 = await request('/agenda', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Tech Deep Dive',
        eventId,
        speakerId,
        startTime: '2025-09-19T04:30:00.000Z',
        durationMinutes: 60,
        status: 'UPCOMING',
      }),
    });
    item2Id = createAg2.body?.id;

    // Create Item 3: 11:00 - 12:00 IST (UTC 05:30 - 06:30)
    const createAg3 = await request('/agenda', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Closing Talk',
        eventId,
        startTime: '2025-09-19T05:30:00.000Z',
        durationMinutes: 60,
        status: 'UPCOMING',
      }),
    });
    item3Id = createAg3.body?.id;
    record('Agenda', 'Create agenda items with speaker', '201 for all items', `item1=${item1Id}, item2=${item2Id}, item3=${item3Id}`, !!item1Id && !!item2Id && !!item3Id);

    // Create Item in Other Event (Isolation)
    const createOtherAg = await request('/agenda', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Other Event Session',
        eventId: otherEventId,
        startTime: '2025-09-19T04:30:00.000Z',
        durationMinutes: 60,
        status: 'UPCOMING',
      }),
    });
    otherItemId = createOtherAg.body?.id;

    // Speaker Deletion Guard (409)
    const deleteBlockedSpk = await request(`/speakers/${speakerId}`, { method: 'DELETE' });
    record('Speakers', 'Delete speaker referenced by agenda', '409 SPEAKER_REFERENCED', `${deleteBlockedSpk.status} code=${deleteBlockedSpk.body?.code}`, deleteBlockedSpk.status === 409 && deleteBlockedSpk.body?.code === 'SPEAKER_REFERENCED');

    // List Agenda by eventId & Chronological Order
    const listAg = await request(`/agenda?eventId=${eventId}`);
    const isChronological = Array.isArray(listAg.body) && listAg.body.length === 3 && listAg.body[0].id === item1Id && listAg.body[1].id === item2Id && listAg.body[2].id === item3Id;
    record('Agenda', 'List agenda chronological order', 'Item 1, 2, 3 in order', `length=${listAg.body?.length} chronological=${isChronological}`, isChronological);

    // Speaker included on agenda item
    const hasSpeakerRel = listAg.body?.[0]?.speaker?.id === speakerId;
    record('Agenda', 'Agenda item includes speaker relation', 'speaker object populated', `speakerId=${listAg.body?.[0]?.speaker?.id}`, hasSpeakerRel);

    // Get Single Agenda Item
    const getAg = await request(`/agenda/${item1Id}`);
    record('Agenda', 'Get agenda item', '200 with title', `${getAg.status} title=${getAg.body?.title}`, getAg.status === 200 && getAg.body?.id === item1Id);

    // Update Agenda Item
    const patchAg = await request(`/agenda/${item1Id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: 'Morning Keynote (Updated)' }),
    });
    record('Agenda', 'Update agenda item', '200 title updated', `${patchAg.status} title=${patchAg.body?.title}`, patchAg.status === 200 && patchAg.body?.title === 'Morning Keynote (Updated)');

    // ──────────── 4. DELAY VALIDATION & CASCSADE ────────────
    // Bad inputs: delayMinutes = 0, negative, NaN, "abc", missing
    const badZero = await request(`/agenda/${item1Id}/delay`, { method: 'POST', body: JSON.stringify({ delayMinutes: 0, cascade: true }) });
    const badNeg  = await request(`/agenda/${item1Id}/delay`, { method: 'POST', body: JSON.stringify({ delayMinutes: -10, cascade: true }) });
    const badStr  = await request(`/agenda/${item1Id}/delay`, { method: 'POST', body: JSON.stringify({ delayMinutes: 'abc', cascade: true }) });
    const badMiss = await request(`/agenda/${item1Id}/delay`, { method: 'POST', body: JSON.stringify({ cascade: true }) });
    const allBad400 = badZero.status === 400 && badNeg.status === 400 && badStr.status === 400 && badMiss.status === 400;
    record('Delay', 'Invalid delayMinutes (0, -10, "abc", missing)', '400 Bad Request on all', `0=${badZero.status}, -10=${badNeg.status}, abc=${badStr.status}, miss=${badMiss.status}`, allBad400);

    // Overlap with cascade: false -> 409
    const overlapRes = await request(`/agenda/${item1Id}/delay`, {
      method: 'POST',
      body: JSON.stringify({ delayMinutes: 15, cascade: false, reason: 'Test overlap' }),
    });
    record('Delay', 'Overlap without cascade (cascade:false)', '409 SCHEDULE_OVERLAP', `${overlapRes.status} code=${overlapRes.body?.code}`, overlapRes.status === 409 && overlapRes.body?.code === 'SCHEDULE_OVERLAP');

    // Midnight violation -> 400
    const midnightRes = await request(`/agenda/${item1Id}/delay`, {
      method: 'POST',
      body: JSON.stringify({ delayMinutes: 900, cascade: true, reason: 'Pushes past midnight IST' }),
    });
    record('Delay', 'Midnight violation check (IST timezone-aware)', '400 DELAY_CROSSES_MIDNIGHT', `${midnightRes.status} code=${midnightRes.body?.code}`, midnightRes.status === 400 && midnightRes.body?.code === 'DELAY_CROSSES_MIDNIGHT');

    // Successful 15-min cascade delay
    const cascadeRes = await request(`/agenda/${item1Id}/delay`, {
      method: 'POST',
      body: JSON.stringify({ delayMinutes: 15, cascade: true, reason: 'Speaker travel delay' }),
    });
    const batchId = cascadeRes.body?.batchId;
    const changesCount = cascadeRes.body?.changes?.length;

    // Verify item 1, 2, 3 shifted by 15 min
    const agAfter1 = await request(`/agenda/${item1Id}`);
    const agAfter2 = await request(`/agenda/${item2Id}`);
    const agAfter3 = await request(`/agenda/${item3Id}`);
    const otherAgAfter = await request(`/agenda/${otherItemId}`);

    const item1Shifted = agAfter1.body?.startTime === '2025-09-19T03:45:00.000Z';
    const item2Shifted = agAfter2.body?.startTime === '2025-09-19T04:45:00.000Z';
    const item3Shifted = agAfter3.body?.startTime === '2025-09-19T05:45:00.000Z';
    const otherIsolated = otherAgAfter.body?.startTime === '2025-09-19T04:30:00.000Z';

    record('Delay', '15-min cascade shifts downstream items', 'item1,2,3 shifted +15 min', `i1=${item1Shifted}, i2=${item2Shifted}, i3=${item3Shifted}`, item1Shifted && item2Shifted && item3Shifted);
    record('Delay', 'Cross-event isolation', 'other event session untouched', `untouched=${otherIsolated}`, otherIsolated);

    // Undo Batch
    const undoRes = await request(`/schedule-changes/${batchId}/undo`, { method: 'POST' });
    const agRestored1 = await request(`/agenda/${item1Id}`);
    const isRestored = agRestored1.body?.startTime === '2025-09-19T03:30:00.000Z';
    record('Delay', 'Undo restores exact original schedule', '200, item1 back to 03:30', `${undoRes.status} restored=${isRestored}`, undoRes.status === 200 && isRestored);

    // ──────────── 5. CLEANUP & DELETE ────────────
    const delAg = await request(`/agenda/${item3Id}`, { method: 'DELETE' });
    record('Agenda', 'Delete agenda item', '200 OK', `${delAg.status}`, delAg.status === 200);

    const delEvt = await request(`/events/${eventId}?cascade=true`, { method: 'DELETE' });
    record('Events', 'Delete event (?cascade=true)', '200 OK', `${delEvt.status}`, delEvt.status === 200);

    await request(`/events/${otherEventId}?cascade=true`, { method: 'DELETE' });
  } catch (err: any) {
    record('Fatal', 'Unhandled error in smoke tests', 'clean execution', err.message, false);
  }

  // ──────────── SUMMARY TABLE ────────────
  console.log('┌──────────────────────────────────────────────────────────────────────────────────────────────────┐');
  console.log('│  STAGE-SYNC BACKEND CORE ACCEPTANCE SMOKE RESULTS                                                │');
  console.log('├────────────────┬────────────────────────────────────────────┬─────────────┬──────────────────────┤');
  console.log('│ Suite          │ Scenario                                   │ Result      │ Status               │');
  console.log('├────────────────┼────────────────────────────────────────────┼─────────────┼──────────────────────┤');

  let allPassed = true;
  for (const r of results) {
    if (!r.passed) allPassed = false;
    const status = r.passed ? '✅ PASS' : '❌ FAIL';
    const suite = r.suite.padEnd(14).slice(0, 14);
    const scenario = r.scenario.padEnd(42).slice(0, 42);
    const actual = r.actual.padEnd(11).slice(0, 11);
    console.log(`│ ${suite} │ ${scenario} │ ${actual} │ ${status.padEnd(20)} │`);
  }

  console.log('└────────────────┴────────────────────────────────────────────┴─────────────┴──────────────────────┘\n');

  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

  if (!allPassed) {
    console.error('❌  One or more smoke tests failed!');
    process.exit(1);
  } else {
    console.log('🎉  ALL SMOKE TESTS PASSED CLEANLY!\n');
    process.exit(0);
  }
}

main();
