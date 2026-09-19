import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@smart-anchor/database';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AgendaItem, Prisma } from '@prisma/client';
import { ScheduleEventsPublisher } from '../../common/events/schedule-events.publisher';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly publisher: ScheduleEventsPublisher,
  ) {}

  findAll(q?: string) {
    const where: Prisma.EventWhereInput = q
      ? { name: { contains: q, mode: 'insensitive' } }
      : {};
    return this.prisma.event.findMany({
      where,
      include: {
        agendaItems: {
          orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
          include: {
            speaker: true,
            panelSpeakers: { include: { speaker: true } },
          },
        },
        speakers: true,
      },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        agendaItems: {
          orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
          include: {
            speaker: true,
            panelSpeakers: { include: { speaker: true } },
          },
        },
        speakers: true,
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: `Event with id '${id}' was not found.`,
      });
    }
    return event;
  }

  create(dto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...(dto.id ? { id: dto.id } : {}),
        name:        dto.name,
        description: dto.description,
        venue:       dto.venue,
        date:        new Date(dto.date),
        timezone:    dto.timezone ?? 'Asia/Kolkata',
        status:      dto.status ?? 'DRAFT',
      },
    });
  }

  async update(id: string, dto: UpdateEventDto) {
    await this.findOne(id); // throws 404 if not found
    return this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.name        !== undefined && { name:        dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.venue       !== undefined && { venue:       dto.venue }),
        ...(dto.date        !== undefined && { date:        new Date(dto.date) }),
        ...(dto.timezone    !== undefined && { timezone:    dto.timezone }),
        ...(dto.status      !== undefined && { status:      dto.status }),
      },
    });
  }

  async remove(id: string, cascade = false) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { agendaItems: { select: { id: true } } },
    });
    if (!event) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: `Event with id '${id}' was not found.`,
      });
    }

    const agendaCount = event.agendaItems.length;

    if (agendaCount > 0 && !cascade) {
      throw new ConflictException({
        code: 'EVENT_HAS_AGENDA',
        message: `Event '${event.name}' still has ${agendaCount} agenda item(s). Use ?cascade=true to delete all related data.`,
        agendaItemCount: agendaCount,
      });
    }

    if (cascade) {
      // Cascade delete in FK-safe order within a transaction
      await this.prisma.$transaction([
        this.prisma.scheduleChange.deleteMany({ where: { eventId: id } }),
        this.prisma.agendaItemSpeaker.deleteMany({ where: { agendaItem: { eventId: id } } }),
        this.prisma.agendaItem.deleteMany({ where: { eventId: id } }),
        this.prisma.speaker.deleteMany({ where: { eventId: id } }),
        this.prisma.script.deleteMany({ where: { eventId: id } }),
        this.prisma.event.delete({ where: { id } }),
      ]);
    } else {
      await this.prisma.event.delete({ where: { id } });
    }

    return { id, deleted: true };
  }

  /** GET /events/:id/state — consolidated read-model for dashboard and AI context */
  async getState(id: string, atIso?: string) {
    const event = await this.findOne(id);
    const agenda = (event.agendaItems as AgendaItem[]).sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime(),
    );

    const recentChanges = await this.prisma.scheduleChange.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const now = atIso ? new Date(atIso) : new Date();

    const liveItem     = agenda.find(i => i.status === 'LIVE');
    const delayedItems = agenda.filter(i => i.status === 'DELAYED');
    const currentItem  = liveItem ?? delayedItems[0] ?? null;

    let nextItem: AgendaItem | null = null;
    if (currentItem) {
      nextItem = agenda.find(i => i.startTime > currentItem.startTime && i.status === 'UPCOMING') ?? null;
    } else {
      nextItem = agenda.find(i => i.startTime > now && i.status === 'UPCOMING') ?? null;
    }

    const totalDelay = delayedItems.length > 0
      ? Math.max(...agenda
          .filter(i => i.status === 'DELAYED')
          .map(i => i.durationMinutes))
      : 0;

    const lastItem = agenda.at(-1);
    const projectedEnd = lastItem
      ? new Date(lastItem.startTime.getTime() + lastItem.durationMinutes * 60_000).toISOString()
      : null;

    const overallStatus =
      delayedItems.length > 0 ? 'DELAYED' :
      agenda.some(i => i.status === 'LIVE') ? 'AT_RISK' :
      'ON_TIME';

    return {
      event,
      agenda,
      recentChanges,
      health: {
        status:            overallStatus,
        delayedItemIds:    delayedItems.map(i => i.id),
        totalDelayMinutes: totalDelay,
        currentItemId:     currentItem?.id ?? null,
        nextItemId:        nextItem?.id ?? null,
        projectedEnd,
      },
    };
  }
}
