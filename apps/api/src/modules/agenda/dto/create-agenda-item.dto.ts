import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsInt,
  IsPositive,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgendaStatus } from '@prisma/client';

export class CreateAgendaItemDto {
  @ApiProperty({ example: 'Keynote: AI at the Edge' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title: string;

  @ApiProperty({ description: 'Parent event id' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({ description: 'Lead speaker id (nullable for panel items / no speaker)' })
  @IsString()
  @IsOptional()
  speakerId?: string;

  @ApiPropertyOptional({ example: 'Opening keynote exploring AI inference on edge devices.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '2025-09-19T03:30:00.000Z', description: 'Start time as UTC ISO-8601' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: 60, description: 'Duration in minutes (positive integer)' })
  @IsInt()
  @Min(1)
  durationMinutes: number;

  @ApiPropertyOptional({ enum: AgendaStatus, default: AgendaStatus.UPCOMING })
  @IsEnum(AgendaStatus)
  @IsOptional()
  status?: AgendaStatus;

  @ApiPropertyOptional({
    description: 'Additional speaker IDs for panels/co-presenters',
    type: [String],
  })
  @IsString({ each: true })
  @IsOptional()
  panelSpeakerIds?: string[];
}
