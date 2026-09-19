import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Headers,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { AgendaService } from './agenda.service';
import { CreateAgendaItemDto } from './dto/create-agenda-item.dto';
import { UpdateAgendaItemDto } from './dto/update-agenda-item.dto';
import { DelayAgendaItemDto } from './dto/delay-agenda-item.dto';

@ApiTags('Agenda')
@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  @ApiOperation({ summary: 'List agenda items', description: 'Filter with ?eventId=' })
  @ApiQuery({ name: 'eventId', required: false })
  findAll(@Query('eventId') eventId?: string) {
    return this.agendaService.findAll(eventId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single agenda item' })
  @ApiResponse({ status: 404, description: 'AGENDA_ITEM_NOT_FOUND' })
  findOne(@Param('id') id: string) {
    return this.agendaService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an agenda item' })
  create(@Body() dto: CreateAgendaItemDto) {
    return this.agendaService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an agenda item (partial)' })
  update(@Param('id') id: string, @Body() dto: UpdateAgendaItemDto) {
    return this.agendaService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an agenda item' })
  remove(@Param('id') id: string) {
    return this.agendaService.remove(id);
  }

  // ──── Cascade delay ────

  @Post(':id/delay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Apply a cascading delay',
    description: 'Shifts the item and all downstream items by N minutes. Uses Serializable transaction + advisory lock.',
  })
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Unique key to prevent duplicate shifts' })
  @ApiResponse({ status: 400, description: 'DELAY_CROSSES_MIDNIGHT or invalid delayMinutes' })
  @ApiResponse({ status: 409, description: 'SCHEDULE_OVERLAP or CONCURRENT_MODIFICATION' })
  async delay(
    @Param('id') id: string,
    @Body() dto: DelayAgendaItemDto,
    @Headers('idempotency-key') idempotencyKey?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const result = await this.agendaService.cascadeDelay(id, dto, { dryRun: false, idempotencyKey });
    if ((result as any)._idempotentReplay && res) {
      res.setHeader('Idempotent-Replay', 'true');
    }
    return result;
  }

  @Post(':id/delay/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview a cascade delay without writing anything',
    description: 'Identical computation as POST /delay — zero DB writes. Use this to show the diff before confirming.',
  })
  preview(@Param('id') id: string, @Body() dto: DelayAgendaItemDto) {
    return this.agendaService.cascadeDelay(id, dto, { dryRun: true });
  }

  @Get(':id/recovery-options')
  @ApiOperation({
    summary: 'Get deterministic recovery options and facts for AI prompt consumption [STRETCH]',
    description: 'Computes available buffer slack, compressible downstream sessions, and projected end time. Zero AI calls.',
  })
  @ApiQuery({ name: 'delayMinutes', required: false, type: Number })
  getRecoveryOptions(
    @Param('id') id: string,
    @Query('delayMinutes') delayMinutes?: string,
  ) {
    return this.agendaService.getRecoveryOptions(id, delayMinutes ? parseInt(delayMinutes, 10) : 15);
  }
}
