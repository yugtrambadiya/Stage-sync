import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@smart-anchor/database';
import { Prisma } from '@prisma/client';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { UpdateSpeakerDto } from './dto/update-speaker.dto';

@Injectable()
export class SpeakersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(q?: string, eventId?: string) {
    const where: Prisma.SpeakerWhereInput = {};
    if (eventId) where.eventId = eventId;
    if (q) {
      where.OR = [
        { name:         { contains: q, mode: 'insensitive' } },
        { organization: { contains: q, mode: 'insensitive' } },
        { biography:    { contains: q, mode: 'insensitive' } },
      ];
    }
    return this.prisma.speaker.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const speaker = await this.prisma.speaker.findUnique({
      where: { id },
      include: {
        agendaItems: { select: { id: true, title: true, startTime: true } },
        panelSlots:  { include: { agendaItem: { select: { id: true, title: true } } } },
      },
    });
    if (!speaker) {
      throw new NotFoundException({
        code: 'SPEAKER_NOT_FOUND',
        message: `Speaker with id '${id}' was not found.`,
      });
    }
    return speaker;
  }

  async create(dto: CreateSpeakerDto) {
    // Verify event exists
    const event = await this.prisma.event.findUnique({ where: { id: dto.eventId } });
    if (!event) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: `Event with id '${dto.eventId}' was not found.`,
      });
    }
    return this.prisma.speaker.create({
      data: {
        name:         dto.name,
        eventId:      dto.eventId,
        designation:  dto.designation,
        organization: dto.organization,
        biography:    dto.biography,
        expertise:    dto.expertise ?? [],
      },
    });
  }

  async update(id: string, dto: UpdateSpeakerDto) {
    await this.findOne(id);
    return this.prisma.speaker.update({
      where: { id },
      data: {
        ...(dto.name         !== undefined && { name:         dto.name }),
        ...(dto.designation  !== undefined && { designation:  dto.designation }),
        ...(dto.organization !== undefined && { organization: dto.organization }),
        ...(dto.biography    !== undefined && { biography:    dto.biography }),
        ...(dto.expertise    !== undefined && { expertise:    dto.expertise }),
      },
    });
  }

  async remove(id: string) {
    const speaker = await this.prisma.speaker.findUnique({
      where: { id },
      include: {
        agendaItems: { select: { id: true, title: true } },
      },
    });
    if (!speaker) {
      throw new NotFoundException({
        code: 'SPEAKER_NOT_FOUND',
        message: `Speaker with id '${id}' was not found.`,
      });
    }

    if (speaker.agendaItems.length > 0) {
      throw new ConflictException({
        code: 'SPEAKER_REFERENCED',
        message: `Speaker '${speaker.name}' is referenced by ${speaker.agendaItems.length} agenda item(s) and cannot be deleted.`,
        blockedBy: speaker.agendaItems.map(a => ({ agendaItemId: a.id, title: a.title })),
      });
    }

    await this.prisma.speaker.delete({ where: { id } });
    return { id, deleted: true };
  }
}
