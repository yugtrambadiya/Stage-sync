import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
const request: typeof supertest = (supertest as any).default || supertest;
import { AppModule } from '../src/app.module';
import { PrismaService } from '@smart-anchor/database';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { RequestIdMiddleware } from '../src/common/middleware/request-id.middleware';

describe('Backend Core E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const testSuffix = Date.now().toString();
  const testEventId = `evt_e2e_${testSuffix}`;
  let speakerId: string;
  let item1Id: string;
  let item2Id: string;
  let item3Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((req: any, res: any, next: any) => new RequestIdMiddleware().use(req, res, next));
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Isolated cleanup — never touch demo seed data
    try {
      await prisma.scheduleChange.deleteMany({ where: { eventId: testEventId } });
      await prisma.agendaItemSpeaker.deleteMany({ where: { agendaItem: { eventId: testEventId } } });
      await prisma.agendaItem.deleteMany({ where: { eventId: testEventId } });
      await prisma.speaker.deleteMany({ where: { eventId: testEventId } });
      await prisma.event.deleteMany({ where: { id: testEventId } });
    } catch {
      // ignore
    }
    await app.close();
  });

  // ──────────────── 1. Events CRUD ────────────────
  describe('Events CRUD', () => {
    it('creates an event', async () => {
      const res = await request(app.getHttpServer())
        .post('/events')
        .send({
          id: testEventId,
          name: `E2E Test Symposium ${testSuffix}`,
          description: 'E2E Testing',
          venue: 'Hall A',
          date: '2025-09-19T00:00:00.000Z',
          timezone: 'Asia/Kolkata',
          status: 'LIVE',
        })
        .expect(201);

      expect(res.body.id).toBe(testEventId);
      expect(res.body.name).toContain('E2E Test Symposium');
    });

    it('lists events', async () => {
      const res = await request(app.getHttpServer()).get('/events').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((e: any) => e.id === testEventId)).toBe(true);
    });

    it('gets a single event', async () => {
      const res = await request(app.getHttpServer()).get(`/events/${testEventId}`).expect(200);
      expect(res.body.id).toBe(testEventId);
    });

    it('returns 404 for unknown event', async () => {
      const res = await request(app.getHttpServer()).get('/events/evt_non_existent').expect(404);
      expect(res.body.code).toBe('EVENT_NOT_FOUND');
    });

    it('updates an event', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/events/${testEventId}`)
        .send({ venue: 'Hall B Updated' })
        .expect(200);
      expect(res.body.venue).toBe('Hall B Updated');
    });
  });

  // ──────────────── 2. Speakers CRUD & 409 Deletion Guard ────────────────
  describe('Speakers CRUD & Constraints', () => {
    it('creates a speaker', async () => {
      const res = await request(app.getHttpServer())
        .post('/speakers')
        .send({
          name: 'Dr. Test Speaker',
          designation: 'Research Fellow',
          organization: 'Test Labs',
          biography: 'Expert in testing',
          expertise: ['Testing', 'Systems'],
          eventId: testEventId,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Dr. Test Speaker');
      speakerId = res.body.id;
    });

    it('gets the speaker', async () => {
      const res = await request(app.getHttpServer()).get(`/speakers/${speakerId}`).expect(200);
      expect(res.body.id).toBe(speakerId);
    });

    it('updates the speaker', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/speakers/${speakerId}`)
        .send({ designation: 'Senior Research Fellow' })
        .expect(200);
      expect(res.body.designation).toBe('Senior Research Fellow');
    });

    it('creates agenda items linked to this speaker', async () => {
      // Item 1: 09:00 - 10:00 IST (UTC 03:30 - 04:30)
      const res1 = await request(app.getHttpServer())
        .post('/agenda')
        .send({
          title: 'Opening Remarks',
          eventId: testEventId,
          speakerId,
          startTime: '2025-09-19T03:30:00.000Z',
          durationMinutes: 60,
          status: 'COMPLETED',
        })
        .expect(201);
      item1Id = res1.body.id;

      // Item 2: 10:00 - 11:00 IST (UTC 04:30 - 05:30)
      const res2 = await request(app.getHttpServer())
        .post('/agenda')
        .send({
          title: 'Keynote Address',
          eventId: testEventId,
          speakerId,
          startTime: '2025-09-19T04:30:00.000Z',
          durationMinutes: 60,
          status: 'LIVE',
        })
        .expect(201);
      item2Id = res2.body.id;

      // Item 3: 11:00 - 12:00 IST (UTC 05:30 - 06:30)
      const res3 = await request(app.getHttpServer())
        .post('/agenda')
        .send({
          title: 'Closing Panel',
          eventId: testEventId,
          startTime: '2025-09-19T05:30:00.000Z',
          durationMinutes: 60,
          status: 'UPCOMING',
        })
        .expect(201);
      item3Id = res3.body.id;

      expect(item1Id).toBeDefined();
      expect(item2Id).toBeDefined();
      expect(item3Id).toBeDefined();
    });

    it('refuses to delete speaker referenced by agenda item (409 SPEAKER_REFERENCED)', async () => {
      const res = await request(app.getHttpServer()).delete(`/speakers/${speakerId}`).expect(409);
      expect(res.body.code).toBe('SPEAKER_REFERENCED');
      expect(res.body.blockedBy).toBeDefined();
      expect(res.body.blockedBy.length).toBeGreaterThan(0);
    });
  });

  // ──────────────── 3. Agenda Items Querying ────────────────
  describe('Agenda Items Querying', () => {
    it('lists agenda items for the event in chronological order', async () => {
      const res = await request(app.getHttpServer())
        .get(`/agenda?eventId=${testEventId}`)
        .expect(200);

      expect(res.body.length).toBe(3);
      expect(res.body[0].id).toBe(item1Id);
      expect(res.body[1].id).toBe(item2Id);
      expect(res.body[2].id).toBe(item3Id);
    });
  });

  // ──────────────── 4. Preview Endpoint (Zero DB Writes) ────────────────
  describe('Preview Endpoint', () => {
    it('previews 15-min cascade delay with zero writes to the database', async () => {
      // Snapshot agenda before preview
      const before = await prisma.agendaItem.findMany({
        where: { eventId: testEventId },
        orderBy: { id: 'asc' },
      });

      const res = await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay/preview`)
        .send({ delayMinutes: 15, cascade: true, reason: 'Testing preview' })
        .expect(200);

      expect(res.body.dryRun).toBe(true);
      expect(res.body.applied).toBe(false);
      expect(res.body.changes.length).toBe(2); // item2 and item3

      // Verify DB unchanged byte-for-byte
      const after = await prisma.agendaItem.findMany({
        where: { eventId: testEventId },
        orderBy: { id: 'asc' },
      });

      expect(JSON.stringify(before)).toEqual(JSON.stringify(after));
    });
  });

  // ──────────────── 5. Rollback Proof on Negative Tests ────────────────
  describe('Rollback Proof on Violations (Overlap & Midnight & Validation)', () => {
    it('rejects invalid delayMinutes (<= 0, > 1440, non-integer) with 400', async () => {
      await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay`)
        .send({ delayMinutes: 0, cascade: true })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay`)
        .send({ delayMinutes: -5, cascade: true })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay`)
        .send({ delayMinutes: 'abc', cascade: true })
        .expect(400);
    });

    it('rejects overlap when cascade=false with 409 and leaves DB completely unchanged', async () => {
      const before = await prisma.agendaItem.findMany({
        where: { eventId: testEventId },
        orderBy: { id: 'asc' },
      });

      const res = await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay`)
        .send({ delayMinutes: 15, cascade: false, reason: 'Will overlap item 3' })
        .expect(409);

      expect(res.body.code).toBe('SCHEDULE_OVERLAP');

      const after = await prisma.agendaItem.findMany({
        where: { eventId: testEventId },
        orderBy: { id: 'asc' },
      });

      expect(JSON.stringify(before)).toEqual(JSON.stringify(after));
    });

    it('rejects midnight crossing with 400 and leaves DB completely unchanged', async () => {
      const before = await prisma.agendaItem.findMany({
        where: { eventId: testEventId },
        orderBy: { id: 'asc' },
      });

      // Shifting by 800 minutes would push past 18:30 UTC (which is 00:00 IST next day)
      const res = await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay`)
        .send({ delayMinutes: 800, cascade: true, reason: 'Crosses midnight' })
        .expect(400);

      expect(res.body.code).toBe('DELAY_CROSSES_MIDNIGHT');

      const after = await prisma.agendaItem.findMany({
        where: { eventId: testEventId },
        orderBy: { id: 'asc' },
      });

      expect(JSON.stringify(before)).toEqual(JSON.stringify(after));
    });
  });

  // ──────────────── 6. Cascade Delay & Downstream Shifts ────────────────
  describe('Cascade Delay Execution', () => {
    let appliedBatchId: string;

    it('applies 15 min cascade delay to item2 and downstream item3', async () => {
      const res = await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay`)
        .send({ delayMinutes: 15, cascade: true, reason: 'Traffic delay' })
        .expect(200);

      expect(res.body.applied).toBe(true);
      expect(res.body.batchId).toBeDefined();
      appliedBatchId = res.body.batchId;

      expect(res.body.changes.length).toBe(2);
      expect(res.body.changes.find((c: any) => c.itemId === item2Id)).toBeDefined();
      expect(res.body.changes.find((c: any) => c.itemId === item3Id)).toBeDefined();

      // Verify item1 (earlier) was untouched
      const item1 = await prisma.agendaItem.findUnique({ where: { id: item1Id } });
      expect(item1?.startTime.toISOString()).toBe('2025-09-19T03:30:00.000Z');

      // Verify item2 shifted by 15 min (04:30 -> 04:45 UTC)
      const item2 = await prisma.agendaItem.findUnique({ where: { id: item2Id } });
      expect(item2?.startTime.toISOString()).toBe('2025-09-19T04:45:00.000Z');

      // Verify item3 shifted by 15 min (05:30 -> 05:45 UTC)
      const item3 = await prisma.agendaItem.findUnique({ where: { id: item3Id } });
      expect(item3?.startTime.toISOString()).toBe('2025-09-19T05:45:00.000Z');
    });

    it('verifies schedule change history recorded in DB', async () => {
      const res = await request(app.getHttpServer())
        .get(`/schedule-changes?eventId=${testEventId}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(2);
      const batchChanges = res.body.filter((c: any) => c.batchId === appliedBatchId);
      expect(batchChanges.length).toBe(2);
    });

    it('undoes the batch and restores exact original times', async () => {
      const res = await request(app.getHttpServer())
        .post(`/schedule-changes/${appliedBatchId}/undo`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.revertedCount).toBe(2);

      const item2 = await prisma.agendaItem.findUnique({ where: { id: item2Id } });
      expect(item2?.startTime.toISOString()).toBe('2025-09-19T04:30:00.000Z');

      const item3 = await prisma.agendaItem.findUnique({ where: { id: item3Id } });
      expect(item3?.startTime.toISOString()).toBe('2025-09-19T05:30:00.000Z');
    });

    it('rejects double-undo with 409', async () => {
      const res = await request(app.getHttpServer())
        .post(`/schedule-changes/${appliedBatchId}/undo`)
        .expect(409);

      expect(res.body.code).toBe('BATCH_ALREADY_REVERTED');
    });
  });

  // ──────────────── 7. Idempotency Header ────────────────
  describe('Idempotency Support', () => {
    it('returns replay response when called with identical Idempotency-Key', async () => {
      const idemKey = `idem_${Date.now()}`;

      // First call
      const res1 = await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay`)
        .set('Idempotency-Key', idemKey)
        .send({ delayMinutes: 10, cascade: true, reason: 'First Idempotent Call' })
        .expect(200);

      expect(res1.body.applied).toBe(true);
      expect(res1.headers['idempotent-replay']).toBeUndefined();

      // Second call with same key
      const res2 = await request(app.getHttpServer())
        .post(`/agenda/${item2Id}/delay`)
        .set('Idempotency-Key', idemKey)
        .send({ delayMinutes: 10, cascade: true, reason: 'Replay Call' })
        .expect(200);

      expect(res2.headers['idempotent-replay']).toBe('true');
      expect(res2.body.batchId).toBe(res1.body.batchId);

      // Verify it shifted only once (item2 was 04:30, now 04:40, NOT 04:50)
      const item2 = await prisma.agendaItem.findUnique({ where: { id: item2Id } });
      expect(item2?.startTime.toISOString()).toBe('2025-09-19T04:40:00.000Z');

      // Clean up by undoing
      await request(app.getHttpServer())
        .post(`/schedule-changes/${res1.body.batchId}/undo`)
        .expect(200);
    });
  });

  // ──────────────── 8. Concurrency Safety ────────────────
  describe('Concurrency Safety (Advisory Lock + Retry)', () => {
    it('handles concurrent delays on the same event without corruption or 500s', async () => {
      const item2Before = await prisma.agendaItem.findUnique({ where: { id: item2Id } });
      const expectedTimeMs = (item2Before?.startTime.getTime() ?? 0) + 20 * 60_000;

      // Both shift by 10 minutes concurrently
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/agenda/${item2Id}/delay`)
          .send({ delayMinutes: 10, cascade: true, reason: 'Concurrent call 1' }),
        request(app.getHttpServer())
          .post(`/agenda/${item2Id}/delay`)
          .send({ delayMinutes: 10, cascade: true, reason: 'Concurrent call 2' }),
      ]);

      expect(r1.status).toBe(200);
      expect(r2.status).toBe(200);

      // Final state should equal sequential application (+20 minutes)
      const item2 = await prisma.agendaItem.findUnique({ where: { id: item2Id } });
      expect(item2?.startTime.getTime()).toBe(expectedTimeMs);
    });
  });

  // ──────────────── 9. Consolidated State Endpoint ────────────────
  describe('Consolidated State Endpoint', () => {
    it('returns full event state with agenda, health, and recent changes', async () => {
      const res = await request(app.getHttpServer())
        .get(`/events/${testEventId}/state`)
        .expect(200);

      expect(res.body.event.id).toBe(testEventId);
      expect(Array.isArray(res.body.agenda)).toBe(true);
      expect(res.body.health).toBeDefined();
      expect(res.body.health.status).toBeDefined();
      expect(Array.isArray(res.body.recentChanges)).toBe(true);
    });
  });

  // ──────────────── 10. Demo Reset Endpoint Guard ────────────────
  describe('Demo Reset Endpoint', () => {
    it('blocks reset in production when ALLOW_DEMO_RESET is false', async () => {
      const prevEnv = process.env.NODE_ENV;
      const prevAllow = process.env.ALLOW_DEMO_RESET;

      process.env.NODE_ENV = 'production';
      process.env.ALLOW_DEMO_RESET = 'false';

      try {
        const res = await request(app.getHttpServer()).post('/api/reset').expect(403);
        expect(res.body.code).toBe('DEMO_RESET_DISABLED');
      } finally {
        process.env.NODE_ENV = prevEnv;
        process.env.ALLOW_DEMO_RESET = prevAllow;
      }
    });

    it('allows demo reset in development and returns success', async () => {
      const res = await request(app.getHttpServer()).post('/api/reset').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('reset');
    });
  });
});
