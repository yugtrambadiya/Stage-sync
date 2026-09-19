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
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiResponse } from '@nestjs/swagger';
import { SpeakersService } from './speakers.service';
import { CreateSpeakerDto } from './dto/create-speaker.dto';
import { UpdateSpeakerDto } from './dto/update-speaker.dto';

@ApiTags('Speakers')
@Controller('speakers')
export class SpeakersController {
  constructor(private readonly speakersService: SpeakersService) {}

  @Get()
  @ApiOperation({ summary: 'List speakers', description: 'Supports ?q= (name/org/topic search) and ?eventId=' })
  @ApiQuery({ name: 'q',       required: false })
  @ApiQuery({ name: 'eventId', required: false })
  findAll(@Query('q') q?: string, @Query('eventId') eventId?: string) {
    return this.speakersService.findAll(q, eventId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single speaker with their agenda items' })
  @ApiResponse({ status: 404, description: 'SPEAKER_NOT_FOUND' })
  findOne(@Param('id') id: string) {
    return this.speakersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a speaker' })
  create(@Body() dto: CreateSpeakerDto) {
    return this.speakersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update speaker fields (partial)' })
  update(@Param('id') id: string, @Body() dto: UpdateSpeakerDto) {
    return this.speakersService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete speaker', description: 'Returns 409 if speaker is referenced by agenda items.' })
  @ApiResponse({ status: 409, description: 'SPEAKER_REFERENCED — blockedBy list included' })
  remove(@Param('id') id: string) {
    return this.speakersService.remove(id);
  }
}
