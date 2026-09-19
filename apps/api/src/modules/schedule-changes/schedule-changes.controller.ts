import { Controller, Get, Post, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { AgendaService } from '../agenda/agenda.service';

@ApiTags('Schedule Changes')
@Controller('schedule-changes')
export class ScheduleChangesController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get()
  @ApiOperation({ summary: 'Get schedule change history for an event', description: 'Newest first. Grouped by batchId.' })
  @ApiQuery({ name: 'eventId', required: true })
  @ApiQuery({ name: 'limit', required: false, description: 'Max 200, default 50' })
  findAll(
    @Query('eventId') eventId: string,
    @Query('limit') limit?: string,
  ) {
    return this.agendaService.getScheduleChanges(eventId, limit ? parseInt(limit, 10) : 50);
  }

  @Post(':batchId/undo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Undo a batch of schedule changes',
    description: 'Transactional. Returns 409 if any item has drifted or batch is already reverted.',
  })
  @ApiResponse({ status: 409, description: 'STALE_UNDO or BATCH_ALREADY_REVERTED' })
  undoBatch(@Param('batchId') batchId: string) {
    return this.agendaService.undoBatch(batchId);
  }
}
