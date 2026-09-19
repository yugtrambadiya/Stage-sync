import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@smart-anchor/database';
import { Prisma } from '@prisma/client';
import { CreateAgendaItemDto } from './dto/create-agenda-item.dto';
import { UpdateAgendaItemDto } from './dto/update-agenda-item.dto';
import { DelayAgendaItemDto } from './dto/delay-agenda-item.dto';
import { ScheduleEventsPublisher } from '../../common/events/schedule-events.publisher';
import {
  computePlan,
  computeMaxAllowedDelay,
  AgendaItemSnapshot,
} from './engine/cascade.engine';
import { CascadeResult } from '@smart-anchor/shared';

const AGENDA_INCLUDE = {
  speaker: true,
  panelSpeakers: { include: { speaker: true } },
} as const;

/** In-memory idempotency store — TTL 5 minutes. Single-instance only (documented in API_CONTRACT.md). */
const idempotencyCache = new Map<string, { result: CascadeResult; expiresAt: number }>();
const IDEM_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AgendaService {
  private readonly logger = new Logger(AgendaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: ScheduleEventsPublisher,
  ) {}

  // ──────────────── READ ────────────────

  findAll(eventId?: string) {
    const where: Prisma.AgendaItemWhereInput = eventId ? { eventId } : {};
    return this.prisma.agendaItem.findMany({
      where,
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      include: AGENDA_INCLUDE,
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.agendaItem.findUnique({
      where: { id },
      include: AGENDA_INCLUDE,
    });
    if (!item) {
      throw new NotFoundException({
        code: 'AGENDA_ITEM_NOT_FOUND',
        message: `Agenda item with id '${id}' was not found.`,
      });
    }
    return item;
  }

  // ──────────────── WRITE ────────────────

  async create(dto: CreateAgendaItemDto) {
    // Verify event exists
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event) {
      throw new NotFoundException({ code: 'EVENT_NOT_FOUND', message: `Event '${dto.eventId}' not found.` });
    }

    const startTime = new Date(dto.startTime);

    return this.prisma.$transaction(async tx => {
      const item = await tx.agendaItem.create({
        data: {
          title:           dto.title,
          description:     dto.description,
          startTime,
          durationMinutes: dto.durationMinutes,
          status:          dto.status ?? 'UPCOMING',
          event:   { connect: { id: dto.eventId } },
          ...(dto.speakerId && { speaker: { connect: { id: dto.speakerId } } }),
        },
      });

      // Wire panel speakers if provided
      if (dto.panelSpeakerIds?.length) {
        for (const speakerId of dto.panelSpeakerIds) {
          await tx.agendaItemSpeaker.upsert({
            where: { agendaItemId_speakerId: { agendaItemId: item.id, speakerId } },
            create: { agendaItemId: item.id, speakerId, role: 'PANELIST' },
            update: {},
          });
        }
      }

      this.publisher.publish({
        type:    'agenda.created',
        eventId: dto.eventId,
        at:      new Date().toISOString(),
        data:    item,
      });

      return tx.agendaItem.findUnique({ where: { id: item.id }, include: AGENDA_INCLUDE });
    });
  }

  async update(id: string, dto: UpdateAgendaItemDto) {
    const existing = await this.findOne(id);

    return this.prisma.$transaction(async tx => {
      const updated = await tx.agendaItem.update({
        where: { id },
        data: {
          ...(dto.title           !== undefined && { title:           dto.title }),
          ...(dto.description     !== undefined && { description:     dto.description }),
          ...(dto.startTime       !== undefined && { startTime:       new Date(dto.startTime) }),
          ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
          ...(dto.status          !== undefined && { status:          dto.status }),
          ...(dto.speakerId       !== undefined && {
            speaker: dto.speakerId ? { connect: { id: dto.speakerId } } : { disconnect: true },
          }),
        },
        include: AGENDA_INCLUDE,
      });

      this.publisher.publish({
        type:    'agenda.updated',
        eventId: existing.eventId,
        at:      new Date().toISOString(),
        data:    updated,
      });

      return updated;
    });
  }

  async remove(id: string) {
    const item = await this.findOne(id);

    await this.prisma.$transaction([
      this.prisma.agendaItemSpeaker.deleteMany({ where: { agendaItemId: id } }),
      this.prisma.scheduleChange.deleteMany({ where: { agendaItemId: id } }),
      this.prisma.agendaItem.delete({ where: { id } }),
    ]);

    this.publisher.publish({
      type:    'agenda.deleted',
      eventId: item.eventId,
      at:      new Date().toISOString(),
      data:    { id },
    });

    return { id, deleted: true };
  }

  // ──────────────── CASCADE DELAY ────────────────

  async cascadeDelay(
    agendaItemId: string,
    dto: DelayAgendaItemDto,
    options: { dryRun?: boolean; idempotencyKey?: string } = {},
  ): Promise<CascadeResult> {
    const { dryRun = false, idempotencyKey } = options;
    const cascade     = dto.cascade ?? true;
    const delayMinutes = dto.delayMinutes;

    // ── Idempotency check ──
    if (idempotencyKey) {
      const cacheKey = `${idempotencyKey}:${agendaItemId}`;
      const cached   = idempotencyCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        this.logger.debug(`Idempotent replay for key=${idempotencyKey}`);
        return { ...cached.result, _idempotentReplay: true } as CascadeResult & { _idempotentReplay: boolean };
      }
    }

    // ── Load anchor item ──
    const anchor = await this.prisma.agendaItem.findUnique({ where: { id: agendaItemId } });
    if (!anchor) {
      throw new NotFoundException({
        code: 'AGENDA_ITEM_NOT_FOUND',
        message: `Agenda item with id '${agendaItemId}' was not found.`,
      });
    }

    const event = await this.prisma.event.findUnique({ where: { id: anchor.eventId } });
    const timezone = event?.timezone ?? process.env.EVENT_TIMEZONE ?? 'Asia/Kolkata';

    // ── Serialized, advisory-locked transaction ──
    const result = await this.runCascadeTransaction({
      anchor,
      timezone,
      delayMinutes,
      cascade,
      dryRun,
      reason: dto.reason ?? 'Delay applied',
      agendaItemId,
    });

    // ── Cache for idempotency ──
    if (idempotencyKey && !dryRun && result.applied) {
      const cacheKey = `${idempotencyKey}:${agendaItemId}`;
      idempotencyCache.set(cacheKey, { result, expiresAt: Date.now() + IDEM_TTL_MS });
    }

    // ── Publish domain event (only on real apply) ──
    if (!dryRun && result.applied) {
      this.publisher.publish({
        type:    'schedule.cascaded',
        eventId: anchor.eventId,
        at:      new Date().toISOString(),
        data:    result,
      });
    }

    return result;
  }

  private async runCascadeTransaction(params: {
    anchor:        { id: string; eventId: string; startTime: Date; durationMinutes: number; title: string };
    timezone:      string;
    delayMinutes:  number;
    cascade:       boolean;
    dryRun:        boolean;
    reason:        string;
    agendaItemId:  string;
  }): Promise<CascadeResult> {
    const { anchor, timezone, delayMinutes, cascade, dryRun, reason, agendaItemId } = params;
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(
          async tx => {
            // Advisory lock per event — prevents concurrent cascades
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${anchor.eventId}))`;

            // Re-read inside the transaction (never trust pre-reads)
            const items = await tx.agendaItem.findMany({
              where: { eventId: anchor.eventId },
              orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
            });

            const snapshots: AgendaItemSnapshot[] = items.map(i => ({
              id:              i.id,
              title:           i.title,
              startTime:       i.startTime,
              durationMinutes: i.durationMinutes,
              status:          i.status,
              eventId:         i.eventId,
            }));

            // ── Pure computation ──
            const plan = computePlan({ items: snapshots, anchorId: agendaItemId, delayMinutes, cascade, timezone });

            // ── Midnight violation ──
            if (plan.violations.midnight.length > 0) {
              const v = plan.violations.midnight[0];
              const maxAllowed = computeMaxAllowedDelay(snapshots, agendaItemId, cascade, timezone);
              throw new BadRequestException({
                statusCode: 400,
                error:      'Bad Request',
                code:       'DELAY_CROSSES_MIDNIGHT',
                message:    'The requested delay would move an agenda item past midnight.',
                itemId:     v.itemId,
                applied:    false,
                maxAllowedDelayMinutes: maxAllowed,
              });
            }

            // ── Overlap violation ──
            if (plan.violations.overlaps.length > 0) {
              const maxAllowed = computeMaxAllowedDelay(snapshots, agendaItemId, cascade, timezone);
              throw new ConflictException({
                statusCode: 409,
                error:      'Conflict',
                code:       'SCHEDULE_OVERLAP',
                message:    `The requested delay would cause an agenda overlap between '${plan.violations.overlaps[0].a.title}' and '${plan.violations.overlaps[0].b.title}'.`,
                applied:    false,
                conflicts:  plan.violations.overlaps,
                changes:    plan.changes.map(c => ({
                  itemId:   c.itemId,
                  title:    c.title,
                  oldStart: c.oldStart.toISOString(),
                  newStart: c.newStart.toISOString(),
                  oldEnd:   c.oldEnd.toISOString(),
                  newEnd:   c.newEnd.toISOString(),
                })),
                maxAllowedDelayMinutes: maxAllowed,
              });
            }

            const maxAllowed = computeMaxAllowedDelay(snapshots, agendaItemId, cascade, timezone);

            const changes = plan.changes.map(c => ({
              itemId:   c.itemId,
              title:    c.title,
              oldStart: c.oldStart.toISOString(),
              newStart: c.newStart.toISOString(),
              oldEnd:   c.oldEnd.toISOString(),
              newEnd:   c.newEnd.toISOString(),
            }));

            const result: CascadeResult = {
              agendaItemId,
              eventId:      anchor.eventId,
              delayMinutes,
              cascade,
              dryRun,
              applied:      !dryRun,
              batchId:      null,
              changes,
              impact: {
                affectedCount:          plan.impact.affectedCount,
                eventEndBefore:         plan.impact.eventEndBefore?.toISOString(),
                eventEndAfter:          plan.impact.eventEndAfter?.toISOString(),
                maxAllowedDelayMinutes: maxAllowed,
              },
            };

            if (dryRun) return result;

            // ── Apply DB writes ──
            const batchId = crypto.randomUUID();

            for (const change of plan.changes) {
              await tx.agendaItem.update({
                where: { id: change.itemId },
                data: {
                  startTime: change.newStart,
                  status:    change.itemId === agendaItemId ? 'DELAYED' : undefined,
                },
              });

              await tx.scheduleChange.create({
                data: {
                  eventId:      anchor.eventId,
                  agendaItemId: change.itemId,
                  batchId,
                  changeType:   'DELAY',
                  delayMinutes,
                  reason,
                  oldStart:     change.oldStart,
                  newStart:     change.newStart,
                  oldEnd:       change.oldEnd,
                  newEnd:       change.newEnd,
                  approved:     true,
                },
              });
            }

            return { ...result, batchId };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout:        15_000,
          },
        );
      } catch (err: unknown) {
        // Retry on Prisma serialization conflicts
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          (err.code === 'P2034' || err.code === 'P1001') &&
          attempt < MAX_RETRIES - 1
        ) {
          const jitter = Math.random() * 100 + 50 * attempt;
          this.logger.warn(`Cascade transaction conflict on attempt ${attempt + 1}, retrying in ${jitter.toFixed(0)}ms`);
          await new Promise(r => setTimeout(r, jitter));
          continue;
        }
        throw err;
      }
    }

    throw new ConflictException({
      code:    'CONCURRENT_MODIFICATION',
      message: 'The schedule was modified by a concurrent request. Please retry.',
      applied: false,
    });
  }

  // ──────────────── UNDO ────────────────

  async undoBatch(batchId: string): Promise<CascadeResult> {
    const changes = await this.prisma.scheduleChange.findMany({
      where: { batchId },
      include: { agendaItem: true },
    });

    if (changes.length === 0) {
      throw new NotFoundException({
        code:    'BATCH_NOT_FOUND',
        message: `No schedule changes found for batchId '${batchId}'.`,
      });
    }

    // Check for REVERT type (already undone) or existing revert of this batch
    const firstChange = changes[0];
    const alreadyReverted = await this.prisma.scheduleChange.findFirst({
      where: {
        eventId: firstChange.eventId,
        changeType: 'REVERT',
        reason: { contains: batchId },
      },
    });

    if (alreadyReverted || firstChange.changeType === 'REVERT') {
      throw new ConflictException({
        code:    'BATCH_ALREADY_REVERTED',
        message: `Batch '${batchId}' has already been reverted.`,
        applied: false,
      });
    }

    const eventId = firstChange.eventId;
    const event   = await this.prisma.event.findUnique({ where: { id: eventId } });
    const timezone = event?.timezone ?? 'Asia/Kolkata';

    return this.prisma.$transaction(
      async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${eventId}))`;

        // Verify items haven't drifted (stale undo protection)
        for (const change of changes) {
          if (!change.agendaItemId || !change.newStart) continue;
          const current = await tx.agendaItem.findUnique({ where: { id: change.agendaItemId } });
          if (!current) continue;
          if (current.startTime.getTime() !== change.newStart.getTime()) {
            throw new ConflictException({
              code:    'STALE_UNDO',
              message: `Agenda item '${current.title}' has been modified since this batch was applied. Undo aborted.`,
              applied: false,
              itemId:  change.agendaItemId,
            });
          }
        }

        const revertBatchId = crypto.randomUUID();
        const undoChanges: CascadeResult['changes'] = [];

        for (const change of changes) {
          if (!change.agendaItemId || !change.oldStart || !change.newStart) continue;

          await tx.agendaItem.update({
            where: { id: change.agendaItemId },
            data:  { startTime: change.oldStart, status: 'UPCOMING' },
          });

          await tx.scheduleChange.create({
            data: {
              eventId,
              agendaItemId: change.agendaItemId,
              batchId:      revertBatchId,
              changeType:   'REVERT',
              reason:       `Reverted batch ${batchId}`,
              oldStart:     change.newStart,
              newStart:     change.oldStart,
              oldEnd:       change.newEnd,
              newEnd:       change.oldEnd,
              approved:     true,
            },
          });

          undoChanges.push({
            itemId:   change.agendaItemId,
            oldStart: change.newStart.toISOString(),
            newStart: change.oldStart.toISOString(),
            oldEnd:   change.newEnd?.toISOString() ?? '',
            newEnd:   change.oldEnd?.toISOString() ?? '',
          });
        }

        const result: CascadeResult = {
          agendaItemId: changes[0].agendaItemId ?? '',
          eventId,
          delayMinutes: 0,
          cascade:      true,
          dryRun:       false,
          applied:      true,
          batchId:      revertBatchId,
          changes:      undoChanges,
          impact: {
            affectedCount:          undoChanges.length,
            maxAllowedDelayMinutes: 0,
          },
        };

        this.publisher.publish({
          type:    'schedule.reverted',
          eventId,
          at:      new Date().toISOString(),
          data:    result,
        });

        return {
          success: true,
          revertedCount: undoChanges.length,
          ...result,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15_000 },
    );
  }

  // ──────────────── SCHEDULE CHANGES ────────────────

  getScheduleChanges(eventId: string, limit = 50) {
    return this.prisma.scheduleChange.findMany({
      where:   { eventId },
      orderBy: { createdAt: 'desc' },
      take:    Math.min(limit, 200),
      include: { agendaItem: { select: { id: true, title: true } } },
    });
  }

  // ──────────────── RECOVERY OPTIONS [STRETCH] ────────────────

  async getRecoveryOptions(agendaItemId: string, delayMinutes = 15) {
    const item = await this.findOne(agendaItemId);
    const items = await this.prisma.agendaItem.findMany({
      where: { eventId: item.eventId },
      orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    });

    const itemIdx = items.findIndex(i => i.id === agendaItemId);
    const downstream = items.slice(itemIdx);

    // Calculate slack gaps between downstream items
    const slackGaps: { afterItemId: string; afterTitle: string; beforeItemId: string; beforeTitle: string; gapMinutes: number }[] = [];
    let totalSlackMinutes = 0;

    for (let i = 0; i < downstream.length - 1; i++) {
      const current = downstream[i];
      const next = downstream[i + 1];
      const currentEnd = new Date(current.startTime.getTime() + current.durationMinutes * 60_000);
      const gapMs = next.startTime.getTime() - currentEnd.getTime();
      if (gapMs > 0) {
        const gapMinutes = Math.floor(gapMs / 60_000);
        totalSlackMinutes += gapMinutes;
        slackGaps.push({
          afterItemId:  current.id,
          afterTitle:   current.title,
          beforeItemId: next.id,
          beforeTitle:  next.title,
          gapMinutes,
        });
      }
    }

    // Identify compressible items (sessions > 30m or buffer/lunch sessions)
    const compressibleItems = downstream
      .filter(i => i.id !== agendaItemId && i.durationMinutes > 30)
      .map(i => {
        const maxReduction = Math.min(15, Math.floor(i.durationMinutes * 0.25));
        return {
          id: i.id,
          title: i.title,
          currentDurationMinutes: i.durationMinutes,
          suggestedCompressMinutes: maxReduction,
        };
      });

    const lastItem = items[items.length - 1];
    const projectedEndTime = lastItem
      ? new Date(lastItem.startTime.getTime() + (lastItem.durationMinutes + delayMinutes) * 60_000).toISOString()
      : null;

    let recommendation = 'Apply cascade delay to all downstream sessions.';
    if (totalSlackMinutes >= delayMinutes) {
      recommendation = `Existing buffer gaps of ${totalSlackMinutes} min can absorb this ${delayMinutes} min delay with minimal impact.`;
    } else if (compressibleItems.length > 0) {
      const best = compressibleItems[0];
      recommendation = `Compressing '${best.title}' by ${Math.min(delayMinutes, best.suggestedCompressMinutes)} min would recover time lost to this delay.`;
    }

    return {
      agendaItemId,
      delayMinutes,
      projectedEndTime,
      totalSlackMinutes,
      slackGaps,
      compressibleItems,
      recommendation,
    };
  }
}
