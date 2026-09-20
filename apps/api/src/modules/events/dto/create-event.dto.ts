import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';

export class CreateEventDto {
  @ApiPropertyOptional({ example: 'evt_technova_2025' })
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty({ example: 'TechNova 2025 — Annual Technical Symposium' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'A full-day technical symposium featuring talks, workshops and keynotes.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'Main Auditorium, Block A' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  venue?: string;

  @ApiProperty({ example: '2025-09-19T00:00:00.000Z', description: 'Event date (UTC ISO-8601)' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'Asia/Kolkata', default: 'Asia/Kolkata' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}
