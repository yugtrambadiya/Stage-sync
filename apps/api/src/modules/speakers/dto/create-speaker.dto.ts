import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpeakerDto {
  @ApiProperty({ example: 'Dr. Rohan Verma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: 'cld_event_id_here', description: 'Event this speaker belongs to' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiPropertyOptional({ example: 'Professor & Head of ML Research' })
  @IsString()
  @IsOptional()
  @MaxLength(300)
  designation?: string;

  @ApiPropertyOptional({ example: 'IIT Bombay' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  organization?: string;

  @ApiPropertyOptional({ example: 'Dr. Verma leads the AI at the Edge lab at IIT Bombay...' })
  @IsString()
  @IsOptional()
  @MaxLength(3000)
  biography?: string;

  @ApiPropertyOptional({ example: ['Machine Learning', 'Edge AI', 'Federated Learning'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  expertise?: string[];

  @ApiPropertyOptional({ example: 'rverma@iitb.ac.in' })
  @IsEmail()
  @IsOptional()
  email?: string;
}
