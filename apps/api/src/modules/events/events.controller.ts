import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List all events', description: 'Supports ?q= for name search' })
  @ApiQuery({ name: 'q', required: false, description: 'Search by event name' })
  findAll(@Query('q') q?: string) {
    return this.eventsService.findAll(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single event with agenda and speakers' })
  @ApiParam({ name: 'id', description: 'Event cuid' })
  @ApiResponse({ status: 404, description: 'EVENT_NOT_FOUND' })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Get(':id/state')
  @ApiOperation({
    summary: 'Get consolidated event state (event + agenda + recent changes + health)',
    description: 'Pass ?at=<ISO> to simulate a specific time (useful for demos)',
  })
  @ApiQuery({ name: 'at', required: false, description: 'ISO-8601 timestamp to evaluate current/next speaker' })
  getState(@Param('id') id: string, @Query('at') at?: string) {
    return this.eventsService.getState(id, at);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({ status: 201, description: 'Created' })
  create(@Body() dto: CreateEventDto) {
    return this.eventsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event fields (partial)' })
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete event',
    description: 'Returns 409 if event has agenda items. Use ?cascade=true to force-delete all related data.',
  })
  @ApiQuery({ name: 'cascade', required: false, type: Boolean })
  @ApiResponse({ status: 409, description: 'EVENT_HAS_AGENDA — use ?cascade=true' })
  remove(
    @Param('id') id: string,
    @Query('cascade') cascade?: string,
  ) {
    return this.eventsService.remove(id, cascade === 'true');
  }
}
